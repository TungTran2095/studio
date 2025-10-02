import { useState, useEffect, useCallback } from 'react';

export interface ApiCall {
  id: string;
  endpoint: string;
  method: string;
  timestamp: number;
  duration: number;
  status: 'success' | 'error';
  responseSize?: number;
  // Phân loại và metadata
  category?: 'Giá' | 'Giao dịch' | 'Tài khoản' | 'Nội bộ' | 'Khác';
  service?: 'Binance' | 'App API' | 'Khác';
  endpointName?: string;
  normalizedUrl?: string; // protocol//host + pathname (không query)
  pathname?: string; // chỉ pathname
  // Header rate limit từ Binance (nếu có)
  usedWeight1m?: number; // x-mbx-used-weight-1m
  orderCount10s?: number; // x-mbx-order-count-10s
  orderCount1m?: number; // x-mbx-order-count-1m
}

export interface ApiUsageStats {
  endpoint: string;
  method: string;
  category: NonNullable<ApiCall['category']>;
  service: NonNullable<ApiCall['service']>;
  endpointName?: string;
  normalizedUrl?: string;
  pathname?: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgDuration: number;
  lastCalled: number;
  callsPerMinute: number;
  callsPerHour: number;
  totalDataTransferred: number;
  // Rate limit gần nhất
  lastUsedWeight1m?: number;
  lastOrderCount10s?: number;
  lastOrderCount1m?: number;
}

export function useApiMonitoring() {
  const [apiCalls, setApiCalls] = useState<ApiCall[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);

  // Bắt đầu theo dõi API calls
  const startMonitoring = useCallback(() => {
    setIsMonitoring(true);
    
    // Intercept fetch calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const startTime = Date.now();
      const url = args[0] as string;
      const options = args[1] || {};
      const method = options.method || 'GET';
      
      // Xác định phân loại endpoint
      const classify = (inputUrl: string): {
        category: ApiCall['category'];
        service: ApiCall['service'];
        endpointName?: string;
        normalizedUrl?: string;
        pathname?: string;
      } => {
        try {
          const u = new URL(inputUrl, window.location.origin);
          const host = u.host;
          const path = u.pathname.toLowerCase();
          const normalizedUrl = `${u.protocol}//${u.host}${u.pathname}`;
          const isBinance = host.includes('binance');
          if (isBinance) {
            // Giá thị trường
            if (path.includes('/ticker') || path.includes('/klines') || path.includes('/avgprice') || path.includes('/depth') || path.includes('/exchangeinfo')) {
              return { category: 'Giá', service: 'Binance', endpointName: 'Market Data', normalizedUrl, pathname: u.pathname };
            }
            // Giao dịch
            if (path.includes('/order') || path.includes('/mytrades') || path.includes('/openorders') || path.includes('/allorders')) {
              return { category: 'Giao dịch', service: 'Binance', endpointName: 'Trading', normalizedUrl, pathname: u.pathname };
            }
            // Tài khoản
            if (path.includes('/account') || path.includes('/balance') ) {
              return { category: 'Tài khoản', service: 'Binance', endpointName: 'Account', normalizedUrl, pathname: u.pathname };
            }
            return { category: 'Khác', service: 'Binance', endpointName: 'Other', normalizedUrl, pathname: u.pathname };
          }
          // App internal API
          if (u.origin === window.location.origin && u.pathname.startsWith('/api/')) {
            return { category: 'Nội bộ', service: 'App API', endpointName: u.pathname, normalizedUrl, pathname: u.pathname };
          }
          return { category: 'Khác', service: 'Khác', endpointName: u.pathname, normalizedUrl, pathname: u.pathname };
        } catch {
          return { category: 'Khác', service: 'Khác', endpointName: undefined, normalizedUrl: undefined, pathname: undefined };
        }
      };
      const { category, service, endpointName, normalizedUrl, pathname } = classify(url);
      
      try {
        const response = await originalFetch(...args);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Lấy kích thước response nếu có thể
        let responseSize = 0;
        try {
          const clonedResponse = response.clone();
          const text = await clonedResponse.text();
          responseSize = new Blob([text]).size;
        } catch (e) {
          // Ignore error
        }
        
        // Lấy các header rate limit của Binance nếu có
        const usedWeight1mHeader = response.headers.get('x-mbx-used-weight-1m');
        const orderCount10sHeader = response.headers.get('x-mbx-order-count-10s');
        const orderCount1mHeader = response.headers.get('x-mbx-order-count-1m');
        const usedWeight1m = usedWeight1mHeader ? Number(usedWeight1mHeader) : undefined;
        const orderCount10s = orderCount10sHeader ? Number(orderCount10sHeader) : undefined;
        const orderCount1m = orderCount1mHeader ? Number(orderCount1mHeader) : undefined;
        
        const apiCall: ApiCall = {
          id: `${Date.now()}-${Math.random()}`,
          endpoint: url,
          method,
          timestamp: startTime,
          duration,
          status: response.ok ? 'success' : 'error',
          responseSize,
          category,
          service,
          endpointName,
          normalizedUrl,
          pathname,
          usedWeight1m,
          orderCount10s,
          orderCount1m
        };
        
        setApiCalls(prev => [...prev, apiCall]);
        
        return response;
      } catch (error) {
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        const apiCall: ApiCall = {
          id: `${Date.now()}-${Math.random()}`,
          endpoint: url,
          method,
          timestamp: startTime,
          duration,
          status: 'error',
          category,
          service,
          endpointName,
          normalizedUrl,
          pathname
        };
        
        setApiCalls(prev => [...prev, apiCall]);
        
        throw error;
      }
    };
    
    return () => {
      window.fetch = originalFetch;
    };
  }, []);

  // Dừng theo dõi
  const stopMonitoring = useCallback(() => {
    setIsMonitoring(false);
  }, []);

  // Xóa dữ liệu cũ (giữ lại 1000 calls gần nhất)
  const cleanupOldCalls = useCallback(() => {
    setApiCalls(prev => {
      const sorted = prev.sort((a, b) => b.timestamp - a.timestamp);
      return sorted.slice(0, 1000);
    });
  }, []);

  // Tính toán thống kê sử dụng API
  const getApiUsageStats = useCallback((): ApiUsageStats[] => {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    
    // Nhóm các API calls theo endpoint và method
    const groupedCalls = apiCalls.reduce((acc, call) => {
      const key = `${call.method}:${call.endpoint}`;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(call);
      return acc;
    }, {} as Record<string, ApiCall[]>);
    
    return Object.entries(groupedCalls).map(([key, calls]) => {
      const [method, endpoint] = key.split(':');
      const totalCalls = calls.length;
      const successCalls = calls.filter(c => c.status === 'success').length;
      const errorCalls = calls.filter(c => c.status === 'error').length;
      const avgDuration = calls.reduce((sum, c) => sum + c.duration, 0) / totalCalls;
      const lastCalled = Math.max(...calls.map(c => c.timestamp));
      const callsPerMinute = calls.filter(c => c.timestamp >= oneMinuteAgo).length;
      const callsPerHour = calls.filter(c => c.timestamp >= oneHourAgo).length;
      const totalDataTransferred = calls.reduce((sum, c) => sum + (c.responseSize || 0), 0);
      // Lấy thông tin phân loại và header gần nhất từ call mới nhất
      const latest = calls.reduce((latest, c) => (c.timestamp > latest.timestamp ? c : latest), calls[0]);
      
      return {
        endpoint,
        method,
        category: latest.category || 'Khác',
        service: latest.service || 'Khác',
        endpointName: latest.endpointName,
        normalizedUrl: latest.normalizedUrl,
        pathname: latest.pathname,
        totalCalls,
        successCalls,
        errorCalls,
        avgDuration,
        lastCalled,
        callsPerMinute,
        callsPerHour,
        totalDataTransferred,
        lastUsedWeight1m: latest.usedWeight1m,
        lastOrderCount10s: latest.orderCount10s,
        lastOrderCount1m: latest.orderCount1m
      };
    }).sort((a, b) => b.totalCalls - a.totalCalls);
  }, [apiCalls]);

  // Tự động cleanup mỗi 5 phút
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(cleanupOldCalls, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isMonitoring, cleanupOldCalls]);

  return {
    apiCalls,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    getApiUsageStats,
    cleanupOldCalls
  };
}
