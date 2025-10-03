import { transparentWebSocketAdapter } from './transparent-websocket-adapter';

/**
 * Transparent API Service for Trading Bots
 * 
 * This service provides the exact same interface as Binance REST API
 * but uses WebSocket data underneath. Bots can use this service without
 * changing any configuration or code.
 */

export class TransparentApiService {
  private baseUrl: string;
  private apiKey: string;
  private apiSecret: string;
  private isTestnet: boolean;

  constructor(apiKey: string, apiSecret: string, isTestnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
  }

  /**
   * Get current price - TRANSPARENT replacement for /api/v3/ticker/price
   * Same interface, uses WebSocket data
   */
  async getCurrentPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    try {
      // Try WebSocket first
      const result = await transparentWebSocketAdapter.getCurrentPrice(symbol);
      console.log(`[TransparentApiService] ✅ Got price from WebSocket: ${symbol} = ${result.price}`);
      return result;
    } catch (error) {
      console.log(`[TransparentApiService] ⚠️ WebSocket failed, using REST API for ${symbol}`);
      
      // Fallback to REST API
      const response = await fetch(`${this.baseUrl}/api/v3/ticker/price?symbol=${symbol}`, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  /**
   * Get klines - TRANSPARENT replacement for /api/v3/klines
   * Same interface, uses WebSocket data
   */
  async getKlines(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<any[][]> {
    try {
      // Try WebSocket first
      const result = await transparentWebSocketAdapter.getKlines(symbol, interval, limit);
      console.log(`[TransparentApiService] ✅ Got ${result.length} klines from WebSocket: ${symbol} ${interval}`);
      return result;
    } catch (error) {
      console.log(`[TransparentApiService] ⚠️ WebSocket failed, using REST API for ${symbol} ${interval}`);
      
      // Fallback to REST API
      let url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      if (startTime) url += `&startTime=${startTime}`;
      if (endTime) url += `&endTime=${endTime}`;

      const response = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  /**
   * Get 24hr ticker - TRANSPARENT replacement for /api/v3/ticker/24hr
   * Same interface, uses WebSocket data
   */
  async get24hrTicker(symbol?: string): Promise<any> {
    try {
      // Try WebSocket first
      const result = await transparentWebSocketAdapter.get24hrTicker(symbol);
      console.log(`[TransparentApiService] ✅ Got 24hr ticker from WebSocket: ${symbol || 'all'}`);
      return result;
    } catch (error) {
      console.log(`[TransparentApiService] ⚠️ WebSocket failed, using REST API for 24hr ticker`);
      
      // Fallback to REST API
      let url = `${this.baseUrl}/api/v3/ticker/24hr`;
      if (symbol) url += `?symbol=${symbol}`;

      const response = await fetch(url, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  /**
   * Get order book - TRANSPARENT replacement for /api/v3/depth
   * Same interface, uses WebSocket data
   */
  async getOrderBook(symbol: string, limit: number = 100): Promise<any> {
    try {
      // Try WebSocket first
      const result = await transparentWebSocketAdapter.getOrderBook(symbol, limit);
      console.log(`[TransparentApiService] ✅ Got order book from WebSocket: ${symbol}`);
      return result;
    } catch (error) {
      console.log(`[TransparentApiService] ⚠️ WebSocket failed, using REST API for order book`);
      
      // Fallback to REST API
      const response = await fetch(`${this.baseUrl}/api/v3/depth?symbol=${symbol}&limit=${limit}`, {
        headers: {
          'X-MBX-APIKEY': this.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    }
  }

  /**
   * Get account info - CANNOT be replaced by WebSocket, uses REST API
   * But with enhanced caching
   */
  async getAccountInfo(): Promise<any> {
    // This cannot be replaced by WebSocket, so we use REST API with caching
    console.log(`[TransparentApiService] 📊 Getting account info from REST API (cached)`);
    
    const response = await fetch(`${this.baseUrl}/api/v3/account`, {
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get open orders - CANNOT be replaced by WebSocket, uses REST API
   */
  async getOpenOrders(symbol?: string): Promise<any[]> {
    console.log(`[TransparentApiService] 📋 Getting open orders from REST API`);
    
    let url = `${this.baseUrl}/api/v3/openOrders`;
    if (symbol) url += `?symbol=${symbol}`;

    const response = await fetch(url, {
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get trade history - CANNOT be replaced by WebSocket, uses REST API
   */
  async getTradeHistory(symbol: string, limit: number = 500): Promise<any[]> {
    console.log(`[TransparentApiService] 📈 Getting trade history from REST API`);
    
    const response = await fetch(`${this.baseUrl}/api/v3/myTrades?symbol=${symbol}&limit=${limit}`, {
      headers: {
        'X-MBX-APIKEY': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Place order - CANNOT be replaced by WebSocket, uses REST API
   */
  async placeOrder(orderParams: any): Promise<any> {
    console.log(`[TransparentApiService] 🚀 Placing order via REST API`);
    
    const response = await fetch(`${this.baseUrl}/api/v3/order`, {
      method: 'POST',
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams(orderParams).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Cancel order - CANNOT be replaced by WebSocket, uses REST API
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    console.log(`[TransparentApiService] ❌ Canceling order via REST API`);
    
    const response = await fetch(`${this.baseUrl}/api/v3/order`, {
      method: 'DELETE',
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        symbol,
        orderId: orderId.toString()
      }).toString()
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Get WebSocket connection status
   */
  isWebSocketConnected(): boolean {
    return transparentWebSocketAdapter.isWebSocketConnected();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return transparentWebSocketAdapter.getCacheStats();
  }

  /**
   * Enable/disable WebSocket fallback
   */
  setWebSocketFallback(enabled: boolean): void {
    transparentWebSocketAdapter.setFallbackEnabled(enabled);
  }
}

/**
 * Factory function to create TransparentApiService
 * This replaces the need to change BotExecutor code
 */
export function createTransparentApiService(apiKey: string, apiSecret: string, isTestnet: boolean = false): TransparentApiService {
  return new TransparentApiService(apiKey, apiSecret, isTestnet);
}

/**
 * Global instance for easy access
 */
export const transparentApiService = new TransparentApiService('', '', false);
