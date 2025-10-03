import { EventEmitter } from 'events';

/**
 * Transparent WebSocket Adapter for Trading Bots
 * 
 * This adapter provides the same interface as REST API calls but uses WebSocket
 * data underneath. Bots don't need to change any configuration or code.
 */

export interface WebSocketAdapterConfig {
  symbols: string[];
  timeframes: string[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export interface CandleData {
  symbol: string;
  interval: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
  isClosed: boolean;
}

export interface TickerData {
  symbol: string;
  price: number;
  change: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  timestamp: number;
}

export interface OrderBookData {
  symbol: string;
  bids: [number, number][];
  asks: [number, number][];
  timestamp: number;
}

class TransparentWebSocketAdapter extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketAdapterConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectInterval = 5000;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Data caches - same format as REST API responses
  private priceCache = new Map<string, TickerData>();
  private klineCache = new Map<string, CandleData[]>();
  private depthCache = new Map<string, OrderBookData>();
  private ticker24hCache = new Map<string, any>();
  
  // Fallback to REST API when WebSocket fails
  private fallbackEnabled = true;
  private fallbackCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

  constructor(config: WebSocketAdapterConfig) {
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
      
      console.log(`[TransparentWebSocket] 🔌 Connecting to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[TransparentWebSocket] ✅ Connected successfully');
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
          console.error('[TransparentWebSocket] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[TransparentWebSocket] 🔌 Connection closed: ${event.code} - ${event.reason}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', event);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[TransparentWebSocket] ❌ WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('[TransparentWebSocket] ❌ Connection failed:', error);
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
        this.handleTickerData(data);
      } else if (data.e === 'kline') {
        this.handleKlineData(data);
      } else if (data.e === 'depthUpdate') {
        this.handleDepthData(data);
      } else if (data.e === 'trade') {
        this.handleTradeData(data);
      }
    } catch (error) {
      console.error('[TransparentWebSocket] Error handling message:', error);
    }
  }

  private handleTickerData(data: any): void {
    const symbol = data.s;
    const tickerData: TickerData = {
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
    
    // Also update 24h ticker cache
    this.ticker24hCache.set(symbol, {
      symbol,
      priceChange: tickerData.change,
      priceChangePercent: tickerData.change,
      weightedAvgPrice: tickerData.price,
      prevClosePrice: tickerData.open,
      lastPrice: tickerData.price,
      lastQty: '0',
      bidPrice: tickerData.price,
      askPrice: tickerData.price,
      openPrice: tickerData.open,
      highPrice: tickerData.high,
      lowPrice: tickerData.low,
      volume: tickerData.volume.toString(),
      quoteVolume: (tickerData.volume * tickerData.price).toString(),
      openTime: data.E - 86400000, // 24 hours ago
      closeTime: data.E,
      firstId: 0,
      lastId: 0,
      count: 0
    });
    
    this.emit('priceUpdate', tickerData);
  }

  private handleKlineData(data: any): void {
    const symbol = data.s;
    const interval = data.k.i;
    const klineData: CandleData = {
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
      if (klines.length > 1000) {
        klines = klines.slice(-1000); // Keep only last 1000
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
    this.emit('klineUpdate', klineData);
  }

  private handleDepthData(data: any): void {
    const symbol = data.s;
    const depthData: OrderBookData = {
      symbol,
      bids: data.b.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
      asks: data.a.map(([price, qty]: [string, string]) => [parseFloat(price), parseFloat(qty)]),
      timestamp: data.E
    };

    this.depthCache.set(symbol, depthData);
    this.emit('depthUpdate', depthData);
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

    this.emit('tradeUpdate', tradeData);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.ping();
      }
    }, 30000);
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
    
    console.log(`[TransparentWebSocket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // TRANSPARENT API METHODS - Same interface as REST API calls

  /**
   * Get current price - same interface as /api/v3/ticker/price
   */
  async getCurrentPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    // Try WebSocket cache first
    const tickerData = this.priceCache.get(symbol);
    if (tickerData) {
      return {
        symbol: tickerData.symbol,
        price: tickerData.price.toString()
      };
    }

    // Fallback to REST API if WebSocket data not available
    if (this.fallbackEnabled) {
      return this.fallbackToRestApi(`/api/v3/ticker/price?symbol=${symbol}`);
    }

    throw new Error(`No price data available for ${symbol}`);
  }

  /**
   * Get klines - same interface as /api/v3/klines
   */
  async getKlines(symbol: string, interval: string, limit: number = 100): Promise<any[][]> {
    const cacheKey = `${symbol}_${interval}`;
    const klines = this.klineCache.get(cacheKey) || [];
    
    if (klines.length > 0) {
      // Convert to REST API format
      const result = klines.slice(-limit).map(kline => [
        kline.timestamp,           // Open time
        kline.open.toString(),     // Open
        kline.high.toString(),     // High
        kline.low.toString(),      // Low
        kline.close.toString(),    // Close
        kline.volume.toString(),   // Volume
        kline.timestamp + 60000,   // Close time
        '0',                       // Quote asset volume
        '0',                       // Number of trades
        '0',                       // Taker buy base asset volume
        '0',                       // Taker buy quote asset volume
        '0'                        // Ignore
      ]);
      
      return result;
    }

    // Fallback to REST API
    if (this.fallbackEnabled) {
      return this.fallbackToRestApi(`/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`);
    }

    throw new Error(`No kline data available for ${symbol} ${interval}`);
  }

  /**
   * Get 24hr ticker - same interface as /api/v3/ticker/24hr
   */
  async get24hrTicker(symbol?: string): Promise<any> {
    if (symbol) {
      const tickerData = this.ticker24hCache.get(symbol);
      if (tickerData) {
        return tickerData;
      }
    } else {
      // Return all symbols
      const allTickers = Array.from(this.ticker24hCache.values());
      if (allTickers.length > 0) {
        return allTickers;
      }
    }

    // Fallback to REST API
    if (this.fallbackEnabled) {
      const endpoint = symbol ? `/api/v3/ticker/24hr?symbol=${symbol}` : '/api/v3/ticker/24hr';
      return this.fallbackToRestApi(endpoint);
    }

    throw new Error(`No 24hr ticker data available for ${symbol || 'all symbols'}`);
  }

  /**
   * Get order book - same interface as /api/v3/depth
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    const depthData = this.depthCache.get(symbol);
    if (depthData) {
      return {
        lastUpdateId: Date.now(),
        bids: depthData.bids.slice(0, limit),
        asks: depthData.asks.slice(0, limit)
      };
    }

    // Fallback to REST API
    if (this.fallbackEnabled) {
      return this.fallbackToRestApi(`/api/v3/depth?symbol=${symbol}&limit=${limit}`);
    }

    throw new Error(`No order book data available for ${symbol}`);
  }

  /**
   * Fallback to REST API when WebSocket data is not available
   */
  private async fallbackToRestApi(endpoint: string): Promise<any> {
    const cacheKey = endpoint;
    const cached = this.fallbackCache.get(cacheKey);
    
    // Check cache first
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      console.log(`[TransparentWebSocket] 📦 Using cached REST API data for ${endpoint}`);
      return cached.data;
    }

    try {
      console.log(`[TransparentWebSocket] 🔄 Fallback to REST API: ${endpoint}`);
      
      // Use internal API for price data
      if (endpoint.includes('/api/v3/ticker/price')) {
        const symbol = endpoint.split('symbol=')[1];
        const response = await fetch('/api/trading/binance/price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            symbol: symbol,
            apiKey: '',
            apiSecret: '',
            isTestnet: false
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        this.fallbackCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: 30000 // 30 seconds cache
        });
        
        return data;
      } else {
        // For other endpoints, use direct Binance API
        const baseUrl = 'https://api.binance.com';
        const response = await fetch(`${baseUrl}${endpoint}`);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache the result
        this.fallbackCache.set(cacheKey, {
          data,
          timestamp: Date.now(),
          ttl: 30000 // 30 seconds cache
        });
        
        return data;
      }
    } catch (error) {
      console.error(`[TransparentWebSocket] ❌ REST API fallback failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // Utility methods
  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  disconnect(): void {
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.reconnectAttempts = 0;
    console.log('[TransparentWebSocket] 🔌 Disconnected');
  }

  // Enable/disable fallback
  setFallbackEnabled(enabled: boolean): void {
    this.fallbackEnabled = enabled;
    console.log(`[TransparentWebSocket] 🔄 Fallback ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Get cache statistics
  getCacheStats(): any {
    return {
      priceCache: this.priceCache.size,
      klineCache: this.klineCache.size,
      depthCache: this.depthCache.size,
      ticker24hCache: this.ticker24hCache.size,
      fallbackCache: this.fallbackCache.size,
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts
    };
  }
}

// Global instance for trading bots
export const transparentWebSocketAdapter = new TransparentWebSocketAdapter({
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'],
  timeframes: ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M']
});

// Auto-connect on import
if (typeof window !== 'undefined') {
  transparentWebSocketAdapter.connect();
}
