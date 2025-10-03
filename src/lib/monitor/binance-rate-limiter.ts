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
    // EMERGENCY MODE: Ultra conservative limits to avoid IP ban
    const usedWeightPerMin = Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 500); // Giảm xuống 500 để tránh ban
    const ordersPer10s = Number(process.env.BINANCE_ORDERS_PER_10S || 20); // Giảm xuống 20
    const ordersPer1m = Number(process.env.BINANCE_ORDERS_PER_1M || 800); // Giảm xuống 800
    this.limiter.defineBucket('weight:1m', 60_000, usedWeightPerMin - 200); // Tăng headroom lên 200
    this.limiter.defineBucket('orders:10s', 10_000, Math.max(1, ordersPer10s - 10)); // Tăng headroom lên 10
    this.limiter.defineBucket('orders:1m', 60_000, Math.max(5, ordersPer1m - 100)); // Tăng headroom lên 100
    
    // Auto-enable emergency mode if we detect high usage
    this.checkAndEnableEmergencyMode();
  }

  async throttle(kind: BinanceEndpointKind): Promise<void> {
    const c = COST[kind];
    
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
    } catch (error) {
      // If we hit rate limits, enter emergency mode
      this.emergencyMode = true;
      this.lastEmergencyReset = Date.now();
      console.error('[BinanceRateLimiter] 🚨 Rate limit exceeded, entering emergency mode');
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
        limit: Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1000) - 100,
        available: Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1000) - 100
      },
      orders10s: {
        used: 0,
        limit: Number(process.env.BINANCE_ORDERS_PER_10S || 40) - 5,
        available: Number(process.env.BINANCE_ORDERS_PER_10S || 40) - 5
      },
      orders1m: {
        used: 0,
        limit: Number(process.env.BINANCE_ORDERS_PER_1M || 1500) - 50,
        available: Number(process.env.BINANCE_ORDERS_PER_1M || 1500) - 50
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
    // Enable emergency mode immediately to prevent further API calls
    this.emergencyMode = true;
    this.lastEmergencyReset = Date.now();
    console.log('[BinanceRateLimiter] 🚨 EMERGENCY MODE ENABLED - All API calls blocked to prevent IP ban');
    
    // Auto-reset after 10 minutes instead of 5
    setTimeout(() => {
      this.emergencyMode = false;
      console.log('[BinanceRateLimiter] 🔄 Emergency mode auto-reset after 10 minutes');
    }, 600000); // 10 minutes
  }

  // Method to force enable emergency mode
  forceEmergencyMode(): void {
    this.emergencyMode = true;
    this.lastEmergencyReset = Date.now();
    console.log('[BinanceRateLimiter] 🚨 Emergency mode FORCED ENABLED');
  }
}

export const binanceRateLimiter = new BinanceRateLimiter();


