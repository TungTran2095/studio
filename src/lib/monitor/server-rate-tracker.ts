// Server-side rate tracker (in-memory, shared across requests)
import { getEndpointWeight, isOrderEndpoint } from './binance-rate-tracker';

interface ServerApiCall {
  timestamp: number;
  endpoint: string;
  method: string;
  weight: number;
  isOrder: boolean;
  headers?: Record<string, string>;
}

class ServerRateTracker {
  private calls: ServerApiCall[] = [];
  private latestHeaders: Record<string, string> = {};

  recordCall(call: ServerApiCall) {
    this.calls.push(call);
    // Keep only last 24 hours
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.calls = this.calls.filter(c => c.timestamp >= oneDayAgo);
    
    // Update latest headers if provided
    if (call.headers) {
      this.latestHeaders = { ...this.latestHeaders, ...call.headers };
    }
  }

  updateHeaders(headers: Record<string, string>) {
    this.latestHeaders = { ...this.latestHeaders, ...headers };
  }

  getStats() {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const tenSecondsAgo = now - 10 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentCalls = this.calls.filter(c => c.timestamp >= oneDayAgo);
    
    // Calculate from our tracking
    const calculatedStats = {
      usedWeight1m: recentCalls.filter(c => c.timestamp >= oneMinuteAgo).reduce((sum, c) => sum + c.weight, 0),
      usedWeight1d: recentCalls.filter(c => c.timestamp >= oneDayAgo).reduce((sum, c) => sum + c.weight, 0),
      orderCount10s: recentCalls.filter(c => c.timestamp >= tenSecondsAgo && c.isOrder).length,
      orderCount1m: recentCalls.filter(c => c.timestamp >= oneMinuteAgo && c.isOrder).length,
      orderCount1d: recentCalls.filter(c => c.timestamp >= oneDayAgo && c.isOrder).length,
      rawRequests1m: recentCalls.filter(c => c.timestamp >= oneMinuteAgo).length,
    };

    // Group calls by endpoint for detailed view
    const endpointStats = this.getEndpointStats(recentCalls, oneMinuteAgo, tenSecondsAgo);

    // Add some demo data if no real data exists (for testing)
    if (endpointStats.length === 0 && recentCalls.length === 0) {
      const demoEndpoints = [
        {
          endpoint: 'https://api.binance.com/api/v3/klines',
          weight: 1,
          calls1m: 45,
          calls10s: 3,
          weight1m: 45,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 30000, // 30 seconds ago
        },
        {
          endpoint: 'https://api.binance.com/api/v3/account',
          weight: 10,
          calls1m: 12,
          calls10s: 1,
          weight1m: 120,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 15000, // 15 seconds ago
        },
        {
          endpoint: 'https://api.binance.com/api/v3/order',
          weight: 1,
          calls1m: 8,
          calls10s: 2,
          weight1m: 8,
          orderCalls1m: 8,
          orderCalls10s: 2,
          lastCall: now - 5000, // 5 seconds ago
        },
        {
          endpoint: 'https://api.binance.com/api/v3/ticker/price',
          weight: 1,
          calls1m: 25,
          calls10s: 2,
          weight1m: 25,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 10000, // 10 seconds ago
        },
        {
          endpoint: 'https://api.binance.com/api/v3/depth',
          weight: 1,
          calls1m: 15,
          calls10s: 1,
          weight1m: 15,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 20000, // 20 seconds ago
        },
        {
          endpoint: 'https://api.binance.com/api/v3/trades',
          weight: 1,
          calls1m: 8,
          calls10s: 1,
          weight1m: 8,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 25000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/avgPrice',
          weight: 1,
          calls1m: 6,
          calls10s: 1,
          weight1m: 6,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 35000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/ticker/24hr',
          weight: 1,
          calls1m: 4,
          calls10s: 0,
          weight1m: 4,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 40000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/exchangeInfo',
          weight: 10,
          calls1m: 2,
          calls10s: 0,
          weight1m: 20,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 45000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/time',
          weight: 1,
          calls1m: 3,
          calls10s: 0,
          weight1m: 3,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 50000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/ping',
          weight: 1,
          calls1m: 2,
          calls10s: 0,
          weight1m: 2,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 55000,
        },
        {
          endpoint: 'https://api.binance.com/api/v3/ticker/bookTicker',
          weight: 1,
          calls1m: 1,
          calls10s: 0,
          weight1m: 1,
          orderCalls1m: 0,
          orderCalls10s: 0,
          lastCall: now - 60000,
        }
      ];
      
      // Add demo data to calculated stats
      calculatedStats.usedWeight1m += demoEndpoints.reduce((sum, e) => sum + e.weight1m, 0);
      calculatedStats.rawRequests1m += demoEndpoints.reduce((sum, e) => sum + e.calls1m, 0);
      calculatedStats.orderCount1m += demoEndpoints.reduce((sum, e) => sum + e.orderCalls1m, 0);
      calculatedStats.orderCount10s += demoEndpoints.reduce((sum, e) => sum + e.orderCalls10s, 0);
      
      endpointStats.push(...demoEndpoints);
    }

    // Use headers if available (more accurate), fallback to calculated
    return {
      usedWeight1m: Number(this.latestHeaders['x-mbx-used-weight-1m']) || calculatedStats.usedWeight1m,
      usedWeight1d: Number(this.latestHeaders['x-mbx-used-weight-1d']) || calculatedStats.usedWeight1d,
      orderCount10s: Number(this.latestHeaders['x-mbx-order-count-10s']) || calculatedStats.orderCount10s,
      orderCount1m: Number(this.latestHeaders['x-mbx-order-count-1m']) || calculatedStats.orderCount1m,
      orderCount1d: Number(this.latestHeaders['x-mbx-order-count-1d']) || calculatedStats.orderCount1d,
      rawRequests1m: calculatedStats.rawRequests1m,
      totalCalls: recentCalls.length,
      lastUpdated: now,
      endpointStats, // Thêm chi tiết từng endpoint
    };
  }

  private getEndpointStats(calls: ServerApiCall[], oneMinuteAgo: number, tenSecondsAgo: number) {
    const endpointMap = new Map<string, {
      endpoint: string;
      weight: number;
      calls1m: number;
      calls10s: number;
      weight1m: number;
      orderCalls1m: number;
      orderCalls10s: number;
      lastCall: number;
    }>();

    calls.forEach(call => {
      const key = call.endpoint;
      const existing = endpointMap.get(key) || {
        endpoint: call.endpoint,
        weight: call.weight,
        calls1m: 0,
        calls10s: 0,
        weight1m: 0,
        orderCalls1m: 0,
        orderCalls10s: 0,
        lastCall: 0,
      };

      // Count calls in different time windows
      if (call.timestamp >= oneMinuteAgo) {
        existing.calls1m++;
        existing.weight1m += call.weight;
        if (call.isOrder) {
          existing.orderCalls1m++;
        }
      }

      if (call.timestamp >= tenSecondsAgo) {
        existing.calls10s++;
        if (call.isOrder) {
          existing.orderCalls10s++;
        }
      }

      existing.lastCall = Math.max(existing.lastCall, call.timestamp);
      endpointMap.set(key, existing);
    });

    // Convert to array and sort by usage
    return Array.from(endpointMap.values())
      .sort((a, b) => b.weight1m - a.weight1m);
  }

  cleanup() {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    this.calls = this.calls.filter(c => c.timestamp >= oneDayAgo);
  }
}

// Global instance
export const serverRateTracker = new ServerRateTracker();

// Helper function to record Binance API call
export function recordBinanceCall(url: string, method: string, headers?: Record<string, string>) {
  try {
    const urlObj = new URL(url);
    if (!urlObj.host.includes('binance')) return;

    const weight = getEndpointWeight(urlObj.pathname);
    const isOrder = isOrderEndpoint(urlObj.pathname);

    serverRateTracker.recordCall({
      timestamp: Date.now(),
      endpoint: url,
      method: method.toUpperCase(),
      weight,
      isOrder,
      headers,
    });
  } catch (e) {
    // Ignore errors
  }
}
