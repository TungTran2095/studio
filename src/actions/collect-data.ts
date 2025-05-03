// src/actions/collect-data.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';
import { supabase } from '@/lib/supabase-client';

// Define the structure for the OHLCV data matching the Supabase table
// Use snake_case matching the SQL table definition
interface OhlcvData {
  open_time: string; // ISO string format for timestamptz
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  close_time: string; // ISO string format for timestamptz
  quote_asset_volume: number;
  number_of_trades: number;
  taker_buy_base_asset_volume: number;
  taker_buy_quote_asset_volume: number;
}

// Define the input schema, adding optional startTime and endTime
const CollectDataInputSchema = z.object({
  symbol: z.string().default('BTCUSDT'),
  interval: z.string().default('1m'),
  limit: z.number().int().positive().max(1000).optional().describe("Max candles per request (API limit). Used for fetching latest data or within a date range."),
  startTime: z.number().int().positive().optional().describe("Start time timestamp (milliseconds) for historical data."),
  endTime: z.number().int().positive().optional().describe("End time timestamp (milliseconds) for historical data."),
}).refine(data => !data.startTime || !data.endTime || data.endTime > data.startTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});


// Define the output schema
interface CollectDataResult {
  success: boolean;
  message: string;
  insertedCount?: number;
  fetchedCount?: number; // Add count of fetched records
}

// --- Collect Binance Data Action ---
export async function collectBinanceOhlcvData(
  input: z.infer<typeof CollectDataInputSchema>
): Promise<CollectDataResult> {
  console.log('[collectBinanceOhlcvData] Starting data collection with input:', input);
  const validationResult = CollectDataInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[collectBinanceOhlcvData] Invalid input:', validationResult.error);
    return { success: false, message: `Invalid input: ${validationResult.error.errors.map(e => e.message).join(', ')}` };
  }

  const { symbol, interval, limit = 1000, startTime, endTime } = validationResult.data; // Default limit to max if not provided
  const isHistorical = startTime && endTime;

  // 1. Initialize Binance client (public data, no keys needed)
  let binance;
  try {
    binance = new Binance();
    console.log('[collectBinanceOhlcvData] Binance client initialized.');
  } catch (initError: any) {
    console.error('[collectBinanceOhlcvData] Failed to initialize Binance client:', initError);
    return { success: false, message: `Failed to initialize Binance client: ${initError.message}` };
  }

  // 2. Fetch Candlestick Data
  let ticks: any[] = [];
  const apiOptions: { limit: number; startTime?: number; endTime?: number } = { limit };
  if (startTime) apiOptions.startTime = startTime;
  if (endTime) apiOptions.endTime = endTime;

  try {
    const fetchType = isHistorical ? `historical (${new Date(startTime!).toISOString()} to ${new Date(endTime!).toISOString()})` : `latest ${limit}`;
    console.log(`[collectBinanceOhlcvData] Fetching ${fetchType} candlesticks for ${symbol} (${interval})...`);
    console.log(`[collectBinanceOhlcvData] API options:`, apiOptions);

    // Format: [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored]
    // The third argument is the callback (pass undefined), fourth is options
    ticks = await binance.candlesticks(symbol, interval, undefined, apiOptions);

    if (!Array.isArray(ticks)) {
      // Handle non-array responses, might indicate an API error not caught as exception
      console.error(`[collectBinanceOhlcvData] Unexpected non-array response from Binance API for ${symbol}:`, ticks);
       throw new Error(`Unexpected response format from Binance API.`);
    }

    if (ticks.length === 0) {
        const message = isHistorical
            ? `No candlestick data received for ${symbol} in the specified date range.`
            : `No candlestick data received for ${symbol}.`;
      console.warn(`[collectBinanceOhlcvData] ${message}`);
      // Return success=true but indicate 0 fetched if no data in range, not necessarily an error
      return { success: true, message: message, fetchedCount: 0, insertedCount: 0 };
    }
    console.log(`[collectBinanceOhlcvData] Received ${ticks.length} candlesticks.`);
     // Check if limit was reached, suggesting more data might exist for the range
     if (isHistorical && ticks.length === limit) {
        console.warn(`[collectBinanceOhlcvData] Reached API limit (${limit}) for historical fetch. Data might be truncated. Consider smaller date ranges or implementing chunking.`);
        // Optionally add a note to the success message later
     }

  } catch (fetchError: any) {
    console.error(`[collectBinanceOhlcvData] Error fetching candlesticks for ${symbol}:`, fetchError);
     // Handle specific Binance API errors if possible
     let userMessage = `Error fetching data from Binance: ${fetchError.message}`;
     if (fetchError.message?.includes('startTime does not exist')) {
         userMessage = "Binance API Error: Invalid startTime provided.";
     } else if (fetchError.message?.includes('Timestamp for this request was 1000ms ahead of the server time')) {
         userMessage = "Binance API Error: Clock sync issue. Check server time.";
     }
    return { success: false, message: userMessage };
  }

  // 3. Transform Data for Supabase
  let dataToInsert: OhlcvData[] = [];
  try {
    dataToInsert = ticks.map((tick: any[]) => {
        if (!Array.isArray(tick) || tick.length < 11) {
            console.warn("[collectBinanceOhlcvData] Skipping malformed tick:", tick);
            return null; // Skip malformed ticks
        }
        return {
            open_time: new Date(tick[0]).toISOString(), // Convert timestamp to ISO string
            open: parseFloat(tick[1]),
            high: parseFloat(tick[2]),
            low: parseFloat(tick[3]),
            close: parseFloat(tick[4]),
            volume: parseFloat(tick[5]),
            close_time: new Date(tick[6]).toISOString(), // Convert timestamp to ISO string
            quote_asset_volume: parseFloat(tick[7]),
            number_of_trades: parseInt(tick[8], 10),
            taker_buy_base_asset_volume: parseFloat(tick[9]),
            taker_buy_quote_asset_volume: parseFloat(tick[10]),
        };
    }).filter((item): item is OhlcvData => item !== null); // Filter out nulls

    if (dataToInsert.length !== ticks.length) {
         console.warn(`[collectBinanceOhlcvData] ${ticks.length - dataToInsert.length} ticks were skipped due to formatting issues.`);
    }
     if (dataToInsert.length === 0 && ticks.length > 0) {
        console.error("[collectBinanceOhlcvData] All fetched ticks failed transformation. Check data format.");
        return { success: false, message: "Failed to process fetched data. Check data format.", fetchedCount: ticks.length };
     }

  } catch (transformError: any) {
       console.error("[collectBinanceOhlcvData] Error transforming data:", transformError);
       return { success: false, message: `Error processing data: ${transformError.message}`, fetchedCount: ticks.length };
  }


  // 4. Insert Data into Supabase
  if (!supabase) {
    console.error('[collectBinanceOhlcvData] Supabase client is not initialized.');
    return { success: false, message: 'Supabase client not initialized.' };
  }

  try {
    console.log(`[collectBinanceOhlcvData] Attempting to insert/upsert ${dataToInsert.length} records into Supabase...`);
    // Use upsert to handle potential duplicate primary keys (open_time) if re-fetching overlapping data
    const { data, error, count } = await supabase
      .from('OHLCV_BTC_USDT_1m') // Ensure table name matches EXACTLY (case-sensitive if quoted)
      .upsert(dataToInsert, {
           onConflict: 'open_time', // Specify the conflict column
           // ignoreDuplicates: false, // Default is false, which means upsert replaces on conflict
      });

    if (error) {
      console.error('[collectBinanceOhlcvData] Supabase insert/upsert error:', error);
      // Check for RLS errors specifically
      if (error.message.includes('security policy') || error.code === '42501') {
          return { success: false, message: 'Permission denied saving data. Check Supabase RLS policies for OHLCV_BTC_USDT_1m (INSERT/UPDATE).', fetchedCount: dataToInsert.length };
      } else if (error.message.includes('relation "public.OHLCV_BTC_USDT_1m" does not exist')) {
          return { success: false, message: 'Table "OHLCV_BTC_USDT_1m" not found. Ensure it was created in Supabase.', fetchedCount: dataToInsert.length };
      }
       // Add specific check for data type mismatch if possible (e.g., based on error code/message)
       // Example: if (error.code === '22P02') { // invalid text representation
       //    return { success: false, message: 'Data type mismatch saving to Supabase. Check data transformation.', fetchedCount: dataToInsert.length };
       // }
      return { success: false, message: `Supabase error: ${error.message}`, fetchedCount: dataToInsert.length };
    }

    const insertedCount = count ?? data?.length ?? 0; // Supabase v2 count might be null
    console.log(`[collectBinanceOhlcvData] Successfully inserted/upserted ${insertedCount} records.`);
    let message = `Successfully collected ${dataToInsert.length} and saved ${insertedCount} data points.`;
     if (isHistorical && ticks.length === limit) {
         message += ` (API limit reached, more data might exist for the range)`;
     }

    return { success: true, message: message, fetchedCount: dataToInsert.length, insertedCount: insertedCount };

  } catch (dbError: any) {
    console.error('[collectBinanceOhlcvData] Unexpected error during Supabase operation:', dbError);
    return { success: false, message: `Unexpected database error: ${dbError.message}`, fetchedCount: dataToInsert.length };
  }
}
