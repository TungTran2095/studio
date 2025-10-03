import { useState, useEffect, useCallback } from 'react';
import { smartApiManager } from '@/lib/api/smart-api-manager';
import { binanceWebSocketManager } from '@/lib/websocket/binance-websocket';

interface UseSmartApiOptions {
  apiKey?: string;
  useCache?: boolean;
  cacheTTL?: number;
  useWebSocket?: boolean;
  priority?: 'high' | 'medium' | 'low';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface UseSmartApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  fromCache: boolean;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

/**
 * Hook để sử dụng Smart API Manager với caching và WebSocket
 */
export function useSmartApi<T>(
  apiCall: () => Promise<T>,
  options: UseSmartApiOptions = {}
): UseSmartApiResult<T> {
  const {
    useCache = true,
    cacheTTL = 30000,
    useWebSocket = true,
    priority = 'medium',
    autoRefresh = false,
    refreshInterval = 30000
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    if (loading) return; // Prevent concurrent calls

    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      setData(result);
      setFromCache(false);
      setLastUpdate(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useSmartApi] Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [apiCall, loading]);

  // Auto refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    fetchData();
    const interval = setInterval(fetchData, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchData]);

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    fromCache,
    lastUpdate,
    refetch: fetchData
  };
}

/**
 * Hook để lấy giá với WebSocket và cache
 */
export function useSmartPrice(symbol: string, options: UseSmartApiOptions = {}) {
  return useSmartApi(
    () => smartApiManager.getPrice(symbol, options),
    {
      useWebSocket: true,
      useCache: true,
      cacheTTL: 10000,
      priority: 'high',
      ...options
    }
  );
}

/**
 * Hook để lấy account data với cache
 */
export function useSmartAccount(apiKey: string, options: UseSmartApiOptions = {}) {
  return useSmartApi(
    () => smartApiManager.getAccountData(apiKey, options),
    {
      useCache: true,
      cacheTTL: 30000,
      priority: 'medium',
      ...options
    }
  );
}

/**
 * Hook để lấy balance với cache
 */
export function useSmartBalance(apiKey: string, options: UseSmartApiOptions = {}) {
  return useSmartApi(
    () => smartApiManager.getBalance(apiKey, options),
    {
      useCache: true,
      cacheTTL: 30000,
      priority: 'high',
      ...options
    }
  );
}

/**
 * Hook để monitor WebSocket connection
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);

  useEffect(() => {
    const updateStatus = () => {
      setIsConnected(binanceWebSocketManager.isWebSocketConnected());
    };

    const handleMessage = (data: any) => {
      setLastMessage(data);
    };

    // Initial status
    updateStatus();

    // Listen for events
    binanceWebSocketManager.on('connected', updateStatus);
    binanceWebSocketManager.on('disconnected', updateStatus);
    binanceWebSocketManager.on('priceUpdate', handleMessage);

    return () => {
      binanceWebSocketManager.off('connected', updateStatus);
      binanceWebSocketManager.off('disconnected', updateStatus);
      binanceWebSocketManager.off('priceUpdate', handleMessage);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    connect: () => binanceWebSocketManager.connect(),
    disconnect: () => binanceWebSocketManager.disconnect()
  };
}

/**
 * Hook để batch multiple API calls
 */
export function useBatchApiCalls<T>(
  calls: Array<() => Promise<T>>,
  options: UseSmartApiOptions = {}
) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const executeBatch = useCallback(async () => {
    if (loading) return;

    setLoading(true);
    setError(null);

    try {
      const results = await smartApiManager.batchApiCalls(calls, options);
      setData(results);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('[useBatchApiCalls] Error:', errorMessage);
    } finally {
      setLoading(false);
    }
  }, [calls, options, loading]);

  useEffect(() => {
    executeBatch();
  }, [executeBatch]);

  return {
    data,
    loading,
    error,
    refetch: executeBatch
  };
}
