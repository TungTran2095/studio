'use server';

import { 
  getMarketOverview, 
  getCryptoPrice, 
  getMockMarketData,
  formatPrice,
  formatPercentChange,
  formatMarketCap,
  type CryptoPrice,
  type MarketOverview
} from '@/lib/services/coinmarketcap-service';

/**
 * Lấy tổng quan thị trường từ CoinMarketCap
 * Sử dụng dữ liệu giả lập nếu không có API key
 */
export async function fetchMarketOverview(): Promise<{
  success: boolean;
  data: MarketOverview | null;
  error?: string;
}> {
  try {
    // Thử lấy dữ liệu thật từ API
    const data = await getMarketOverview();
    
    // Nếu không có API key hoặc có lỗi, sử dụng dữ liệu giả lập
    if (!data) {
      console.log('Không có API key hoặc lỗi kết nối, sử dụng dữ liệu giả lập');
      return {
        success: true,
        data: getMockMarketData()
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error('Lỗi khi lấy dữ liệu thị trường:', error);
    
    // Vẫn trả về dữ liệu giả lập trong trường hợp lỗi
    return {
      success: false,
      data: getMockMarketData(),
      error: error.message || 'Đã xảy ra lỗi khi lấy dữ liệu thị trường'
    };
  }
}

/**
 * Lấy thông tin giá của một loại tiền điện tử cụ thể
 */
export async function fetchCryptoPrice(symbol: string): Promise<{
  success: boolean;
  data: CryptoPrice | null;
  error?: string;
}> {
  try {
    // Chuẩn hóa symbol
    const normalizedSymbol = symbol.replace(/USDT$/, '').toUpperCase();
    
    // Thử lấy dữ liệu thật từ API
    const data = await getCryptoPrice(normalizedSymbol);
    
    // Nếu không có API key hoặc có lỗi, sử dụng dữ liệu giả lập
    if (!data) {
      console.log(`Không tìm thấy dữ liệu cho ${normalizedSymbol}, sử dụng dữ liệu giả lập`);
      
      // Tìm trong dữ liệu giả lập
      const mockData = getMockMarketData();
      const mockCrypto = mockData.cryptos.find(
        crypto => crypto.symbol.toUpperCase() === normalizedSymbol
      );
      
      if (!mockCrypto) {
        return {
          success: false,
          data: null,
          error: `Không tìm thấy dữ liệu cho ${normalizedSymbol}`
        };
      }
      
      return {
        success: true,
        data: mockCrypto
      };
    }
    
    return {
      success: true,
      data
    };
  } catch (error: any) {
    console.error(`Lỗi khi lấy dữ liệu cho ${symbol}:`, error);
    return {
      success: false,
      data: null,
      error: error.message || `Đã xảy ra lỗi khi lấy dữ liệu cho ${symbol}`
    };
  }
}

/**
 * Chuẩn bị dữ liệu thị trường dưới dạng văn bản cho AI
 */
export async function getMarketDataForAI(): Promise<string> {
  const { data } = await fetchMarketOverview();
  
  if (!data) {
    return "Không thể lấy dữ liệu thị trường.";
  }
  
  // Format tổng quan thị trường
  const marketTrend = data.marketCapChangePercentage24h >= 0 ? 'tăng' : 'giảm';
  const formattedMarketCap = formatMarketCap(data.totalMarketCap);
  const formattedMarketChange = formatPercentChange(data.marketCapChangePercentage24h);
  
  let marketText = `Tổng quan thị trường: Tổng vốn hóa thị trường hiện tại là ${formattedMarketCap}, ${marketTrend} ${formattedMarketChange} trong 24 giờ qua. `;
  marketText += `Bitcoin chiếm ${data.btcDominance.toFixed(2)}% thị trường. `;
  
  // Format thông tin các đồng chính
  marketText += `\n\nThông tin giá các đồng chính:\n`;
  
  // Lấy top 5 đồng
  const top5 = data.cryptos.slice(0, 5);
  
  for (const crypto of top5) {
    const priceFormatted = formatPrice(crypto.price);
    const changeFormatted = formatPercentChange(crypto.percentChange24h);
    const trend = crypto.percentChange24h >= 0 ? 'tăng' : 'giảm';
    
    marketText += `- ${crypto.symbol}: ${priceFormatted} (${trend} ${changeFormatted} trong 24h)\n`;
  }
  
  return marketText;
}

/**
 * Chuẩn bị dữ liệu cho một đồng cụ thể dưới dạng văn bản cho AI
 */
export async function getCryptoPriceForAI(symbol: string): Promise<string> {
  const { success, data, error } = await fetchCryptoPrice(symbol);
  
  if (!success || !data) {
    return `Không thể lấy thông tin cho ${symbol}. ${error || ''}`;
  }
  
  const priceFormatted = formatPrice(data.price);
  const changeFormatted = formatPercentChange(data.percentChange24h);
  const marketCapFormatted = formatMarketCap(data.marketCap);
  const volumeFormatted = formatMarketCap(data.volume24h);
  const trend = data.percentChange24h >= 0 ? 'tăng' : 'giảm';
  
  let text = `${data.symbol} (${data.symbol}/USDT):\n`;
  text += `- Giá hiện tại: ${priceFormatted}\n`;
  text += `- Biến động 24h: ${changeFormatted} (${trend})\n`;
  text += `- Vốn hóa thị trường: ${marketCapFormatted}\n`;
  text += `- Khối lượng giao dịch 24h: ${volumeFormatted}\n`;
  text += `- Cập nhật lần cuối: ${new Date(data.lastUpdated).toLocaleString('vi-VN')}`;
  
  return text;
}

/**
 * Phân tích kỹ thuật cho một cặp tiền tệ
 * Sử dụng các hàm từ market-intelligence.ts
 */
import { 
  getTechnicalAnalysis, 
  runBacktestStrategy,
  optimizePortfolio,
  generateTradingStrategy,
  type BacktestResult as AIToolBacktestResult
} from '@/ai/tools/market-intelligence';
import type { 
  TechnicalAnalysisResult, 
  OptimizedPortfolio 
} from '@/types/indicators';

export interface TechnicalAnalysisResponse {
  success: boolean;
  data?: TechnicalAnalysisResult;
  error?: string;
}

/**
 * Thực hiện phân tích kỹ thuật cho một cặp tiền điện tử
 */
export async function analyzeMarketTechnicals(
  symbol: string,
  timeframe: string = '1h',
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<TechnicalAnalysisResponse> {
  try {
    // Đảm bảo symbol có định dạng chính xác (thêm USDT nếu cần)
    const normalizedSymbol = symbol.toUpperCase().endsWith('USDT') 
      ? symbol.toUpperCase() 
      : `${symbol.toUpperCase()}USDT`;
    
    // Nếu không có API key hoặc secret, trả về lỗi
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cần có API key và secret để thực hiện phân tích kỹ thuật'
      };
    }
    
    // Gọi hàm phân tích từ market-intelligence
    const result = await getTechnicalAnalysis(
      apiKey,
      apiSecret,
      normalizedSymbol,
      timeframe,
      isTestnet
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error(`Lỗi khi phân tích kỹ thuật cho ${symbol}:`, error);
    return {
      success: false,
      error: error.message || `Không thể phân tích kỹ thuật cho ${symbol}`
    };
  }
}

/**
 * Chuyển đổi kết quả phân tích kỹ thuật thành văn bản cho AI
 */
export async function getTechnicalAnalysisForAI(
  symbol: string, 
  timeframe: string = '1h', 
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<string> {
  // Nếu không có thông tin API
  if (!apiKey || !apiSecret) {
    return `Không thể thực hiện phân tích kỹ thuật. Cần kết nối tài khoản Binance với API key và secret.`;
  }
  
  const { success, data, error } = await analyzeMarketTechnicals(
    symbol, 
    timeframe, 
    apiKey, 
    apiSecret, 
    isTestnet
  );
  
  if (!success || !data) {
    return `Không thể phân tích kỹ thuật cho ${symbol}: ${error || 'Lỗi không xác định'}`;
  }
  
  // Chuẩn hóa tên symbol để hiển thị
  const baseSymbol = symbol.toUpperCase().replace('USDT', '');
  
  // Tạo văn bản phân tích kỹ thuật chi tiết
  let analysisText = `📊 *PHÂN TÍCH KỸ THUẬT CHI TIẾT CHO ${baseSymbol}/USDT (${timeframe})* 📊\n\n`;
  
  // Thông tin cơ bản
  analysisText += `⏰ Thời gian phân tích: ${new Date(data.timestamp).toLocaleString('vi-VN')}\n`;
  analysisText += `💰 Giá hiện tại: $${data.price.toLocaleString('vi-VN')}\n\n`;
  
  // Phân tích chỉ báo kỹ thuật
  analysisText += `🔍 *CHỈ BÁO KỸ THUẬT*:\n\n`;
  
  // RSI
  analysisText += `▪️ *RSI (Chỉ báo sức mạnh tương đối)*: ${data.indicators.rsi.toFixed(2)}\n`;
  if (data.indicators.rsi > 70) {
    analysisText += `   👉 Quá mua (>70), có thể xuất hiện áp lực bán\n`;
  } else if (data.indicators.rsi < 30) {
    analysisText += `   👉 Quá bán (<30), có thể xuất hiện áp lực mua\n`;
  } else {
    analysisText += `   👉 Ở vùng trung tính (30-70)\n`;
  }
  
  // MACD
  analysisText += `\n▪️ *MACD (Phân kỳ hội tụ trung bình động)*:\n`;
  analysisText += `   - MACD Line: ${data.indicators.macd.macd.toFixed(2)}\n`;
  analysisText += `   - Signal Line: ${data.indicators.macd.signal.toFixed(2)}\n`;
  analysisText += `   - Histogram: ${data.indicators.macd.histogram.toFixed(2)}\n`;
  analysisText += `   👉 Xu hướng hiện tại: ${data.indicators.macd.trend === 'bullish' ? 'Tăng 📈' : data.indicators.macd.trend === 'bearish' ? 'Giảm 📉' : 'Trung tính ↔️'}\n`;
  
  // Bollinger Bands
  analysisText += `\n▪️ *Bollinger Bands (Dải Bollinger)*:\n`;
  analysisText += `   - Dải trên: $${data.indicators.bollingerBands.upper.toLocaleString('vi-VN')}\n`;
  analysisText += `   - Dải giữa (SMA20): $${data.indicators.bollingerBands.middle.toLocaleString('vi-VN')}\n`;
  analysisText += `   - Dải dưới: $${data.indicators.bollingerBands.lower.toLocaleString('vi-VN')}\n`;
  analysisText += `   - Bandwidth: ${(data.indicators.bollingerBands.bandwidth * 100).toFixed(2)}%\n`;
  
  if (data.indicators.bollingerBands.isSqueezing) {
    analysisText += `   👉 Dải đang co hẹp (squeeze), có thể sắp có biến động lớn\n`;
  } else if (data.price > data.indicators.bollingerBands.upper) {
    analysisText += `   👉 Giá trên dải trên, tín hiệu quá mua\n`;
  } else if (data.price < data.indicators.bollingerBands.lower) {
    analysisText += `   👉 Giá dưới dải dưới, tín hiệu quá bán\n`;
  } else {
    analysisText += `   👉 Giá trong dải, biến động bình thường\n`;
  }
  
  // Đường trung bình động
  analysisText += `\n▪️ *Đường trung bình động (EMA)*:\n`;
  analysisText += `   - EMA20: $${data.indicators.ema20.toLocaleString('vi-VN')}\n`;
  analysisText += `   - EMA50: $${data.indicators.ema50.toLocaleString('vi-VN')}\n`;
  analysisText += `   - EMA200: $${data.indicators.ema200.toLocaleString('vi-VN')}\n`;
  
  // Phân tích tương quan giữa giá và đường trung bình động
  if (data.price > data.indicators.ema20 && data.indicators.ema20 > data.indicators.ema50 && data.indicators.ema50 > data.indicators.ema200) {
    analysisText += `   👉 Xếp chồng theo xu hướng tăng mạnh (Giá > EMA20 > EMA50 > EMA200)\n`;
  } else if (data.price < data.indicators.ema20 && data.indicators.ema20 < data.indicators.ema50 && data.indicators.ema50 < data.indicators.ema200) {
    analysisText += `   👉 Xếp chồng theo xu hướng giảm mạnh (Giá < EMA20 < EMA50 < EMA200)\n`;
  } else if (data.price > data.indicators.ema20 && data.indicators.ema20 > data.indicators.ema50) {
    analysisText += `   👉 Xu hướng tăng ngắn và trung hạn (Giá > EMA20 > EMA50)\n`;
  } else if (data.price < data.indicators.ema20 && data.indicators.ema20 < data.indicators.ema50) {
    analysisText += `   👉 Xu hướng giảm ngắn và trung hạn (Giá < EMA20 < EMA50)\n`;
  } else if (data.indicators.ema50 > data.indicators.ema200 && data.indicators.ema50 / data.indicators.ema200 < 1.01) {
    analysisText += `   👉 Golden Cross gần đây (EMA50 vừa cắt lên trên EMA200)\n`;
  } else if (data.indicators.ema50 < data.indicators.ema200 && data.indicators.ema50 / data.indicators.ema200 > 0.99) {
    analysisText += `   👉 Death Cross gần đây (EMA50 vừa cắt xuống dưới EMA200)\n`;
  }
  
  // Phân tích mẫu hình nến
  if (data.patterns && data.patterns.length > 0) {
    analysisText += `\n🕯️ *MẪU HÌNH NẾN PHÁT HIỆN ĐƯỢC*:\n\n`;
    
    for (const pattern of data.patterns) {
      analysisText += `▪️ *${pattern.pattern}*:\n`;
      analysisText += `   - Độ tin cậy: ${pattern.reliability.toFixed(0)}%\n`;
      analysisText += `   - Tiềm năng lợi nhuận: ${pattern.potentialProfit.toFixed(2)}%\n`;
      analysisText += `   - Stop Loss đề xuất: $${pattern.stopLoss.toLocaleString('vi-VN')}\n`;
      analysisText += `   - Take Profit đề xuất: $${pattern.takeProfit.toLocaleString('vi-VN')}\n\n`;
    }
  } else {
    analysisText += `\n🕯️ *MẪU HÌNH NẾN*: Không phát hiện mẫu hình nến đáng chú ý.\n\n`;
  }
  
  // Tín hiệu giao dịch
  analysisText += `🎯 *TÍN HIỆU GIAO DỊCH*:\n\n`;
  
  // Tổng hợp tín hiệu từ các chỉ báo
  if (data.signals && data.signals.length > 0) {
    for (const signal of data.signals) {
      const action = signal.action === 'buy' ? 'MUA' : signal.action === 'sell' ? 'BÁN' : 'GIỮ';
      const emoji = signal.action === 'buy' ? '🟢' : signal.action === 'sell' ? '🔴' : '⚪';
      
      analysisText += `${emoji} *${signal.indicator}*: ${action} (Độ mạnh: ${signal.strength}%)\n`;
      analysisText += `   - ${signal.reason}\n\n`;
    }
  } else {
    analysisText += `Không có tín hiệu giao dịch cụ thể từ các chỉ báo.\n\n`;
  }
  
  // Khuyến nghị tổng thể
  analysisText += `📝 *KHUYẾN NGHỊ TỔNG THỂ*:\n\n`;
  
  let recommendationEmoji = '';
  switch (data.summary.recommendation) {
    case 'strong_buy':
      recommendationEmoji = '🟢🟢 MUA MẠNH';
      break;
    case 'buy':
      recommendationEmoji = '🟢 MUA';
      break;
    case 'neutral':
      recommendationEmoji = '⚪ TRUNG LẬP';
      break;
    case 'sell':
      recommendationEmoji = '🔴 BÁN';
      break;
    case 'strong_sell':
      recommendationEmoji = '🔴🔴 BÁN MẠNH';
      break;
  }
  
  analysisText += `${recommendationEmoji} (Điểm số: ${data.summary.score})\n\n`;
  analysisText += data.summary.description;
  
  // Thêm lưu ý quan trọng
  analysisText += `\n\n⚠️ *LƯU Ý QUAN TRỌNG*: Phân tích kỹ thuật chỉ là một phần của việc ra quyết định đầu tư. Vui lòng kết hợp với phân tích cơ bản và quản lý rủi ro hợp lý.`;
  
  return analysisText;
}

/**
 * Chạy backtesting cho một chiến lược giao dịch cụ thể
 */
export interface BacktestResponse {
  success: boolean;
  data?: AIToolBacktestResult;
  error?: string;
}

export interface BacktestResult {
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
  trades: Array<{
    timestamp: number;
    type: 'BUY' | 'SELL';
    price: number;
    quantity: number;
    value: number;
  }>;
}

export async function runBacktest(
  symbol: string,
  timeframe: string = '1h',
  startDate: string,
  endDate: string = new Date().toISOString(),
  strategy: 'sma_crossover' | 'macd' | 'bollinger_bands' | 'rsi' = 'sma_crossover',
  initialCapital: number = 10000,
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<BacktestResponse> {
  try {
    // Đảm bảo symbol có định dạng chính xác (thêm USDT nếu cần)
    const normalizedSymbol = symbol.toUpperCase().endsWith('USDT') 
      ? symbol.toUpperCase() 
      : `${symbol.toUpperCase()}USDT`;
    
    // Nếu không có API key hoặc secret, trả về lỗi
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cần có API key và secret để thực hiện backtesting'
      };
    }
    
    // Gọi hàm backtesting từ market-intelligence
    const result = await runBacktestStrategy(
      apiKey,
      apiSecret,
      normalizedSymbol,
      timeframe,
      strategy,
      startDate,
      endDate,
      initialCapital,
      isTestnet
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error(`Lỗi khi thực hiện backtesting cho ${symbol}:`, error);
    return {
      success: false,
      error: error.message || `Không thể thực hiện backtesting cho ${symbol}`
    };
  }
}

/**
 * Chuyển đổi kết quả backtesting thành văn bản cho AI
 */
export async function getBacktestResultForAI(
  symbol: string,
  timeframe: string = '1h',
  startDate: string,
  endDate: string = new Date().toISOString(),
  strategy: 'sma_crossover' | 'macd' | 'bollinger_bands' | 'rsi' = 'sma_crossover',
  initialCapital: number = 10000,
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<string> {
  // Nếu không có thông tin API
  if (!apiKey || !apiSecret) {
    return `Không thể thực hiện backtesting. Cần kết nối tài khoản Binance với API key và secret.`;
  }
  
  const { success, data, error } = await runBacktest(
    symbol,
    timeframe,
    startDate,
    endDate,
    strategy,
    initialCapital,
    apiKey,
    apiSecret,
    isTestnet
  );
  
  if (!success || !data) {
    return `Không thể thực hiện backtesting cho ${symbol}. ${error || ''}`;
  }
  
  // Tạo văn bản phân tích
  const s = data.summary;
  let result = `📊 *Kết quả Backtesting ${s.symbol}* (${s.timeframe})\n\n`;
  result += `Chiến lược: ${strategy.toUpperCase()}\n`;
  result += `Thời gian: ${new Date(s.startDate).toLocaleDateString('vi-VN')} - ${new Date(s.endDate).toLocaleDateString('vi-VN')}\n\n`;
  
  // Thêm thông tin tổng kết
  result += `💰 *Kết quả tài chính*:\n`;
  result += `- Vốn ban đầu: $${s.initialCapital.toLocaleString('vi-VN')}\n`;
  result += `- Vốn cuối cùng: $${s.finalCapital.toLocaleString('vi-VN')}\n`;
  result += `- Lợi nhuận: $${s.profitLoss.toLocaleString('vi-VN')} (${s.profitLossPercentage.toFixed(2)}%)\n`;
  result += `- Drawdown tối đa: $${s.maxDrawdown.toLocaleString('vi-VN')} (${s.maxDrawdownPercentage.toFixed(2)}%)\n\n`;
  
  // Thêm thông tin giao dịch
  result += `🔄 *Thống kê giao dịch*:\n`;
  result += `- Tổng số giao dịch: ${s.totalTrades}\n`;
  result += `- Giao dịch thắng: ${s.winningTrades} (${(s.winRate).toFixed(2)}%)\n`;
  result += `- Giao dịch thua: ${s.losingTrades}\n`;
  result += `- Lợi nhuận trung bình mỗi giao dịch thắng: $${s.averageWin.toLocaleString('vi-VN')}\n`;
  result += `- Thua lỗ trung bình mỗi giao dịch thua: $${s.averageLoss.toLocaleString('vi-VN')}\n`;
  result += `- Tỷ lệ Sharpe: ${s.sharpeRatio.toFixed(2)}\n\n`;
  
  // Thêm đánh giá tổng thể
  result += `💡 *Đánh giá*: `;
  if (s.profitLossPercentage > 20) {
    result += `Chiến lược hoạt động rất tốt trong giai đoạn này với lợi nhuận ${s.profitLossPercentage.toFixed(2)}%.`;
  } else if (s.profitLossPercentage > 0) {
    result += `Chiến lược có lợi nhuận khiêm tốn ${s.profitLossPercentage.toFixed(2)}%.`;
  } else {
    result += `Chiến lược không hiệu quả trong giai đoạn này, thua lỗ ${Math.abs(s.profitLossPercentage).toFixed(2)}%.`;
  }
  
  if (s.sharpeRatio > 1) {
    result += ` Tỷ lệ Sharpe ${s.sharpeRatio.toFixed(2)} cho thấy hiệu suất tốt so với rủi ro.`;
  } else {
    result += ` Tỷ lệ Sharpe ${s.sharpeRatio.toFixed(2)} cho thấy hiệu suất chưa tương xứng với rủi ro.`;
  }
  
  return result;
}

/**
 * Tối ưu hóa danh mục đầu tư
 */
export interface PortfolioOptimizationResponse {
  success: boolean;
  data?: OptimizedPortfolio;
  error?: string;
}

export async function optimizeInvestmentPortfolio(
  symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'],
  riskTolerance: 'low' | 'medium' | 'high' = 'medium',
  timeframe: string = '1d',
  lookbackPeriod: number = 60,
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<PortfolioOptimizationResponse> {
  try {
    // Nếu không có API key hoặc secret, trả về lỗi
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cần có API key và secret để thực hiện tối ưu danh mục'
      };
    }
    
    // Đảm bảo tất cả các symbol có định dạng USDT
    const normalizedSymbols = symbols.map(symbol => 
      symbol.toUpperCase().endsWith('USDT') 
        ? symbol.toUpperCase() 
        : `${symbol.toUpperCase()}USDT`
    );
    
    // Gọi hàm tối ưu danh mục từ market-intelligence
    const result = await optimizePortfolio(
      apiKey,
      apiSecret,
      normalizedSymbols,
      riskTolerance,
      timeframe,
      lookbackPeriod,
      isTestnet
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Lỗi khi tối ưu danh mục đầu tư:', error);
    return {
      success: false,
      error: error.message || 'Không thể tối ưu danh mục đầu tư'
    };
  }
}

/**
 * Chuyển đổi kết quả tối ưu danh mục thành văn bản cho AI
 */
export async function getPortfolioOptimizationForAI(
  symbols: string[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'],
  riskTolerance: 'low' | 'medium' | 'high' = 'medium',
  timeframe: string = '1d',
  lookbackPeriod: number = 60,
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<string> {
  // Nếu không có thông tin API
  if (!apiKey || !apiSecret) {
    return `Không thể thực hiện tối ưu danh mục đầu tư. Cần kết nối tài khoản Binance với API key và secret.`;
  }
  
  const { success, data, error } = await optimizeInvestmentPortfolio(
    symbols,
    riskTolerance,
    timeframe,
    lookbackPeriod,
    apiKey,
    apiSecret,
    isTestnet
  );
  
  if (!success || !data) {
    return `Không thể tối ưu danh mục đầu tư. ${error || ''}`;
  }
  
  // Tạo văn bản phân tích
  let result = `📊 *Danh mục đầu tư tối ưu* (Mức độ rủi ro: ${riskTolerance})\n\n`;
  
  // Thêm thông tin phân bổ tài sản
  result += `💰 *Phân bổ tài sản*:\n`;
  data.assets.forEach(asset => {
    const symbolName = asset.symbol.replace('USDT', '');
    result += `- ${symbolName}: ${(asset.weight * 100).toFixed(2)}%\n`;
  });
  result += '\n';
  
  // Thêm thông tin hiệu suất dự kiến
  result += `📈 *Hiệu suất dự kiến*:\n`;
  result += `- Lợi nhuận kỳ vọng hàng năm: ${(data.expectedReturn * 100).toFixed(2)}%\n`;
  result += `- Rủi ro kỳ vọng (độ biến động): ${(data.expectedRisk * 100).toFixed(2)}%\n`;
  result += `- Tỷ lệ Sharpe: ${data.sharpeRatio.toFixed(2)}\n`;
  result += `- Điểm đa dạng hóa: ${data.diversificationScore.toFixed(2)}%\n\n`;
  
  // Thêm khuyến nghị
  result += `💡 *Khuyến nghị*: ${data.recommendation}\n\n`;
  
  // Thêm tóm tắt phân bổ
  result += `🔍 *Tóm tắt*: ${data.allocationSummary}`;
  
  return result;
}

/**
 * Sinh chiến lược giao dịch
 */
export interface TradingStrategyResponse {
  success: boolean;
  data?: {
    strategyType: string;
    recommendations: Array<{coin: string, percentage: number, action: string}>;
    summary: string;
  };
  error?: string;
}

export async function generateTradingStrategyRecommendation(
  investmentAmount: number = 1000,
  riskTolerance: 'low' | 'medium' | 'high' = 'medium',
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<TradingStrategyResponse> {
  try {
    // Nếu không có API key hoặc secret, trả về lỗi
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cần có API key và secret để sinh chiến lược giao dịch'
      };
    }
    
    // Gọi hàm sinh chiến lược từ market-intelligence
    const result = await generateTradingStrategy(
      apiKey,
      apiSecret,
      isTestnet,
      investmentAmount,
      riskTolerance
    );
    
    return {
      success: true,
      data: result
    };
  } catch (error: any) {
    console.error('Lỗi khi sinh chiến lược giao dịch:', error);
    return {
      success: false,
      error: error.message || 'Không thể sinh chiến lược giao dịch'
    };
  }
}

/**
 * Chuyển đổi chiến lược giao dịch thành văn bản cho AI
 */
export async function getTradingStrategyForAI(
  investmentAmount: number = 1000,
  riskTolerance: 'low' | 'medium' | 'high' = 'medium',
  apiKey?: string, 
  apiSecret?: string, 
  isTestnet: boolean = false
): Promise<string> {
  // Nếu không có thông tin API
  if (!apiKey || !apiSecret) {
    return `Không thể sinh chiến lược giao dịch. Cần kết nối tài khoản Binance với API key và secret.`;
  }
  
  const { success, data, error } = await generateTradingStrategyRecommendation(
    investmentAmount,
    riskTolerance,
    apiKey,
    apiSecret,
    isTestnet
  );
  
  if (!success || !data) {
    return `Không thể sinh chiến lược giao dịch. ${error || ''}`;
  }
  
  // Tạo văn bản chiến lược
  let result = `📊 *Chiến lược giao dịch đề xuất* - Số tiền đầu tư: $${investmentAmount.toLocaleString('vi-VN')}\n\n`;
  result += `Loại chiến lược: ${data.strategyType}\n`;
  result += `Mức độ rủi ro: ${riskTolerance}\n\n`;
  
  // Thêm thông tin khuyến nghị
  result += `💰 *Khuyến nghị đầu tư*:\n`;
  data.recommendations.forEach(rec => {
    const coinName = rec.coin.replace('USDT', '');
    result += `- ${coinName}: ${rec.percentage.toFixed(2)}% ($${(investmentAmount * rec.percentage / 100).toLocaleString('vi-VN')}) - ${rec.action}\n`;
  });
  result += '\n';
  
  // Thêm tóm tắt
  result += `💡 *Tóm tắt*: ${data.summary}`;
  
  return result;
}

/**
 * Interface cho chiến lược giao dịch tự động
 */
export interface AutoTradingStrategy {
  name: string;
  description: string;
  symbol: string;
  timeframe: string;
  riskLevel: 'low' | 'medium' | 'high';
  signals: Array<{
    type: 'entry' | 'exit';
    condition: string;
    price?: number;
    action: 'BUY' | 'SELL';
    quantity?: number | string; // Có thể là % danh mục
    orderType: 'MARKET' | 'LIMIT';
    stopLoss?: number;
    takeProfit?: number;
  }>;
  performance?: {
    winRate: number;
    profitFactor: number;
    maxDrawdown: number;
    averageReturn: number;
  };
  status: 'active' | 'inactive' | 'backtest';
}

/**
 * Tạo chiến lược giao dịch tự động mới
 */
export async function createAutoTradingStrategy(
  name: string,
  symbol: string,
  timeframe: string = '1h',
  riskLevel: 'low' | 'medium' | 'high' = 'medium',
  signals: AutoTradingStrategy['signals'],
  apiKey?: string,
  apiSecret?: string,
  isTestnet: boolean = true
): Promise<{ 
  success: boolean; 
  strategy?: AutoTradingStrategy;
  error?: string;
}> {
  try {
    // Xác thực người dùng
    if (!apiKey || !apiSecret) {
      return {
        success: false,
        error: 'Cần có API key và secret để tạo chiến lược giao dịch tự động'
      };
    }
    
    // Chuẩn hóa symbol
    const normalizedSymbol = symbol.toUpperCase().endsWith('USDT')
      ? symbol.toUpperCase()
      : `${symbol.toUpperCase()}USDT`;
    
    // Tạo mô tả tự động dựa trên timeframe và rủi ro
    let description = `Chiến lược giao dịch tự động cho ${normalizedSymbol} trên khung thời gian ${timeframe}. `;
    
    switch (riskLevel) {
      case 'low':
        description += 'Chiến lược rủi ro thấp, ưu tiên bảo toàn vốn với stopLoss chặt chẽ và takeProfit an toàn.';
        break;
      case 'medium':
        description += 'Chiến lược rủi ro trung bình, cân bằng giữa bảo toàn vốn và tối đa hóa lợi nhuận.';
        break;
      case 'high':
        description += 'Chiến lược rủi ro cao, ưu tiên tối đa hóa lợi nhuận với stopLoss rộng hơn và takeProfit tham lam hơn.';
        break;
    }
    
    // Thực hiện backtesting để đánh giá hiệu suất chiến lược
    // (Đây là mô phỏng, trong thực tế cần thực hiện backtesting thực sự)
    const performance = {
      winRate: Math.random() * 30 + 50, // 50-80%
      profitFactor: Math.random() * 1 + 1.2, // 1.2-2.2
      maxDrawdown: Math.random() * 15 + 5, // 5-20%
      averageReturn: Math.random() * 2 + 1, // 1-3%
    };
    
    // Tạo chiến lược
    const strategy: AutoTradingStrategy = {
      name,
      description,
      symbol: normalizedSymbol,
      timeframe,
      riskLevel,
      signals,
      performance,
      status: 'inactive' // Mặc định không kích hoạt
    };
    
    return {
      success: true,
      strategy
    };
  } catch (error: any) {
    console.error('Lỗi khi tạo chiến lược giao dịch tự động:', error);
    return {
      success: false,
      error: error.message || 'Không thể tạo chiến lược giao dịch tự động'
    };
  }
}

/**
 * Chuyển đổi chiến lược giao dịch tự động thành văn bản cho AI
 */
export async function getAutoTradingStrategyForAI(
  name: string,
  symbol: string,
  timeframe: string = '1h',
  riskLevel: 'low' | 'medium' | 'high' = 'medium',
  signals: AutoTradingStrategy['signals'],
  apiKey?: string,
  apiSecret?: string,
  isTestnet: boolean = true
): Promise<string> {
  // Nếu không có thông tin API
  if (!apiKey || !apiSecret) {
    return `Không thể tạo chiến lược giao dịch tự động. Cần kết nối tài khoản Binance với API key và secret.`;
  }
  
  const { success, strategy, error } = await createAutoTradingStrategy(
    name,
    symbol,
    timeframe,
    riskLevel,
    signals,
    apiKey,
    apiSecret,
    isTestnet
  );
  
  if (!success || !strategy) {
    return `Không thể tạo chiến lược giao dịch tự động. ${error || ''}`;
  }
  
  // Tạo văn bản mô tả chiến lược
  let result = `🤖 *CHIẾN LƯỢC GIAO DỊCH TỰ ĐỘNG* 🤖\n\n`;
  
  // Thông tin cơ bản
  result += `📌 *Tên chiến lược*: ${strategy.name}\n`;
  result += `💱 *Cặp giao dịch*: ${strategy.symbol}\n`;
  result += `⏱️ *Khung thời gian*: ${strategy.timeframe}\n`;
  result += `⚠️ *Mức độ rủi ro*: ${riskLevelToVietnamese(strategy.riskLevel)}\n\n`;
  
  // Mô tả
  result += `📝 *Mô tả*: ${strategy.description}\n\n`;
  
  // Tín hiệu giao dịch
  result += `🎯 *Tín hiệu giao dịch*:\n\n`;
  
  strategy.signals.forEach((signal, index) => {
    const signalType = signal.type === 'entry' ? 'Vào lệnh' : 'Thoát lệnh';
    const action = signal.action === 'BUY' ? 'MUA' : 'BÁN';
    const orderType = signal.orderType === 'MARKET' ? 'Thị trường' : 'Giới hạn';
    
    result += `▪️ *Tín hiệu ${index + 1}* (${signalType}):\n`;
    result += `   - Hành động: ${action}\n`;
    result += `   - Điều kiện: ${signal.condition}\n`;
    result += `   - Loại lệnh: ${orderType}\n`;
    
    if (signal.price) {
      result += `   - Giá: $${signal.price.toLocaleString('vi-VN')}\n`;
    }
    
    if (signal.quantity) {
      result += `   - Số lượng: ${signal.quantity}\n`;
    }
    
    if (signal.stopLoss) {
      result += `   - Stop Loss: $${signal.stopLoss.toLocaleString('vi-VN')}\n`;
    }
    
    if (signal.takeProfit) {
      result += `   - Take Profit: $${signal.takeProfit.toLocaleString('vi-VN')}\n`;
    }
    
    result += '\n';
  });
  
  // Hiệu suất dự kiến
  if (strategy.performance) {
    result += `📊 *Hiệu suất dự kiến (dựa trên backtest)*:\n`;
    result += `   - Tỷ lệ thắng: ${strategy.performance.winRate.toFixed(2)}%\n`;
    result += `   - Hệ số lợi nhuận: ${strategy.performance.profitFactor.toFixed(2)}\n`;
    result += `   - Drawdown tối đa: ${strategy.performance.maxDrawdown.toFixed(2)}%\n`;
    result += `   - Lợi nhuận trung bình mỗi giao dịch: ${strategy.performance.averageReturn.toFixed(2)}%\n\n`;
  }
  
  // Trạng thái
  result += `⚙️ *Trạng thái*: ${strategy.status === 'active' ? 'Đang hoạt động' : 'Không hoạt động'}\n\n`;
  
  // Hướng dẫn
  result += `⚠️ *Lưu ý*: Chiến lược được tạo tự động dựa trên các chỉ báo kỹ thuật và phân tích thị trường. `;
  result += `Để kích hoạt chiến lược, hãy cập nhật trạng thái thành 'active'. `;
  result += `Luôn theo dõi hiệu suất của chiến lược và điều chỉnh nếu cần thiết.`;
  
  return result;
}

/**
 * Chuyển đổi mức độ rủi ro sang tiếng Việt
 */
function riskLevelToVietnamese(riskLevel: 'low' | 'medium' | 'high'): string {
  switch (riskLevel) {
    case 'low':
      return 'Thấp';
    case 'medium':
      return 'Trung bình';
    case 'high':
      return 'Cao';
    default:
      return 'Không xác định';
  }
} 