import Binance from 'binance-api-node';
import { TimeSync } from '@/lib/time-sync';

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
   * Retry logic với timestamp sync và xử lý 5xx/network (exponential backoff + jitter)
   */
  private async retryWithTimestampSync<T>(fn: () => Promise<T>, maxRetries: number = Number(process.env.BINANCE_MAX_RETRIES || 5)): Promise<T> {
    let lastError: any;
    const baseDelayMs = Number(process.env.BINANCE_RETRY_BASE_DELAY_MS || 500);
    const maxDelayMs = Number(process.env.BINANCE_RETRY_MAX_DELAY_MS || 30000);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        const status = error?.response?.status || error?.status;
        const message = (error?.message || '').toString();

        // Xác định lỗi timestamp / recvWindow
        const isTimestampError = (
          typeof message === 'string' && (
            message.includes('Timestamp for this request') ||
            message.toLowerCase().includes('timestamp') ||
            message.toLowerCase().includes('recvwindow') ||
            message.toLowerCase().includes('outside of the recvwindow')
          )
        ) || error?.code === -1021;

        // Xác định lỗi 5xx hoặc network
        const is5xx = typeof status === 'number' && status >= 500 && status < 600;
        const isNetwork = (
          message.includes('fetch failed') ||
          message.includes('Failed to fetch') ||
          message.includes('ECONNRESET') ||
          message.includes('ENOTFOUND') ||
          message.includes('EAI_AGAIN') ||
          message.includes('socket hang up') ||
          message.includes('timeout') ||
          message.includes('Bad Gateway') ||
          message.includes('Gateway Timeout')
        );

        // Nhánh xử lý lỗi timestamp: sync + recreate client
        if (isTimestampError && attempt < maxRetries) {
          console.log(`[BinanceService] Lỗi timestamp (attempt ${attempt}/${maxRetries}), đang sync lại...`);
          console.log(`[BinanceService] Error details:`, error);
          console.log(`[BinanceService] Bot type: ${this.testnet ? 'testnet' : 'realnet'}`);
          try {
            await TimeSync.syncWithServer();
            await new Promise(resolve => setTimeout(resolve, 1000));
            this.client = Binance({
              apiKey: this.apiKey,
              apiSecret: this.apiSecret,
              httpBase: this.testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
              getTime: () => {
                const now = Date.now();
                const safeTime = now - 1000;
                console.log(`[BinanceService] Regenerating timestamp: ${safeTime} (${new Date(safeTime).toISOString()})`);
                return safeTime;
              }
            });
            console.log(`[BinanceService] Đã tạo lại client với timestamp sync (${this.testnet ? 'testnet' : 'realnet'})`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            continue;
          } catch (syncError) {
            console.error('[BinanceService] Không thể sync timestamp:', syncError);
            // Nếu sync thất bại, rơi xuống retry chung bên dưới
          }
        }

        // Nhánh xử lý 5xx/network: exponential backoff + jitter
        if ((is5xx || isNetwork) && attempt < maxRetries) {
          const expDelay = Math.min(maxDelayMs, baseDelayMs * Math.pow(2, attempt - 1));
          const jitter = Math.floor(Math.random() * 250);
          const delay = expDelay + jitter;
          console.warn(`[BinanceService] Lỗi ${status || 'network'}: ${message}. Sẽ retry attempt ${attempt + 1}/${maxRetries} sau ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // Hết lượt hoặc lỗi không thuộc nhóm retry -> ném lỗi
        if (attempt === maxRetries || (!isTimestampError && !is5xx && !isNetwork)) {
          throw error;
        }
      }
    }
    throw lastError;
  }

  async getAccountInfo(): Promise<BinanceAccountInfo> {
    try {
      return await this.retryWithTimestampSync(() => this.client.accountInfo());
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<BinanceCandle[]> {
    try {
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


