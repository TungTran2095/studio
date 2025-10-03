interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number;
  maxSize: number;
  cleanupInterval: number;
}

export class EnhancedCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      defaultTTL: 120000, // EMERGENCY: Tăng từ 30s lên 120s để giảm API calls
      maxSize: 2000, // Tăng cache size để lưu nhiều data hơn
      cleanupInterval: 300000, // EMERGENCY: Tăng từ 1m lên 5m để giảm cleanup frequency
      ...config
    };

    this.startCleanup();
  }

  set<T>(key: string, data: T, ttl?: number): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL
    };

    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, item);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() - item.timestamp > item.ttl) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache stats
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestItem: number;
    newestItem: number;
  } {
    const now = Date.now();
    let oldest = now;
    let newest = 0;

    for (const item of this.cache.values()) {
      if (item.timestamp < oldest) oldest = item.timestamp;
      if (item.timestamp > newest) newest = item.timestamp;
    }

    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // Would need to track hits/misses
      oldestItem: oldest === now ? 0 : now - oldest,
      newestItem: now - newest
    };
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));
    
    if (expiredKeys.length > 0) {
      console.log(`[EnhancedCache] 🧹 Cleaned up ${expiredKeys.length} expired items`);
    }
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.cache.clear();
  }
}

// Specialized caches for different data types
export const priceCache = new EnhancedCache({
  defaultTTL: 10000, // 10 seconds for prices
  maxSize: 500
});

export const accountCache = new EnhancedCache({
  defaultTTL: 30000, // 30 seconds for account data
  maxSize: 100
});

export const marketDataCache = new EnhancedCache({
  defaultTTL: 60000, // 1 minute for market data
  maxSize: 200
});

export const indicatorCache = new EnhancedCache({
  defaultTTL: 300000, // 5 minutes for indicators
  maxSize: 300
});

// Cache key generators
export const CacheKeys = {
  price: (symbol: string) => `price:${symbol}`,
  account: (apiKey: string) => `account:${apiKey}`,
  balance: (apiKey: string) => `balance:${apiKey}`,
  marketData: (symbol: string, interval: string) => `market:${symbol}:${interval}`,
  indicator: (symbol: string, indicator: string, params: string) => `indicator:${symbol}:${indicator}:${params}`,
  exchangeInfo: () => 'exchange:info',
  orderBook: (symbol: string) => `orderbook:${symbol}`
};
