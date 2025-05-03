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

// Define the input schema (optional, could just be a trigger)
const CollectDataInputSchema = z.object({
  symbol: z.string().default('BTCUSDT'),
  interval: z.string().default('1m'),
  limit: z.number().int().positive().max(1000).default(100), // Fetch last 100 minutes by default
});

// Define the output schema
interface CollectDataResult {
  success: boolean;
  message: string;
  insertedCount?: number;
}

// --- Collect Binance Data Action ---
export async function collectBinanceOhlcvData(
  input: z.infer<typeof CollectDataInputSchema> = { symbol: 'BTCUSDT', interval: '1m', limit: 100 } // Default input
): Promise<CollectDataResult> {
  console.log('[collectBinanceOhlcvData] Starting data collection with input:', input);
  const validationResult = CollectDataInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[collectBinanceOhlcvData] Invalid input:', validationResult.error);
    return { success: false, message: 'Invalid input.' };
  }

  const { symbol, interval, limit } = validationResult.data;

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
  try {
    console.log(`[collectBinanceOhlcvData] Fetching ${limit} candlesticks for ${symbol} (${interval})...`);
    // Format: [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored]
    ticks = await binance.candlesticks(symbol, interval, undefined, { limit });

    if (!Array.isArray(ticks) || ticks.length === 0) {
      console.warn(`[collectBinanceOhlcvData] No candlestick data received for ${symbol}.`);
      return { success: false, message: `No candlestick data received for ${symbol}.` };
    }
    console.log(`[collectBinanceOhlcvData] Received ${ticks.length} candlesticks.`);
  } catch (fetchError: any) {
    console.error(`[collectBinanceOhlcvData] Error fetching candlesticks for ${symbol}:`, fetchError);
    return { success: false, message: `Error fetching data from Binance: ${fetchError.message}` };
  }

  // 3. Transform Data for Supabase
  const dataToInsert: OhlcvData[] = ticks.map((tick: any[]) => ({
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
  }));

  // 4. Insert Data into Supabase
  if (!supabase) {
    console.error('[collectBinanceOhlcvData] Supabase client is not initialized.');
    return { success: false, message: 'Supabase client not initialized.' };
  }

  try {
    console.log(`[collectBinanceOhlcvData] Attempting to insert ${dataToInsert.length} records into Supabase...`);
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
          return { success: false, message: 'Permission denied saving data. Check Supabase RLS policies for OHLCV_BTC_USDT_1m (INSERT/UPDATE).' };
      } else if (error.message.includes('relation "public.OHLCV_BTC_USDT_1m" does not exist')) {
          return { success: false, message: 'Table "OHLCV_BTC_USDT_1m" not found. Ensure it was created in Supabase.' };
      }
      return { success: false, message: `Supabase error: ${error.message}` };
    }

    console.log(`[collectBinanceOhlcvData] Successfully inserted/upserted ${count ?? data?.length ?? 0} records.`);
    return { success: true, message: `Successfully collected and saved ${count ?? data?.length ?? 0} data points.`, insertedCount: count ?? data?.length ?? 0 };

  } catch (dbError: any) {
    console.error('[collectBinanceOhlcvData] Unexpected error during Supabase operation:', dbError);
    return { success: false, message: `Unexpected database error: ${dbError.message}` };
  }
}
