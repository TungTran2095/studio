import { binanceAPIUsageManager } from './binance-api-usage-manager';

// In-memory rate limiter tailored for Binance REST limits
// Targeting common limits: Used-Weight (per minute) and Order count (10s/1m)

type Bucket = { windowMs: number; max: number; timestamps: number[] };

class SlidingWindowLimiter {
  private buckets: Record<string, Bucket> = {};

  constructor(private now: () => number = () => Date.now()) {}

  defineBucket(key: string, windowMs: number, max: number) {
    this.buckets[key] = this.buckets[key] || { windowMs, max, timestamps: [] };
  }

  async acquire(key: string, cost: number = 1): Promise<void> {
    const b = this.buckets[key];
    if (!b) return;
    const now = this.now();
    // purge old
    b.timestamps = b.timestamps.filter(ts => now - ts < b.windowMs);
    while (b.timestamps.length + cost > b.max) {
      const oldest = b.timestamps[0];
      const waitMs = b.windowMs - (now - oldest);
      await new Promise(res => setTimeout(res, Math.max(10, waitMs)));
      const n2 = this.now();
      b.timestamps = b.timestamps.filter(ts => n2 - ts < b.windowMs);
    }
    for (let i = 0; i < cost; i++) b.timestamps.push(this.now());
  }
}

export type BinanceEndpointKind = 'market' | 'account' | 'order';

// Simplified cost mapping per endpoint kind (approximation)
const COST: Record<BinanceEndpointKind, { weight: number; order10s?: number; order1m?: number }> = {
  market: { weight: 1 },
  account: { weight: 10 }, // Tăng từ 5 lên 10 để phản ánh đúng weight của /api/v3/account
  order: { weight: 1, order10s: 1, order1m: 1 },
};

class BinanceRateLimiter {
  private limiter = new SlidingWindowLimiter();
  private emergencyMode = false;
  private lastEmergencyReset = 0;

  constructor() {
    // OPTIMIZED: Increased limits to safe levels to prevent false rate limiting
    const usedWeightPerMin = Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1000); // Increased from 500 to 1000
    const ordersPer10s = Number(process.env.BINANCE_ORDERS_PER_10S || 50); // Increased from 20 to 50
    const ordersPer1m = Number(process.env.BINANCE_ORDERS_PER_1M || 1200); // Increased from 800 to 1200
    this.limiter.defineBucket('weight:1m', 60_000, usedWeightPerMin - 100); // Reduced headroom from 200 to 100
    this.limiter.defineBucket('orders:10s', 10_000, Math.max(5, ordersPer10s - 5)); // Reduced headroom from 10 to 5
    this.limiter.defineBucket('orders:1m', 60_000, Math.max(10, ordersPer1m - 50)); // Reduced headroom from 100 to 50
    
    // Auto-enable emergency mode if we detect high usage
    this.checkAndEnableEmergencyMode();
  }

  async throttle(kind: BinanceEndpointKind): Promise<void> {
    const c = COST[kind];
    
    // Check with comprehensive API usage manager first
    const canMakeCall = binanceAPIUsageManager.canMakeCall(`/api/v3/${kind}`);
    if (!canMakeCall.allowed) {
      throw new Error(`API call blocked: ${canMakeCall.reason}`);
    }
    
    // Emergency mode: reject all calls if we're in emergency mode
    if (this.emergencyMode) {
      const now = Date.now();
      if (now - this.lastEmergencyReset > 300000) { // Reset emergency mode after 5 minutes
        this.emergencyMode = false;
        console.log('[BinanceRateLimiter] 🚨 Emergency mode reset');
      } else {
        throw new Error('Rate limit emergency mode active - too many requests');
      }
    }

    try {
      await this.limiter.acquire('weight:1m', c.weight);
      if (c.order10s) await this.limiter.acquire('orders:10s', c.order10s);
      if (c.order1m) await this.limiter.acquire('orders:1m', c.order1m);
      
      // Record API usage in comprehensive manager
      binanceAPIUsageManager.recordAPICall(`/api/v3/${kind}`, true, 0);
      
    } catch (error) {
      // If we hit rate limits, enter emergency mode
      this.emergencyMode = true;
      this.lastEmergencyReset = Date.now();
      console.error('[BinanceRateLimiter] 🚨 Rate limit exceeded, entering emergency mode');
      
      // Record failed API call
      binanceAPIUsageManager.recordAPICall(`/api/v3/${kind}`, false, 0);
      
      throw error;
    }
  }

  // Method to check if we can make a call without actually making it
  canMakeCall(kind: BinanceEndpointKind): boolean {
    const c = COST[kind];
    
    if (this.emergencyMode) {
      return false;
    }

    // For now, return true - would need to implement capacity checking in SlidingWindowLimiter
    return true;
  }

  // Method to get current usage statistics
  getUsageStats(): {
    weight1m: { used: number; limit: number; available: number };
    orders10s: { used: number; limit: number; available: number };
    orders1m: { used: number; limit: number; available: number };
    emergencyMode: boolean;
  } {
    return {
      weight1m: {
        used: 0, // Would need to implement in SlidingWindowLimiter
        limit: Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1000) - 50, // Increased from 1000-100 to 1000-50
        available: Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1000) - 50
      },
      orders10s: {
        used: 0,
        limit: Number(process.env.BINANCE_ORDERS_PER_10S || 50) - 2, // Increased from 40-5 to 50-2
        available: Number(process.env.BINANCE_ORDERS_PER_10S || 50) - 2
      },
      orders1m: {
        used: 0,
        limit: Number(process.env.BINANCE_ORDERS_PER_1M || 1200) - 25, // Increased from 1500-50 to 1200-25
        available: Number(process.env.BINANCE_ORDERS_PER_1M || 1200) - 25
      },
      emergencyMode: this.emergencyMode
    };
  }

  // Method to reset emergency mode manually
  resetEmergencyMode(): void {
    this.emergencyMode = false;
    this.lastEmergencyReset = 0;
    console.log('[BinanceRateLimiter] 🔄 Emergency mode manually reset');
  }

  // Method to check and enable emergency mode based on usage
  private checkAndEnableEmergencyMode(): void {
    // DISABLED: Emergency mode auto-enable to prevent false positives
    // this.emergencyMode = true;
    // this.lastEmergencyReset = Date.now();
    console.log('[BinanceRateLimiter] ✅ Emergency mode auto-enable DISABLED - Manual control only');
    
    // Emergency mode will only be enabled manually or when explicitly triggered
    // setTimeout(() => {
    //   this.emergencyMode = false;
    //   console.log('[BinanceRateLimiter] 🔄 Emergency mode auto-reset after 10 minutes');
    // }, 600000); // 10 minutes
  }

  // Method to force enable emergency mode
  forceEmergencyMode(): void {
    this.emergencyMode = true;
    this.lastEmergencyReset = Date.now();
    console.log('[BinanceRateLimiter] 🚨 Emergency mode FORCED ENABLED');
  }
}

export const binanceRateLimiter = new BinanceRateLimiter();


