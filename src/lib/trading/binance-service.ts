import Binance from 'binance-api-node';

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

  constructor(apiKey: string, apiSecret: string, testnet: boolean = false) {
    this.client = Binance({
      apiKey,
      apiSecret,
      httpBase: testnet ? 'https://testnet.binance.vision' : 'https://api.binance.com'
    });
  }

  async getAccountInfo(): Promise<BinanceAccountInfo> {
    try {
      return await this.client.accountInfo();
    } catch (error) {
      console.error('Error getting account info:', error);
      throw error;
    }
  }

  async getCandles(symbol: string, interval: string, limit: number = 100): Promise<BinanceCandle[]> {
    try {
      const candles = await this.client.candles({ symbol, interval, limit });
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
      return await this.client.price({ symbol });
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
      const order = await this.client.order({
        symbol: orderParams.symbol,
        side: orderParams.side,
        type: orderParams.type,
        quantity: orderParams.quantity,
        ...(orderParams.price && { price: orderParams.price })
      });
      return order;
    } catch (error) {
      console.error('Error placing order:', error);
      throw error;
    }
  }

  async getBalance(asset?: string): Promise<any> {
    try {
      const accountInfo = await this.client.accountInfo();
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
