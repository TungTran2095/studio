import { EventEmitter } from 'events';

export interface BinanceWebSocketData {
  symbol: string;
  price: string;
  timestamp: number;
  type: 'ticker' | 'kline' | 'depth' | 'trade';
}

export interface BinanceWebSocketConfig {
  symbols: string[];
  streams: ('ticker' | 'kline' | 'depth' | 'trade')[];
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

export class BinanceWebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: BinanceWebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 5000;
  private isConnected = false;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastPong = Date.now();

  constructor(config: BinanceWebSocketConfig) {
    super();
    this.config = {
      ...config,
      reconnectAttempts: config.reconnectAttempts || 5,
      reconnectInterval: config.reconnectInterval || 5000
    };
  }

  connect(): void {
    if (this.isConnected) return;

    try {
      // Tạo stream URLs
      const streams = this.createStreamUrls();
      const wsUrl = `wss://stream.binance.com:9443/ws/${streams.join('/')}`;
      
      console.log(`[BinanceWebSocket] 🔌 Connecting to: ${wsUrl}`);
      
      this.ws = new WebSocket(wsUrl);
      
      this.ws.onopen = () => {
        console.log('[BinanceWebSocket] ✅ Connected successfully');
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
          console.error('[BinanceWebSocket] Error parsing message:', error);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[BinanceWebSocket] 🔌 Connection closed: ${event.code} - ${event.reason}`);
        this.isConnected = false;
        this.stopHeartbeat();
        this.emit('disconnected', event);
        
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error('[BinanceWebSocket] ❌ WebSocket error:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('[BinanceWebSocket] ❌ Connection failed:', error);
      this.emit('error', error);
    }
  }

  private createStreamUrls(): string[] {
    const streams: string[] = [];
    
    this.config.symbols.forEach(symbol => {
      this.config.streams.forEach(streamType => {
        switch (streamType) {
          case 'ticker':
            streams.push(`${symbol.toLowerCase()}@ticker`);
            break;
          case 'kline':
            streams.push(`${symbol.toLowerCase()}@kline_1m`);
            break;
          case 'depth':
            streams.push(`${symbol.toLowerCase()}@depth20@100ms`);
            break;
          case 'trade':
            streams.push(`${symbol.toLowerCase()}@trade`);
            break;
        }
      });
    });
    
    return streams;
  }

  private handleMessage(data: any): void {
    // Handle different message types
    if (data.e === '24hrTicker') {
      this.handleTicker(data);
    } else if (data.e === 'kline') {
      this.handleKline(data);
    } else if (data.e === 'depthUpdate') {
      this.handleDepth(data);
    } else if (data.e === 'trade') {
      this.handleTrade(data);
    }
  }

  private handleTicker(data: any): void {
    const tickerData: BinanceWebSocketData = {
      symbol: data.s,
      price: data.c,
      timestamp: data.E,
      type: 'ticker'
    };
    
    this.emit('ticker', tickerData);
    this.emit('priceUpdate', tickerData);
  }

  private handleKline(data: any): void {
    const klineData = {
      symbol: data.s,
      openTime: data.k.t,
      closeTime: data.k.T,
      open: data.k.o,
      high: data.k.h,
      low: data.k.l,
      close: data.k.c,
      volume: data.k.v,
      timestamp: data.E,
      type: 'kline' as const
    };
    
    this.emit('kline', klineData);
  }

  private handleDepth(data: any): void {
    const depthData = {
      symbol: data.s,
      bids: data.b,
      asks: data.a,
      timestamp: data.E,
      type: 'depth' as const
    };
    
    this.emit('depth', depthData);
  }

  private handleTrade(data: any): void {
    const tradeData: BinanceWebSocketData = {
      symbol: data.s,
      price: data.p,
      timestamp: data.E,
      type: 'trade'
    };
    
    this.emit('trade', tradeData);
    this.emit('priceUpdate', tradeData);
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        // Send ping message to keep connection alive
        this.ws.send(JSON.stringify({ ping: Date.now() }));
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
    const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1); // Exponential backoff
    
    console.log(`[BinanceWebSocket] 🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
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
    console.log('[BinanceWebSocket] 🔌 Disconnected');
  }

  isWebSocketConnected(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  // Method to get current price for a symbol
  getCurrentPrice(symbol: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`Timeout waiting for price data for ${symbol}`));
      }, 5000);

      const onPriceUpdate = (data: BinanceWebSocketData) => {
        if (data.symbol === symbol) {
          clearTimeout(timeout);
          this.off('priceUpdate', onPriceUpdate);
          resolve(data.price);
        }
      };

      this.on('priceUpdate', onPriceUpdate);
    });
  }
}

// Global instance for price monitoring
export const binanceWebSocketManager = new BinanceWebSocketManager({
  symbols: ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT'],
  streams: ['ticker', 'trade']
});

// Auto-connect on import
if (typeof window !== 'undefined') {
  binanceWebSocketManager.connect();
}
