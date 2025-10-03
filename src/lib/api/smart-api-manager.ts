import { binanceWebSocketManager } from '@/lib/websocket/binance-websocket';
import { priceCache, accountCache, CacheKeys } from '@/lib/cache/enhanced-cache';
import { binanceRateLimiter } from '@/lib/monitor/binance-rate-limiter';

interface ApiCallOptions {
  useCache?: boolean;
  cacheTTL?: number;
  useWebSocket?: boolean;
  priority?: 'high' | 'medium' | 'low';
}

interface ApiCallResult<T> {
  data: T;
  fromCache: boolean;
  timestamp: number;
}

export class SmartApiManager {
  private static instance: SmartApiManager;
  private pendingCalls = new Map<string, Promise<any>>();
  private callQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  static getInstance(): SmartApiManager {
    if (!SmartApiManager.instance) {
      SmartApiManager.instance = new SmartApiManager();
    }
    return SmartApiManager.instance;
  }

  /**
   * Get price data with smart caching and WebSocket fallback
   */
  async getPrice(symbol: string, options: ApiCallOptions = {}): Promise<ApiCallResult<string>> {
    const cacheKey = CacheKeys.price(symbol);
    const {
      useCache = true,
      cacheTTL = 10000,
      useWebSocket = true
    } = options;

    // Check cache first
    if (useCache) {
      const cachedPrice = priceCache.get<string>(cacheKey);
      if (cachedPrice) {
        return {
          data: cachedPrice,
          fromCache: true,
          timestamp: Date.now()
        };
      }
    }

    // Try WebSocket first if available
    if (useWebSocket && binanceWebSocketManager.isWebSocketConnected()) {
      try {
        const price = await binanceWebSocketManager.getCurrentPrice(symbol);
        priceCache.set(cacheKey, price, cacheTTL);
        return {
          data: price,
          fromCache: false,
          timestamp: Date.now()
        };
      } catch (error) {
        console.log(`[SmartApiManager] WebSocket failed for ${symbol}, falling back to REST API`);
      }
    }

    // Fallback to REST API with rate limiting
    return this.makeApiCall(
      `price:${symbol}`,
      async () => {
        await binanceRateLimiter.throttle('market');
        // This would be the actual API call
        const response = await fetch(`/api/binance/price?symbol=${symbol}`);
        const data = await response.json();
        
        priceCache.set(cacheKey, data.price, cacheTTL);
        return {
          data: data.price,
          fromCache: false,
          timestamp: Date.now()
        };
      },
      options
    );
  }

  /**
   * Get account data with smart caching
   */
  async getAccountData(apiKey: string, options: ApiCallOptions = {}): Promise<ApiCallResult<any>> {
    const cacheKey = CacheKeys.account(apiKey);
    const {
      useCache = true,
      cacheTTL = 30000,
      priority = 'medium'
    } = options;

    // Check cache first
    if (useCache) {
      const cachedData = accountCache.get(cacheKey);
      if (cachedData) {
        return {
          data: cachedData,
          fromCache: true,
          timestamp: Date.now()
        };
      }
    }

    // Use REST API with rate limiting
    return this.makeApiCall(
      `account:${apiKey}`,
      async () => {
        await binanceRateLimiter.throttle('account');
        // This would be the actual API call
        const response = await fetch('/api/trading/binance/account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await response.json();
        
        accountCache.set(cacheKey, data, cacheTTL);
        return {
          data,
          fromCache: false,
          timestamp: Date.now()
        };
      },
      { ...options, priority }
    );
  }

  /**
   * Get balance data with smart caching
   */
  async getBalance(apiKey: string, options: ApiCallOptions = {}): Promise<ApiCallResult<any>> {
    const cacheKey = CacheKeys.balance(apiKey);
    const {
      useCache = true,
      cacheTTL = 30000,
      priority = 'high'
    } = options;

    // Check cache first
    if (useCache) {
      const cachedBalance = accountCache.get(cacheKey);
      if (cachedBalance) {
        return {
          data: cachedBalance,
          fromCache: true,
          timestamp: Date.now()
        };
      }
    }

    // Use REST API with rate limiting
    return this.makeApiCall(
      `balance:${apiKey}`,
      async () => {
        await binanceRateLimiter.throttle('account');
        // This would be the actual API call
        const response = await fetch('/api/trading/binance/balance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey })
        });
        const data = await response.json();
        
        accountCache.set(cacheKey, data, cacheTTL);
        return {
          data,
          fromCache: false,
          timestamp: Date.now()
        };
      },
      { ...options, priority }
    );
  }

  /**
   * Make API call with deduplication and queue management
   */
  private async makeApiCall<T>(
    callId: string,
    apiCall: () => Promise<T>,
    options: ApiCallOptions = {}
  ): Promise<T> {
    // Check if same call is already pending
    if (this.pendingCalls.has(callId)) {
      console.log(`[SmartApiManager] 🔄 Deduplicating call: ${callId}`);
      return this.pendingCalls.get(callId)!;
    }

    const {
      priority = 'medium'
    } = options;

    // Create the promise
    const promise = this.executeApiCall(callId, apiCall);
    this.pendingCalls.set(callId, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingCalls.delete(callId);
    }
  }

  private async executeApiCall<T>(
    callId: string,
    apiCall: () => Promise<T>
  ): Promise<T> {
    try {
      console.log(`[SmartApiManager] 📡 Making API call: ${callId}`);
      const result = await apiCall();
      console.log(`[SmartApiManager] ✅ API call successful: ${callId}`);
      return result;
    } catch (error) {
      console.error(`[SmartApiManager] ❌ API call failed: ${callId}`, error);
      throw error;
    }
  }

  /**
   * Batch multiple API calls to reduce overhead
   */
  async batchApiCalls<T>(
    calls: Array<() => Promise<T>>,
    options: ApiCallOptions = {}
  ): Promise<T[]> {
    const {
      priority = 'medium'
    } = options;

    // Execute calls in parallel with rate limiting
    const promises = calls.map(async (call, index) => {
      // Add small delay between calls to avoid overwhelming the API
      if (index > 0) {
        await new Promise(resolve => setTimeout(resolve, 100 * index));
      }
      return call();
    });

    return Promise.all(promises);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    priceCache: any;
    accountCache: any;
    pendingCalls: number;
  } {
    return {
      priceCache: priceCache.getStats(),
      accountCache: accountCache.getStats(),
      pendingCalls: this.pendingCalls.size
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    priceCache.clear();
    accountCache.clear();
    console.log('[SmartApiManager] 🧹 All caches cleared');
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(apiKey: string): Promise<void> {
    console.log('[SmartApiManager] 🚀 Preloading critical data...');
    
    try {
      // Preload account data and balance
      await Promise.all([
        this.getAccountData(apiKey, { priority: 'high' }),
        this.getBalance(apiKey, { priority: 'high' })
      ]);

      // Preload common prices
      await Promise.all([
        this.getPrice('BTCUSDT', { priority: 'high' }),
        this.getPrice('ETHUSDT', { priority: 'high' }),
        this.getPrice('USDTUSDT', { priority: 'high' })
      ]);

      console.log('[SmartApiManager] ✅ Critical data preloaded');
    } catch (error) {
      console.error('[SmartApiManager] ❌ Failed to preload critical data:', error);
    }
  }
}

// Export singleton instance
export const smartApiManager = SmartApiManager.getInstance();
