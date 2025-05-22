/**
 * Market Data Retriever
 * 
 * Module này quản lý việc lấy dữ liệu thị trường từ nhiều nguồn, bao gồm
 * cả API Binance, dữ liệu lưu trữ cục bộ và các nhà cung cấp dữ liệu khác.
 */

/**
 * Định nghĩa cấu trúc dữ liệu nến
 */
export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Tham số để lấy dữ liệu nến
 */
export interface CandlesParams {
  symbol: string;
  interval: string;
  limit?: number;
  startTime?: number;
  endTime?: number;
  forceRealData?: boolean;
}

/**
 * Kết quả từ quá trình lấy dữ liệu nến
 */
export interface CandlesResult {
  success: boolean;
  data?: Candle[];
  source?: 'binance_api' | 'ccxt' | 'local_storage' | 'mock';
  error?: string;
}

/**
 * Thông tin thị trường cơ bản
 */
export interface MarketInfo {
  symbol: string;
  price: number;
  change24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  lastUpdated: number;
}

/**
 * MarketDataRetriever quản lý việc lấy dữ liệu thị trường
 */
export class MarketDataRetriever {
  private cacheTTL: number = 60000; // 1 phút
  private cachedData: Map<string, { data: any, timestamp: number }> = new Map();
  
  constructor() {
    console.log('[MarketDataRetriever] Khởi tạo...');
  }
  
  /**
   * Lấy dữ liệu nến từ API
   */
  public async getCandles(params: CandlesParams): Promise<CandlesResult> {
    console.log(`[MarketDataRetriever] Lấy dữ liệu nến cho ${params.symbol} (${params.interval})`);
    
    // Tạo khóa cache
    const cacheKey = `candles_${params.symbol}_${params.interval}_${params.limit || 100}`;
    
    // Kiểm tra cache
    const cached = this.getCached(cacheKey);
    if (cached && !params.forceRealData) {
      console.log(`[MarketDataRetriever] Sử dụng dữ liệu cache cho ${params.symbol}`);
      return cached as CandlesResult;
    }
    
    try {
      // Xây dựng tham số cho API
      let url = `/api/technical/candles?symbol=${params.symbol}&interval=${params.interval}`;
      
      if (params.limit) {
        url += `&limit=${params.limit}`;
      }
      
      if (params.startTime) {
        url += `&startTime=${params.startTime}`;
      }
      
      if (params.endTime) {
        url += `&endTime=${params.endTime}`;
      }
      
      if (params.forceRealData) {
        url += `&force_real_data=true`;
      }
      
      console.log(`[MarketDataRetriever] Gọi API: ${url}`);
      
      // Gọi API
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // Lưu vào cache
      this.setCached(cacheKey, result);
      
      return result;
    } catch (error: any) {
      console.error(`[MarketDataRetriever] Lỗi khi lấy dữ liệu nến:`, error);
      
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi lấy dữ liệu nến'
      };
    }
  }
  
  /**
   * Lấy thông tin thị trường cho một mã tiền
   */
  public async getMarketInfo(symbol: string): Promise<MarketInfo | null> {
    console.log(`[MarketDataRetriever] Lấy thông tin thị trường cho ${symbol}`);
    
    const cacheKey = `market_info_${symbol}`;
    
    // Kiểm tra cache
    const cached = this.getCached(cacheKey);
    if (cached) {
      return cached as MarketInfo;
    }
    
    try {
      // Định dạng symbol nếu cần
      const formattedSymbol = symbol.includes('USDT') ? symbol : `${symbol}USDT`;
      
      // Thực hiện hai cuộc gọi song song để lấy dữ liệu giá hiện tại và dữ liệu 24h
      const [tickerResponse, dayStatsResponse] = await Promise.all([
        fetch(`https://api.binance.com/api/v3/ticker/price?symbol=${formattedSymbol}`),
        fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${formattedSymbol}`)
      ]);
      
      if (!tickerResponse.ok || !dayStatsResponse.ok) {
        throw new Error('Không thể lấy dữ liệu từ Binance API');
      }
      
      const ticker = await tickerResponse.json();
      const dayStats = await dayStatsResponse.json();
      
      // Tạo đối tượng thông tin thị trường
      const marketInfo: MarketInfo = {
        symbol: formattedSymbol,
        price: parseFloat(ticker.price),
        change24h: parseFloat(dayStats.priceChangePercent),
        volume24h: parseFloat(dayStats.volume),
        high24h: parseFloat(dayStats.highPrice),
        low24h: parseFloat(dayStats.lowPrice),
        lastUpdated: Date.now()
      };
      
      // Lưu vào cache
      this.setCached(cacheKey, marketInfo);
      
      return marketInfo;
    } catch (error: any) {
      console.error(`[MarketDataRetriever] Lỗi khi lấy thông tin thị trường:`, error);
      return null;
    }
  }
  
  /**
   * Lấy dữ liệu RSI cho một mã tiền
   */
  public async getRSI(symbol: string, interval: string = '1d', period: number = 14): Promise<number | null> {
    console.log(`[MarketDataRetriever] Tính toán RSI cho ${symbol} (${interval}), period=${period}`);
    
    try {
      // Lấy dữ liệu nến
      const candlesResult = await this.getCandles({
        symbol,
        interval,
        limit: period * 3 // Cần ít nhất gấp đôi period để tính RSI chính xác
      });
      
      if (!candlesResult.success || !candlesResult.data || candlesResult.data.length < period + 1) {
        throw new Error('Không đủ dữ liệu để tính RSI');
      }
      
      // Trích xuất giá đóng cửa
      const closePrices = candlesResult.data.map(candle => candle.close);
      
      // Tính RSI
      const rsi = this.calculateRSI(closePrices, period);
      return rsi;
    } catch (error: any) {
      console.error(`[MarketDataRetriever] Lỗi khi tính RSI:`, error);
      return null;
    }
  }
  
  /**
   * Lấy dữ liệu MA cho một mã tiền
   */
  public async getMA(symbol: string, interval: string = '1d', period: number = 50): Promise<number | null> {
    console.log(`[MarketDataRetriever] Tính toán MA${period} cho ${symbol} (${interval})`);
    
    try {
      // Lấy dữ liệu nến
      const candlesResult = await this.getCandles({
        symbol,
        interval,
        limit: period + 10 // Thêm một chút dữ liệu dự phòng
      });
      
      if (!candlesResult.success || !candlesResult.data || candlesResult.data.length < period) {
        throw new Error('Không đủ dữ liệu để tính MA');
      }
      
      // Trích xuất giá đóng cửa
      const closePrices = candlesResult.data.map(candle => candle.close);
      
      // Tính MA
      const ma = this.calculateMA(closePrices, period);
      return ma;
    } catch (error: any) {
      console.error(`[MarketDataRetriever] Lỗi khi tính MA:`, error);
      return null;
    }
  }
  
  /**
   * Tính toán RSI
   */
  private calculateRSI(prices: number[], period: number): number {
    if (prices.length <= period) {
      throw new Error('Không đủ dữ liệu để tính RSI');
    }
    
    // Tính toán các thay đổi giá
    const changes = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // Phân tách thành gains và losses
    const gains = changes.map(change => change > 0 ? change : 0);
    const losses = changes.map(change => change < 0 ? Math.abs(change) : 0);
    
    // Tính average gain và average loss
    let avgGain = gains.slice(0, period).reduce((sum, gain) => sum + gain, 0) / period;
    let avgLoss = losses.slice(0, period).reduce((sum, loss) => sum + loss, 0) / period;
    
    // Tính RSI cho điểm đầu tiên
    let rs = avgGain / (avgLoss || 0.001); // Tránh chia cho 0
    let rsi = 100 - (100 / (1 + rs));
    
    // Tính RSI cho các điểm còn lại
    for (let i = period; i < changes.length; i++) {
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period;
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period;
      
      rs = avgGain / (avgLoss || 0.001);
      rsi = 100 - (100 / (1 + rs));
    }
    
    return parseFloat(rsi.toFixed(2));
  }
  
  /**
   * Tính toán MA
   */
  private calculateMA(prices: number[], period: number): number {
    if (prices.length < period) {
      throw new Error('Không đủ dữ liệu để tính MA');
    }
    
    const slice = prices.slice(prices.length - period);
    const sum = slice.reduce((total, price) => total + price, 0);
    return parseFloat((sum / period).toFixed(2));
  }
  
  /**
   * Lấy dữ liệu từ cache
   */
  private getCached(key: string): any | null {
    const cached = this.cachedData.get(key);
    
    if (!cached) {
      return null;
    }
    
    // Kiểm tra TTL
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.cachedData.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  /**
   * Lưu dữ liệu vào cache
   */
  private setCached(key: string, data: any): void {
    this.cachedData.set(key, {
      data,
      timestamp: Date.now()
    });
  }
} 