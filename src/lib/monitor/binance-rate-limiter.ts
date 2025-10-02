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
  account: { weight: 5 },
  order: { weight: 1, order10s: 1, order1m: 1 },
};

class BinanceRateLimiter {
  private limiter = new SlidingWindowLimiter();

  constructor() {
    // Default conservative limits; can be tuned via env
    const usedWeightPerMin = Number(process.env.BINANCE_USED_WEIGHT_PER_MIN || 1100);
    const ordersPer10s = Number(process.env.BINANCE_ORDERS_PER_10S || 50);
    const ordersPer1m = Number(process.env.BINANCE_ORDERS_PER_1M || 1600);
    this.limiter.defineBucket('weight:1m', 60_000, usedWeightPerMin - 50); // leave headroom
    this.limiter.defineBucket('orders:10s', 10_000, Math.max(1, ordersPer10s - 2));
    this.limiter.defineBucket('orders:1m', 60_000, Math.max(5, ordersPer1m - 20));
  }

  async throttle(kind: BinanceEndpointKind) {
    const c = COST[kind];
    await this.limiter.acquire('weight:1m', c.weight);
    if (c.order10s) await this.limiter.acquire('orders:10s', c.order10s);
    if (c.order1m) await this.limiter.acquire('orders:1m', c.order1m);
  }
}

export const binanceRateLimiter = new BinanceRateLimiter();


