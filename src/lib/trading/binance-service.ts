import Binance from 'binance-api-node';
import { TimeSync } from '@/lib/time-sync';
import { binanceCache } from '@/lib/cache/binance-cache';

export interface BinanceAccountInfo {
  makerCommission: number;
  takerCommission: number;
  buyerCommission: number;
  sellerCommission: number;
  canTrade: boolean;
  canWithdraw: boolean;
  canDeposit: boolean;
  updateTime: number;
  accountType: string;
  balances: Array<{
    asset: string;
    free: string;
    locked: string;
  }>;
  permissions: string[];
}

export interface BinanceCandle {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  closeTime: number;
  quoteAssetVolume: string;
  numberOfTrades: number;
  takerBuyBaseAssetVolume: string;
  takerBuyQuoteAssetVolume: string;
}

export interface BinancePrice {
  symbol: string;
  price: string;
}

export interface BinanceOrder {
  symbol: string;
  orderId: number;
  orderListId: number;
  clientOrderId: string;
  price: string;
  origQty: string;
  executedQty: string;
  cummulativeQuoteQty: string;
  status: string;
  timeInForce: string;
  type: string;
  side: string;
  stopPrice: string;
  icebergQty: string;
  time: number;
  updateTime: number;
  isWorking: boolean;
  origQuoteOrderQty: string;
}

export class BinanceService {
  private client: any;
  private apiKey: string;
  private apiSecret: string;
  private testnet: boolean;

  constructor(apiKey: string, apiSecret: string, testnet: boolean = false) {
    // Lưu credentials để có thể tạo lại client
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.testnet = testnet;
    
    // Không đồng bộ timestamp ở đây vì có thể gây delay
    // Sẽ đồng bộ trong retry logic khi cần
    
    this.client = Binance({
      apiKey,
      apiSecret,
      httpBase: testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
      // Sử dụng custom getTime function để đảm bảo timestamp chính xác
      getTime: () => {
        const now = Date.now();
        const safeTime = now - 1000; // Trừ 1 giây để đảm bảo an toàn
        console.log(`[BinanceService] Generating timestamp: ${safeTime} (${new Date(safeTime).toISOString()})`);
        return safeTime;
      }
    });
    
    console.log(`[BinanceService] Đã khởi tạo với getTime function (${testnet ? 'testnet' : 'realnet'})`);
  }

  /**
   * Retry logic với timestamp sync cho các API calls
   */
  private async retryWithTimestampSync<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    let lastError: any;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        // Kiểm tra nếu là lỗi timestamp hoặc recvWindow
        const isTimestampError = error.message && (
          error.message.includes('Timestamp for this request') ||
          error.message.includes('timestamp') ||
          error.message.includes('time') ||
          error.message.includes('recvWindow') ||
          error.message.includes('outside of the recvWindow') ||
          error.code === -1021 // Binance error code cho timestamp issues
        );
        
        if (isTimestampError && attempt < maxRetries) {
          console.log(`[BinanceService] Lỗi timestamp (attempt ${attempt}/${maxRetries}), đang sync lại...`);
          console.log(`[BinanceService] Error details:`, error);
          console.log(`[BinanceService] Bot type: ${this.testnet ? 'testnet' : 'realnet'}`);
          
          // Force sync timestamp
          try {
            await TimeSync.syncWithServer();
            
            // Đợi một chút để đảm bảo sync hoàn tất
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Tạo lại client với cấu hình mới
            this.client = Binance({
              apiKey: this.apiKey,
              apiSecret: this.apiSecret,
              httpBase: this.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
              // Sử dụng custom getTime function để đảm bảo timestamp chính xác
              getTime: () => {
                const now = Date.now();
                const safeTime = now - 1000; // Trừ 1 giây để đảm bảo an toàn
                console.log(`[BinanceService] Regenerating timestamp: ${safeTime} (${new Date(safeTime).toISOString()})`);
                return safeTime;
              }
            });
            
            console.log(`[BinanceService] Đã tạo lại client với timestamp sync (${this.testnet ? 'testnet' : 'realnet'})`);
            
            // Đợi thêm một chút trước khi thử lại
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } catch (syncError) {
            console.error('[BinanceService] Không thể sync timestamp:', syncError);
          }
        }
        
        // Nếu không phải lỗi timestamp hoặc đã hết retry, throw error
        if (attempt === maxRetries || !isTimestampError) {
          throw error;
        }
      }
    }
    
    throw lastError;
  }

  async getAccountInfo(): Promise<BinanceAccountInfo> {
    try {
      // Kiểm tra cache trước
      const cachedData = binanceCache.getAccountInfo();
      if (cachedData) {
        return cachedData;
      }

      // Cache miss - gọi API
      console.log('[BinanceService] 🔄 Fetching fresh account info from API');
      // Simplified: No rate limiting
      const accountInfo = await this.retryWithTimestampSync(() => this.client.accountInfo()) as BinanceAccountInfo;
      
      // Lưu vào cache
      binanceCache.setAccountInfo(accountInfo);
      
      return accountInfo;
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  async getExchangeInfo(): Promise<any> {
    try {
      // Kiểm tra cache trước
      const cachedData = binanceCache.getExchangeInfo();
      if (cachedData) {
        return cachedData;
      }

      // Cache miss - gọi API
      console.log('[BinanceService] 🔄 Fetching fresh exchange info from API');
      // Simplified: No rate limiting
      const exchangeInfo = await this.retryWithTimestampSync(() => this.client.exchangeInfo()) as any;
      
      // Lưu vào cache
      binanceCache.setExchangeInfo(exchangeInfo);
      
      return exchangeInfo;
    } catch (error) {
      console.error('Error getting exchange info:', error);
      throw error;
    }
  }

  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<BinanceCandle[]> {
    try {
      // Simplified: No rate limiting
      const candles = await this.retryWithTimestampSync(() => this.client.candles({ symbol, interval, limit })) as any[];
      return candles.map((candle: any[]) => ({
        openTime: candle[0],
        open: candle[1],
        high: candle[2],
        low: candle[3],
        close: candle[4],
        volume: candle[5],
        closeTime: candle[6],
        quoteAssetVolume: candle[7],
        numberOfTrades: candle[8],
        takerBuyBaseAssetVolume: candle[9],
        takerBuyQuoteAssetVolume: candle[10]
      }));
    } catch (error) {
      console.error('Error getting candles:', error);
      throw error;
    }
  }

  async getPrice(symbol: string): Promise<BinancePrice> {
    try {
      // Simplified: No rate limiting
      return await this.retryWithTimestampSync(() => this.client.price({ symbol }));
    } catch (error) {
      console.error('Error getting price:', error);
      throw error;
    }
  }

  async placeOrder(orderParams: {
    symbol: string;
    side: 'BUY' | 'SELL';
    type: 'MARKET' | 'LIMIT';
    quantity: string;
    price?: string;
  }): Promise<BinanceOrder> {
    try {
      // Simplified: No rate limiting
      const order = await this.retryWithTimestampSync(() => this.client.order({
        symbol: orderParams.symbol,
        side: orderParams.side,
        type: orderParams.type,
        quantity: orderParams.quantity,
        ...(orderParams.price && { price: orderParams.price })
      })) as BinanceOrder;
      return order;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  async getBalance(asset?: string): Promise<any> {
    try {
      const accountInfo = await this.retryWithTimestampSync(() => this.client.accountInfo()) as any;
      if (asset) {
        return accountInfo.balances.find((balance: any) => balance.asset === asset);
      }
      return accountInfo.balances;
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }
}
