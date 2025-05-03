// src/actions/collect-data.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';
import { supabase } from '@/lib/supabase-client';
import { addMilliseconds, parse } from 'date-fns'; // Import date-fns for interval calculation

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
  interval: z.string().default('1m').describe("Candlestick interval (e.g., '1m', '5m', '1h')."),
  limit: z.number().int().positive().max(1000).optional().default(1000).describe("Candles per request (API max 1000). Used for latest data or chunk size for historical."),
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
  totalFetchedCount?: number; // Total fetched across all chunks
  totalInsertedCount?: number; // Total inserted across all chunks
}

// Helper function to parse interval string (e.g., '1m', '5m', '1h') into milliseconds
function intervalToMilliseconds(interval: string): number {
    const value = parseInt(interval.slice(0, -1));
    const unit = interval.slice(-1);
    switch (unit) {
        case 'm': return value * 60 * 1000;
        case 'h': return value * 60 * 60 * 1000;
        case 'd': return value * 24 * 60 * 60 * 1000;
        case 'w': return value * 7 * 24 * 60 * 60 * 1000;
        // Add 's' for seconds if needed
        default: throw new Error(`Unsupported interval unit: ${unit}`);
    }
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

  const { symbol, interval, limit, startTime, endTime } = validationResult.data;
  const isHistorical = startTime !== undefined && endTime !== undefined;
  const CHUNK_DELAY_MS = 250; // Delay between chunk requests to avoid rate limiting

  // 1. Initialize Binance client (public data, no keys needed)
  let binance;
  try {
    binance = new Binance();
    console.log('[collectBinanceOhlcvData] Binance client initialized.');
  } catch (initError: any) {
    console.error('[collectBinanceOhlcvData] Failed to initialize Binance client:', initError);
    return { success: false, message: `Failed to initialize Binance client: ${initError.message}` };
  }

   // Ensure Supabase client is ready
   if (!supabase) {
     console.error('[collectBinanceOhlcvData] Supabase client is not initialized.');
     return { success: false, message: 'Supabase client not initialized.' };
   }

  // --- Historical Data Fetching (Chunking Logic) ---
  if (isHistorical) {
    let currentStartTime = startTime;
    let totalFetched = 0;
    let totalInserted = 0;
    let chunkNumber = 1;
    const intervalMs = intervalToMilliseconds(interval);

    console.log(`[collectBinanceOhlcvData] Starting historical data collection for ${symbol} (${interval}) from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()} in chunks of ${limit}...`);

    try {
      while (currentStartTime <= endTime) {
        console.log(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Fetching data starting from ${new Date(currentStartTime).toISOString()}...`);

        const apiOptions = {
          limit: limit,
          startTime: currentStartTime,
           // Fetch up to the original endTime on the last chunk if needed
           // However, relying on startTime and limit is usually sufficient
           // endTime: Math.min(currentStartTime + (limit * intervalMs), endTime), // Optional: Can also set chunk endTime explicitly
        };

        let ticks: any[] = [];
        try {
          // Format: [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored]
          ticks = await binance.candlesticks(symbol, interval, undefined, apiOptions);
        } catch (fetchError: any) {
           console.error(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Error fetching candlesticks:`, fetchError);
           // Decide whether to stop or continue. Let's stop on fetch error for simplicity.
           return { success: false, message: `Error fetching data chunk ${chunkNumber}: ${fetchError.message}`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
        }


        if (!Array.isArray(ticks)) {
          console.error(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Unexpected non-array response from Binance API.`, ticks);
           // Stop processing if the API returns unexpected data
           return { success: false, message: `Unexpected API response format in chunk ${chunkNumber}.`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
        }

        if (ticks.length === 0) {
          console.log(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: No more data received. Ending collection.`);
          break; // Exit loop if no data is returned
        }

        totalFetched += ticks.length;
        console.log(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Received ${ticks.length} candlesticks.`);

        // Transform Data
        let dataToInsert: OhlcvData[] = [];
        try {
          dataToInsert = ticks.map((tick: any[]) => {
              if (!Array.isArray(tick) || tick.length < 11) {
                  console.warn(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Skipping malformed tick:`, tick);
                  return null;
              }
              return {
                  open_time: new Date(tick[0]).toISOString(),
                  open: parseFloat(tick[1]),
                  high: parseFloat(tick[2]),
                  low: parseFloat(tick[3]),
                  close: parseFloat(tick[4]),
                  volume: parseFloat(tick[5]),
                  close_time: new Date(tick[6]).toISOString(),
                  quote_asset_volume: parseFloat(tick[7]),
                  number_of_trades: parseInt(tick[8], 10),
                  taker_buy_base_asset_volume: parseFloat(tick[9]),
                  taker_buy_quote_asset_volume: parseFloat(tick[10]),
              };
          }).filter((item): item is OhlcvData => item !== null);

          if (dataToInsert.length === 0 && ticks.length > 0) {
              console.warn(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: All fetched ticks failed transformation. Skipping chunk.`);
              // Continue to next chunk? Or error out? Let's continue for now.
          }
        } catch (transformError: any) {
             console.error(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Error transforming data:`, transformError);
             // Stop processing if transformation fails critically
             return { success: false, message: `Error processing data in chunk ${chunkNumber}: ${transformError.message}`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
        }


        // Insert Data into Supabase
        if (dataToInsert.length > 0) {
          try {
            const { data, error, count } = await supabase
              .from('OHLCV_BTC_USDT_1m')
              .upsert(dataToInsert, { onConflict: 'open_time' });

            if (error) {
              console.error(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Supabase upsert error:`, error);
              // Check for RLS errors or other critical DB errors
              if (error.message.includes('security policy') || error.code === '42501') {
                return { success: false, message: 'Permission denied saving data. Check Supabase RLS policies (INSERT/UPDATE).', totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
              } else if (error.message.includes('relation "public.OHLCV_BTC_USDT_1m" does not exist')) {
                 return { success: false, message: 'Table "OHLCV_BTC_USDT_1m" not found.', totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
              }
              // For other errors, maybe log and continue? For now, let's stop.
              return { success: false, message: `Supabase error in chunk ${chunkNumber}: ${error.message}`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
            }
            const insertedCount = count ?? data?.length ?? 0;
            totalInserted += insertedCount;
            console.log(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Successfully inserted/upserted ${insertedCount} records.`);

          } catch (dbError: any) {
            console.error(`[collectBinanceOhlcvData] Chunk ${chunkNumber}: Unexpected error during Supabase operation:`, dbError);
            return { success: false, message: `Unexpected database error in chunk ${chunkNumber}: ${dbError.message}`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
          }
        }

        // Update start time for the next chunk
        // Use the open_time of the last fetched candle + interval duration
        const lastCandleOpenTime = ticks[ticks.length - 1][0];
        currentStartTime = lastCandleOpenTime + intervalMs;

         // Optional check: If the last candle's time is already beyond the requested endTime, break.
         // Note: Binance API might return candles starting *before* startTime, so check last candle time.
         if (lastCandleOpenTime >= endTime) {
             console.log(`[collectBinanceOhlcvData] Last candle time (${new Date(lastCandleOpenTime).toISOString()}) reached or exceeded requested end time (${new Date(endTime).toISOString()}). Finishing.`);
             break;
         }

        chunkNumber++;

        // Add a delay to prevent hitting API rate limits
        console.log(`[collectBinanceOhlcvData] Waiting ${CHUNK_DELAY_MS}ms before next chunk...`);
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY_MS));

      } // End while loop

      // Historical collection finished successfully
       const finalMessage = `Successfully collected historical data for ${symbol} (${interval}) from ${new Date(startTime).toISOString()} to ${new Date(endTime).toISOString()}. Total fetched: ${totalFetched}, Total saved: ${totalInserted}.`;
       console.log(`[collectBinanceOhlcvData] ${finalMessage}`);
      return { success: true, message: finalMessage, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };

    } catch (overallError: any) {
      // Catch any unexpected errors outside the loop
      console.error("[collectBinanceOhlcvData] Unexpected error during historical collection:", overallError);
      return { success: false, message: `Unexpected error during historical collection: ${overallError.message}`, totalFetchedCount: totalFetched, totalInsertedCount: totalInserted };
    }
  }


  // --- Fetching Latest Data (No Chunking Needed) ---
  else {
    console.log(`[collectBinanceOhlcvData] Fetching latest ${limit} candlesticks for ${symbol} (${interval})...`);
    let ticks: any[] = [];
    try {
       ticks = await binance.candlesticks(symbol, interval, undefined, { limit });

        if (!Array.isArray(ticks)) {
             console.error(`[collectBinanceOhlcvData] Unexpected non-array response from Binance API for ${symbol}:`, ticks);
             throw new Error(`Unexpected response format from Binance API.`);
        }
        if (ticks.length === 0) {
             const message = `No latest candlestick data received for ${symbol}.`;
             console.warn(`[collectBinanceOhlcvData] ${message}`);
             return { success: true, message: message, totalFetchedCount: 0, totalInsertedCount: 0 };
        }
        console.log(`[collectBinanceOhlcvData] Received ${ticks.length} latest candlesticks.`);

    } catch (fetchError: any) {
       console.error(`[collectBinanceOhlcvData] Error fetching latest candlesticks for ${symbol}:`, fetchError);
       let userMessage = `Error fetching latest data from Binance: ${fetchError.message}`;
       // Add specific error handling if needed
       return { success: false, message: userMessage };
    }

    // Transform Data
    let dataToInsert: OhlcvData[] = [];
    try {
        dataToInsert = ticks.map((tick: any[]) => {
            if (!Array.isArray(tick) || tick.length < 11) {
                console.warn("[collectBinanceOhlcvData] Skipping malformed tick:", tick);
                return null;
            }
            return {
                open_time: new Date(tick[0]).toISOString(),
                open: parseFloat(tick[1]),
                high: parseFloat(tick[2]),
                low: parseFloat(tick[3]),
                close: parseFloat(tick[4]),
                volume: parseFloat(tick[5]),
                close_time: new Date(tick[6]).toISOString(),
                quote_asset_volume: parseFloat(tick[7]),
                number_of_trades: parseInt(tick[8], 10),
                taker_buy_base_asset_volume: parseFloat(tick[9]),
                taker_buy_quote_asset_volume: parseFloat(tick[10]),
            };
        }).filter((item): item is OhlcvData => item !== null);

        if (dataToInsert.length === 0 && ticks.length > 0) {
            console.error("[collectBinanceOhlcvData] All latest fetched ticks failed transformation.");
            return { success: false, message: "Failed to process latest fetched data.", totalFetchedCount: ticks.length };
        }
    } catch (transformError: any) {
         console.error("[collectBinanceOhlcvData] Error transforming latest data:", transformError);
         return { success: false, message: `Error processing latest data: ${transformError.message}`, totalFetchedCount: ticks.length };
    }

    // Insert Latest Data into Supabase
    if (dataToInsert.length > 0) {
        try {
            console.log(`[collectBinanceOhlcvData] Attempting to insert/upsert ${dataToInsert.length} latest records into Supabase...`);
            const { data, error, count } = await supabase
              .from('OHLCV_BTC_USDT_1m')
              .upsert(dataToInsert, { onConflict: 'open_time' });

            if (error) {
              console.error('[collectBinanceOhlcvData] Supabase upsert error for latest data:', error);
              if (error.message.includes('security policy') || error.code === '42501') {
                return { success: false, message: 'Permission denied saving data. Check Supabase RLS policies (INSERT/UPDATE).', totalFetchedCount: dataToInsert.length };
              } else if (error.message.includes('relation "public.OHLCV_BTC_USDT_1m" does not exist')) {
                 return { success: false, message: 'Table "OHLCV_BTC_USDT_1m" not found.', totalFetchedCount: dataToInsert.length };
              }
              return { success: false, message: `Supabase error saving latest data: ${error.message}`, totalFetchedCount: dataToInsert.length };
            }

            const insertedCount = count ?? data?.length ?? 0;
            console.log(`[collectBinanceOhlcvData] Successfully inserted/upserted ${insertedCount} latest records.`);
            const message = `Successfully collected ${dataToInsert.length} and saved ${insertedCount} latest data points.`;
            return { success: true, message: message, totalFetchedCount: dataToInsert.length, totalInsertedCount: insertedCount };

        } catch (dbError: any) {
            console.error('[collectBinanceOhlcvData] Unexpected error during Supabase operation for latest data:', dbError);
            return { success: false, message: `Unexpected database error saving latest data: ${dbError.message}`, totalFetchedCount: dataToInsert.length };
        }
    } else {
         return { success: true, message: "No latest data needed insertion.", totalFetchedCount: ticks.length, totalInsertedCount: 0 };
    }
  } // End else (latest data fetch)
}
