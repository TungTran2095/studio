import { useState, useEffect, useCallback } from 'react';
import { binanceWebSocketManager, BinanceWebSocketData } from '@/lib/websocket/binance-websocket';

interface UseWebSocketPriceOptions {
  symbol: string;
  fallbackToRest?: boolean;
  updateInterval?: number;
}

interface UseWebSocketPriceResult {
  price: string | null;
  isLoading: boolean;
  error: string | null;
  isWebSocketConnected: boolean;
  lastUpdate: Date | null;
}

/**
 * Hook để sử dụng WebSocket cho price updates thay vì REST API
 * Giúp giảm đáng kể số lượng API calls và tránh rate limit
 */
export function useWebSocketPrice({ 
  symbol, 
  fallbackToRest = false,
  updateInterval = 1000 
}: UseWebSocketPriceOptions): UseWebSocketPriceResult {
  const [price, setPrice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);

  // Check WebSocket connection status
  const checkConnection = useCallback(() => {
    const connected = binanceWebSocketManager.isWebSocketConnected();
    setIsWebSocketConnected(connected);
    
    if (!connected && fallbackToRest) {
      console.warn(`[useWebSocketPrice] WebSocket not connected for ${symbol}, will use REST API fallback`);
    }
  }, [symbol, fallbackToRest]);

  // Handle price updates from WebSocket
  const handlePriceUpdate = useCallback((data: BinanceWebSocketData) => {
    if (data.symbol === symbol) {
      setPrice(data.price);
      setLastUpdate(new Date());
      setIsLoading(false);
      setError(null);
    }
  }, [symbol]);

  // Fallback to REST API if WebSocket fails
  const fetchPriceFromRest = useCallback(async () => {
    if (!fallbackToRest) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/trading/binance/price', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          symbol: symbol,
          apiKey: '', // Empty for public price data
          apiSecret: '',
          isTestnet: false
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.price) {
        setPrice(data.price);
        setLastUpdate(new Date());
        setError(null);
      } else {
        throw new Error(data.error || 'Failed to fetch price');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error(`[useWebSocketPrice] REST API fallback failed for ${symbol}:`, errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [symbol, fallbackToRest]);

  useEffect(() => {
    // Check initial connection
    checkConnection();

    // Listen for WebSocket events
    binanceWebSocketManager.on('priceUpdate', handlePriceUpdate);
    binanceWebSocketManager.on('connected', checkConnection);
    binanceWebSocketManager.on('disconnected', checkConnection);

    // Try to get initial price
    const getInitialPrice = async () => {
      if (binanceWebSocketManager.isWebSocketConnected()) {
        try {
          const initialPrice = await binanceWebSocketManager.getCurrentPrice(symbol);
          setPrice(initialPrice);
          setLastUpdate(new Date());
          setIsLoading(false);
        } catch (err) {
          console.warn(`[useWebSocketPrice] Failed to get initial price for ${symbol}:`, err);
          if (fallbackToRest) {
            await fetchPriceFromRest();
          } else {
            setError('WebSocket connection failed and REST fallback disabled');
            setIsLoading(false);
          }
        }
      } else if (fallbackToRest) {
        await fetchPriceFromRest();
      } else {
        setError('WebSocket not connected and REST fallback disabled');
        setIsLoading(false);
      }
    };

    getInitialPrice();

    // Set up periodic connection check
    const connectionCheckInterval = setInterval(checkConnection, updateInterval);

    return () => {
      binanceWebSocketManager.off('priceUpdate', handlePriceUpdate);
      binanceWebSocketManager.off('connected', checkConnection);
      binanceWebSocketManager.off('disconnected', checkConnection);
      clearInterval(connectionCheckInterval);
    };
  }, [symbol, handlePriceUpdate, checkConnection, fetchPriceFromRest, fallbackToRest, updateInterval]);

  return {
    price,
    isLoading,
    error,
    isWebSocketConnected,
    lastUpdate
  };
}

/**
 * Hook để sử dụng WebSocket cho multiple symbols
 */
export function useWebSocketPrices(symbols: string[]): Record<string, UseWebSocketPriceResult> {
  const results: Record<string, UseWebSocketPriceResult> = {};
  
  symbols.forEach(symbol => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    results[symbol] = useWebSocketPrice({ symbol, fallbackToRest: true });
  });
  
  return results;
}

/**
 * Hook để kiểm tra trạng thái WebSocket connection
 */
export function useWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const connected = binanceWebSocketManager.isWebSocketConnected();
      setIsConnected(connected);
      setLastConnectionCheck(new Date());
    };

    checkStatus();
    
    // Check every 5 seconds
    const interval = setInterval(checkStatus, 5000);
    
    // Listen for connection events
    binanceWebSocketManager.on('connected', checkStatus);
    binanceWebSocketManager.on('disconnected', checkStatus);

    return () => {
      clearInterval(interval);
      binanceWebSocketManager.off('connected', checkStatus);
      binanceWebSocketManager.off('disconnected', checkStatus);
    };
  }, []);

  return {
    isConnected,
    lastConnectionCheck,
    reconnect: () => binanceWebSocketManager.connect(),
    disconnect: () => binanceWebSocketManager.disconnect()
  };
}
