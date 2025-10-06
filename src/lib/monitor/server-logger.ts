import { supabase } from '@/lib/supabase-client';

export type ApiCategory = 'Giá' | 'Giao dịch' | 'Tài khoản' | 'Nội bộ' | 'Khác';
export type ApiService = 'Binance' | 'App API' | 'Khác';

function classify(url: string): { category: ApiCategory; service: ApiService; endpointName?: string; normalizedUrl?: string; pathname?: string } {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const normalizedUrl = `${u.protocol}//${u.host}${u.pathname}`;
    const isBinance = u.host.includes('binance');
    if (isBinance) {
      if (path.includes('/ticker') || path.includes('/klines') || path.includes('/avgprice') || path.includes('/depth') || path.includes('/exchangeinfo')) {
        return { category: 'Giá', service: 'Binance', endpointName: 'Market Data', normalizedUrl, pathname: u.pathname };
      }
      if (path.includes('/order') || path.includes('/mytrades') || path.includes('/openorders') || path.includes('/allorders')) {
        return { category: 'Giao dịch', service: 'Binance', endpointName: 'Trading', normalizedUrl, pathname: u.pathname };
      }
      if (path.includes('/account') || path.includes('/balance')) {
        return { category: 'Tài khoản', service: 'Binance', endpointName: 'Account', normalizedUrl, pathname: u.pathname };
      }
      return { category: 'Khác', service: 'Binance', endpointName: 'Other', normalizedUrl, pathname: u.pathname };
    }
    if (u.pathname.startsWith('/api/')) {
      return { category: 'Nội bộ', service: 'App API', endpointName: u.pathname, normalizedUrl, pathname: u.pathname };
    }
    return { category: 'Khác', service: 'Khác', endpointName: u.pathname, normalizedUrl, pathname: u.pathname };
  } catch {
    return { category: 'Khác', service: 'Khác' } as any;
  }
}

export async function logApiCall(params: {
  method: string;
  url: string;
  status?: number;
  durationMs?: number;
  responseSize?: number;
  usedWeight1m?: number;
  orderCount10s?: number;
  orderCount1m?: number;
  timestamp?: number;
  source?: string;
}) {
  try {
    if (!supabase) return;
    const { category, service, endpointName, normalizedUrl, pathname } = classify(params.url);
    await supabase.from('api_calls').insert({
      timestamp: new Date(params.timestamp || Date.now()).toISOString(),
      method: params.method,
      url: params.url,
      normalized_url: normalizedUrl,
      pathname,
      status: params.status,
      duration_ms: params.durationMs,
      response_size: params.responseSize,
      category,
      service,
      endpoint_name: endpointName,
      used_weight_1m: params.usedWeight1m,
      order_count_10s: params.orderCount10s,
      order_count_1m: params.orderCount1m,
      source: params.source || 'server'
    });
  } catch (e) {
    // tránh làm hỏng flow chính
    console.error('[monitor] Failed to log api call:', e);
  }
}

export async function instrumentedFetch(input: string, init?: RequestInit) {
  const start = Date.now();
  try {
    const res = await fetch(input, init);
    let size = 0;
    try {
      const t = await res.clone().text();
      size = new Blob([t]).size;
    } catch {}
    
    // Extract rate limit headers
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      if (key.startsWith('x-mbx-')) {
        headers[key] = value;
      }
    });
    
    const usedWeight1m = Number(res.headers.get('x-mbx-used-weight-1m') || '');
    const orderCount10s = Number(res.headers.get('x-mbx-order-count-10s') || '');
    const orderCount1m = Number(res.headers.get('x-mbx-order-count-1m') || '');
    
    // Track Binance API calls in server rate tracker
    // Simplified: No Binance call tracking
    
    await logApiCall({
      method: (init?.method || 'GET').toUpperCase(),
      url: input,
      status: res.status,
      durationMs: Date.now() - start,
      responseSize: size,
      usedWeight1m: isNaN(usedWeight1m) ? undefined : usedWeight1m,
      orderCount10s: isNaN(orderCount10s) ? undefined : orderCount10s,
      orderCount1m: isNaN(orderCount1m) ? undefined : orderCount1m,
      source: 'server'
    });
    return res;
  } catch (e) {
    await logApiCall({
      method: (init?.method || 'GET').toUpperCase(),
      url: input,
      status: 0,
      durationMs: Date.now() - start,
      source: 'server'
    });
    throw e;
  }
}


