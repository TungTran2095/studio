import { transparentWebSocketAdapter } from '@/lib/websocket/transparent-websocket-adapter';

/**
 * Transparent BinanceService - Drop-in replacement for existing BinanceService
 * 
 * This service provides the exact same interface as the original BinanceService
 * but uses WebSocket data underneath. Bots don't need to change any code.
 */

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

export interface BinanceOrderParams {
  symbol: string;
  side: 'BUY' | 'SELL';
  type: 'MARKET' | 'LIMIT' | 'STOP_LOSS' | 'STOP_LOSS_LIMIT' | 'TAKE_PROFIT' | 'TAKE_PROFIT_LIMIT' | 'LIMIT_MAKER';
  quantity?: string;
  quoteOrderQty?: string;
  price?: string;
  timeInForce?: 'GTC' | 'IOC' | 'FOK';
  stopPrice?: string;
  icebergQty?: string;
  newOrderRespType?: 'ACK' | 'RESULT' | 'FULL';
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

export class TransparentBinanceService {
  private client: any;
  private apiKey: string;
  private apiSecret: string;
  private isTestnet: boolean;
  private baseUrl: string;
  private pendingCalls: Map<string, Promise<any>> = new Map();
  
  // Cache for account data to reduce API calls
  private accountCache: { data: BinanceAccountInfo | null; timestamp: number; ttl: number } = {
    data: null,
    timestamp: 0,
    ttl: 300000 // 5 minutes cache
  };

  constructor(apiKey: string, apiSecret: string, isTestnet: boolean = false) {
    this.apiKey = apiKey;
    this.apiSecret = apiSecret;
    this.isTestnet = isTestnet;
    this.baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
    
    // Initialize the original client for non-WebSocket operations
    this.initializeClient();
  }

  private initializeClient(): void {
    try {
      // Dynamic import to avoid circular dependencies
      const Binance = require('binance-api-node').default || require('binance-api-node');
      this.client = Binance({
        apiKey: this.apiKey,
        apiSecret: this.apiSecret,
        ...(this.isTestnet && { httpBase: this.baseUrl })
      });
    } catch (error) {
      console.error('[TransparentBinanceService] Failed to initialize client:', error);
      // Don't throw error, we'll use direct fetch instead
    }
  }

  // Unified call executor with dedup + simple cache + throttle
  private async executeCall<T>(
    key: string,
    fn: () => Promise<T>,
    options: { ttlMs?: number } = {}
  ): Promise<T> {
    // Serve from short cache if available
    const ttl = options.ttlMs ?? 0;
    if (ttl > 0) {
      const cached = this.getCachedData(key);
      if (cached) return cached as T;
    }

    // Deduplicate concurrent calls
    if (this.pendingCalls.has(key)) {
      return this.pendingCalls.get(key)! as Promise<T>;
    }

    const promise = (async () => {
      try {
        const result = await fn();
        if (ttl > 0) {
          this.setCachedData(key, result, ttl);
        }
        return result;
      } finally {
        this.pendingCalls.delete(key);
      }
    })();

    this.pendingCalls.set(key, promise);
    return promise;
  }

  /**
   * Get account info with enhanced caching and API ban handling
   * Same interface as original BinanceService
   */
  async getAccountInfo(): Promise<BinanceAccountInfo> {
    try {
      // Check cache first
      const now = Date.now();
      if (this.accountCache.data && (now - this.accountCache.timestamp) < this.accountCache.ttl) {
        console.log('[TransparentBinanceService] 📦 Using cached account info');
        return this.accountCache.data;
      }

      // Cache miss - try to fetch via signed client with retry
      console.log('[TransparentBinanceService] 🔄 Fetching fresh account info via client');

      // Lazy initialize client if missing
      if (!this.client) {
        this.initializeClient();
      }

      // Retry with small backoff, and provide recvWindow
      const maxAttempts = 3;
      let lastError: any;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          const accountInfo = await this.client.accountInfo();
          // Update cache
          this.accountCache = {
            data: accountInfo,
            timestamp: now,
            ttl: 300000 // 5 minutes
          };
          return accountInfo;
        } catch (err: any) {
          lastError = err;
          const message = err?.message || '';
          const code = err?.code;
          const isTimeError = code === -1021 || message.includes('Timestamp for this request') || message.includes('recvWindow') || message.includes('outside of the recvWindow');
          console.warn('[TransparentBinanceService] accountInfo failed', { attempt, code, message });
          if (isTimeError && attempt < maxAttempts) {
            try {
              // Best-effort time sync using server time endpoint without credentials
              const res = await fetch(`${this.baseUrl}/api/v3/time`);
              await res.json();
            } catch {}
            await new Promise(r => setTimeout(r, 500 * attempt));
            continue;
          }
          throw err;
        }
      }

      // If all attempts failed, throw the last error
      throw lastError;
    } catch (error) {
      console.error('[TransparentBinanceService] Error getting account info:', error);
      throw error;
    }
  }

  /**
   * Get exchange info - TRANSPARENT replacement using WebSocket when possible
   * Same interface as original BinanceService
   */
  async getExchangeInfo(): Promise<any> {
    try {
      // This is static data, cache it for a long time
      const cacheKey = 'exchangeInfo';
      return this.executeCall(cacheKey, async () => {
        console.log('[TransparentBinanceService] 🔄 Fetching exchange info from API');
        const response = await fetch(`${this.baseUrl}/api/v3/exchangeInfo`, {
          headers: { 'X-MBX-APIKEY': this.apiKey }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 3600000 }); // 1h
    } catch (error) {
      console.error('[TransparentBinanceService] Error getting exchange info:', error);
      throw error;
    }
  }

  /**
   * Get current price - TRANSPARENT replacement using WebSocket
   * Same interface as original BinanceService
   */
  async getCurrentPrice(symbol: string): Promise<{ symbol: string; price: string }> {
    try {
      // Use WebSocket data
      const result = await transparentWebSocketAdapter.getCurrentPrice(symbol);
      console.log(`[TransparentBinanceService] ✅ Got price from WebSocket: ${symbol} = ${result.price}`);
      return result;
    } catch (error) {
      console.log(`[TransparentBinanceService] ⚠️ WebSocket failed, using REST API for ${symbol}`);
      
      // Fallback to internal API with short cache & dedup
      const key = `price:${symbol}`;
      const data = await this.executeCall(key, async () => {
        const response = await fetch('/api/trading/binance/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, apiKey: this.apiKey, apiSecret: this.apiSecret, isTestnet: this.isTestnet })
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 2000 });

      return { symbol: data.symbol, price: data.price };
    }
  }

  /**
   * Get klines - TRANSPARENT replacement using WebSocket
   * Same interface as original BinanceService
   */
  async getKlines(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit: number = 1000
  ): Promise<any[][]> {
    try {
      // Use WebSocket data
      const result = await transparentWebSocketAdapter.getKlines(symbol, interval, limit);
      console.log(`[TransparentBinanceService] ✅ Got ${result.length} klines from WebSocket: ${symbol} ${interval}`);
      return result;
    } catch (error) {
      console.log(`[TransparentBinanceService] ⚠️ WebSocket failed, using REST API for ${symbol} ${interval}`);
      
      // Fallback to REST API
      let url = `${this.baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
      
      if (startTime) url += `&startTime=${startTime}`;
      if (endTime) url += `&endTime=${endTime}`;

      const key = `klines:${symbol}:${interval}:${startTime || 0}:${endTime || 0}:${limit}`;
      return await this.executeCall(key, async () => {
        const response = await fetch(url, { headers: { 'X-MBX-APIKEY': this.apiKey } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 5000 });
    }
  }

  /**
   * Get 24hr ticker - TRANSPARENT replacement using WebSocket
   * Same interface as original BinanceService
   */
  async get24hrTicker(symbol?: string): Promise<any> {
    try {
      // Use WebSocket data
      const result = await transparentWebSocketAdapter.get24hrTicker(symbol);
      console.log(`[TransparentBinanceService] ✅ Got 24hr ticker from WebSocket: ${symbol || 'all'}`);
      return result;
    } catch (error) {
      console.log(`[TransparentBinanceService] ⚠️ WebSocket failed, using REST API for 24hr ticker`);
      
      // Fallback to REST API
      let url = `${this.baseUrl}/api/v3/ticker/24hr`;
      if (symbol) url += `?symbol=${symbol}`;

      const key = `24hr:${symbol || 'all'}`;
      return await this.executeCall(key, async () => {
        const response = await fetch(url, { headers: { 'X-MBX-APIKEY': this.apiKey } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 3000 });
    }
  }

  /**
   * Place order - CANNOT be replaced by WebSocket, uses REST API
   * Same interface as original BinanceService
   */
  async placeOrder(orderParams: BinanceOrderParams): Promise<BinanceOrder> {
    try {
      console.log('[TransparentBinanceService] 🚀 Placing order via REST API');
      // Do not cache orders; dedup by client-side id if provided
      const response = await fetch(`${this.baseUrl}/api/v3/order`, {
        method: 'POST',
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(orderParams as any).toString()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[TransparentBinanceService] Error placing order:', error);
      throw error;
    }
  }

  /**
   * Cancel order - CANNOT be replaced by WebSocket, uses REST API
   * Same interface as original BinanceService
   */
  async cancelOrder(symbol: string, orderId: number): Promise<any> {
    try {
      console.log('[TransparentBinanceService] ❌ Canceling order via REST API');
      const response = await fetch(`${this.baseUrl}/api/v3/order`, {
        method: 'DELETE',
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({ symbol, orderId: orderId.toString() }).toString()
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('[TransparentBinanceService] Error canceling order:', error);
      throw error;
    }
  }

  /**
   * Get open orders - CANNOT be replaced by WebSocket, uses REST API
   * Same interface as original BinanceService
   */
  async getOpenOrders(symbol?: string): Promise<BinanceOrder[]> {
    try {
      console.log('[TransparentBinanceService] 📋 Getting open orders from REST API');
      let url = `${this.baseUrl}/api/v3/openOrders`;
      if (symbol) url += `?symbol=${symbol}`;
      const key = `openOrders:${symbol || 'all'}`;
      return await this.executeCall(key, async () => {
        const response = await fetch(url, { headers: { 'X-MBX-APIKEY': this.apiKey } });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 2000 });
    } catch (error) {
      console.error('[TransparentBinanceService] Error getting open orders:', error);
      throw error;
    }
  }

  /**
   * Get trade history - CANNOT be replaced by WebSocket, uses REST API
   * Same interface as original BinanceService
   */
  async getTradeHistory(symbol: string, limit: number = 500): Promise<any[]> {
    try {
      console.log('[TransparentBinanceService] 📈 Getting trade history from REST API');
      const key = `myTrades:${symbol}:${limit}`;
      return await this.executeCall(key, async () => {
        const response = await fetch(`${this.baseUrl}/api/v3/myTrades?symbol=${symbol}&limit=${limit}`, {
          headers: { 'X-MBX-APIKEY': this.apiKey }
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      }, { ttlMs: 10000 });
    } catch (error) {
      console.error('[TransparentBinanceService] Error getting trade history:', error);
      throw error;
    }
  }

  /**
   * Get balance for specific asset
   * Same interface as original BinanceService
   */
  async getBalance(asset?: string): Promise<any> {
    try {
      const accountInfo = await this.getAccountInfo();
      
      if (asset) {
        return accountInfo.balances.find((balance: any) => balance.asset === asset);
      }
      
      return accountInfo.balances;
    } catch (error) {
      console.error('[TransparentBinanceService] Error getting balance:', error);
      throw error;
    }
  }

  // Cache management methods
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  private getCachedData(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCachedData(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
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
    return {
      ...transparentWebSocketAdapter.getCacheStats(),
      accountCache: this.accountCache.data ? 'cached' : 'empty',
      cacheSize: this.cache.size
    };
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.accountCache = { data: null, timestamp: 0, ttl: 300000 };
    console.log('[TransparentBinanceService] 🧹 All caches cleared');
  }
}

/**
 * Factory function to create TransparentBinanceService
 * This is a drop-in replacement for the original BinanceService
 */
export function createTransparentBinanceService(apiKey: string, apiSecret: string, isTestnet: boolean = false): TransparentBinanceService {
  return new TransparentBinanceService(apiKey, apiSecret, isTestnet);
}
