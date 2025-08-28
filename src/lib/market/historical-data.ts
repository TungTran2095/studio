import { Binance } from 'binance-api-node';
import { createSafeBinanceClient } from '@/actions/binance';

export interface HistoricalDataParams {
  apiKey: string;
  apiSecret: string;
  isTestnet: boolean;
  useDefault: boolean;
  symbols: string[];
  interval: string;
  startTime?: number;
  endTime?: number;
  limit?: number;
}

export interface CandleData {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteVolume: string;
  trades: number;
  buyBaseVolume: string;
  buyQuoteVolume: string;
  ignored: string;
}

export interface PriceData {
  symbol: string;
  prices: number[];
  timestamps: number[];
  volumes: number[];
}

/**
 * Lấy dữ liệu lịch sử giá từ Binance cho nhiều cặp giao dịch
 */
export async function fetchHistoricalPrices(
  params: HistoricalDataParams
): Promise<Record<string, PriceData>> {
  try {
    const { apiKey, apiSecret, isTestnet, useDefault, symbols, interval, startTime, endTime, limit } = params;
    
    const client = await createSafeBinanceClient(apiKey, apiSecret, isTestnet);
    
    const results: Record<string, PriceData> = {};
    
    // Xử lý từng symbol một
    for (const symbol of symbols) {
      // Đảm bảo có USDT nếu chưa có
      const tradingPair = symbol.endsWith('USDT') ? symbol : `${symbol}USDT`;
      
      try {
        const candles = await client.candles({
          symbol: tradingPair,
          interval: interval as any,
          startTime,
          endTime,
          limit
        });
        
        if (candles && candles.length > 0) {
          const prices = candles.map((candle: any) => parseFloat(candle.close));
          const timestamps = candles.map((candle: any) => candle.closeTime);
          const volumes = candles.map((candle: any) => parseFloat(candle.volume));
          
          results[symbol] = {
            symbol,
            prices,
            timestamps,
            volumes
          };
        }
      } catch (error) {
        console.error(`Lỗi khi lấy dữ liệu cho ${tradingPair}:`, error);
      }
    }
    
    return results;
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu lịch sử:', error);
    throw new Error(`Không thể lấy dữ liệu lịch sử: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`);
  }
}

/**
 * Lấy dữ liệu lịch sử cho BTC làm dữ liệu thị trường chuẩn
 */
export async function fetchMarketBenchmarkData(
  params: Omit<HistoricalDataParams, 'symbols'>
): Promise<number[]> {
  try {
    const result = await fetchHistoricalPrices({
      ...params,
      symbols: ['BTC']
    });
    
    return result['BTC']?.prices || [];
  } catch (error) {
    console.error('Lỗi khi lấy dữ liệu chuẩn thị trường:', error);
    return [];
  }
}

/**
 * Tính toán tỷ lệ tương quan giữa các tài sản
 */
export function calculateCorrelationMatrix(historicalPrices: Record<string, PriceData>): Record<string, Record<string, number>> {
  const symbols = Object.keys(historicalPrices);
  const matrix: Record<string, Record<string, number>> = {};
  
  // Tính toán các mảng lợi nhuận
  const returns: Record<string, number[]> = {};
  
  for (const symbol of symbols) {
    const prices = historicalPrices[symbol].prices;
    returns[symbol] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns[symbol].push(dailyReturn);
    }
  }
  
  // Tính ma trận tương quan
  for (const symbol1 of symbols) {
    matrix[symbol1] = {};
    
    for (const symbol2 of symbols) {
      const correlation = calculateCorrelation(returns[symbol1], returns[symbol2]);
      matrix[symbol1][symbol2] = correlation;
    }
  }
  
  return matrix;
}

/**
 * Tính hệ số tương quan Pearson giữa hai dãy số
 */
function calculateCorrelation(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  
  if (length === 0) return 0;
  
  // Tính giá trị trung bình
  const meanA = a.slice(0, length).reduce((sum, val) => sum + val, 0) / length;
  const meanB = b.slice(0, length).reduce((sum, val) => sum + val, 0) / length;
  
  // Tính tử số và mẫu số
  let numerator = 0;
  let denominatorA = 0;
  let denominatorB = 0;
  
  for (let i = 0; i < length; i++) {
    const diffA = a[i] - meanA;
    const diffB = b[i] - meanB;
    
    numerator += diffA * diffB;
    denominatorA += diffA * diffA;
    denominatorB += diffB * diffB;
  }
  
  // Tránh chia cho 0
  if (denominatorA === 0 || denominatorB === 0) return 0;
  
  return numerator / Math.sqrt(denominatorA * denominatorB);
}

/**
 * Phát hiện xu hướng từ dữ liệu lịch sử
 */
export function detectTrend(priceData: PriceData): 'uptrend' | 'downtrend' | 'sideways' {
  const prices = priceData.prices;
  
  if (prices.length < 10) return 'sideways'; // Không đủ dữ liệu
  
  // Tính giá trung bình động đơn giản 20 ngày
  const sma20 = calculateSMA(prices, 20);
  // Tính giá trung bình động đơn giản 50 ngày
  const sma50 = calculateSMA(prices, 50);
  
  // Lấy giá trị mới nhất
  const latestSMA20 = sma20[sma20.length - 1];
  const latestSMA50 = sma50[sma50.length - 1];
  
  // Lấy giá trị 5 ngày trước
  const prevSMA20 = sma20[sma20.length - 6] || sma20[0];
  const prevSMA50 = sma50[sma50.length - 6] || sma50[0];
  
  // Xác định xu hướng dựa vào đường trung bình động
  if (latestSMA20 > latestSMA50 && prevSMA20 < prevSMA50) {
    return 'uptrend'; // Vừa cắt lên, xu hướng tăng
  } else if (latestSMA20 < latestSMA50 && prevSMA20 > prevSMA50) {
    return 'downtrend'; // Vừa cắt xuống, xu hướng giảm
  } else if (latestSMA20 > latestSMA50 && latestSMA20 > prevSMA20 && latestSMA50 > prevSMA50) {
    return 'uptrend'; // Đang trong xu hướng tăng
  } else if (latestSMA20 < latestSMA50 && latestSMA20 < prevSMA20 && latestSMA50 < prevSMA50) {
    return 'downtrend'; // Đang trong xu hướng giảm
  } else {
    return 'sideways'; // Đi ngang
  }
}

/**
 * Tính giá trung bình động đơn giản (SMA)
 */
function calculateSMA(data: number[], period: number): number[] {
  const result: number[] = [];
  
  if (data.length < period) {
    // Không đủ dữ liệu, trả về mảng rỗng
    return result;
  }
  
  // Tính tổng giá trị của cửa sổ đầu tiên
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  
  // Tính giá trị SMA đầu tiên
  result.push(sum / period);
  
  // Tính các giá trị SMA tiếp theo
  for (let i = period; i < data.length; i++) {
    sum = sum - data[i - period] + data[i];
    result.push(sum / period);
  }
  
  return result;
}

/**
 * Tính giá trung bình động hàm mũ (EMA)
 */
export function calculateEMA(data: number[], period: number): number[] {
  const result: number[] = [];
  
  if (data.length < period) {
    return result;
  }
  
  // Tính SMA đầu tiên
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  
  // EMA đầu tiên là SMA đầu tiên
  const firstEMA = sum / period;
  result.push(firstEMA);
  
  // Hệ số
  const multiplier = 2 / (period + 1);
  
  // Tính các EMA tiếp theo
  let prevEMA = firstEMA;
  for (let i = period; i < data.length; i++) {
    const ema = (data[i] - prevEMA) * multiplier + prevEMA;
    result.push(ema);
    prevEMA = ema;
  }
  
  return result;
}

/**
 * Tính chỉ báo Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], period: number = 14): number[] {
  const result: number[] = [];
  const changes: number[] = [];
  
  // Tính các thay đổi giá
  for (let i = 1; i < prices.length; i++) {
    changes.push(prices[i] - prices[i - 1]);
  }
  
  if (changes.length < period) {
    return result;
  }
  
  // Tính giá trị RSI đầu tiên
  let sumGain = 0;
  let sumLoss = 0;
  
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      sumGain += changes[i];
    } else {
      sumLoss += Math.abs(changes[i]);
    }
  }
  
  let avgGain = sumGain / period;
  let avgLoss = sumLoss / period;
  
  // Tránh chia cho 0
  if (avgLoss === 0) {
    result.push(100);
  } else {
    const rs = avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }
  
  // Tính các giá trị RSI tiếp theo
  for (let i = period; i < changes.length; i++) {
    const change = changes[i];
    let currentGain = 0;
    let currentLoss = 0;
    
    if (change >= 0) {
      currentGain = change;
    } else {
      currentLoss = Math.abs(change);
    }
    
    // Sử dụng công thức Wilder's smoothing
    avgGain = ((avgGain * (period - 1)) + currentGain) / period;
    avgLoss = ((avgLoss * (period - 1)) + currentLoss) / period;
    
    if (avgLoss === 0) {
      result.push(100);
    } else {
      const rs = avgGain / avgLoss;
      result.push(100 - (100 / (1 + rs)));
    }
  }
  
  return result;
} 