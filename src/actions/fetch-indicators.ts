// src/actions/fetch-indicators.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';

// Define the structure for the indicator data
export interface IndicatorsData {
    "Moving Average (50)": string;
    "Moving Average (200)": string;
    "RSI (14)": string;
    "MACD": string;
    "Bollinger Bands": string;
    lastUpdated: string; // Add timestamp for last update
}

// Define the input schema for the action
const FetchIndicatorsInputSchema = z.object({
  symbol: z.string().min(1).describe("The trading pair symbol (e.g., BTCUSDT)."),
  interval: z.string().optional().default('1h').describe("Candlestick interval (e.g., '1m', '5m', '1h', '4h', '1d')."),
  limit: z.number().int().positive().optional().default(200).describe("Number of candlesticks to fetch."),
});

// Define the output schema for the action
interface FetchIndicatorsResult {
  success: boolean;
  data?: IndicatorsData;
  error?: string;
}

// --- Helper function for placeholder calculations ---
// IMPORTANT: These are highly simplified placeholders and NOT accurate technical indicators.
// A real implementation should use a dedicated library like 'technicalindicators'.
function calculatePlaceholderIndicators(closes: number[]): Partial<IndicatorsData> {
    if (closes.length === 0) return {};

    const indicators: Partial<IndicatorsData> = {};

    // Moving Average (Simple)
    if (closes.length >= 50) {
        const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        indicators["Moving Average (50)"] = ma50.toFixed(2);
    } else {
         indicators["Moving Average (50)"] = "N/A";
    }
    if (closes.length >= 200) {
        const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
        indicators["Moving Average (200)"] = ma200.toFixed(2);
    } else {
         indicators["Moving Average (200)"] = "N/A";
    }


    // RSI (Placeholder - Extremely simplified, measures direction of last 14 changes)
    if (closes.length >= 15) {
        let gains = 0;
        let losses = 0;
        for (let i = closes.length - 14; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff > 0) gains++;
            else if (diff < 0) losses++;
        }
        const relativeStrength = losses === 0 ? 100 : gains / losses; // Very basic ratio
        const rsi = 100 - (100 / (1 + relativeStrength)); // Simplified RSI-like formula
        indicators["RSI (14)"] = rsi.toFixed(2);
    } else {
         indicators["RSI (14)"] = "N/A";
    }

    // MACD (Placeholder - Difference between two simple MAs)
    if (closes.length >= 26) {
         const ma12 = closes.slice(-12).reduce((a, b) => a + b, 0) / 12;
         const ma26 = closes.slice(-26).reduce((a, b) => a + b, 0) / 26;
         indicators["MACD"] = `${(ma12 - ma26).toFixed(2)} / Signal N/A`; // Placeholder, no signal line calc
    } else {
         indicators["MACD"] = "N/A";
    }

    // Bollinger Bands (Placeholder - MA + std dev)
    if (closes.length >= 20) {
        const periodCloses = closes.slice(-20);
        const ma20 = periodCloses.reduce((a, b) => a + b, 0) / 20;
        const variance = periodCloses.reduce((a, b) => a + Math.pow(b - ma20, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        const upperBand = ma20 + (stdDev * 2);
        const lowerBand = ma20 - (stdDev * 2);
        indicators["Bollinger Bands"] = `Upper: ${upperBand.toFixed(2)}, Lower: ${lowerBand.toFixed(2)}`;
    } else {
         indicators["Bollinger Bands"] = "N/A";
    }


    return indicators;
}


// --- Fetch Technical Indicators Action ---
export async function fetchTechnicalIndicators(
  input: z.infer<typeof FetchIndicatorsInputSchema>
): Promise<FetchIndicatorsResult> {
  console.log('[fetchTechnicalIndicators] Input:', input);
  const validationResult = FetchIndicatorsInputSchema.safeParse(input);
  if (!validationResult.success) {
    console.error('[fetchTechnicalIndicators] Invalid input:', validationResult.error);
    return { success: false, error: 'Invalid input.' };
  }

  const { symbol, interval, limit } = validationResult.data;

  // Initialize Binance client (using public API, no keys needed for candlestick data)
  let binance;
  try {
    console.log('[fetchTechnicalIndicators] Initializing Binance client...');
    // Note: No API keys needed for public market data like candlesticks
    binance = new Binance();
    console.log('[fetchTechnicalIndicators] Binance client initialized.');
  } catch (initError: any) {
    console.error('[fetchTechnicalIndicators] Failed to initialize Binance client:', initError);
    return { success: false, error: `Failed to initialize Binance client: ${initError.message}` };
  }

  try {
    console.log(`[fetchTechnicalIndicators] Fetching ${limit} candlesticks for ${symbol} (${interval})...`);
    // Fetch candlestick data
    // Result format: [time, open, high, low, close, volume, closeTime, assetVolume, trades, buyBaseVolume, buyAssetVolume, ignored]
    const ticks = await binance.candlesticks(symbol, interval, undefined, { limit });

    if (!Array.isArray(ticks) || ticks.length === 0) {
        throw new Error(`No candlestick data received for ${symbol}.`);
    }
    console.log(`[fetchTechnicalIndicators] Received ${ticks.length} candlesticks.`);

    // Extract closing prices
    const closingPrices = ticks.map((tick: any[]) => parseFloat(tick[4])); // Index 4 is the closing price

    // Calculate placeholder indicators
    console.log('[fetchTechnicalIndicators] Calculating placeholder indicators...');
    const calculatedIndicators = calculatePlaceholderIndicators(closingPrices);

    // Combine with timestamp
    const indicatorsData: IndicatorsData = {
        "Moving Average (50)": calculatedIndicators["Moving Average (50)"] ?? "Error",
        "Moving Average (200)": calculatedIndicators["Moving Average (200)"] ?? "Error",
        "RSI (14)": calculatedIndicators["RSI (14)"] ?? "Error",
        "MACD": calculatedIndicators["MACD"] ?? "Error",
        "Bollinger Bands": calculatedIndicators["Bollinger Bands"] ?? "Error",
        lastUpdated: new Date().toLocaleTimeString(),
    };

    console.log('[fetchTechnicalIndicators] Indicators calculated:', indicatorsData);
    return { success: true, data: indicatorsData };

  } catch (error: any) {
    console.error(`[fetchTechnicalIndicators] Error fetching or processing data for ${symbol}:`, error);
    let errorMessage = `Failed to fetch indicators for ${symbol}.`;
     if (error?.message?.includes('Invalid symbol')) {
        errorMessage = `Invalid symbol: ${symbol}.`;
    } else if (error?.message) {
        errorMessage += ` ${error.message}`;
    }
    return { success: false, error: errorMessage };
  }
}
