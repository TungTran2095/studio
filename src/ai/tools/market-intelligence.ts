'use server';

import { z } from 'zod';
import Binance from 'node-binance-api';
import { TimeSync } from '@/lib/time-sync';

// Định nghĩa cấu trúc dữ liệu cho độ biến động
interface VolatilityData {
  symbol: string;
  hourly: number;
  daily: number;
  weekly: number;
  monthly: number;
  trend: 'up' | 'down' | 'sideways';
  rsi: number;
  recommendation: string;
}

// Định nghĩa cấu trúc dữ liệu cho phân tích thị trường
interface MarketAnalysisResult {
  timestamp: string;
  btcDominance: number;
  marketSentiment: 'bullish' | 'bearish' | 'neutral';
  topGainers: Array<{symbol: string, change: number}>;
  topLosers: Array<{symbol: string, change: number}>;
  volatilityData: VolatilityData[];
  marketSummary: string;
}

// Định nghĩa cấu trúc dữ liệu cho nến (OHLCV)
interface Candle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Định nghĩa cấu trúc dữ liệu cho Bollinger Bands
interface BollingerBands {
  upper: number;
  middle: number;
  lower: number;
  bandwidth: number;
  isSqueezing: boolean;
}

// Định nghĩa cấu trúc dữ liệu cho MACD
interface MACD {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'bullish' | 'bearish' | 'neutral';
}

// Định nghĩa cấu trúc dữ liệu cho mô hình giá
interface PricePattern {
  pattern: string;
  reliability: number; // 0-100%
  potentialProfit: number; // Tiềm năng lợi nhuận ước tính
  stopLoss: number; // Mức cắt lỗ đề xuất
  takeProfit: number; // Mức chốt lời đề xuất
}

// Định nghĩa cấu trúc cho kết quả phân tích kỹ thuật
interface TechnicalAnalysisResult {
  symbol: string;
  timeframe: string;
  timestamp: string;
  price: number;
  indicators: {
    rsi: number;
    macd: MACD;
    bollingerBands: BollingerBands;
    ema20: number;
    ema50: number;
    ema200: number;
  };
  patterns: PricePattern[];
  signals: Array<{
    indicator: string;
    action: 'buy' | 'sell' | 'hold';
    strength: number; // 0-100%
    reason: string;
  }>;
  summary: {
    recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell';
    score: number; // -100 đến 100
    description: string;
  };
}

// Định nghĩa cấu trúc cho kết quả backtesting
export interface BacktestResult {
  // Tab 1: Summary
  summary: {
    symbol: string;
    timeframe: string;
    strategy: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    finalCapital: number;
    profitLoss: number;
    profitLossPercentage: number;
    maxDrawdown: number;
    maxDrawdownPercentage: number;
    totalTrades: number;
    winningTrades: number;
    losingTrades: number;
    winRate: number;
    averageWin: number;
    averageLoss: number;
    sharpeRatio: number;
  };

  // Tab 2: Equity Chart
  equityChart: Array<{
    timestamp: number;
    value: number;
    drawdown: number;
  }>;

  // Tab 3: Trade List
  trades: Array<{
    timestamp: number;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    value: number;
    profitLoss?: number;
    profitLossPercentage?: number;
    reason: string;
  }>;
}

// Định nghĩa cấu trúc dữ liệu cho danh mục đầu tư
interface PortfolioAsset {
  symbol: string;
  weight: number;
  expectedReturn: number;
  volatility: number; // Độ biến động/rủi ro
  correlation: Record<string, number>; // Tương quan với các tài sản khác
}

interface OptimizedPortfolio {
  assets: PortfolioAsset[];
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  diversificationScore: number; // 0-100%
  recommendation: string;
  allocationSummary: string;
}

interface Signal {
  timestamp: number;
  type: 'buy' | 'sell';
  price: number;
  reason: string;
}

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Trade {
  type: 'buy' | 'sell';
  entryPrice: number;
  entryTime: number;
  quantity: number;
  reason: string;
}

interface EquityPoint {
  timestamp: number;
  value: number;
}

// Định nghĩa getSignals trước khi sử dụng
const getSignals = {
  sma_crossover: (data: OHLCV[]): Signal[] => {
    const closes = data.map(d => d.close);
    const sma20 = calculateSMA(closes, 20);
    const sma50 = calculateSMA(closes, 50);
    const signals: Signal[] = [];

    for (let i = 1; i < data.length; i++) {
      if (isNaN(sma20[i]) || isNaN(sma50[i])) continue;

      const prevDiff = sma20[i - 1] - sma50[i - 1];
      const currDiff = sma20[i] - sma50[i];

      if (prevDiff < 0 && currDiff > 0) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          price: data[i].close,
          reason: 'SMA Crossover (Bullish)'
        });
      } else if (prevDiff > 0 && currDiff < 0) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          price: data[i].close,
          reason: 'SMA Crossover (Bearish)'
        });
      }
    }
    return signals;
  },

  macd: (data: OHLCV[]): Signal[] => {
    const closes = data.map(d => d.close);
    const { macd, signal } = calculateMACD(closes);
    const signals: Signal[] = [];

    for (let i = 1; i < data.length; i++) {
      if (isNaN(macd[i]) || isNaN(signal[i])) continue;

      const prevDiff = macd[i - 1] - signal[i - 1];
      const currDiff = macd[i] - signal[i];

      if (prevDiff < 0 && currDiff > 0) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          price: data[i].close,
          reason: 'MACD Crossover (Bullish)'
        });
      } else if (prevDiff > 0 && currDiff < 0) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          price: data[i].close,
          reason: 'MACD Crossover (Bearish)'
        });
      }
    }
    return signals;
  },

  bollinger_bands: (data: OHLCV[]): Signal[] => {
    const closes = data.map(d => d.close);
    const { upper, middle, lower } = calculateBollingerBands(closes);
    const signals: Signal[] = [];

    for (let i = 0; i < data.length; i++) {
      if (isNaN(upper[i]) || isNaN(middle[i]) || isNaN(lower[i])) continue;

      if (data[i].close < lower[i]) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          price: data[i].close,
          reason: 'Price below lower Bollinger Band'
        });
      } else if (data[i].close > upper[i]) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          price: data[i].close,
          reason: 'Price above upper Bollinger Band'
        });
      }
    }
    return signals;
  },

  rsi: (data: OHLCV[]): Signal[] => {
    const closes = data.map(d => d.close);
    const rsi = calculateRSI(closes);
    const signals: Signal[] = [];

    for (let i = 0; i < data.length; i++) {
      if (isNaN(rsi[i])) continue;

      if (rsi[i] < 30) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'buy',
          price: data[i].close,
          reason: 'RSI Oversold'
        });
      } else if (rsi[i] > 70) {
        signals.push({
          timestamp: data[i].timestamp,
          type: 'sell',
          price: data[i].close,
          reason: 'RSI Overbought'
        });
      }
    }
    return signals;
  }
};

// Định nghĩa kiểu cho strategy
type StrategyType = 'sma_crossover' | 'ma_crossover' | 'macd' | 'bollinger_bands' | 'rsi';

/**
 * Lấy phân tích thị trường hiện tại
 */
export async function getMarketAnalysis(
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean = false
): Promise<MarketAnalysisResult> {
  console.log("[getMarketAnalysis] Đang phân tích thị trường");
  
  // Khởi tạo client Binance
  const binance = new Binance().options({
    APIKEY: apiKey,
    APISECRET: apiSecret,
    useServerTime: true,
    test: isTestnet,
    recvWindow: 60000,
    verbose: false,
    urls: {
      base: isTestnet ? 'https://testnet.binance.vision/api/' : 'https://api.binance.com/api/'
    }
  });
  
  try {
    // Đồng bộ hóa thời gian
    TimeSync.adjustOffset(-5000);

    // Lấy dữ liệu ticker cho tất cả các cặp tiền tệ
    const tickers = await binance.prices();
    const tickerStats = await binance.prevDay();

    // Tính toán BTC Dominance (đơn giản hóa)
    let btcPrice = parseFloat(tickers['BTCUSDT'] || '0');
    let btcDominance = 0.42; // Giá trị gần đúng, lẽ ra cần tính toán phức tạp hơn
    
    // Xử lý danh sách cặp tiền
    const allPairs = Object.keys(tickers).filter(symbol => symbol.endsWith('USDT'));
    
    // Tính toán % thay đổi và sắp xếp
    const pairChanges = allPairs.map(symbol => {
      const stat = tickerStats.find((s: any) => s.symbol === symbol);
      return {
        symbol,
        change: stat ? parseFloat(stat.priceChangePercent) : 0
      };
    }).filter(pair => !isNaN(pair.change));
    
    // Sắp xếp để lấy top tăng/giảm
    pairChanges.sort((a, b) => b.change - a.change);
    const topGainers = pairChanges.slice(0, 5);
    const topLosers = [...pairChanges].sort((a, b) => a.change - b.change).slice(0, 5);
    
    // Tính toán tâm lý thị trường dựa trên số lượng cặp tăng/giảm
    const risingPairs = pairChanges.filter(p => p.change > 0).length;
    const fallingPairs = pairChanges.filter(p => p.change < 0).length;
    
    let marketSentiment: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (risingPairs > fallingPairs * 1.5) marketSentiment = 'bullish';
    else if (fallingPairs > risingPairs * 1.5) marketSentiment = 'bearish';
    
    // Phân tích độ biến động cho top coins
    const volatilityData: VolatilityData[] = [];
    const topCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP'];
    
    for (const coin of topCoins) {
      const symbol = `${coin}USDT`;
      if (!tickers[symbol]) continue;
      
      // Lấy dữ liệu biến động (mô phỏng, trong thực tế cần tính từ OHLCV data)
      const stat = tickerStats.find((s: any) => s.symbol === symbol);
      if (!stat) continue;
      
      const change = parseFloat(stat.priceChangePercent);
      const hourlyVolatility = Math.abs(change) / 24;
      const dailyVolatility = Math.abs(change);
      const weeklyVolatility = dailyVolatility * 1.5; // Mô phỏng
      const monthlyVolatility = dailyVolatility * 2.2; // Mô phỏng
      
      // Tính toán chỉ số RSI (mô phỏng)
      let rsi = 50;
      if (change > 5) rsi = 70 + Math.min(change - 5, 20);
      else if (change < -5) rsi = 30 - Math.min(Math.abs(change) - 5, 20);
      else rsi = 50 + change * 4;
      
      // Xác định trend
      let trend: 'up' | 'down' | 'sideways' = 'sideways';
      if (change > 3) trend = 'up';
      else if (change < -3) trend = 'down';
      
      // Tạo khuyến nghị
      let recommendation = '';
      if (rsi > 70) recommendation = 'Cân nhắc chốt lời, thị trường quá mua';
      else if (rsi < 30) recommendation = 'Cơ hội mua vào, thị trường quá bán';
      else recommendation = 'Theo dõi biến động thị trường';
      
      volatilityData.push({
        symbol: coin,
        hourly: hourlyVolatility,
        daily: dailyVolatility,
        weekly: weeklyVolatility,
        monthly: monthlyVolatility,
        trend,
        rsi,
        recommendation
      });
    }
    
    // Tạo bản tóm tắt thị trường
    let marketSummary = `Thị trường đang trong trạng thái ${
      marketSentiment === 'bullish' ? 'tăng mạnh' : 
      marketSentiment === 'bearish' ? 'giảm mạnh' : 'ổn định'
    }. `;
    
    if (marketSentiment === 'bullish') {
      marketSummary += `Có ${risingPairs} cặp tiền đang tăng giá, trong khi chỉ ${fallingPairs} cặp đang giảm. `;
    } else if (marketSentiment === 'bearish') {
      marketSummary += `Có ${fallingPairs} cặp tiền đang giảm giá, trong khi chỉ ${risingPairs} cặp đang tăng. `;
    }
    
    // Thông tin về BTC
    const btcData = volatilityData.find(v => v.symbol === 'BTC');
    if (btcData) {
      marketSummary += `Bitcoin đang trong xu hướng ${
        btcData.trend === 'up' ? 'tăng' : 
        btcData.trend === 'down' ? 'giảm' : 'đi ngang'
      } với RSI = ${btcData.rsi.toFixed(1)}. `;
    }
    
    // Thông tin về ETH
    const ethData = volatilityData.find(v => v.symbol === 'ETH');
    if (ethData) {
      marketSummary += `Ethereum đang trong xu hướng ${
        ethData.trend === 'up' ? 'tăng' : 
        ethData.trend === 'down' ? 'giảm' : 'đi ngang'
      } với RSI = ${ethData.rsi.toFixed(1)}. `;
    }
    
    // Kết quả phân tích
    return {
      timestamp: new Date().toISOString(),
      btcDominance,
      marketSentiment,
      topGainers,
      topLosers,
      volatilityData,
      marketSummary
    };

  } catch (error: any) {
    console.error("[getMarketAnalysis] Lỗi khi phân tích thị trường:", error);
    throw new Error(`Lỗi khi phân tích thị trường: ${error.message}`);
  }
}

/**
 * Tạo chiến lược giao dịch dựa trên phân tích thị trường
 */
export async function generateTradingStrategy(
  apiKey: string, 
  apiSecret: string, 
  isTestnet: boolean = false,
  investmentAmount: number = 1000, // Số tiền đầu tư (USD)
  riskTolerance: 'low' | 'medium' | 'high' = 'medium' // Mức độ chấp nhận rủi ro
): Promise<{
  strategyType: string;
  recommendations: Array<{coin: string, percentage: number, action: string}>;
  summary: string;
}> {
  try {
    // Phân tích thị trường để đưa ra chiến lược
    const marketAnalysis = await getMarketAnalysis(apiKey, apiSecret, isTestnet);
    
    // Tạo danh sách khuyến nghị dựa trên các yếu tố thị trường
    const recommendations: Array<{coin: string, percentage: number, action: string}> = [];
    
    // Xác định loại chiến lược dựa trên phân tích thị trường và mức chấp nhận rủi ro
    let strategyType = '';
    
    if (marketAnalysis.marketSentiment === 'bullish') {
      if (riskTolerance === 'high') {
        strategyType = 'Tăng trưởng tích cực';
        // Ưu tiên các coin đang tăng mạnh
        recommendations.push(
          ...marketAnalysis.topGainers.slice(0, 3).map(g => ({
            coin: g.symbol.replace('USDT', ''),
            percentage: g.symbol === 'BTCUSDT' ? 40 : g.symbol === 'ETHUSDT' ? 30 : 10,
            action: 'mua'
          }))
        );
      } else if (riskTolerance === 'medium') {
        strategyType = 'Tăng trưởng cân bằng';
        // Cân bằng giữa BTC/ETH và một số coin tăng ổn định
        recommendations.push(
          { coin: 'BTC', percentage: 40, action: 'mua' },
          { coin: 'ETH', percentage: 30, action: 'mua' }
        );
        recommendations.push(
          ...marketAnalysis.topGainers.slice(0, 2).map(g => ({
            coin: g.symbol.replace('USDT', ''),
            percentage: 15,
            action: 'mua'
          }))
        );
      } else {
        strategyType = 'Bảo toàn trong xu hướng tăng';
        // Chủ yếu BTC và ETH
        recommendations.push(
          { coin: 'BTC', percentage: 60, action: 'mua' },
          { coin: 'ETH', percentage: 30, action: 'mua' },
          { coin: 'USDT', percentage: 10, action: 'giữ' }
        );
      }
    } else if (marketAnalysis.marketSentiment === 'bearish') {
      if (riskTolerance === 'high') {
        strategyType = 'Đầu tư ngược dòng';
        // Xem xét mua các coin đã giảm sâu
        recommendations.push(
          { coin: 'BTC', percentage: 30, action: 'mua từng phần' },
          { coin: 'ETH', percentage: 20, action: 'mua từng phần' },
          { coin: 'USDT', percentage: 50, action: 'giữ để chờ cơ hội' }
        );
      } else if (riskTolerance === 'medium') {
        strategyType = 'Phòng thủ tạm thời';
        // Chủ yếu giữ tiền, chỉ giữ một ít BTC/ETH
        recommendations.push(
          { coin: 'BTC', percentage: 20, action: 'giữ' },
          { coin: 'ETH', percentage: 10, action: 'giữ' },
          { coin: 'USDT', percentage: 70, action: 'giữ để chờ cơ hội' }
        );
      } else {
        strategyType = 'Bảo toàn vốn tối đa';
        // Chủ yếu là stablecoin
        recommendations.push(
          { coin: 'USDT', percentage: 80, action: 'giữ để chờ cơ hội' },
          { coin: 'BTC', percentage: 20, action: 'giữ lượng nhỏ' }
        );
      }
    } else {
      // Thị trường đi ngang
      if (riskTolerance === 'high') {
        strategyType = 'Đầu tư tích cực trong thị trường đi ngang';
        recommendations.push(
          { coin: 'BTC', percentage: 30, action: 'mua' },
          { coin: 'ETH', percentage: 30, action: 'mua' },
          // Thêm 2-3 top coins có RSI tốt
          ...marketAnalysis.volatilityData
            .filter(v => v.rsi < 40 && v.symbol !== 'BTC' && v.symbol !== 'ETH')
            .slice(0, 2)
            .map(v => ({
              coin: v.symbol,
              percentage: 20,
              action: 'mua khi RSI thấp'
            }))
        );
      } else if (riskTolerance === 'medium') {
        strategyType = 'Cân bằng trong thị trường đi ngang';
        recommendations.push(
          { coin: 'BTC', percentage: 40, action: 'mua' },
          { coin: 'ETH', percentage: 30, action: 'mua' },
          { coin: 'USDT', percentage: 30, action: 'giữ để chờ cơ hội' }
        );
      } else {
        strategyType = 'Chờ đợi thời cơ';
        recommendations.push(
          { coin: 'BTC', percentage: 30, action: 'giữ' },
          { coin: 'USDT', percentage: 70, action: 'giữ để chờ xu hướng rõ ràng' }
        );
      }
    }
    
    // Tạo tóm tắt chiến lược
    let summary = `Chiến lược "${strategyType}" phù hợp với thị trường ${
      marketAnalysis.marketSentiment === 'bullish' ? 'tăng điểm' : 
      marketAnalysis.marketSentiment === 'bearish' ? 'giảm điểm' : 'đi ngang'
    } hiện tại và mức chấp nhận rủi ro ${
      riskTolerance === 'high' ? 'cao' : 
      riskTolerance === 'medium' ? 'trung bình' : 'thấp'
    } của bạn.\n\n`;
    
    summary += `Với ${investmentAmount}$ đầu tư, bạn nên:\n`;
    recommendations.forEach(rec => {
      const amount = investmentAmount * rec.percentage / 100;
      summary += `- ${rec.action} ${rec.coin}: ${rec.percentage}% (${amount.toFixed(2)}$)\n`;
    });
    
    // Thêm lời khuyên dựa trên RSI
    const btcData = marketAnalysis.volatilityData.find(v => v.symbol === 'BTC');
    if (btcData) {
      summary += `\nLưu ý về BTC: ${btcData.recommendation}`;
    }
    
    return {
      strategyType,
      recommendations,
      summary
    };
    
  } catch (error: any) {
    console.error("[generateTradingStrategy] Lỗi khi tạo chiến lược:", error);
    throw new Error(`Lỗi khi tạo chiến lược giao dịch: ${error.message}`);
  }
}

// --- Các hàm tính toán chỉ báo kỹ thuật ---

/**
 * Tính toán Simple Moving Average (SMA)
 */
function calculateSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

/**
 * Tính toán Exponential Moving Average (EMA)
 */
function calculateEMA(data: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const ema: number[] = [];
  ema[0] = data[0];
  for (let i = 1; i < data.length; i++) {
    ema[i] = data[i] * k + ema[i - 1] * (1 - k);
  }
  return ema;
}

/**
 * Tính toán Relative Strength Index (RSI)
 */
function calculateRSI(data: number[], period: number = 14): number[] {
  const rsi: number[] = [];
  const changes: number[] = [];

  // Tính thay đổi giá
  for (let i = 1; i < data.length; i++) {
    changes.push(data[i] - data[i - 1]);
  }

  // Tính RSI
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(NaN);
      continue;
    }

    const slice = changes.slice(i - period, i);
    const gains = slice.filter(v => v > 0).reduce((a, b) => a + b, 0);
    const losses = Math.abs(slice.filter(v => v < 0).reduce((a, b) => a + b, 0));

    if (losses === 0) {
      rsi.push(100);
    } else {
      const rs = gains / losses;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

/**
 * Tính toán độ lệch chuẩn (Standard Deviation)
 */
function calculateStandardDeviation(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const subset = prices.slice(-period);
  const mean = subset.reduce((total, price) => total + price, 0) / period;
  const squaredDiffs = subset.map(price => Math.pow(price - mean, 2));
  const variance = squaredDiffs.reduce((total, diff) => total + diff, 0) / period;
  
  return Math.sqrt(variance);
}

/**
 * Tính toán Bollinger Bands
 */
function calculateBollingerBands(data: number[], period: number = 20, stdDev: number = 2): { upper: number[], middle: number[], lower: number[] } {
  const sma = calculateSMA(data, period);
  const upper: number[] = [];
  const lower: number[] = [];

  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
      continue;
    }
    const slice = data.slice(i - period + 1, i + 1);
    const mean = sma[i];
    const squaredDiffs = slice.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const std = Math.sqrt(variance);
    upper.push(mean + stdDev * std);
    lower.push(mean - stdDev * std);
  }

  return { upper, middle: sma, lower };
}

/**
 * Tính toán MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(data: number[]): { macd: number[], signal: number[], histogram: number[] } {
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macd = ema12.map((v, i) => v - ema26[i]);
  const signal = calculateEMA(macd, 9);
  const histogram = macd.map((v, i) => v - signal[i]);
  return { macd, signal, histogram };
}

/**
 * Phát hiện mẫu hình nến (Candlestick Patterns)
 */
function detectCandlestickPatterns(candles: Candle[], lookback: number = 5): PricePattern[] {
  if (candles.length < lookback) return [];
  
  const patterns: PricePattern[] = [];
  const recentCandles = candles.slice(-lookback);
  const lastCandle = recentCandles[recentCandles.length - 1];
  const lastPrice = lastCandle.close;
  
  // Doji (thân nến rất nhỏ)
  const lastCandleBody = Math.abs(lastCandle.open - lastCandle.close);
  const lastCandleRange = lastCandle.high - lastCandle.low;
  
  if (lastCandleBody / lastCandleRange < 0.1) {
    patterns.push({
      pattern: 'Doji',
      reliability: 60,
      potentialProfit: lastPrice * 0.02, // Ước tính lợi nhuận 2%
      stopLoss: Math.min(lastCandle.low, recentCandles[recentCandles.length - 2].low) * 0.99,
      takeProfit: lastPrice * 1.02
    });
  }
  
  // Hammer (thân nhỏ, bóng dưới dài)
  const lowerShadow = lastCandle.open > lastCandle.close 
    ? lastCandle.close - lastCandle.low 
    : lastCandle.open - lastCandle.low;
  
  if (lowerShadow / lastCandleBody > 2 && lastCandleBody / lastCandleRange < 0.3) {
    // Xác định nếu Hammer xuất hiện sau xu hướng giảm
    let priorTrend = 'neutral';
    const priorCandles = recentCandles.slice(0, -1);
    if (priorCandles[0].close > priorCandles[priorCandles.length - 1].close) {
      priorTrend = 'bearish';
    }
    
    if (priorTrend === 'bearish') {
      patterns.push({
        pattern: 'Hammer',
        reliability: 70,
        potentialProfit: lastPrice * 0.03,
        stopLoss: lastCandle.low * 0.99,
        takeProfit: lastPrice * 1.03
      });
    }
  }
  
  // Phân tích mẫu hình Engulfing
  if (recentCandles.length >= 2) {
    const previousCandle = recentCandles[recentCandles.length - 2];
    const currentCandle = lastCandle;
    
    // Bullish Engulfing
    if (
      previousCandle.close < previousCandle.open && // Previous candle is bearish
      currentCandle.close > currentCandle.open && // Current candle is bullish
      currentCandle.open < previousCandle.close && // Current open below previous close
      currentCandle.close > previousCandle.open // Current close above previous open
    ) {
      patterns.push({
        pattern: 'Bullish Engulfing',
        reliability: 75,
        potentialProfit: lastPrice * 0.04,
        stopLoss: Math.min(currentCandle.low, previousCandle.low) * 0.99,
        takeProfit: lastPrice * 1.04
      });
    }
    
    // Bearish Engulfing
    if (
      previousCandle.close > previousCandle.open && // Previous candle is bullish
      currentCandle.close < currentCandle.open && // Current candle is bearish
      currentCandle.open > previousCandle.close && // Current open above previous close
      currentCandle.close < previousCandle.open // Current close below previous open
    ) {
      patterns.push({
        pattern: 'Bearish Engulfing',
        reliability: 75,
        potentialProfit: lastPrice * 0.04,
        stopLoss: Math.max(currentCandle.high, previousCandle.high) * 1.01,
        takeProfit: lastPrice * 0.96
      });
    }
  }
  
  return patterns;
}

/**
 * Tạo phân tích kỹ thuật về một cặp tiền tệ
 */
export async function getTechnicalAnalysis(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  timeframe: string = '1h',
  isTestnet: boolean = false
): Promise<TechnicalAnalysisResult> {
  console.log(`[getTechnicalAnalysis] Bắt đầu phân tích kỹ thuật cho ${symbol} (${timeframe})`);
  try {
    // Khởi tạo client Binance
    console.log(`[getTechnicalAnalysis] Khởi tạo client Binance, testnet=${isTestnet}`);
    const binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      useServerTime: true,
      test: isTestnet,
      recvWindow: 60000,
      urls: {
        base: isTestnet ? 'https://testnet.binance.vision/api/' : 'https://api.binance.com/api/'
      }
    });
    
    // Kiểm tra API key
    console.log(`[getTechnicalAnalysis] Kiểm tra API key, chiều dài: ${apiKey.length}`);
    if (!apiKey || apiKey.length < 5) {
      console.error("[getTechnicalAnalysis] API key không hợp lệ");
      throw new Error("API key không hợp lệ");
    }
    
    // Đồng bộ hóa thời gian
    TimeSync.adjustOffset(-5000);
    
    // Lấy dữ liệu nến
    console.log(`[getTechnicalAnalysis] Lấy dữ liệu nến cho ${symbol} (${timeframe})`);
    const klineData = await binance.candlesticks(symbol, timeframe, undefined, { limit: 200 });
    
    // Chuyển đổi dữ liệu nến
    const candles: Candle[] = klineData.map((kline: any) => ({
      timestamp: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
    
    // Lấy mảng giá đóng cửa
    const closes = candles.map(candle => candle.close);
    const lastPrice = closes[closes.length - 1];
    
    // Tính toán các chỉ báo
    const rsiArr = calculateRSI(closes);
    const lastRsi = rsiArr[rsiArr.length - 1];
    
    const macdObj = calculateMACD(closes);
    const lastMacd = macdObj.macd[macdObj.macd.length - 1];
    const lastSignal = macdObj.signal[macdObj.signal.length - 1];
    const lastHistogram = macdObj.histogram[macdObj.histogram.length - 1];
    
    const bollingerBandsObj = calculateBollingerBands(closes);
    const lastUpper = bollingerBandsObj.upper[bollingerBandsObj.upper.length - 1];
    const lastMiddle = bollingerBandsObj.middle[bollingerBandsObj.middle.length - 1];
    const lastLower = bollingerBandsObj.lower[bollingerBandsObj.lower.length - 1];
    
    const ema20Arr = calculateEMA(closes, 20);
    const ema50Arr = calculateEMA(closes, 50);
    const ema200Arr = calculateEMA(closes, 200);
    
    const lastEma20 = ema20Arr[ema20Arr.length - 1];
    const lastEma50 = ema50Arr[ema50Arr.length - 1];
    const lastEma200 = ema200Arr[ema200Arr.length - 1];
    
    // Phát hiện mẫu hình giá
    const patterns = detectCandlestickPatterns(candles);
    
    // Tạo tín hiệu giao dịch
    const signals = [];
    
    // Tín hiệu RSI
    if (lastRsi < 30) {
      signals.push({
        indicator: 'RSI',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 70,
        reason: `RSI ở mức quá bán (${lastRsi.toFixed(2)})`
      });
    } else if (lastRsi > 70) {
      signals.push({
        indicator: 'RSI',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 70,
        reason: `RSI ở mức quá mua (${lastRsi.toFixed(2)})`
      });
    } else {
      signals.push({
        indicator: 'RSI',
        action: 'hold' as 'buy' | 'sell' | 'hold',
        strength: 50,
        reason: `RSI ở mức trung tính (${lastRsi.toFixed(2)})`
      });
    }
    
    // Tín hiệu MACD
    const macdTrend = lastMacd > lastSignal ? 'bullish' : lastMacd < lastSignal ? 'bearish' : 'neutral';
    if (macdTrend === 'bullish') {
      signals.push({
        indicator: 'MACD',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 60,
        reason: 'MACD hiện tại cho tín hiệu tăng giá'
      });
    } else if (macdTrend === 'bearish') {
      signals.push({
        indicator: 'MACD',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 60,
        reason: 'MACD hiện tại cho tín hiệu giảm giá'
      });
    } else {
      signals.push({
        indicator: 'MACD',
        action: 'hold' as 'buy' | 'sell' | 'hold',
        strength: 40,
        reason: 'MACD hiện tại không cho tín hiệu rõ ràng'
      });
    }
    
    // Tín hiệu Bollinger Bands
    if (lastPrice > lastUpper) {
      signals.push({
        indicator: 'Bollinger Bands',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 65,
        reason: 'Giá vượt dải trên Bollinger, có thể quá mua'
      });
    } else if (lastPrice < lastLower) {
      signals.push({
        indicator: 'Bollinger Bands',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 65,
        reason: 'Giá dưới dải dưới Bollinger, có thể quá bán'
      });
    } else {
      const bandwidth = (lastUpper - lastLower) / lastMiddle;
      const isSqueezing = bandwidth < 0.1; // Điều chỉnh ngưỡng tùy theo nhu cầu
      
      if (isSqueezing) {
        signals.push({
          indicator: 'Bollinger Bands',
          action: 'hold' as 'buy' | 'sell' | 'hold',
          strength: 55,
          reason: 'Bollinger Bands đang co lại, chuẩn bị bùng nổ giá'
        });
      }
    }
    
    // Tín hiệu EMA
    if (lastPrice > lastEma50 && lastEma50 > lastEma200) {
      signals.push({
        indicator: 'Moving Averages',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 75,
        reason: 'Giá trên EMA50 và EMA50 trên EMA200 (xu hướng tăng)'
      });
    } else if (lastPrice < lastEma50 && lastEma50 < lastEma200) {
      signals.push({
        indicator: 'Moving Averages',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 75,
        reason: 'Giá dưới EMA50 và EMA50 dưới EMA200 (xu hướng giảm)'
      });
    }
    
    // Tính toán tổng hợp
    let buySignals = 0;
    let sellSignals = 0;
    let totalBuyStrength = 0;
    let totalSellStrength = 0;
    
    signals.forEach(signal => {
      if (signal.action === 'buy') {
        buySignals++;
        totalBuyStrength += signal.strength;
      } else if (signal.action === 'sell') {
        sellSignals++;
        totalSellStrength += signal.strength;
      }
    });
    
    const avgBuyStrength = buySignals > 0 ? totalBuyStrength / buySignals : 0;
    const avgSellStrength = sellSignals > 0 ? totalSellStrength / sellSignals : 0;
    
    // Tính điểm tổng hợp (-100 đến 100)
    const score = Math.round(((avgBuyStrength * buySignals) - (avgSellStrength * sellSignals)) * 10 / (buySignals + sellSignals + 1));
    
    // Xác định khuyến nghị
    let recommendation: 'strong_buy' | 'buy' | 'neutral' | 'sell' | 'strong_sell' = 'neutral';
    if (score > 50) recommendation = 'strong_buy';
    else if (score > 20) recommendation = 'buy';
    else if (score < -50) recommendation = 'strong_sell';
    else if (score < -20) recommendation = 'sell';
    
    // Tạo mô tả tổng hợp
    let description = '';
    if (recommendation === 'strong_buy') {
      description = `Các chỉ báo kỹ thuật mạnh mẽ ủng hộ xu hướng tăng giá cho ${symbol}. Đặc biệt ${signals.filter(s => s.action === 'buy' && s.strength > 70).map(s => s.indicator).join(', ')} cho tín hiệu mua mạnh.`;
    } else if (recommendation === 'buy') {
      description = `Xu hướng tăng nhẹ cho ${symbol}. ${signals.filter(s => s.action === 'buy').map(s => s.indicator).join(', ')} cho tín hiệu mua.`;
    } else if (recommendation === 'strong_sell') {
      description = `Các chỉ báo kỹ thuật mạnh mẽ ủng hộ xu hướng giảm giá cho ${symbol}. Đặc biệt ${signals.filter(s => s.action === 'sell' && s.strength > 70).map(s => s.indicator).join(', ')} cho tín hiệu bán mạnh.`;
    } else if (recommendation === 'sell') {
      description = `Xu hướng giảm nhẹ cho ${symbol}. ${signals.filter(s => s.action === 'sell').map(s => s.indicator).join(', ')} cho tín hiệu bán.`;
    } else {
      description = `Thị trường đang đi ngang hoặc không có xu hướng rõ ràng cho ${symbol}. Nên theo dõi thêm.`;
    }
    
    // Kết quả phân tích
    return {
      symbol,
      timeframe,
      timestamp: new Date().toISOString(),
      price: lastPrice,
      indicators: {
        rsi: lastRsi,
        macd: {
          macd: lastMacd,
          signal: lastSignal,
          histogram: lastHistogram,
          trend: macdTrend
        },
        bollingerBands: {
          upper: lastUpper,
          middle: lastMiddle,
          lower: lastLower,
          bandwidth: (lastUpper - lastLower) / lastMiddle,
          isSqueezing: (lastUpper - lastLower) / lastMiddle < 0.1
        },
        ema20: lastEma20,
        ema50: lastEma50,
        ema200: lastEma200
      },
      patterns,
      signals,
      summary: {
        recommendation,
        score,
        description
      }
    };
    
  } catch (error: any) {
    console.error(`[getTechnicalAnalysis] Lỗi khi phân tích kỹ thuật cho ${symbol}:`, error);
    throw new Error(`Lỗi khi phân tích kỹ thuật: ${error.message}`);
  }
}

/**
 * Chạy backtesting một chiến lược đơn giản
 */
export async function runBacktestStrategy(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  timeframe: string,
  strategy: StrategyType,
  startDate: string,
  endDate: string,
  initialCapital: number,
  isTestnet: boolean = false
): Promise<BacktestResult> {
  try {
    console.log(`[runBacktestStrategy] Bắt đầu backtest cho ${symbol}`, {
      symbol,
      timeframe,
      strategy,
      startDate,
      endDate,
      initialCapital,
      isTestnet
    });

    // Kiểm tra tham số đầu vào
    if (!symbol || !timeframe || !strategy || !startDate || !endDate) {
      throw new Error('Thiếu tham số bắt buộc');
    }

    if (isNaN(initialCapital) || initialCapital <= 0) {
      throw new Error('Vốn ban đầu phải là số dương');
    }

    // Lấy dữ liệu lịch sử
    const historicalData = await getHistoricalData(apiKey, apiSecret, symbol, timeframe, startDate, endDate, isTestnet);
    
    // Chuyển đổi dữ liệu sang định dạng OHLCV
    const ohlcvData: OHLCV[] = historicalData.map((candle: Candle) => ({
      timestamp: candle.timestamp,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    }));

    // Lấy tín hiệu từ chiến lược
    console.log(`[runBacktestStrategy] Đang lấy tín hiệu cho chiến lược ${strategy}`);
    let signals: Signal[] = [];
    
    switch (strategy) {
      case 'sma_crossover':
      case 'ma_crossover': // Thêm hỗ trợ cho ma_crossover
        signals = getSignals.sma_crossover(ohlcvData);
        break;
      case 'macd':
        signals = getSignals.macd(ohlcvData);
        break;
      case 'bollinger_bands':
        signals = getSignals.bollinger_bands(ohlcvData);
        break;
      case 'rsi':
        signals = getSignals.rsi(ohlcvData);
        break;
      default:
        throw new Error(`Chiến lược ${strategy} không được hỗ trợ. Các chiến lược được hỗ trợ: sma_crossover, macd, bollinger_bands, rsi`);
    }
    
    if (!signals || signals.length === 0) {
      throw new Error(`Không tìm thấy tín hiệu cho chiến lược ${strategy}`);
    }
    
    console.log(`[runBacktestStrategy] Đã nhận ${signals.length} tín hiệu`);
    
    // Khởi tạo biến theo dõi
    let currentPosition = 0;
    let capital = initialCapital;
    const trades: Trade[] = [];
    const equityCurve: EquityPoint[] = [{
      timestamp: ohlcvData[0].timestamp,
      value: initialCapital
    }];
    
    // Chạy backtest
    for (let i = 0; i < ohlcvData.length; i++) {
      const candle = ohlcvData[i];
      const signal = signals.find(s => s.timestamp === candle.timestamp);
      
      if (!signal) continue; // Bỏ qua nếu không có tín hiệu cho nến này
      
      if (signal.type === 'buy' && currentPosition <= 0) {
        // Mở vị thế mua khi có signal mua
        const quantity = capital / candle.close;
        currentPosition = quantity;
        trades.push({
          type: 'buy',
          entryPrice: candle.close,
          entryTime: candle.timestamp,
          quantity: quantity,
          reason: signal.reason
        });
      } else if (signal.type === 'sell' && currentPosition > 0) {
        // Đóng vị thế mua khi có signal bán
        const pnl = (candle.close - trades[trades.length - 1].entryPrice) * currentPosition;
        capital += pnl;
        trades.push({
          type: 'sell',
          entryPrice: candle.close,
          entryTime: candle.timestamp,
          quantity: currentPosition,
          reason: signal.reason
        });
        currentPosition = 0;
      }
      
      // Cập nhật vốn
      capital = initialCapital + (currentPosition * candle.close);
      
      // Cập nhật đường equity
      equityCurve.push({
        timestamp: candle.timestamp,
        value: capital
      });
    }
    
    // Tính toán các chỉ số hiệu suất
    const finalCapital = capital;
    const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
    
    // Tính max drawdown
    let maxDrawdown = 0;
    let peak = initialCapital;
    const drawdowns: number[] = [];
    
    for (const point of equityCurve) {
      if (point.value > peak) {
        peak = point.value;
      }
      const drawdown = (peak - point.value) / peak;
      drawdowns.push(drawdown);
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }
    
    // Tính toán lợi nhuận trung bình cho các giao dịch thắng/thua
    const winningTrades = trades.filter(t => {
      const lastPrice = ohlcvData[ohlcvData.length - 1].close;
      return (t.type === 'buy' && lastPrice > t.entryPrice) || 
             (t.type === 'sell' && lastPrice < t.entryPrice);
    });
    
    const losingTrades = trades.filter(t => {
      const lastPrice = ohlcvData[ohlcvData.length - 1].close;
      return (t.type === 'buy' && lastPrice < t.entryPrice) || 
             (t.type === 'sell' && lastPrice > t.entryPrice);
    });
    
    const averageWin = winningTrades.length > 0 
      ? winningTrades.reduce((sum, t) => {
          const lastPrice = ohlcvData[ohlcvData.length - 1].close;
          return sum + Math.abs(lastPrice - t.entryPrice);
        }, 0) / winningTrades.length
      : 0;
      
    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => {
          const lastPrice = ohlcvData[ohlcvData.length - 1].close;
          return sum + Math.abs(lastPrice - t.entryPrice);
        }, 0) / losingTrades.length
      : 0;
    
    // Tính Sharpe ratio
    const returns = equityCurve.slice(1).map((point, i) => 
      (point.value - equityCurve[i].value) / equityCurve[i].value
    );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const stdDev = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
    );
    const sharpeRatio = avgReturn / stdDev;
    
    // Tính win rate
    const winRate = (winningTrades.length / trades.length) * 100;
    
    return {
      summary: {
        symbol,
        timeframe,
        strategy,
        startDate,
        endDate,
        initialCapital,
        finalCapital,
        profitLoss: finalCapital - initialCapital,
        profitLossPercentage: totalReturn || 0,
        maxDrawdown: maxDrawdown || 0,
        maxDrawdownPercentage: (maxDrawdown || 0) * 100,
        totalTrades: trades.length || 0,
        winningTrades: winningTrades.length || 0,
        losingTrades: losingTrades.length || 0,
        winRate: winRate || 0,
        averageWin: averageWin || 0,
        averageLoss: averageLoss || 0,
        sharpeRatio: sharpeRatio || 0
      },
      equityChart: equityCurve.map((point, i) => ({
        timestamp: point.timestamp,
        value: point.value || 0,
        drawdown: drawdowns[i] || 0
      })),
      trades: trades.map(trade => {
        const lastPrice = ohlcvData[ohlcvData.length - 1].close;
        const profitLoss = trade.type === 'buy' 
          ? (lastPrice - trade.entryPrice) || 0
          : (trade.entryPrice - lastPrice) || 0;
        const profitLossPercentage = ((profitLoss / trade.entryPrice) * 100) || 0;
        
        return {
          timestamp: trade.entryTime,
          type: trade.type === 'buy' ? 'BUY' : 'SELL',
          price: trade.entryPrice || 0,
          quantity: trade.quantity || 0,
          value: trade.type === 'buy' ? (trade.entryPrice || 0) : -(trade.entryPrice || 0),
          profitLoss: profitLoss || 0,
          profitLossPercentage: profitLossPercentage || 0,
          reason: trade.reason || 'Không có lý do'
        };
      })
    };
    
  } catch (error: any) {
    console.error(`[runBacktestStrategy] Lỗi khi chạy backtest cho ${symbol}:`, error);
    throw new Error(`Lỗi khi chạy backtest: ${error.message}`);
  }
}

async function getHistoricalData(
  apiKey: string,
  apiSecret: string,
  symbol: string,
  timeframe: string,
  startDate: string,
  endDate: string,
  isTestnet: boolean
): Promise<Candle[]> {
  try {
    console.log(`[getHistoricalData] Bắt đầu lấy dữ liệu lịch sử cho ${symbol}`);
    console.log(`[getHistoricalData] Tham số đầu vào:`, {
      symbol,
      timeframe,
      startDate,
      endDate,
      isTestnet
    });
    
    // Khởi tạo Binance client
    const binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      useServerTime: true,
      test: isTestnet,
      recvWindow: 60000,
      verbose: true,
      urls: {
        base: isTestnet ? 'https://testnet.binance.vision/api/' : 'https://api.binance.com/api/'
      }
    });

    console.log(`[getHistoricalData] Đã khởi tạo Binance client`);
    
    // Đồng bộ hóa thời gian
    TimeSync.adjustOffset(-5000);
    console.log(`[getHistoricalData] Đã đồng bộ thời gian`);
    
    // Chuyển đổi ngày tháng sang timestamp
    let startTime: number;
    let endTime: number;
    
    try {
      // Kiểm tra định dạng ngày tháng
      if (!startDate || !endDate) {
        throw new Error('Ngày bắt đầu và kết thúc không được để trống');
      }

      // Thử parse ngày tháng
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);

      if (isNaN(startDateObj.getTime())) {
        throw new Error(`Ngày bắt đầu không hợp lệ: ${startDate}`);
      }

      if (isNaN(endDateObj.getTime())) {
        throw new Error(`Ngày kết thúc không hợp lệ: ${endDate}`);
      }

      // Kiểm tra thời gian không được ở tương lai
      const now = new Date();
      if (startDateObj > now) {
        console.log(`[getHistoricalData] Cảnh báo: Thời gian bắt đầu (${startDate}) nằm trong tương lai. Tự động điều chỉnh về 30 ngày trước.`);
        startDateObj.setTime(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      }
      if (endDateObj > now) {
        console.log(`[getHistoricalData] Cảnh báo: Thời gian kết thúc (${endDate}) nằm trong tương lai. Tự động điều chỉnh về thời gian hiện tại.`);
        endDateObj.setTime(now.getTime());
      }

      // Kiểm tra khoảng thời gian hợp lệ
      const maxTimeRange = 365 * 24 * 60 * 60 * 1000; // 1 năm
      if (endDateObj.getTime() - startDateObj.getTime() > maxTimeRange) {
        console.log(`[getHistoricalData] Cảnh báo: Khoảng thời gian yêu cầu quá lớn (> 1 năm). Tự động giới hạn về 1 năm.`);
        startDateObj.setTime(endDateObj.getTime() - maxTimeRange);
      }

      startTime = startDateObj.getTime();
      endTime = endDateObj.getTime();
      
      // Kiểm tra tính hợp lệ của timestamp
      if (isNaN(startTime) || isNaN(endTime)) {
        throw new Error(`Timestamp không hợp lệ: startTime=${startTime}, endTime=${endTime}`);
      }
      
      if (startTime >= endTime) {
        throw new Error(`Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc`);
      }
      
      console.log(`[getHistoricalData] Timestamp:`, {
        startTime,
        endTime,
        startDate: startDateObj.toLocaleString(),
        endDate: endDateObj.toLocaleString()
      });
    } catch (error: any) {
      console.error(`[getHistoricalData] Lỗi khi xử lý timestamp:`, error);
      throw new Error(`Lỗi khi xử lý timestamp: ${error.message}`);
    }
    
    // Gọi API lấy dữ liệu nến
    console.log('[getHistoricalData] Đang gọi API candles...');
    try {
      const allCandles = [];
      let currentStartTime = startTime;
      
      // Tính toán khoảng thời gian cho mỗi lần gọi API dựa trên timeframe
      const timeframeMs = {
        '1m': 60 * 1000,
        '3m': 3 * 60 * 1000,
        '5m': 5 * 60 * 1000,
        '15m': 15 * 60 * 1000,
        '30m': 30 * 60 * 1000,
        '1h': 60 * 60 * 1000,
        '2h': 2 * 60 * 60 * 1000,
        '4h': 4 * 60 * 60 * 1000,
        '6h': 6 * 60 * 60 * 1000,
        '8h': 8 * 60 * 60 * 1000,
        '12h': 12 * 60 * 60 * 1000,
        '1d': 24 * 60 * 60 * 1000,
        '3d': 3 * 24 * 60 * 60 * 1000,
        '1w': 7 * 24 * 60 * 60 * 1000,
        '1M': 30 * 24 * 60 * 60 * 1000
      };

      const intervalMs = timeframeMs[timeframe as keyof typeof timeframeMs] || 60 * 1000;
      const maxCandlesPerRequest = 1000; // Giới hạn của Binance API
      const maxTimeRange = intervalMs * maxCandlesPerRequest;
      
      while (currentStartTime < endTime) {
        // Tính toán thời gian kết thúc cho request hiện tại
        const currentEndTime = Math.min(currentStartTime + maxTimeRange, endTime);
        
        console.log(`[getHistoricalData] Lấy dữ liệu từ ${new Date(currentStartTime).toLocaleString()} đến ${new Date(currentEndTime).toLocaleString()}`);
        
        // Sử dụng cách gọi API mới
        let historicalData;
        try {
          // Sử dụng cách gọi API trực tiếp với Promise
          historicalData = await binance.candles({
            symbol: symbol,
            interval: timeframe,
            startTime: currentStartTime,
            endTime: currentEndTime,
            limit: maxCandlesPerRequest
          });
        } catch (error) {
          console.error(`[getHistoricalData] Lỗi khi gọi API:`, error);
          throw error;
        }
        
        if (!historicalData || !Array.isArray(historicalData) || historicalData.length === 0) {
          console.log(`[getHistoricalData] Không có dữ liệu cho khoảng thời gian này`);
          break;
        }
        
        console.log(`[getHistoricalData] Nhận được ${historicalData.length} nến`);
        allCandles.push(...historicalData);
        
        // Cập nhật thời gian bắt đầu cho lần lấy tiếp theo
        const lastCandle = historicalData[historicalData.length - 1];
        currentStartTime = lastCandle.closeTime + 1;
        
        // Thêm delay để tránh rate limit
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (allCandles.length === 0) {
        throw new Error(`Không có dữ liệu lịch sử cho ${symbol}`);
      }
      
      console.log(`[getHistoricalData] Tổng cộng đã nhận ${allCandles.length} nến`);
      
      // Chuyển đổi dữ liệu nến thành định dạng OHLCV
      const candles = allCandles.map(candle => {
        try {
          return {
            timestamp: parseInt(candle[0]),
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          };
        } catch (error) {
          console.error('[getHistoricalData] Lỗi khi chuyển đổi dữ liệu nến:', error);
          console.error('[getHistoricalData] Dữ liệu nến gốc:', candle);
          throw new Error(`Lỗi khi xử lý dữ liệu nến cho ${symbol}`);
        }
      });
      
      return candles;
    } catch (error: any) {
      console.error(`[getHistoricalData] Lỗi khi lấy dữ liệu lịch sử cho ${symbol}:`, error);
      console.error(`[getHistoricalData] Stack trace:`, error.stack);
      throw new Error(`Lỗi khi lấy dữ liệu lịch sử cho ${symbol}: ${error.message || 'Không xác định'}`);
    }
    
  } catch (error: any) {
    console.error(`[getHistoricalData] Lỗi khi lấy dữ liệu lịch sử cho ${symbol}:`, error);
    console.error(`[getHistoricalData] Stack trace:`, error.stack);
    throw new Error(`Lỗi khi lấy dữ liệu lịch sử cho ${symbol}: ${error.message || 'Không xác định'}`);
  }
}

/**
 * Tối ưu hóa danh mục đầu tư dựa trên Mean-Variance Optimization đơn giản
 */
export async function optimizePortfolio(
  apiKey: string,
  apiSecret: string,
  symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'],
  riskTolerance: 'low' | 'medium' | 'high' = 'medium',
  timeframe: string = '1d',
  lookbackPeriod: number = 60, // Số ngày quá khứ để phân tích
  isTestnet: boolean = false
): Promise<OptimizedPortfolio> {
  console.log(`[optimizePortfolio] Đang tối ưu hóa danh mục đầu tư với ${symbols.length} tài sản`);
  
  try {
    // Khởi tạo client Binance
    const binance = new Binance().options({
      APIKEY: apiKey,
      APISECRET: apiSecret,
      useServerTime: true,
      test: isTestnet,
      recvWindow: 60000,
      verbose: false,
      urls: {
        base: isTestnet ? 'https://testnet.binance.vision/api/' : 'https://api.binance.com/api/'
      }
    });
    
    // Đồng bộ hóa thời gian
    TimeSync.adjustOffset(-5000);
    
    // Lấy dữ liệu lịch sử cho mỗi tài sản
    const assetData: Record<string, Candle[]> = {};
    
    for (const symbol of symbols) {
      const klineData = await binance.candlesticks(symbol, timeframe, undefined, { limit: lookbackPeriod });
      assetData[symbol] = klineData.map((kline: any) => ({
        timestamp: parseInt(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5])
      }));
    }
    
    // Tính toán lợi nhuận dự kiến (trung bình lợi nhuận trong quá khứ)
    const expectedReturns: Record<string, number> = {};
    const volatilities: Record<string, number> = {};
    
    for (const symbol in assetData) {
      const closes = assetData[symbol].map(candle => candle.close);
      
      // Tính toán biến động giá theo ngày
      const dailyReturns: number[] = [];
      for (let i = 1; i < closes.length; i++) {
        dailyReturns.push((closes[i] / closes[i - 1]) - 1);
      }
      
      // Lợi nhuận kỳ vọng (trung bình)
      expectedReturns[symbol] = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
      
      // Độ biến động (độ lệch chuẩn)
      const meanReturn = expectedReturns[symbol];
      const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - meanReturn, 2), 0) / dailyReturns.length;
      volatilities[symbol] = Math.sqrt(variance);
    }
    
    // Tính toán ma trận tương quan
    const correlations: Record<string, Record<string, number>> = {};
    
    for (const symbol1 of symbols) {
      correlations[symbol1] = {};
      
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          correlations[symbol1][symbol2] = 1; // Tương quan hoàn hảo với chính nó
          continue;
        }
        
        if (correlations[symbol2]?.[symbol1] !== undefined) {
          // Đã tính toán rồi, tương quan có tính đối xứng
          correlations[symbol1][symbol2] = correlations[symbol2][symbol1];
          continue;
        }
        
        // Tính toán tương quan
        const returns1: number[] = [];
        const returns2: number[] = [];
        
        const closes1 = assetData[symbol1].map(candle => candle.close);
        const closes2 = assetData[symbol2].map(candle => candle.close);
        
        for (let i = 1; i < Math.min(closes1.length, closes2.length); i++) {
          returns1.push((closes1[i] / closes1[i - 1]) - 1);
          returns2.push((closes2[i] / closes2[i - 1]) - 1);
        }
        
        // Tính hệ số tương quan Pearson
        const mean1 = returns1.reduce((sum, ret) => sum + ret, 0) / returns1.length;
        const mean2 = returns2.reduce((sum, ret) => sum + ret, 0) / returns2.length;
        
        let numerator = 0;
        let denom1 = 0;
        let denom2 = 0;
        
        for (let i = 0; i < returns1.length; i++) {
          const diff1 = returns1[i] - mean1;
          const diff2 = returns2[i] - mean2;
          
          numerator += diff1 * diff2;
          denom1 += diff1 * diff1;
          denom2 += diff2 * diff2;
        }
        
        const correlation = numerator / (Math.sqrt(denom1) * Math.sqrt(denom2));
        correlations[symbol1][symbol2] = correlation;
      }
    }
    
    // Xác định trọng số danh mục theo mức chấp nhận rủi ro
    // (Đây là version đơn giản hóa của mean-variance optimization)
    const portfolioWeights: Record<string, number> = {};
    
    if (riskTolerance === 'low') {
      // Ưu tiên tài sản ít biến động và tương quan thấp
      const riskScores: Record<string, number> = {};
      
      for (const symbol of symbols) {
        let avgCorrelation = 0;
        for (const otherSymbol of symbols) {
          if (symbol !== otherSymbol) {
            avgCorrelation += correlations[symbol][otherSymbol];
          }
        }
        avgCorrelation /= (symbols.length - 1);
        
        // Tính điểm rủi ro (thấp = tốt)
        riskScores[symbol] = volatilities[symbol] * (0.7 + 0.3 * avgCorrelation);
      }
      
      // Sắp xếp theo điểm rủi ro từ thấp đến cao
      const sortedSymbols = [...symbols].sort((a, b) => riskScores[a] - riskScores[b]);
      
      // Phân bổ trọng số
      let remainingWeight = 1.0;
      const weights = [0.4, 0.25, 0.15, 0.1, 0.1]; // Trọng số giảm dần
      
      for (let i = 0; i < sortedSymbols.length; i++) {
        const symbol = sortedSymbols[i];
        const weight = i < weights.length ? weights[i] : 0;
        portfolioWeights[symbol] = weight;
        remainingWeight -= weight;
      }
      
    } else if (riskTolerance === 'medium') {
      // Cân bằng giữa lợi nhuận và rủi ro
      const scores: Record<string, number> = {};
      
      for (const symbol of symbols) {
        // Tính điểm kết hợp lợi nhuận và rủi ro
        scores[symbol] = expectedReturns[symbol] / volatilities[symbol];
      }
      
      // Sắp xếp theo điểm từ cao xuống thấp
      const sortedSymbols = [...symbols].sort((a, b) => scores[b] - scores[a]);
      
      // Phân bổ trọng số
      let remainingWeight = 1.0;
      const weights = [0.35, 0.25, 0.2, 0.1, 0.1]; // Trọng số giảm dần
      
      for (let i = 0; i < sortedSymbols.length; i++) {
        const symbol = sortedSymbols[i];
        const weight = i < weights.length ? weights[i] : 0;
        portfolioWeights[symbol] = weight;
        remainingWeight -= weight;
      }
      
    } else { // high risk tolerance
      // Ưu tiên lợi nhuận cao
      const returnScores: Record<string, number> = {};
      
      for (const symbol of symbols) {
        returnScores[symbol] = expectedReturns[symbol];
      }
      
      // Sắp xếp theo lợi nhuận kỳ vọng từ cao xuống thấp
      const sortedSymbols = [...symbols].sort((a, b) => returnScores[b] - returnScores[a]);
      
      // Phân bổ trọng số
      let remainingWeight = 1.0;
      const weights = [0.4, 0.3, 0.15, 0.1, 0.05]; // Trọng số giảm dần mạnh hơn
      
      for (let i = 0; i < sortedSymbols.length; i++) {
        const symbol = sortedSymbols[i];
        const weight = i < weights.length ? weights[i] : 0;
        portfolioWeights[symbol] = weight;
        remainingWeight -= weight;
      }
    }
    
    // Đảm bảo tổng trọng số = 1
    const totalWeight = Object.values(portfolioWeights).reduce((sum, w) => sum + w, 0);
    for (const symbol in portfolioWeights) {
      portfolioWeights[symbol] /= totalWeight;
    }
    
    // Tạo danh sách tài sản với trọng số
    const assets: PortfolioAsset[] = symbols.map(symbol => ({
      symbol,
      weight: portfolioWeights[symbol],
      expectedReturn: expectedReturns[symbol],
      volatility: volatilities[symbol],
      correlation: correlations[symbol]
    }));
    
    // Tính toán hiệu suất danh mục dự kiến
    const portfolioExpectedReturn = assets.reduce(
      (sum, asset) => sum + asset.weight * asset.expectedReturn, 
      0
    );
    
    // Tính toán rủi ro danh mục (đơn giản hóa)
    let portfolioRisk = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        portfolioRisk += 
          assets[i].weight * 
          assets[j].weight * 
          assets[i].volatility * 
          assets[j].volatility * 
          correlations[assets[i].symbol][assets[j].symbol];
      }
    }
    portfolioRisk = Math.sqrt(portfolioRisk);
    
    // Tính Sharpe Ratio (giả định lãi suất không rủi ro = 0)
    const sharpeRatio = portfolioExpectedReturn / portfolioRisk;
    
    // Tính điểm đa dạng hóa dựa trên tương quan
    const avgCorrelation = symbols.reduce((sum, symbol1) => {
      return sum + symbols.reduce((innerSum, symbol2) => {
        if (symbol1 === symbol2) return innerSum;
        return innerSum + correlations[symbol1][symbol2];
      }, 0);
    }, 0) / (symbols.length * (symbols.length - 1));
    
    const diversificationScore = (1 - avgCorrelation) * 100;
    
    // Tạo tóm tắt phân bổ
    const sortedAssets = [...assets].sort((a, b) => b.weight - a.weight);
    let allocationSummary = '';
    
    for (const asset of sortedAssets) {
      if (asset.weight < 0.01) continue; // Bỏ qua các tài sản có trọng số nhỏ
      
      const percentWeight = (asset.weight * 100).toFixed(1);
      const symbol = asset.symbol.replace('USDT', '');
      const returnPct = (asset.expectedReturn * 100).toFixed(2);
      const volatilityPct = (asset.volatility * 100).toFixed(2);
      
      allocationSummary += `${symbol}: ${percentWeight}% (Lợi nhuận: ${returnPct}%, Biến động: ${volatilityPct}%)\n`;
    }
    
    // Tạo khuyến nghị
    let recommendation = '';
    
    if (riskTolerance === 'low') {
      recommendation = `Danh mục đầu tư này được tối ưu hóa cho mức rủi ro thấp với trọng số cao hơn ở các tài sản ít biến động như ${sortedAssets[0].symbol.replace('USDT', '')} và ${sortedAssets[1].symbol.replace('USDT', '')}. Điểm đa dạng hóa là ${diversificationScore.toFixed(1)}%, hiệu quả cho việc bảo toàn vốn.`;
    } else if (riskTolerance === 'medium') {
      recommendation = `Danh mục đầu tư này cân bằng giữa rủi ro và lợi nhuận, phù hợp với mức chấp nhận rủi ro trung bình. Ưu tiên các tài sản có tỷ số lợi nhuận/rủi ro tốt như ${sortedAssets[0].symbol.replace('USDT', '')} và ${sortedAssets[1].symbol.replace('USDT', '')}.`;
    } else {
      recommendation = `Danh mục đầu tư này được tối ưu cho lợi nhuận cao, phù hợp với khẩu vị rủi ro cao. Tập trung vào các tài sản có lợi nhuận kỳ vọng cao như ${sortedAssets[0].symbol.replace('USDT', '')} và ${sortedAssets[1].symbol.replace('USDT', '')}, nhưng cũng có thể chịu biến động lớn hơn.`;
    }
    
    return {
      assets: sortedAssets,
      expectedReturn: portfolioExpectedReturn,
      expectedRisk: portfolioRisk,
      sharpeRatio,
      diversificationScore,
      recommendation,
      allocationSummary
    };
    
  } catch (error: any) {
    console.error(`[optimizePortfolio] Lỗi khi tối ưu hóa danh mục đầu tư:`, error);
    throw new Error(`Lỗi khi tối ưu hóa danh mục đầu tư: ${error.message}`);
  }
}

interface PortfolioAnalysisResult {
  symbols: string[];
  timeframe: string;
  timestamp: string;
  correlations: Record<string, Record<string, number>>;
  volatilities: Record<string, number>;
  expectedReturns: Record<string, number>;
  sharpeRatios: Record<string, number>;
  optimalWeights: Record<string, number>;
  summary: {
    portfolioVolatility: number;
    portfolioReturn: number;
    portfolioSharpeRatio: number;
  };
}

function calculateCorrelation(returns1: number[], returns2: number[]): number {
  const n = returns1.length;
  if (n !== returns2.length) {
    throw new Error('Hai mảng lợi nhuận phải có cùng độ dài');
  }

  const mean1 = returns1.reduce((a, b) => a + b, 0) / n;
  const mean2 = returns2.reduce((a, b) => a + b, 0) / n;

  let numerator = 0;
  let denominator1 = 0;
  let denominator2 = 0;

  for (let i = 0; i < n; i++) {
    const diff1 = returns1[i] - mean1;
    const diff2 = returns2[i] - mean2;
    numerator += diff1 * diff2;
    denominator1 += diff1 * diff1;
    denominator2 += diff2 * diff2;
  }

  return numerator / Math.sqrt(denominator1 * denominator2);
}

function calculateVolatility(returns: number[]): number {
  const n = returns.length;
  const mean = returns.reduce((a, b) => a + b, 0) / n;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
  return Math.sqrt(variance * 252); // Chuyển đổi sang biến động hàng năm
}

function calculateOptimalWeights(
  expectedReturns: Record<string, number>,
  volatilities: Record<string, number>,
  correlations: Record<string, Record<string, number>>
): Record<string, number> {
  const symbols = Object.keys(expectedReturns);
  const n = symbols.length;

  // Khởi tạo ma trận hiệp phương sai
  const covarianceMatrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      covarianceMatrix[i][j] = correlations[symbol1][symbol2] * volatilities[symbol1] * volatilities[symbol2];
    }
  }

  // Tính toán tỷ lệ tối ưu sử dụng phương pháp Markowitz
  const weights: Record<string, number> = {};
  let totalWeight = 0;

  for (let i = 0; i < n; i++) {
    const symbol = symbols[i];
    const weight = expectedReturns[symbol] / volatilities[symbol];
    weights[symbol] = weight;
    totalWeight += weight;
  }

  // Chuẩn hóa tỷ lệ
  for (const symbol of symbols) {
    weights[symbol] /= totalWeight;
  }

  return weights;
}

function calculatePortfolioVolatility(
  weights: Record<string, number>,
  volatilities: Record<string, number>,
  correlations: Record<string, Record<string, number>>
): number {
  const symbols = Object.keys(weights);
  let variance = 0;

  for (const symbol1 of symbols) {
    for (const symbol2 of symbols) {
      variance += weights[symbol1] * weights[symbol2] * 
                 correlations[symbol1][symbol2] * 
                 volatilities[symbol1] * 
                 volatilities[symbol2];
    }
  }

  return Math.sqrt(variance);
}

function calculatePortfolioReturn(
  weights: Record<string, number>,
  expectedReturns: Record<string, number>
): number {
  return Object.keys(weights).reduce((sum, symbol) => 
    sum + weights[symbol] * expectedReturns[symbol], 0
  );
}

function calculatePortfolioSharpeRatio(
  weights: Record<string, number>,
  expectedReturns: Record<string, number>,
  volatilities: Record<string, number>,
  correlations: Record<string, Record<string, number>>
): number {
  const portfolioReturn = calculatePortfolioReturn(weights, expectedReturns);
  const portfolioVolatility = calculatePortfolioVolatility(weights, volatilities, correlations);
  return portfolioReturn / portfolioVolatility;
}

export async function getPortfolioAnalysis(
  apiKey: string,
  apiSecret: string,
  symbols: string[],
  timeframe: string = '1d',
  isTestnet: boolean = false
): Promise<PortfolioAnalysisResult> {
  try {
    // Lấy dữ liệu lịch sử cho tất cả các cặp
    const historicalData: Record<string, Candle[]> = {};
    for (const symbol of symbols) {
      const endDate = new Date().toISOString();
      const startDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 năm
      historicalData[symbol] = await getHistoricalData(apiKey, apiSecret, symbol, timeframe, startDate, endDate, isTestnet);
    }

    // Tính toán lợi nhuận hàng ngày
    const dailyReturns: Record<string, number[]> = {};
    for (const symbol of symbols) {
      const candles = historicalData[symbol];
      const returns: number[] = [];
      for (let i = 1; i < candles.length; i++) {
        const return_ = (candles[i].close - candles[i - 1].close) / candles[i - 1].close;
        returns.push(return_);
      }
      dailyReturns[symbol] = returns;
    }

    // Tính toán tương quan
    const correlations: Record<string, Record<string, number>> = {};
    for (const symbol1 of symbols) {
      correlations[symbol1] = {};
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          correlations[symbol1][symbol2] = 1;
          continue;
        }
        const returns1 = dailyReturns[symbol1];
        const returns2 = dailyReturns[symbol2];
        const correlation = calculateCorrelation(returns1, returns2);
        correlations[symbol1][symbol2] = correlation;
      }
    }

    // Tính toán biến động
    const volatilities: Record<string, number> = {};
    for (const symbol of symbols) {
      const returns = dailyReturns[symbol];
      const volatility = calculateVolatility(returns);
      volatilities[symbol] = volatility;
    }

    // Tính toán lợi nhuận kỳ vọng
    const expectedReturns: Record<string, number> = {};
    for (const symbol of symbols) {
      const returns = dailyReturns[symbol];
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      expectedReturns[symbol] = avgReturn * 252; // Chuyển đổi sang lợi nhuận hàng năm
    }

    // Tính toán tỷ lệ Sharpe
    const sharpeRatios: Record<string, number> = {};
    for (const symbol of symbols) {
      const returns = dailyReturns[symbol];
      const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      const volatility = volatilities[symbol];
      const sharpeRatio = avgReturn / volatility * Math.sqrt(252);
      sharpeRatios[symbol] = sharpeRatio;
    }

    // Tính toán tỷ lệ tối ưu
    const weights = calculateOptimalWeights(expectedReturns, volatilities, correlations);

    return {
      symbols,
      timeframe,
      timestamp: new Date().toISOString(),
      correlations,
      volatilities,
      expectedReturns,
      sharpeRatios,
      optimalWeights: weights,
      summary: {
        portfolioVolatility: calculatePortfolioVolatility(weights, volatilities, correlations),
        portfolioReturn: calculatePortfolioReturn(weights, expectedReturns),
        portfolioSharpeRatio: calculatePortfolioSharpeRatio(weights, expectedReturns, volatilities, correlations)
      }
    };

  } catch (error: any) {
    console.error('[getPortfolioAnalysis] Lỗi khi phân tích danh mục:', error);
    throw new Error(`Lỗi khi phân tích danh mục: ${error.message}`);
  }
}