// src/actions/fetch-indicators.ts
'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';
import { IndicatorsData } from '@/types/indicators';

// Define the output schema for the action
interface FetchIndicatorsResult {
  success: boolean;
  data?: IndicatorsData;
  error?: string;
}

// Define the input schema for the action
const FetchIndicatorsInputSchema = z.object({
  symbol: z.string().min(1).describe("The trading pair symbol (e.g., BTCUSDT)."),
  interval: z.string().optional().default('1h').describe("Candlestick interval (e.g., '1m', '5m', '1h', '4h', '1d')."),
  limit: z.number().int().positive().optional().default(200).describe("Number of candlesticks to fetch."),
});

// --- Helper function for calculation of indicators ---
function calculateIndicators(candles: any[]): Partial<IndicatorsData> {
    if (!candles || candles.length === 0) return {};

    const indicators: Partial<IndicatorsData> = {};
    
    // Extract OHLCV data
    const closes = candles.map(candle => parseFloat(candle[4]));
    const highs = candles.map(candle => parseFloat(candle[2]));
    const lows = candles.map(candle => parseFloat(candle[3]));
    const opens = candles.map(candle => parseFloat(candle[1]));
    const volumes = candles.map(candle => parseFloat(candle[5]));
    
    const lastClose = closes[closes.length - 1];
    const lastHigh = highs[highs.length - 1];
    const lastLow = lows[lows.length - 1];
    
    // --- Trend Indicators ---
    
    // Moving Average (Simple)
    if (closes.length >= 50) {
        const ma50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
        indicators["Moving Average (50)"] = ma50.toFixed(2);
        
        // Add bullish/bearish info
        const trend = lastClose > ma50 ? "↗️ Bullish" : lastClose < ma50 ? "↘️ Bearish" : "Neutral";
        indicators["Moving Average (50)"] += ` (${trend})`;
    } else {
        indicators["Moving Average (50)"] = "N/A";
    }
    
    if (closes.length >= 200) {
        const ma200 = closes.slice(-200).reduce((a, b) => a + b, 0) / 200;
        indicators["Moving Average (200)"] = ma200.toFixed(2);
        
        // Add bullish/bearish info
        const trend = lastClose > ma200 ? "↗️ Bullish" : lastClose < ma200 ? "↘️ Bearish" : "Neutral";
        indicators["Moving Average (200)"] += ` (${trend})`;
    } else {
        indicators["Moving Average (200)"] = "N/A";
    }
    
    // EMA (Exponential Moving Average)
    if (closes.length >= 21) {
        // Simplified EMA calculation
        const k = 2 / (21 + 1); // Smoothing factor
        let ema = closes.slice(0, 21).reduce((a, b) => a + b, 0) / 21; // Start with SMA
        
        for (let i = 21; i < closes.length; i++) {
            ema = (closes[i] * k) + (ema * (1 - k));
        }
        
        indicators["EMA (21)"] = ema.toFixed(2);
        const trend = lastClose > ema ? "↗️ Bullish" : lastClose < ema ? "↘️ Bearish" : "Neutral";
        indicators["EMA (21)"] += ` (${trend})`;
    } else {
        indicators["EMA (21)"] = "N/A";
    }
    
    // ADX - Average Directional Index (simplified)
    if (closes.length >= 14) {
        // Extremely simplified ADX calc (just to show concept)
        const ranges = [];
        for (let i = 1; i < 14; i++) {
            ranges.push(Math.abs(highs[closes.length - i] - lows[closes.length - i]));
        }
        const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
        const normADX = (avgRange / lastClose) * 100; // Not a real ADX, just conceptual
        const adxValue = Math.min(100, normADX * 5); // Scale to something ADX-like
        
        indicators["ADX (14)"] = adxValue.toFixed(2);
        let trendStrength = "Weak";
        if (adxValue > 50) trendStrength = "Strong";
        else if (adxValue > 25) trendStrength = "Moderate";
        indicators["ADX (14)"] += ` (${trendStrength} Trend)`;
    } else {
        indicators["ADX (14)"] = "N/A";
    }
    
    // Ichimoku Cloud (extremely simplified)
    if (closes.length >= 52) {
        const tenkanPeriod = 9;
        const kijunPeriod = 26;
        
        // Tenkan-sen (Conversion Line): (highest high + lowest low) / 2 for past 9 periods
        const tenkanHighs = highs.slice(-tenkanPeriod);
        const tenkanLows = lows.slice(-tenkanPeriod);
        const tenkan = (Math.max(...tenkanHighs) + Math.min(...tenkanLows)) / 2;
        
        // Kijun-sen (Base Line): (highest high + lowest low) / 2 for past 26 periods
        const kijunHighs = highs.slice(-kijunPeriod);
        const kijunLows = lows.slice(-kijunPeriod);
        const kijun = (Math.max(...kijunHighs) + Math.min(...kijunLows)) / 2;
        
        // Simplified signal
        let signal = "Neutral";
        if (tenkan > kijun && lastClose > tenkan) signal = "↗️ Bullish";
        else if (tenkan < kijun && lastClose < tenkan) signal = "↘️ Bearish";
        
        indicators["Ichimoku Cloud"] = `Tenkan: ${tenkan.toFixed(2)}, Kijun: ${kijun.toFixed(2)} (${signal})`;
    } else {
        indicators["Ichimoku Cloud"] = "N/A";
    }
    
    // Parabolic SAR (very simplified)
    if (closes.length >= 10) {
        // Simple approximation using recent highs/lows
        const isUptrend = closes[closes.length - 1] > closes[closes.length - 5];
        const sar = isUptrend ? Math.min(...lows.slice(-5)) * 0.99 : Math.max(...highs.slice(-5)) * 1.01;
        
        indicators["Parabolic SAR"] = sar.toFixed(2);
        indicators["Parabolic SAR"] += isUptrend ? " (↗️ Bullish)" : " (↘️ Bearish)";
    } else {
        indicators["Parabolic SAR"] = "N/A";
    }
    
    // --- Momentum Indicators ---
    
    // RSI (Relative Strength Index)
    if (closes.length >= 15) {
        // Simplified RSI calculation
        let gains = 0;
        let losses = 0;
        let sumGains = 0;
        let sumLosses = 0;
        
        for (let i = closes.length - 14; i < closes.length; i++) {
            const diff = closes[i] - closes[i - 1];
            if (diff > 0) {
                gains++;
                sumGains += diff;
            } else if (diff < 0) {
                losses++;
                sumLosses += Math.abs(diff);
            }
        }
        
        const avgGain = sumGains / 14;
        const avgLoss = sumLosses / 14;
        const relativeStrength = avgLoss === 0 ? 100 : avgGain / avgLoss;
        const rsi = 100 - (100 / (1 + relativeStrength));
        
        indicators["RSI (14)"] = rsi.toFixed(2);
        
        // Add interpretation
        let rsiSignal = "Neutral";
        if (rsi > 70) rsiSignal = "⚠️ Overbought";
        else if (rsi < 30) rsiSignal = "⚠️ Oversold";
        indicators["RSI (14)"] += ` (${rsiSignal})`;
    } else {
        indicators["RSI (14)"] = "N/A";
    }
    
    // Stochastic Oscillator
    if (closes.length >= 14) {
        const periodsK = 14;
        const periodsD = 3;
        
        const recentLows = lows.slice(-periodsK);
        const recentHighs = highs.slice(-periodsK);
        const lowestLow = Math.min(...recentLows);
        const highestHigh = Math.max(...recentHighs);
        
        // %K calculation
        const range = highestHigh - lowestLow;
        let k = range === 0 ? 50 : ((lastClose - lowestLow) / range) * 100;
        k = Math.max(0, Math.min(100, k)); // Bound between 0-100
        
        // Simplified %D calculation (moving average of %K)
        let d = k; // Simplified, should be average of last 3 %K values
        
        indicators["Stochastic (14,3)"] = `%K: ${k.toFixed(2)}, %D: ${d.toFixed(2)}`;
        
        // Add interpretation
        let stochSignal = "Neutral";
        if (k > 80) stochSignal = "⚠️ Overbought";
        else if (k < 20) stochSignal = "⚠️ Oversold";
        indicators["Stochastic (14,3)"] += ` (${stochSignal})`;
    } else {
        indicators["Stochastic (14,3)"] = "N/A";
    }
    
    // MACD (Moving Average Convergence Divergence)
    if (closes.length >= 26) {
        // Simplified MACD
        const ema12 = calculateEMA(closes, 12);
        const ema26 = calculateEMA(closes, 26);
        const macd = ema12 - ema26;
        
        // Simplified signal line (9-period EMA of MACD)
        const signal = macd; // Simplified - should be EMA(MACD, 9)
        const histogram = macd - signal;
        
        indicators["MACD"] = `${macd.toFixed(2)} / Signal: ${signal.toFixed(2)}`;
        
        // Add interpretation
        let macdSignal = "Neutral";
        if (macd > signal) macdSignal = "↗️ Bullish";
        else if (macd < signal) macdSignal = "↘️ Bearish";
        indicators["MACD"] += ` (${macdSignal})`;
    } else {
        indicators["MACD"] = "N/A";
    }
    
    // CCI (Commodity Channel Index)
    if (closes.length >= 20) {
        // Calculate typical price for the last 20 candles
        const typicalPrices = [];
        for (let i = closes.length - 20; i < closes.length; i++) {
            // Typical Price = (High + Low + Close) / 3
            const typicalPrice = (highs[i] + lows[i] + closes[i]) / 3;
            typicalPrices.push(typicalPrice);
        }
        
        // Calculate simple moving average of typical price
        const smaTP = typicalPrices.reduce((a, b) => a + b, 0) / typicalPrices.length;
        
        // Calculate mean deviation
        let meanDeviation = 0;
        for (const tp of typicalPrices) {
            meanDeviation += Math.abs(tp - smaTP);
        }
        meanDeviation /= typicalPrices.length;
        
        // Calculate CCI
        const constantFactor = 0.015; // Standard CCI constant
        const lastTP = (lastHigh + lastLow + lastClose) / 3;
        const cci = meanDeviation === 0 ? 0 : (lastTP - smaTP) / (constantFactor * meanDeviation);
        
        indicators["CCI (20)"] = cci.toFixed(2);
        
        // Add interpretation
        let cciSignal = "Neutral";
        if (cci > 100) cciSignal = "⚠️ Overbought";
        else if (cci < -100) cciSignal = "⚠️ Oversold";
        indicators["CCI (20)"] += ` (${cciSignal})`;
    } else {
        indicators["CCI (20)"] = "N/A";
    }
    
    // --- Volatility Indicators ---
    
    // Bollinger Bands
    if (closes.length >= 20) {
        const periodCloses = closes.slice(-20);
        const ma20 = periodCloses.reduce((a, b) => a + b, 0) / 20;
        const variance = periodCloses.reduce((a, b) => a + Math.pow(b - ma20, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        const upperBand = ma20 + (stdDev * 2);
        const lowerBand = ma20 - (stdDev * 2);
        
        indicators["Bollinger Bands"] = `Upper: ${upperBand.toFixed(2)}, Middle: ${ma20.toFixed(2)}, Lower: ${lowerBand.toFixed(2)}`;
        
        // Add interpretation
        let bbSignal = "Neutral";
        const bandWidth = ((upperBand - lowerBand) / ma20) * 100;
        if (lastClose > upperBand) bbSignal = "⚠️ Above Upper Band";
        else if (lastClose < lowerBand) bbSignal = "⚠️ Below Lower Band";
        
        // Check for squeeze (low volatility)
        if (bandWidth < 5) bbSignal = "🔄 Squeeze (Low Volatility)";
        
        indicators["Bollinger Bands"] += ` (${bbSignal})`;
    } else {
        indicators["Bollinger Bands"] = "N/A";
    }
    
    // ATR (Average True Range)
    if (closes.length >= 15) {
        const trueRanges = [];
        for (let i = closes.length - 14; i < closes.length; i++) {
            // Current high - current low
            const range1 = highs[i] - lows[i];
            // Current high - previous close (absolute)
            const range2 = Math.abs(highs[i] - closes[i - 1]);
            // Current low - previous close (absolute)
            const range3 = Math.abs(lows[i] - closes[i - 1]);
            
            // True Range is the max of these three
            const tr = Math.max(range1, range2, range3);
            trueRanges.push(tr);
        }
        
        // Calculate ATR as average of true ranges
        const atr = trueRanges.reduce((a, b) => a + b, 0) / trueRanges.length;
        
        // Express ATR as percentage of price for easier interpretation
        const atrPercent = (atr / lastClose) * 100;
        
        indicators["ATR (14)"] = atr.toFixed(2);
        
        // Add interpretation
        let volatilityLevel = "Low";
        if (atrPercent > 5) volatilityLevel = "Very High";
        else if (atrPercent > 3) volatilityLevel = "High";
        else if (atrPercent > 1.5) volatilityLevel = "Moderate";
        
        indicators["ATR (14)"] += ` (${volatilityLevel} Volatility, ${atrPercent.toFixed(2)}%)`;
    } else {
        indicators["ATR (14)"] = "N/A";
    }
    
    // --- Volume Indicators ---
    
    // OBV (On Balance Volume)
    if (closes.length >= 2 && volumes.length >= 2) {
        let obv = volumes[0]; // Start with first volume
        
        for (let i = 1; i < closes.length; i++) {
            if (closes[i] > closes[i - 1]) {
                // If price went up, add volume
                obv += volumes[i];
            } else if (closes[i] < closes[i - 1]) {
                // If price went down, subtract volume
                obv -= volumes[i];
            }
            // If price unchanged, OBV doesn't change
        }
        
        indicators["OBV"] = formatWithCommas(Math.round(obv));
        
        // Add trend interpretation (simplified)
        // Compare current OBV with OBV 10 periods ago
        const recentChange = volumes.slice(-10).reduce((a, b, i) => {
            const sign = closes[closes.length - 10 + i] > closes[closes.length - 10 + i - 1] ? 1 : -1;
            return a + (sign * b);
        }, 0);
        
        let obvSignal = "Neutral";
        if (recentChange > 0) obvSignal = "↗️ Bullish";
        else if (recentChange < 0) obvSignal = "↘️ Bearish";
        
        indicators["OBV"] += ` (${obvSignal})`;
    } else {
        indicators["OBV"] = "N/A";
    }
    
    // Volume Moving Average
    if (volumes.length >= 20) {
        const volMA = volumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
        const lastVol = volumes[volumes.length - 1];
        const volRatio = lastVol / volMA;
        
        indicators["Volume MA (20)"] = formatWithCommas(Math.round(volMA));
        
        // Add interpretation
        let volSignal = "Average";
        if (volRatio > 2) volSignal = "⚠️ Very High (+100%)";
        else if (volRatio > 1.5) volSignal = "High (+50%)";
        else if (volRatio < 0.5) volSignal = "Low (-50%)";
        
        indicators["Volume MA (20)"] += ` (${volSignal})`;
    } else {
        indicators["Volume MA (20)"] = "N/A";
    }
    
    // --- Support/Resistance ---
    
    // Fibonacci Levels - simplified, based on recent high/low
    if (closes.length >= 20) {
        // Find high and low in recent price action
        const recentHigh = Math.max(...highs.slice(-20));
        const recentLow = Math.min(...lows.slice(-20));
        const range = recentHigh - recentLow;
        
        // Calculate Fibonacci levels
        const fib382 = recentHigh - (range * 0.382);
        const fib50 = recentHigh - (range * 0.5);
        const fib618 = recentHigh - (range * 0.618);
        
        // Determine if price is near any level (within 1%)
        const fibThreshold = range * 0.01;
        let nearestLevel = "None";
        let distance = Number.MAX_VALUE;
        
        if (Math.abs(lastClose - fib382) < distance) {
            distance = Math.abs(lastClose - fib382);
            nearestLevel = "38.2%";
        }
        if (Math.abs(lastClose - fib50) < distance) {
            distance = Math.abs(lastClose - fib50);
            nearestLevel = "50%";
        }
        if (Math.abs(lastClose - fib618) < distance) {
            distance = Math.abs(lastClose - fib618);
            nearestLevel = "61.8%";
        }
        
        indicators["Fibonacci Levels"] = `38.2%: ${fib382.toFixed(2)}, 50%: ${fib50.toFixed(2)}, 61.8%: ${fib618.toFixed(2)}`;
        
        if (distance < fibThreshold) {
            indicators["Fibonacci Levels"] += ` (Near ${nearestLevel})`;
        }
    } else {
        indicators["Fibonacci Levels"] = "N/A";
    }
    
    // Pivot Points - simplified, using classic pivot method
    if (closes.length >= 1 && highs.length >= 1 && lows.length >= 1) {
        // Get recent high, low, close for pivot calculation
        const pivotHigh = highs[highs.length - 1];
        const pivotLow = lows[lows.length - 1];
        const pivotClose = closes[closes.length - 1];
        
        // Calculate pivot point
        const pivot = (pivotHigh + pivotLow + pivotClose) / 3;
        
        // Calculate support and resistance levels
        const r1 = (2 * pivot) - pivotLow;
        const s1 = (2 * pivot) - pivotHigh;
        
        indicators["Pivot Points"] = `Pivot: ${pivot.toFixed(2)}, R1: ${r1.toFixed(2)}, S1: ${s1.toFixed(2)}`;
        
        // Determine if price is near pivot or levels
        let nearLevel = "";
        if (Math.abs(lastClose - pivot) / pivot < 0.005) nearLevel = "At Pivot";
        else if (Math.abs(lastClose - r1) / r1 < 0.005) nearLevel = "Near R1";
        else if (Math.abs(lastClose - s1) / s1 < 0.005) nearLevel = "Near S1";
        
        if (nearLevel) {
            indicators["Pivot Points"] += ` (${nearLevel})`;
        }
    } else {
        indicators["Pivot Points"] = "N/A";
    }
    
    // --- Overall Market Trend ---
    
    // Simple trend assessment
    if (closes.length >= 20) {
        // Check various timeframes
        const shortTrend = closes[closes.length - 1] > closes[closes.length - 5];
        const mediumTrend = closes[closes.length - 1] > closes[closes.length - 10];
        const longTrend = closes[closes.length - 1] > closes[closes.length - 20];
        
        // Count bullish indicators - simple method
        let bullCount = 0;
        let bearCount = 0;
        
        if (shortTrend) bullCount++; else bearCount++;
        if (mediumTrend) bullCount++; else bearCount++;
        if (longTrend) bullCount++; else bearCount++;
        
        // Add key indicator signals
        if (indicators["Moving Average (50)"] && lastClose > parseFloat(indicators["Moving Average (50)"])) bullCount++; else bearCount++;
        if (indicators["Moving Average (200)"] && lastClose > parseFloat(indicators["Moving Average (200)"])) bullCount++; else bearCount++;
        
        let trendSignal = "Neutral";
        if (bullCount >= 4) trendSignal = "↗️ Strong Bullish";
        else if (bullCount === 3) trendSignal = "↗️ Moderately Bullish";
        else if (bearCount >= 4) trendSignal = "↘️ Strong Bearish";
        else if (bearCount === 3) trendSignal = "↘️ Moderately Bearish";
        
        indicators["Price Trend"] = trendSignal;
    } else {
        indicators["Price Trend"] = "Insufficient Data";
    }
    
    return indicators;
}

// Helper function to calculate EMA
function calculateEMA(data: number[], periods: number): number {
    if (data.length < periods) return 0;
    
    const k = 2 / (periods + 1); // Smoothing factor
    let ema = data.slice(0, periods).reduce((a, b) => a + b, 0) / periods; // Start with SMA
    
    for (let i = periods; i < data.length; i++) {
        ema = (data[i] * k) + (ema * (1 - k));
    }
    
    return ema;
}

// Format large numbers with commas
function formatWithCommas(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

    // Calculate indicators
    console.log('[fetchTechnicalIndicators] Calculating technical indicators...');
    const calculatedIndicators = calculateIndicators(ticks);

    // Create default object with all indicators set to "N/A"
    const defaultIndicators: IndicatorsData = {
        "Moving Average (50)": "N/A",
        "Moving Average (200)": "N/A",
        "EMA (21)": "N/A",
        "Ichimoku Cloud": "N/A",
        "ADX (14)": "N/A",
        "Parabolic SAR": "N/A",
        "RSI (14)": "N/A",
        "Stochastic (14,3)": "N/A", 
        "MACD": "N/A",
        "CCI (20)": "N/A",
        "Bollinger Bands": "N/A",
        "ATR (14)": "N/A",
        "OBV": "N/A",
        "Volume MA (20)": "N/A",
        "Fibonacci Levels": "N/A",
        "Pivot Points": "N/A",
        "Price Trend": "N/A",
        lastUpdated: new Date().toLocaleTimeString(),
    };

    // Combine calculated indicators with defaults
    const indicatorsData: IndicatorsData = {
        ...defaultIndicators,
        ...calculatedIndicators,
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
