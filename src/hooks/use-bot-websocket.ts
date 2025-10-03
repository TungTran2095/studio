import { useState, useEffect, useCallback } from 'react';
import { botWebSocketManager, BotWebSocketData } from '@/lib/websocket/bot-websocket-manager';

interface UseBotWebSocketOptions {
  symbol: string;
  timeframe?: string;
  enablePrice?: boolean;
  enableKlines?: boolean;
  enableDepth?: boolean;
  enableTrades?: boolean;
}

interface UseBotWebSocketResult {
  // Price data
  currentPrice: number | null;
  priceChange: number | null;
  tickerData: any | null;
  
  // Kline data
  klines: any[];
  latestKline: any | null;
  
  // Order book data
  orderBook: any | null;
  
  // Trade data
  recentTrades: any[];
  
  // Connection status
  isConnected: boolean;
  lastUpdate: Date | null;
  error: string | null;
}

/**
 * Hook để trading bots sử dụng WebSocket thay vì REST API
 * Giúp giảm 95%+ API calls cho market data
 */
export function useBotWebSocket({
  symbol,
  timeframe = '1m',
  enablePrice = true,
  enableKlines = true,
  enableDepth = false,
  enableTrades = false
}: UseBotWebSocketOptions): UseBotWebSocketResult {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [tickerData, setTickerData] = useState<any | null>(null);
  const [klines, setKlines] = useState<any[]>([]);
  const [latestKline, setLatestKline] = useState<any | null>(null);
  const [orderBook, setOrderBook] = useState<any | null>(null);
  const [recentTrades, setRecentTrades] = useState<any[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Handle price updates
  const handlePriceUpdate = useCallback((data: BotWebSocketData) => {
    if (data.symbol === symbol && enablePrice) {
      setCurrentPrice(data.data.price);
      setPriceChange(data.data.change);
      setTickerData(data.data);
      setLastUpdate(new Date());
      setError(null);
    }
  }, [symbol, enablePrice]);

  // Handle kline updates
  const handleKlineUpdate = useCallback((data: BotWebSocketData) => {
    if (data.symbol === symbol && enableKlines && data.data.interval === timeframe) {
      const newKlines = botWebSocketManager.getKlines(symbol, timeframe);
      setKlines([...newKlines]);
      setLatestKline(newKlines[newKlines.length - 1] || null);
      setLastUpdate(new Date());
      setError(null);
    }
  }, [symbol, timeframe, enableKlines]);

  // Handle depth updates
  const handleDepthUpdate = useCallback((data: BotWebSocketData) => {
    if (data.symbol === symbol && enableDepth) {
      setOrderBook(data.data);
      setLastUpdate(new Date());
      setError(null);
    }
  }, [symbol, enableDepth]);

  // Handle trade updates
  const handleTradeUpdate = useCallback((data: BotWebSocketData) => {
    if (data.symbol === symbol && enableTrades) {
      setRecentTrades(prev => {
        const newTrades = [data.data, ...prev].slice(0, 50); // Keep last 50 trades
        return newTrades;
      });
      setLastUpdate(new Date());
      setError(null);
    }
  }, [symbol, enableTrades]);

  // Handle connection status
  const handleConnectionChange = useCallback(() => {
    const connected = botWebSocketManager.isWebSocketConnected();
    setIsConnected(connected);
    
    if (!connected) {
      setError('WebSocket disconnected');
    } else {
      setError(null);
    }
  }, []);

  useEffect(() => {
    // Check initial connection
    handleConnectionChange();

    // Listen for WebSocket events
    botWebSocketManager.on('priceUpdate', handlePriceUpdate);
    botWebSocketManager.on('klineUpdate', handleKlineUpdate);
    botWebSocketManager.on('depthUpdate', handleDepthUpdate);
    botWebSocketManager.on('tradeUpdate', handleTradeUpdate);
    botWebSocketManager.on('connected', handleConnectionChange);
    botWebSocketManager.on('disconnected', handleConnectionChange);

    // Get initial data from cache
    if (enablePrice) {
      const price = botWebSocketManager.getCurrentPrice(symbol);
      const change = botWebSocketManager.getPriceChange(symbol);
      if (price !== null) {
        setCurrentPrice(price);
        setPriceChange(change);
      }
    }

    if (enableKlines) {
      const cachedKlines = botWebSocketManager.getKlines(symbol, timeframe);
      if (cachedKlines.length > 0) {
        setKlines([...cachedKlines]);
        setLatestKline(cachedKlines[cachedKlines.length - 1]);
      }
    }

    if (enableDepth) {
      const cachedOrderBook = botWebSocketManager.getOrderBook(symbol);
      if (cachedOrderBook) {
        setOrderBook(cachedOrderBook);
      }
    }

    // Ensure WebSocket is connected
    if (!botWebSocketManager.isWebSocketConnected()) {
      botWebSocketManager.connect();
    }

    return () => {
      botWebSocketManager.off('priceUpdate', handlePriceUpdate);
      botWebSocketManager.off('klineUpdate', handleKlineUpdate);
      botWebSocketManager.off('depthUpdate', handleDepthUpdate);
      botWebSocketManager.off('tradeUpdate', handleTradeUpdate);
      botWebSocketManager.off('connected', handleConnectionChange);
      botWebSocketManager.off('disconnected', handleConnectionChange);
    };
  }, [
    symbol,
    timeframe,
    enablePrice,
    enableKlines,
    enableDepth,
    enableTrades,
    handlePriceUpdate,
    handleKlineUpdate,
    handleDepthUpdate,
    handleTradeUpdate,
    handleConnectionChange
  ]);

  return {
    currentPrice,
    priceChange,
    tickerData,
    klines,
    latestKline,
    orderBook,
    recentTrades,
    isConnected,
    lastUpdate,
    error
  };
}

/**
 * Hook đơn giản chỉ để lấy giá hiện tại
 */
export function useBotPrice(symbol: string) {
  return useBotWebSocket({
    symbol,
    enablePrice: true,
    enableKlines: false,
    enableDepth: false,
    enableTrades: false
  });
}

/**
 * Hook để lấy klines cho strategy
 */
export function useBotKlines(symbol: string, timeframe: string) {
  return useBotWebSocket({
    symbol,
    timeframe,
    enablePrice: false,
    enableKlines: true,
    enableDepth: false,
    enableTrades: false
  });
}

/**
 * Hook để lấy tất cả market data
 */
export function useBotMarketData(symbol: string, timeframe: string) {
  return useBotWebSocket({
    symbol,
    timeframe,
    enablePrice: true,
    enableKlines: true,
    enableDepth: true,
    enableTrades: true
  });
}

/**
 * Hook để kiểm tra trạng thái WebSocket connection
 */
export function useBotWebSocketStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [lastConnectionCheck, setLastConnectionCheck] = useState<Date | null>(null);

  useEffect(() => {
    const checkStatus = () => {
      const connected = botWebSocketManager.isWebSocketConnected();
      setIsConnected(connected);
      setLastConnectionCheck(new Date());
    };

    checkStatus();
    
    // Check every 10 seconds
    const interval = setInterval(checkStatus, 10000);
    
    // Listen for connection events
    botWebSocketManager.on('connected', checkStatus);
    botWebSocketManager.on('disconnected', checkStatus);

    return () => {
      clearInterval(interval);
      botWebSocketManager.off('connected', checkStatus);
      botWebSocketManager.off('disconnected', checkStatus);
    };
  }, []);

  return {
    isConnected,
    lastConnectionCheck,
    reconnect: () => botWebSocketManager.connect(),
    disconnect: () => botWebSocketManager.disconnect()
  };
}
