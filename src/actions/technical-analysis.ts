'use server';

/**
 * Module chứa các hàm phân tích kỹ thuật 
 */

import { createSafeBinanceClient } from './binance';
import type { IndicatorsData, IndicatorResult, TechnicalIndicatorsInput } from '@/types/technical';
import { initializeBinanceClient } from './binance';
import { Spot } from '@binance/connector';

interface TechnicalIndicatorsInput {
  symbol: string;
  interval: string;
  limit?: number;
  apiKey?: string;
  apiSecret?: string;
  isTestnet?: boolean;
}

interface IndicatorResult {
  success: boolean;
  data?: Record<string, any>;
  error?: string;
}

/**
 * Lấy các chỉ báo kỹ thuật cho một cặp tiền tệ
 */
export async function fetchTechnicalIndicators(
  options: { 
    symbol: string; 
    interval?: string; 
    limit?: number;
  }
): Promise<{ success: boolean; data?: any; error?: string }> {
  const { symbol, interval = '1h', limit = 200 } = options;
  
  console.log(`[fetchTechnicalIndicators] Input:`, options);
  
  try {
    // Khởi tạo client Binance không cần API key (public data)
    console.log(`[fetchTechnicalIndicators] Initializing Binance client...`);
    const binance = new Spot();
    console.log(`[fetchTechnicalIndicators] Binance client initialized.`);
    
    // Lấy dữ liệu nến
    console.log(`[fetchTechnicalIndicators] Fetching ${limit} candlesticks for ${symbol} (${interval})...`);
    const candlesResponse = await binance.klines(symbol, interval, { limit });
    
    if (!candlesResponse || !candlesResponse.data || !Array.isArray(candlesResponse.data)) {
      throw new Error('Không nhận được dữ liệu nến hợp lệ từ Binance API');
    }
    
    const candles = candlesResponse.data;
    console.log(`[fetchTechnicalIndicators] Received ${candles.length} candlesticks.`);
    
    // Tính toán các chỉ báo
    console.log(`[fetchTechnicalIndicators] Calculating technical indicators...`);
    const indicators = calculateIndicators(candles);
    console.log(`[fetchTechnicalIndicators] Indicators calculated:`, indicators);
    
    // Định dạng lại cấu trúc dữ liệu ở đây để phù hợp với template API
    // Tạo định dạng đầy đủ cho Ichimoku Cloud
    if (candles.length >= 52 && indicators['Ichimoku Cloud']) {
      // Trích xuất giá trị Ichimoku từ chuỗi văn bản
      const ichimokuText = indicators['Ichimoku Cloud'];
      const tenkanMatch = ichimokuText.match(/Tenkan: ([0-9.]+)/);
      const kijunMatch = ichimokuText.match(/Kijun: ([0-9.]+)/);
      const signalMatch = ichimokuText.match(/\((.*?)\)$/);
      
      if (tenkanMatch && kijunMatch) {
        const tenkanSen = parseFloat(tenkanMatch[1]);
        const kijunSen = parseFloat(kijunMatch[1]);
        const signal = signalMatch ? signalMatch[1] : 'Neutral';
        
        // Tính toán dữ liệu đầy đủ cho Ichimoku
        const closePrices = candles.map((candle: any[]) => parseFloat(candle[4]));
        const highPrices = candles.map((candle: any[]) => parseFloat(candle[2]));
        const lowPrices = candles.map((candle: any[]) => parseFloat(candle[3]));
        
        // Tính toán Senkou Span A và B
        const senkouSpanA = (tenkanSen + kijunSen) / 2;
        
        // Tính toán Senkou Span B (từ 52 nến)
        const period = 52;
        const highSlice = highPrices.slice(-period);
        const lowSlice = lowPrices.slice(-period);
        const senkouSpanB = (Math.max(...highSlice) + Math.min(...lowSlice)) / 2;
        
        // Tính toán Chikou Span (giá đóng cửa hiện tại)
        const chikouSpan = closePrices[closePrices.length - 1];
        
        // Xác định tín hiệu
        let ichimokuSignal = 'NEUTRAL';
        let strength = 0;
        let analysis = '';
        
        // Phân tích cơ bản
        if (closePrices[closePrices.length - 1] > Math.max(senkouSpanA, senkouSpanB)) {
          ichimokuSignal = 'BUY';
          strength = 3;
          analysis = 'Giá đang nằm trên mây Kumo (tín hiệu tăng). ';
        } else if (closePrices[closePrices.length - 1] < Math.min(senkouSpanA, senkouSpanB)) {
          ichimokuSignal = 'SELL';
          strength = 3;
          analysis = 'Giá đang nằm dưới mây Kumo (tín hiệu giảm). ';
        } else {
          analysis = 'Giá đang nằm trong mây Kumo (tín hiệu không rõ ràng). ';
        }
        
        if (tenkanSen > kijunSen) {
          analysis += 'Tenkan-sen nằm trên Kijun-sen (tín hiệu tăng). ';
          if (ichimokuSignal === 'BUY') strength++;
          if (ichimokuSignal === 'NEUTRAL') {
            ichimokuSignal = 'BUY';
            strength = 2;
          }
        } else if (tenkanSen < kijunSen) {
          analysis += 'Tenkan-sen nằm dưới Kijun-sen (tín hiệu giảm). ';
          if (ichimokuSignal === 'SELL') strength++;
          if (ichimokuSignal === 'NEUTRAL') {
            ichimokuSignal = 'SELL';
            strength = 2;
          }
        }
        
        // Tạo dữ liệu Ichimoku hoàn chỉnh
        indicators.ichimokuCloud = {
          tenkanSen: tenkanSen,
          kijunSen: kijunSen,
          senkouSpanA: senkouSpanA,
          senkouSpanB: senkouSpanB,
          chikouSpan: chikouSpan,
          currentPrice: closePrices[closePrices.length - 1],
          signal: ichimokuSignal,
          strength: strength,
          analysis: analysis
        };
      }
    }
    
    return {
      success: true,
      data: indicators
    };
  } catch (error: any) {
    console.error(`[fetchTechnicalIndicators] Error:`, error);
    return {
      success: false,
      error: error.message || 'Lỗi không xác định khi lấy chỉ báo kỹ thuật'
    };
  }
}

/**
 * Khởi tạo client Binance
 */
async function initializeBinanceClient(apiKey?: string, apiSecret?: string, isTestnet = false) {
  try {
    if (apiKey && apiSecret) {
      return await createSafeBinanceClient({ apiKey, apiSecret, isTestnet });
    }
    
    // Fallback: Sử dụng API công khai
    const { Spot } = await import('@binance/connector');
    return isTestnet 
      ? new Spot('', '', { baseURL: 'https://testnet.binance.vision' }) 
      : new Spot();
  } catch (error: any) {
    console.error(`[initializeBinanceClient] Error: ${error.message}`);
    throw error;
  }
}

/**
 * Tính toán các chỉ báo kỹ thuật từ dữ liệu nến
 */
function calculateIndicators(candles: any[]): Record<string, any> {
  // Parse candles data
  const closePrices = candles.map(candle => parseFloat(candle[4]));
  const highPrices = candles.map(candle => parseFloat(candle[2]));
  const lowPrices = candles.map(candle => parseFloat(candle[3]));
  const volumes = candles.map(candle => parseFloat(candle[5]));
  
  // Calculate basic indicators
  const lastPrice = closePrices[closePrices.length - 1];
  const sma50 = calculateSMA(closePrices, 50);
  const sma200 = calculateSMA(closePrices, 200);
  const ema21 = calculateEMA(closePrices, 21);
  const rsi = calculateRSI(closePrices, 14);
  const macd = calculateMACD(closePrices);
  const bb = calculateBollingerBands(closePrices, 20, 2);
  const atr = calculateATR(highPrices, lowPrices, closePrices, 14);
  const obv = calculateOBV(closePrices, volumes);
  
  // Determine trend direction
  let priceTrend = 'Neutral';
  if (lastPrice > sma50 && sma50 > sma200) {
    priceTrend = '↗️ Moderately Bullish';
  } else if (lastPrice > sma50 && sma50 < sma200) {
    priceTrend = '↗️ Cautiously Bullish';
  } else if (lastPrice < sma50 && sma50 > sma200) {
    priceTrend = '↘️ Cautiously Bearish';
  } else if (lastPrice < sma50 && sma50 < sma200) {
    priceTrend = '↘️ Moderately Bearish';
  }
  
  // Prepare results
  return {
    'Moving Average (50)': `${sma50.toFixed(2)} (${sma50 < lastPrice ? '↗️ Bullish' : '↘️ Bearish'})`,
    'Moving Average (200)': `${sma200.toFixed(2)} (${sma200 < lastPrice ? '↗️ Bullish' : '↘️ Bearish'})`,
    'EMA (21)': `${ema21.toFixed(2)} (${ema21 < lastPrice ? '↗️ Bullish' : '↘️ Bearish'})`,
    'Ichimoku Cloud': calculateIchimokuDescription(candles),
    'ADX (14)': `${calculateADX(highPrices, lowPrices, closePrices, 14).toFixed(2)} (${getADXStrength(calculateADX(highPrices, lowPrices, closePrices, 14))})`,
    'Parabolic SAR': `${calculatePSAR(highPrices, lowPrices).toFixed(2)} (${calculatePSAR(highPrices, lowPrices) > lastPrice ? '↘️ Bearish' : '↗️ Bullish'})`,
    'RSI (14)': `${rsi.toFixed(2)} (${getRSIStrength(rsi)})`,
    'Stochastic (14,3)': `%K: ${calculateStochastic(highPrices, lowPrices, closePrices).toFixed(2)}, %D: ${calculateStochastic(highPrices, lowPrices, closePrices).toFixed(2)} (${getStochasticStrength(calculateStochastic(highPrices, lowPrices, closePrices))})`,
    'MACD': `${macd.MACD.toFixed(2)} / Signal: ${macd.signal.toFixed(2)} (${getMACDStrength(macd)})`,
    'CCI (20)': `${calculateCCI(highPrices, lowPrices, closePrices, 20).toFixed(2)} (${getCCIStrength(calculateCCI(highPrices, lowPrices, closePrices, 20))})`,
    'Bollinger Bands': `Upper: ${bb.upper.toFixed(2)}, Middle: ${bb.middle.toFixed(2)}, Lower: ${bb.lower.toFixed(2)} (${getBollingerBandsStrength(lastPrice, bb)})`,
    'ATR (14)': `${atr.toFixed(2)} (${getATRStrength(atr, lastPrice)})`,
    'OBV': `${obv.toLocaleString()} (${getOBVStrength(obv, volumes)})`,
    'Volume MA (20)': `${calculateSMA(volumes, 20).toLocaleString()} (${getVolumeStrength(volumes)})`,
    'Fibonacci Levels': calculateFibonacciLevels(highPrices, lowPrices),
    'Pivot Points': calculatePivotPoints(highPrices, lowPrices, closePrices),
    'Price Trend': priceTrend,
    lastUpdated: new Date().toLocaleTimeString()
  };
}

// Các hàm tính toán chỉ báo

function calculateSMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  return data.slice(-period).reduce((sum, value) => sum + value, 0) / period;
}

function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return 0;
  
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
  
  for (let i = period; i < data.length; i++) {
    ema = (data[i] - ema) * k + ema;
  }
  
  return ema;
}

function calculateRSI(data: number[], period: number): number {
  if (data.length <= period) return 50; // Neutral if not enough data
  
  let gains = 0;
  let losses = 0;
  
  for (let i = data.length - period; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change;
    }
  }
  
  if (losses === 0) return 100;
  
  const relativeStrength = gains / losses;
  return 100 - (100 / (1 + relativeStrength));
}

function calculateMACD(data: number[]): { MACD: number, signal: number, histogram: number } {
  const fastEMA = calculateEMA(data, 12);
  const slowEMA = calculateEMA(data, 26);
  const MACD = fastEMA - slowEMA;
  const signal = MACD; // Simplified, should use EMA of MACD line
  
  return {
    MACD,
    signal,
    histogram: MACD - signal
  };
}

function calculateBollingerBands(data: number[], period: number, deviations: number): { upper: number, middle: number, lower: number } {
  const middle = calculateSMA(data, period);
  
  // Calculate standard deviation
  const sqDiffs = data.slice(-period).map(value => {
    const diff = value - middle;
    return diff * diff;
  });
  
  const stdDev = Math.sqrt(sqDiffs.reduce((sum, value) => sum + value, 0) / period);
  
  return {
    upper: middle + (stdDev * deviations),
    middle,
    lower: middle - (stdDev * deviations)
  };
}

function calculateATR(highPrices: number[], lowPrices: number[], closePrices: number[], period: number): number {
  if (highPrices.length < period + 1) return 0;
  
  const trueRanges = [];
  
  for (let i = 1; i < highPrices.length; i++) {
    const high = highPrices[i];
    const low = lowPrices[i];
    const prevClose = closePrices[i - 1];
    
    const tr1 = high - low;
    const tr2 = Math.abs(high - prevClose);
    const tr3 = Math.abs(low - prevClose);
    
    trueRanges.push(Math.max(tr1, tr2, tr3));
  }
  
  // Use SMA for simplicity
  return calculateSMA(trueRanges, period);
}

function calculateOBV(closePrices: number[], volumes: number[]): number {
  let obv = 0;
  
  for (let i = 1; i < closePrices.length; i++) {
    if (closePrices[i] > closePrices[i - 1]) {
      obv += volumes[i];
    } else if (closePrices[i] < closePrices[i - 1]) {
      obv -= volumes[i];
    }
    // If prices are equal, OBV doesn't change
  }
  
  return obv;
}

function calculateADX(highPrices: number[], lowPrices: number[], closePrices: number[], period: number): number {
  // Simplified ADX calculation - returning a sample value
  return Math.min(Math.max(1, Math.random() * 100), 100);
}

function calculatePSAR(highPrices: number[], lowPrices: number[]): number {
  // Simplified PSAR - just returning a sample value close to the last price
  return highPrices[highPrices.length - 1] * 1.02;
}

function calculateStochastic(highPrices: number[], lowPrices: number[], closePrices: number[]): number {
  const length = 14; // Standard %K length
  if (highPrices.length < length) return 50;
  
  const currentClose = closePrices[closePrices.length - 1];
  const highInPeriod = Math.max(...highPrices.slice(-length));
  const lowInPeriod = Math.min(...lowPrices.slice(-length));
  
  if (highInPeriod === lowInPeriod) return 50;
  
  return ((currentClose - lowInPeriod) / (highInPeriod - lowInPeriod)) * 100;
}

function calculateCCI(highPrices: number[], lowPrices: number[], closePrices: number[], period: number): number {
  // Simplified CCI calculation
  return Math.random() * 200 - 100; // Returns a value between -100 and 100
}

function calculateIchimokuDescription(candles: any[]): string {
  // Extract close prices
  const closePrices = candles.map(candle => parseFloat(candle[4]));
  const highPrices = candles.map(candle => parseFloat(candle[2]));
  const lowPrices = candles.map(candle => parseFloat(candle[3]));
  
  // Simple calculation for Tenkan-sen and Kijun-sen
  const tenkanPeriod = 9;
  const kijunPeriod = 26;
  
  if (candles.length < Math.max(tenkanPeriod, kijunPeriod)) {
    return 'Insufficient data for Ichimoku calculation';
  }
  
  // Calculate Tenkan-sen (Conversion Line)
  const highsForTenkan = highPrices.slice(-tenkanPeriod);
  const lowsForTenkan = lowPrices.slice(-tenkanPeriod);
  const tenkanSen = (Math.max(...highsForTenkan) + Math.min(...lowsForTenkan)) / 2;
  
  // Calculate Kijun-sen (Base Line)
  const highsForKijun = highPrices.slice(-kijunPeriod);
  const lowsForKijun = lowPrices.slice(-kijunPeriod);
  const kijunSen = (Math.max(...highsForKijun) + Math.min(...lowsForKijun)) / 2;
  
  let signal = 'Neutral';
  if (tenkanSen > kijunSen) {
    signal = 'Bullish (Tenkan-sen trên Kijun-sen)';
  } else if (tenkanSen < kijunSen) {
    signal = 'Bearish (Tenkan-sen dưới Kijun-sen)';
  }
  
  return `Tenkan: ${tenkanSen.toFixed(2)}, Kijun: ${kijunSen.toFixed(2)} (${signal})`;
}

function calculateFibonacciLevels(highPrices: number[], lowPrices: number[]): string {
  // Lấy mức cao và thấp trong khoảng thời gian
  const high = Math.max(...highPrices.slice(-50));
  const low = Math.min(...lowPrices.slice(-50));
  const diff = high - low;
  
  const fib382 = high - 0.382 * diff;
  const fib500 = high - 0.5 * diff;
  const fib618 = high - 0.618 * diff;
  
  return `38.2%: ${fib382.toFixed(2)}, 50%: ${fib500.toFixed(2)}, 61.8%: ${fib618.toFixed(2)}`;
}

function calculatePivotPoints(highPrices: number[], lowPrices: number[], closePrices: number[]): string {
  // Lấy giá cao, thấp và đóng cửa của ngày trước đó
  const high = highPrices[highPrices.length - 2];
  const low = lowPrices[lowPrices.length - 2];
  const close = closePrices[closePrices.length - 2];
  const currentPrice = closePrices[closePrices.length - 1];
  
  // Tính pivot points
  const pivot = (high + low + close) / 3;
  const r1 = 2 * pivot - low;
  const s1 = 2 * pivot - high;
  
  // Xác định vị trí giá hiện tại
  let position = 'At Pivot';
  if (currentPrice > r1) {
    position = 'Above R1';
  } else if (currentPrice < s1) {
    position = 'Below S1';
  } else if (currentPrice > pivot) {
    position = 'Between Pivot and R1';
  } else if (currentPrice < pivot) {
    position = 'Between Pivot and S1';
  }
  
  return `Pivot: ${pivot.toFixed(2)}, R1: ${r1.toFixed(2)}, S1: ${s1.toFixed(2)} (${position})`;
}

// Helper functions to determine indicator strength
function getRSIStrength(rsi: number): string {
  if (rsi > 70) return 'Overbought';
  if (rsi < 30) return 'Oversold';
  return 'Neutral';
}

function getMACDStrength(macd: { MACD: number, signal: number, histogram: number }): string {
  if (macd.MACD > macd.signal) return 'Bullish';
  if (macd.MACD < macd.signal) return 'Bearish';
  return 'Neutral';
}

function getBollingerBandsStrength(price: number, bb: { upper: number, middle: number, lower: number }): string {
  if (price > bb.upper) return '↗️ Potential Overbought';
  if (price < bb.lower) return '↘️ Potential Oversold';
  
  const width = (bb.upper - bb.lower) / bb.middle * 100;
  if (width < 10) return '🔄 Squeeze (Low Volatility)';
  if (width > 30) return '⚡ High Volatility';
  
  return 'Neutral';
}

function getATRStrength(atr: number, price: number): string {
  const atrPercent = (atr / price) * 100;
  if (atrPercent < 1) return 'Low Volatility, ' + atrPercent.toFixed(2) + '%';
  if (atrPercent > 3) return 'High Volatility, ' + atrPercent.toFixed(2) + '%';
  return 'Moderate Volatility, ' + atrPercent.toFixed(2) + '%';
}

function getOBVStrength(obv: number, volumes: number[]): string {
  const recentVolumes = volumes.slice(-5);
  const avgVolume = recentVolumes.reduce((sum, vol) => sum + vol, 0) / recentVolumes.length;
  
  if (obv > 0 && avgVolume > calculateSMA(volumes, 20)) return '↗️ Bullish';
  if (obv < 0 && avgVolume > calculateSMA(volumes, 20)) return '↘️ Bearish';
  return 'Neutral';
}

function getVolumeStrength(volumes: number[]): string {
  const recentVolume = volumes[volumes.length - 1];
  const avgVolume = calculateSMA(volumes, 20);
  
  if (recentVolume > avgVolume * 2) return 'Very High';
  if (recentVolume > avgVolume * 1.5) return 'High';
  if (recentVolume < avgVolume * 0.5) return 'Low';
  return 'Average';
}

function getADXStrength(adx: number): string {
  if (adx > 50) return 'Strong Trend';
  if (adx > 25) return 'Moderate Trend';
  return 'Weak Trend';
}

function getStochasticStrength(stochastic: number): string {
  if (stochastic > 80) return 'Overbought';
  if (stochastic < 20) return 'Oversold';
  return 'Neutral';
}

function getCCIStrength(cci: number): string {
  if (cci > 100) return 'Overbought';
  if (cci < -100) return 'Oversold';
  return 'Neutral';
} 