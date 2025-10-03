// Binance API Cache Service
// Giảm tần suất gọi API cho account và exchange info

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface BinanceAccountCache {
  accountInfo: CacheItem<any>;
  exchangeInfo: CacheItem<any>;
}

class BinanceCacheService {
  private cache: BinanceAccountCache = {
    accountInfo: { data: null, timestamp: 0, ttl: 60000 }, // 1 minute TTL
    exchangeInfo: { data: null, timestamp: 0, ttl: 300000 }, // 5 minutes TTL
  };

  // Cache account info với TTL 1 phút
  setAccountInfo(data: any) {
    this.cache.accountInfo = {
      data,
      timestamp: Date.now(),
      ttl: 60000 // 1 minute
    };
  }

  // Lấy account info từ cache nếu còn valid
  getAccountInfo(): any | null {
    const item = this.cache.accountInfo;
    if (this.isValid(item)) {
      console.log('[BinanceCache] ✅ Using cached account info');
      return item.data;
    }
    console.log('[BinanceCache] ❌ Account info cache expired, need to fetch');
    return null;
  }

  // Cache exchange info với TTL 5 phút
  setExchangeInfo(data: any) {
    this.cache.exchangeInfo = {
      data,
      timestamp: Date.now(),
      ttl: 300000 // 5 minutes
    };
  }

  // Lấy exchange info từ cache nếu còn valid
  getExchangeInfo(): any | null {
    const item = this.cache.exchangeInfo;
    if (this.isValid(item)) {
      console.log('[BinanceCache] ✅ Using cached exchange info');
      return item.data;
    }
    console.log('[BinanceCache] ❌ Exchange info cache expired, need to fetch');
    return null;
  }

  // Kiểm tra cache item có còn valid không
  private isValid(item: CacheItem<any>): boolean {
    if (!item.data || !item.timestamp) return false;
    
    const now = Date.now();
    const age = now - item.timestamp;
    const isValid = age < item.ttl;
    
    if (!isValid) {
      console.log(`[BinanceCache] Cache expired: age=${age}ms, ttl=${item.ttl}ms`);
    }
    
    return isValid;
  }

  // Clear cache (dùng khi có lỗi hoặc cần force refresh)
  clearCache() {
    this.cache.accountInfo = { data: null, timestamp: 0, ttl: 60000 };
    this.cache.exchangeInfo = { data: null, timestamp: 0, ttl: 300000 };
    console.log('[BinanceCache] 🗑️ Cache cleared');
  }

  // Get cache stats for monitoring
  getCacheStats() {
    const now = Date.now();
    return {
      accountInfo: {
        hasData: !!this.cache.accountInfo.data,
        age: this.cache.accountInfo.data ? now - this.cache.accountInfo.timestamp : 0,
        ttl: this.cache.accountInfo.ttl,
        isValid: this.isValid(this.cache.accountInfo)
      },
      exchangeInfo: {
        hasData: !!this.cache.exchangeInfo.data,
        age: this.cache.exchangeInfo.data ? now - this.cache.exchangeInfo.timestamp : 0,
        ttl: this.cache.exchangeInfo.ttl,
        isValid: this.isValid(this.cache.exchangeInfo)
      }
    };
  }
}

// Global instance
export const binanceCache = new BinanceCacheService();
