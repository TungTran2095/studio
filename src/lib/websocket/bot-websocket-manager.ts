import { EventEmitter } from 'events';

export interface BotWebSocketData {
  symbol: string;
  type: 'ticker' | 'kline' | 'depth' | 'trade' | 'account';
  data: any;
  timestamp: number;
}

export interface BotWebSocketConfig {
  symbols: string[];
  timeframes: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export class BotWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: BotWebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPong = Date.now();
  private priceCache = new Map<string, any>();
  private klineCache = new Map<string, any[]>();
  private depthCache = new Map<string, any>();

  constructor(config: BotWebSocketConfig) {
    super();
    this.config = {
      ...config,
      reconnectAttempts: config.reconnectAttempts || 10,
      reconnectInterval: config.reconnectInterval || 5000
    };
  }

  connect(): void {
    if (this.isConnected) return;

    try {
      const streams = this.createStreamUrls();
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;
      
      console.log(`[BotWebSocket] 🔌 Connecting to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[BotWebSocket] ✅ Connected successfully');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('[BotWebSocket] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[BotWebSocket] 🔌 Connection closed: ${event.code} - ${event.reason}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', event);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[BotWebSocket] ❌ WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('[BotWebSocket] ❌ Connection failed:', error);
      this.emit('error', error);
    }
  }

  private createStreamUrls(): string[] {
    const streams: string[] = [];
    
    this.config.symbols.forEach(symbol => {
      const symbolLower = symbol.toLowerCase();
      
      // Ticker stream for price updates
      streams.push(`${symbolLower}@ticker`);
      
      // Kline streams for different timeframes
      this.config.timeframes.forEach(timeframe => {
        streams.push(`${symbolLower}@kline_${timeframe}`);
      });
      
      // Depth stream for order book
      streams.push(`${symbolLower}@depth`);
      
      // Trade stream for recent trades
      streams.push(`${symbolLower}@trade`);
    });
    
    return streams;
  }

  private handleMessage(data: any): void {
    try {
      if (data.e === '24hrTicker') {
        // Ticker data
        this.handleTickerData(data);
      } else if (data.e === 'kline') {
        // Kline data
        this.handleKlineData(data);
      } else if (data.e === 'depthUpdate') {
        // Depth data
        this.handleDepthData(data);
      } else if (data.e === 'trade') {
        // Trade data
        this.handleTradeData(data);
      }
    } catch (error) {
      console.error('[BotWebSocket] Error handling message:', error);
    }
  }

  private handleTickerData(data: any): void {
    const symbol = data.s;
    const tickerData = {
      symbol,
      price: parseFloat(data.c),
      change: parseFloat(data.P),
      volume: parseFloat(data.v),
      high: parseFloat(data.h),
      low: parseFloat(data.l),
      open: parseFloat(data.o),
      timestamp: data.E
    };

    this.priceCache.set(symbol, tickerData);
    
    this.emit('priceUpdate', {
      symbol,
      type: 'ticker',
      data: tickerData,
      timestamp: Date.now()
    });
  }

  private handleKlineData(data: any): void {
    const symbol = data.s;
    const interval = data.k.i;
    const klineData = {
      symbol,
      interval,
      open: parseFloat(data.k.o),
      high: parseFloat(data.k.h),
      low: parseFloat(data.k.l),
      close: parseFloat(data.k.c),
      volume: parseFloat(data.k.v),
      timestamp: data.k.t,
      isClosed: data.k.x
    };

    const cacheKey = `${symbol}_${interval}`;
    let klines = this.klineCache.get(cacheKey) || [];
    
    if (data.k.x) {
      // Closed kline - add to cache
      klines.push(klineData);
      if (klines.length > 100) {
        klines = klines.slice(-100); // Keep only last 100
      }
    } else {
      // Update last kline
      if (klines.length > 0) {
        klines[klines.length - 1] = klineData;
      } else {
        klines.push(klineData);
      }
    }
    
    this.klineCache.set(cacheKey, klines);
    
    this.emit('klineUpdate', {
      symbol,
      type: 'kline',
      data: klineData,
      timestamp: Date.now()
    });
  }

  private handleDepthData(data: any): void {
    const symbol = data.s;
    const depthData = {
      symbol,
      bids: data.b.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
      asks: data.a.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
      timestamp: data.E
    };

    this.depthCache.set(symbol, depthData);
    
    this.emit('depthUpdate', {
      symbol,
      type: 'depth',
      data: depthData,
      timestamp: Date.now()
    });
  }

  private handleTradeData(data: any): void {
    const symbol = data.s;
    const tradeData = {
      symbol,
      price: parseFloat(data.p),
      quantity: parseFloat(data.q),
      timestamp: data.T,
      isBuyerMaker: data.m
    };

    this.emit('tradeUpdate', {
      symbol,
      type: 'trade',
      data: tradeData,
      timestamp: Date.now()
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`[BotWebSocket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    console.log('[BotWebSocket] 🔌 Disconnected');
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Bot-specific methods
  getCurrentPrice(symbol: string): number | null {
    const tickerData = this.priceCache.get(symbol);
    return tickerData ? tickerData.price : null;
  }

  getKlines(symbol: string, interval: string): any[] {
    const cacheKey = `${symbol}_${interval}`;
    return this.klineCache.get(cacheKey) || [];
  }

  getOrderBook(symbol: string): any | null {
    return this.depthCache.get(symbol) || null;
  }

  // Method to get latest kline for strategy
  getLatestKline(symbol: string, interval: string): any | null {
    const klines = this.getKlines(symbol, interval);
    return klines.length > 0 ? klines[klines.length - 1] : null;
  }

  // Method to get price change percentage
  getPriceChange(symbol: string): number | null {
    const tickerData = this.priceCache.get(symbol);
    return tickerData ? tickerData.change : null;
  }
}

// Global instance for trading bots
export const botWebSocketManager = new BotWebSocketManager({
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'SOLUSDT'],
  timeframes: ['1m', '5m', '15m', '1h', '4h', '1d']
});

// Auto-connect on import
if (typeof window !== 'undefined') {
  botWebSocketManager.connect();
}
