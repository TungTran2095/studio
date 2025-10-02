// Real-time tracking của Binance API usage với các rate limits chính xác
import { create } from 'zustand';

export interface BinanceRateLimit {
  name: string;
  current: number;
  limit: number;
  windowMs: number;
  resetTime: number;
  percentage: number;
  status: 'safe' | 'warning' | 'danger';
}

export interface BinanceApiCall {
  timestamp: number;
  endpoint: string;
  method: string;
  weight: number;
  orderCount?: number;
  responseHeaders?: Record<string, string>;
}

interface BinanceRateStore {
  // Current usage
  usedWeight1m: number;
  usedWeight1d: number;
  orderCount10s: number;
  orderCount1m: number;
  orderCount1d: number;
  rawRequests1m: number;
  
  // Limits (có thể config qua env)
  limits: {
    weight1m: number;
    weight1d: number;
    orders10s: number;
    orders1m: number;
    orders1d: number;
    rawRequests1m: number;
  };
  
  // Call history
  recentCalls: BinanceApiCall[];
  
  // Actions
  recordCall: (call: BinanceApiCall) => void;
  updateFromHeaders: (headers: Record<string, string>) => void;
  getRateLimits: () => BinanceRateLimit[];
  cleanup: () => void;
}

export const useBinanceRateStore = create<BinanceRateStore>((set, get) => ({
  usedWeight1m: 0,
  usedWeight1d: 0,
  orderCount10s: 0,
  orderCount1m: 0,
  orderCount1d: 0,
  rawRequests1m: 0,
  
  limits: {
    weight1m: Number(process.env.NEXT_PUBLIC_BINANCE_WEIGHT_1M || 1200),
    weight1d: Number(process.env.NEXT_PUBLIC_BINANCE_WEIGHT_1D || 100000),
    orders10s: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_10S || 50),
    orders1m: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_1M || 1600),
    orders1d: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_1D || 200000),
    rawRequests1m: Number(process.env.NEXT_PUBLIC_BINANCE_RAW_1M || 6000),
  },
  
  recentCalls: [],
  
  recordCall: (call) => set((state) => {
    const now = Date.now();
    const newCalls = [...state.recentCalls, call].filter(c => now - c.timestamp < 24 * 60 * 60 * 1000); // Keep 24h
    
    // Calculate current usage from recent calls
    const oneMinuteAgo = now - 60 * 1000;
    const tenSecondsAgo = now - 10 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    
    const weight1m = newCalls.filter(c => c.timestamp >= oneMinuteAgo).reduce((sum, c) => sum + c.weight, 0);
    const weight1d = newCalls.filter(c => c.timestamp >= oneDayAgo).reduce((sum, c) => sum + c.weight, 0);
    const orders10s = newCalls.filter(c => c.timestamp >= tenSecondsAgo && c.orderCount).length;
    const orders1m = newCalls.filter(c => c.timestamp >= oneMinuteAgo && c.orderCount).length;
    const orders1d = newCalls.filter(c => c.timestamp >= oneDayAgo && c.orderCount).length;
    const rawRequests1m = newCalls.filter(c => c.timestamp >= oneMinuteAgo).length;
    
    return {
      recentCalls: newCalls,
      usedWeight1m: weight1m,
      usedWeight1d: weight1d,
      orderCount10s: orders10s,
      orderCount1m: orders1m,
      orderCount1d: orders1d,
      rawRequests1m: rawRequests1m,
    };
  }),
  
  updateFromHeaders: (headers) => set((state) => {
    // Cập nhật từ response headers của Binance (chính xác hơn)
    const updates: Partial<BinanceRateStore> = {};
    
    if (headers['x-mbx-used-weight-1m']) {
      updates.usedWeight1m = Number(headers['x-mbx-used-weight-1m']);
    }
    if (headers['x-mbx-used-weight-1d']) {
      updates.usedWeight1d = Number(headers['x-mbx-used-weight-1d']);
    }
    if (headers['x-mbx-order-count-10s']) {
      updates.orderCount10s = Number(headers['x-mbx-order-count-10s']);
    }
    if (headers['x-mbx-order-count-1m']) {
      updates.orderCount1m = Number(headers['x-mbx-order-count-1m']);
    }
    if (headers['x-mbx-order-count-1d']) {
      updates.orderCount1d = Number(headers['x-mbx-order-count-1d']);
    }
    
    return { ...state, ...updates };
  }),
  
  getRateLimits: () => {
    const state = get();
    const now = Date.now();
    
    const createLimit = (name: string, current: number, limit: number, windowMs: number): BinanceRateLimit => {
      const percentage = limit > 0 ? (current / limit) * 100 : 0;
      const status = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'safe';
      const resetTime = now + windowMs;
      
      return { name, current, limit, windowMs, resetTime, percentage, status };
    };
    
    return [
      createLimit('Used Weight (1m)', state.usedWeight1m, state.limits.weight1m, 60 * 1000),
      createLimit('Used Weight (1d)', state.usedWeight1d, state.limits.weight1d, 24 * 60 * 60 * 1000),
      createLimit('Orders (10s)', state.orderCount10s, state.limits.orders10s, 10 * 1000),
      createLimit('Orders (1m)', state.orderCount1m, state.limits.orders1m, 60 * 1000),
      createLimit('Orders (1d)', state.orderCount1d, state.limits.orders1d, 24 * 60 * 60 * 1000),
      createLimit('Raw Requests (1m)', state.rawRequests1m, state.limits.rawRequests1m, 60 * 1000),
    ];
  },
  
  cleanup: () => set((state) => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    return {
      recentCalls: state.recentCalls.filter(c => c.timestamp >= oneDayAgo)
    };
  }),
}));

// Endpoint weight mapping (theo docs Binance)
export const BINANCE_ENDPOINT_WEIGHTS: Record<string, number> = {
  // Market Data
  '/api/v3/ping': 1,
  '/api/v3/time': 1,
  '/api/v3/exchangeInfo': 10,
  '/api/v3/depth': 1, // có thể 5, 10, 20 tùy limit
  '/api/v3/trades': 1,
  '/api/v3/historicalTrades': 5,
  '/api/v3/aggTrades': 1,
  '/api/v3/klines': 1,
  '/api/v3/uiKlines': 1,
  '/api/v3/avgPrice': 1,
  '/api/v3/ticker/24hr': 1, // hoặc 40 nếu không có symbol
  '/api/v3/ticker/price': 1, // hoặc 2 nếu không có symbol
  '/api/v3/ticker/bookTicker': 1, // hoặc 2 nếu không có symbol
  
  // Account Data
  '/api/v3/order': 1, // POST/DELETE/GET
  '/api/v3/orderList': 1,
  '/api/v3/openOrders': 3, // hoặc 40 nếu không có symbol
  '/api/v3/allOrders': 10,
  '/api/v3/account': 10,
  '/api/v3/myTrades': 10,
  
  // Margin
  '/sapi/v1/margin/account': 10,
  '/sapi/v1/margin/order': 3,
  '/sapi/v1/margin/openOrders': 10,
  
  // Futures
  '/fapi/v1/account': 5,
  '/fapi/v1/balance': 5,
  '/fapi/v1/positionRisk': 5,
  '/fapi/v1/order': 1,
  '/fapi/v1/openOrders': 1,
  '/fapi/v1/allOrders': 5,
};

export function getEndpointWeight(pathname: string): number {
  return BINANCE_ENDPOINT_WEIGHTS[pathname] || 1;
}

export function isOrderEndpoint(pathname: string): boolean {
  return pathname.includes('/order') || pathname.includes('/orderList');
}
