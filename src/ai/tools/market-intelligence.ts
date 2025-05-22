'use server';

import { z } from 'genkit';
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
interface BacktestResult {
  symbol: string;
  timeframe: string;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  profitLoss: number;
  profitLossPercentage: number;
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  sharpeRatio: number;
  trades: Array<{
    type: 'buy' | 'sell';
    entryDate: string;
    entryPrice: number;
    exitDate: string;
    exitPrice: number;
    profitLoss: number;
    profitLossPercentage: number;
    reason: string;
  }>;
  chart: {
    equityCurve: Array<{date: string, value: number}>;
    drawdownCurve: Array<{date: string, value: number}>;
  };
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
function calculateSMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  const sum = prices.slice(-period).reduce((total, price) => total + price, 0);
  return sum / period;
}

/**
 * Tính toán Exponential Moving Average (EMA)
 */
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return 0;
  
  const k = 2 / (period + 1);
  // Bắt đầu với SMA
  let ema = calculateSMA(prices.slice(0, period), period);
  
  // Tính EMA cho phần còn lại
  for (let i = period; i < prices.length; i++) {
    ema = (prices[i] * k) + (ema * (1 - k));
  }
  
  return ema;
}

/**
 * Tính toán Relative Strength Index (RSI)
 */
function calculateRSI(prices: number[], period: number = 14): number {
  if (prices.length <= period) return 50; // Giá trị mặc định
  
  let gains = 0;
  let losses = 0;
  
  // Tính toán các thay đổi giá
  for (let i = prices.length - period; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change >= 0) {
      gains += change;
    } else {
      losses -= change; // Chuyển đổi thành giá trị dương
    }
  }
  
  // Tính trung bình
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  // Tính RS và RSI
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
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
function calculateBollingerBands(prices: number[], period: number = 20, multiplier: number = 2): BollingerBands {
  const middle = calculateSMA(prices, period);
  const stdDev = calculateStandardDeviation(prices, period);
  
  const upper = middle + (stdDev * multiplier);
  const lower = middle - (stdDev * multiplier);
  const bandwidth = (upper - lower) / middle;
  
  // Xác định nếu bands đang co lại (squeezing)
  // So sánh với bandwidth trung bình của 10 giá trị trước đó
  let isSqueezing = false;
  if (prices.length >= period + 10) {
    const previousBandwidths = [];
    for (let i = 0; i < 10; i++) {
      const prevPrices = prices.slice(0, prices.length - i - 1);
      const prevMiddle = calculateSMA(prevPrices, period);
      const prevStdDev = calculateStandardDeviation(prevPrices, period);
      const prevUpper = prevMiddle + (prevStdDev * multiplier);
      const prevLower = prevMiddle - (prevStdDev * multiplier);
      previousBandwidths.push((prevUpper - prevLower) / prevMiddle);
    }
    const avgPrevBandwidth = previousBandwidths.reduce((a, b) => a + b, 0) / 10;
    isSqueezing = bandwidth < avgPrevBandwidth * 0.85; // Bandwidth giảm 15% so với trung bình
  }
  
  return {
    upper,
    middle,
    lower,
    bandwidth,
    isSqueezing
  };
}

/**
 * Tính toán MACD (Moving Average Convergence Divergence)
 */
function calculateMACD(prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): MACD {
  const fastEMA = calculateEMA(prices, fastPeriod);
  const slowEMA = calculateEMA(prices, slowPeriod);
  const macdLine = fastEMA - slowEMA;
  
  // Tính Signal Line (EMA của MACD Line)
  // Trong trường hợp thực tế, cần thêm code để tính toán EMA của chuỗi giá trị MACD
  // Tại đây chúng ta giả định một giá trị đơn giản hóa
  const signalLine = macdLine * 0.9; // Giả lập, trong thực tế cần tính EMA đúng
  
  const histogram = macdLine - signalLine;
  
  // Xác định xu hướng
  let trend: 'bullish' | 'bearish' | 'neutral' = 'neutral';
  if (macdLine > signalLine && macdLine > 0) {
    trend = 'bullish';
  } else if (macdLine < signalLine && macdLine < 0) {
    trend = 'bearish';
  }
  
  return {
    macd: macdLine,
    signal: signalLine,
    histogram,
    trend
  };
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
    const rsi = calculateRSI(closes);
    const macd = calculateMACD(closes);
    const bollingerBands = calculateBollingerBands(closes);
    const ema20 = calculateEMA(closes, 20);
    const ema50 = calculateEMA(closes, 50);
    const ema200 = calculateEMA(closes, 200);
    
    // Phát hiện mẫu hình giá
    const patterns = detectCandlestickPatterns(candles);
    
    // Tạo tín hiệu giao dịch
    const signals = [];
    
    // Tín hiệu RSI
    if (rsi < 30) {
      signals.push({
        indicator: 'RSI',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 70,
        reason: `RSI ở mức quá bán (${rsi.toFixed(2)})`
      });
    } else if (rsi > 70) {
      signals.push({
        indicator: 'RSI',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 70,
        reason: `RSI ở mức quá mua (${rsi.toFixed(2)})`
      });
    } else {
      signals.push({
        indicator: 'RSI',
        action: 'hold' as 'buy' | 'sell' | 'hold',
        strength: 50,
        reason: `RSI ở mức trung tính (${rsi.toFixed(2)})`
      });
    }
    
    // Tín hiệu MACD
    if (macd.trend === 'bullish') {
      signals.push({
        indicator: 'MACD',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 60,
        reason: 'MACD hiện tại cho tín hiệu tăng giá'
      });
    } else if (macd.trend === 'bearish') {
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
    if (lastPrice > bollingerBands.upper) {
      signals.push({
        indicator: 'Bollinger Bands',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 65,
        reason: 'Giá vượt dải trên Bollinger, có thể quá mua'
      });
    } else if (lastPrice < bollingerBands.lower) {
      signals.push({
        indicator: 'Bollinger Bands',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 65,
        reason: 'Giá dưới dải dưới Bollinger, có thể quá bán'
      });
    } else if (bollingerBands.isSqueezing) {
      signals.push({
        indicator: 'Bollinger Bands',
        action: 'hold' as 'buy' | 'sell' | 'hold',
        strength: 55,
        reason: 'Bollinger Bands đang co lại, chuẩn bị bùng nổ giá'
      });
    }
    
    // Tín hiệu EMA
    if (lastPrice > ema50 && ema50 > ema200) {
      signals.push({
        indicator: 'Moving Averages',
        action: 'buy' as 'buy' | 'sell' | 'hold',
        strength: 75,
        reason: 'Giá trên EMA50 và EMA50 trên EMA200 (xu hướng tăng)'
      });
    } else if (lastPrice < ema50 && ema50 < ema200) {
      signals.push({
        indicator: 'Moving Averages',
        action: 'sell' as 'buy' | 'sell' | 'hold',
        strength: 75,
        reason: 'Giá dưới EMA50 và EMA50 dưới EMA200 (xu hướng giảm)'
      });
    }
    
    // Tín hiệu từ mẫu hình
    for (const pattern of patterns) {
      if (['Hammer', 'Bullish Engulfing'].includes(pattern.pattern)) {
        signals.push({
          indicator: `Pattern: ${pattern.pattern}`,
          action: 'buy' as 'buy' | 'sell' | 'hold',
          strength: pattern.reliability,
          reason: `Phát hiện mẫu hình tăng giá: ${pattern.pattern}`
        });
      } else if (['Shooting Star', 'Bearish Engulfing'].includes(pattern.pattern)) {
        signals.push({
          indicator: `Pattern: ${pattern.pattern}`,
          action: 'sell' as 'buy' | 'sell' | 'hold',
          strength: pattern.reliability,
          reason: `Phát hiện mẫu hình giảm giá: ${pattern.pattern}`
        });
      }
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
        rsi,
        macd,
        bollingerBands,
        ema20,
        ema50,
        ema200
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
  timeframe: string = '1h',
  startDate: string,
  endDate: string = new Date().toISOString(),
  strategy: 'sma_crossover' | 'macd' | 'bollinger_bands' | 'rsi' = 'sma_crossover',
  initialCapital: number = 10000,
  isTestnet: boolean = false
): Promise<BacktestResult> {
  console.log(`[runBacktestStrategy] Chạy backtest cho ${symbol} với chiến lược ${strategy}`);
  
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
    // Chuyển đổi chuỗi ngày thành timestamp
    const startTimestamp = new Date(startDate).getTime();
    const endTimestamp = new Date(endDate).getTime();
    
    // Lấy dữ liệu nến từ Binance
    const klineData = await binance.candlesticks(symbol, timeframe, undefined, {
      startTime: startTimestamp,
      endTime: endTimestamp,
      limit: 1000
    });
    
    // Chuyển đổi dữ liệu
    const candles: Candle[] = klineData.map((kline: any) => ({
      timestamp: parseInt(kline[0]),
      open: parseFloat(kline[1]),
      high: parseFloat(kline[2]),
      low: parseFloat(kline[3]),
      close: parseFloat(kline[4]),
      volume: parseFloat(kline[5])
    }));
    
    // Nếu không có đủ dữ liệu
    if (candles.length < 50) {
      throw new Error('Không đủ dữ liệu cho backtest, cần ít nhất 50 nến');
    }
    
    // Lấy mảng giá đóng cửa
    const closes = candles.map(candle => candle.close);
    
    // Khởi tạo các biến cho backtest
    let balance = initialCapital;
    let position = 0; // Số lượng coin đang nắm giữ
    let inPosition = false;
    const trades = [];
    const equityCurve = [];
    const drawdownCurve = [];
    
    let highWaterMark = initialCapital;
    let maxDrawdown = 0;
    let entryPrice = 0;
    let entryDate = '';
    
    // Khai báo các hàm xử lý tín hiệu giao dịch cho các chiến lược khác nhau
    const getSignals = {
      // Chiến lược SMA crossover
      sma_crossover: (index: number) => {
        if (index < 50) return 'hold';
        
        const shortSMA = calculateSMA(closes.slice(0, index + 1), 20);
        const longSMA = calculateSMA(closes.slice(0, index + 1), 50);
        
        const prevShortSMA = calculateSMA(closes.slice(0, index), 20);
        const prevLongSMA = calculateSMA(closes.slice(0, index), 50);
        
        // Tín hiệu mua: SMA ngắn hạn cắt lên trên SMA dài hạn
        if (prevShortSMA <= prevLongSMA && shortSMA > longSMA) {
          return 'buy';
        }
        
        // Tín hiệu bán: SMA ngắn hạn cắt xuống dưới SMA dài hạn
        if (prevShortSMA >= prevLongSMA && shortSMA < longSMA) {
          return 'sell';
        }
        
        return 'hold';
      },
      
      // Chiến lược MACD
      macd: (index: number) => {
        if (index < 50) return 'hold';
        
        const macdCurrent = calculateMACD(closes.slice(0, index + 1));
        const macdPrev = calculateMACD(closes.slice(0, index));
        
        // Tín hiệu mua: MACD cắt lên trên đường tín hiệu
        if (macdPrev.macd < macdPrev.signal && macdCurrent.macd > macdCurrent.signal) {
          return 'buy';
        }
        
        // Tín hiệu bán: MACD cắt xuống dưới đường tín hiệu
        if (macdPrev.macd > macdPrev.signal && macdCurrent.macd < macdCurrent.signal) {
          return 'sell';
        }
        
        return 'hold';
      },
      
      // Chiến lược Bollinger Bands
      bollinger_bands: (index: number) => {
        if (index < 20) return 'hold';
        
        const bbCurrent = calculateBollingerBands(closes.slice(0, index + 1));
        const price = closes[index];
        const prevPrice = closes[index - 1];
        
        // Tín hiệu mua: Giá từ dưới dải dưới đi lên
        if (prevPrice <= bbCurrent.lower && price > bbCurrent.lower) {
          return 'buy';
        }
        
        // Tín hiệu bán: Giá từ trên dải trên đi xuống
        if (prevPrice >= bbCurrent.upper && price < bbCurrent.upper) {
          return 'sell';
        }
        
        return 'hold';
      },
      
      // Chiến lược RSI
      rsi: (index: number) => {
        if (index < 14) return 'hold';
        
        const rsiCurrent = calculateRSI(closes.slice(0, index + 1));
        const rsiPrev = calculateRSI(closes.slice(0, index));
        
        // Tín hiệu mua: RSI tăng từ dưới 30
        if (rsiPrev < 30 && rsiCurrent >= 30) {
          return 'buy';
        }
        
        // Tín hiệu bán: RSI giảm từ trên 70
        if (rsiPrev > 70 && rsiCurrent <= 70) {
          return 'sell';
        }
        
        return 'hold';
      }
    };
    
    // Lặp qua từng nến để thực hiện backtest
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const date = new Date(candle.timestamp);
      
      // Cập nhật equity curve
      let currentEquity = balance;
      if (inPosition) {
        currentEquity = balance + (position * candle.close);
      }
      
      equityCurve.push({
        date: date.toISOString(),
        value: currentEquity
      });
      
      // Cập nhật drawdown
      if (currentEquity > highWaterMark) {
        highWaterMark = currentEquity;
      }
      
      const currentDrawdown = (highWaterMark - currentEquity) / highWaterMark;
      drawdownCurve.push({
        date: date.toISOString(),
        value: currentDrawdown
      });
      
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
      
      // Lấy tín hiệu giao dịch dựa trên chiến lược
      const signal = getSignals[strategy](i);
      
      // Xử lý tín hiệu
      if (signal === 'buy' && !inPosition) {
        // Thực hiện mua
        entryPrice = candle.close;
        position = balance / entryPrice;
        balance = 0;
        inPosition = true;
        entryDate = date.toISOString();
      } else if (signal === 'sell' && inPosition) {
        // Thực hiện bán
        balance = position * candle.close;
        
        // Ghi nhận giao dịch
        const exitPrice = candle.close;
        const profitLoss = position * (exitPrice - entryPrice);
        const profitLossPercentage = (exitPrice / entryPrice - 1) * 100;
        
        trades.push({
          type: 'buy' as 'buy' | 'sell',
          entryDate,
          entryPrice,
          exitDate: date.toISOString(),
          exitPrice,
          profitLoss,
          profitLossPercentage,
          reason: `${strategy} tín hiệu bán`
        });
        
        position = 0;
        inPosition = false;
      }
    }
    
    // Bán nốt nếu vẫn còn vị thế mở
    if (inPosition) {
      const lastCandle = candles[candles.length - 1];
      balance = position * lastCandle.close;
      
      // Ghi nhận giao dịch cuối cùng
      const exitPrice = lastCandle.close;
      const profitLoss = position * (exitPrice - entryPrice);
      const profitLossPercentage = (exitPrice / entryPrice - 1) * 100;
      
      trades.push({
        type: 'buy' as 'buy' | 'sell',
        entryDate,
        entryPrice,
        exitDate: new Date(lastCandle.timestamp).toISOString(),
        exitPrice,
        profitLoss,
        profitLossPercentage,
        reason: 'Đóng vị thế cuối kỳ'
      });
    }
    
    // Tính toán thống kê
    const finalCapital = balance;
    const profitLoss = finalCapital - initialCapital;
    const profitLossPercentage = (profitLoss / initialCapital) * 100;
    
    const winningTrades = trades.filter(t => t.profitLoss > 0);
    const losingTrades = trades.filter(t => t.profitLoss <= 0);
    
    const winRate = winningTrades.length / trades.length;
    
    const averageWin = winningTrades.length > 0
      ? winningTrades.reduce((sum, t) => sum + t.profitLoss, 0) / winningTrades.length
      : 0;
      
    const averageLoss = losingTrades.length > 0
      ? losingTrades.reduce((sum, t) => sum + t.profitLoss, 0) / losingTrades.length
      : 0;
    
    // Tính Sharpe Ratio (đơn giản)
    let returns = [];
    for (let i = 1; i < equityCurve.length; i++) {
      returns.push((equityCurve[i].value / equityCurve[i-1].value) - 1);
    }
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const stdDevReturns = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - meanReturn, 2), 0) / returns.length
    );
    
    const sharpeRatio = meanReturn / stdDevReturns * Math.sqrt(252); // Điều chỉnh theo số ngày giao dịch trong năm
    
    return {
      symbol,
      timeframe,
      startDate,
      endDate,
      initialCapital,
      finalCapital,
      profitLoss,
      profitLossPercentage,
      maxDrawdown,
      maxDrawdownPercentage: maxDrawdown * 100,
      winRate,
      totalTrades: trades.length,
      winningTrades: winningTrades.length,
      losingTrades: losingTrades.length,
      averageWin,
      averageLoss,
      sharpeRatio,
      trades,
      chart: {
        equityCurve,
        drawdownCurve
      }
    };
  } catch (error: any) {
    console.error(`[runBacktestStrategy] Lỗi khi chạy backtest cho ${symbol}:`, error);
    throw new Error(`Lỗi khi chạy backtesting: ${error.message}`);
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
    let portfolioWeights: Record<string, number> = {};
    
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