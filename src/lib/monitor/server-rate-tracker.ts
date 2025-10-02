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
    };
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
