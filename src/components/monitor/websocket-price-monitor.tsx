import React, { useEffect, useState, useCallback } from 'react';
import { binanceWebSocketManager } from '@/lib/websocket/binance-websocket';
import { smartApiManager } from '@/lib/api/smart-api-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

interface RealTimePriceData {
  symbol: string;
  price: string;
  change24h: number;
  volume24h: number;
  timestamp: number;
}

interface WebSocketPriceMonitorProps {
  symbols?: string[];
  className?: string;
}

export function WebSocketPriceMonitor({ 
  symbols = ['BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'BNBUSDT'],
  className 
}: WebSocketPriceMonitorProps) {
  const [prices, setPrices] = useState<Map<string, RealTimePriceData>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsConnected(binanceWebSocketManager.isWebSocketConnected());
    };

    // Initial status
    updateConnectionStatus();

    // Listen for connection events
    binanceWebSocketManager.on('connected', updateConnectionStatus);
    binanceWebSocketManager.on('disconnected', updateConnectionStatus);

    // Listen for price updates
    binanceWebSocketManager.on('priceUpdate', handlePriceUpdate);

    // Connect if not already connected
    if (!binanceWebSocketManager.isWebSocketConnected()) {
      binanceWebSocketManager.connect();
    }

    return () => {
      binanceWebSocketManager.off('connected', updateConnectionStatus);
      binanceWebSocketManager.off('disconnected', updateConnectionStatus);
      binanceWebSocketManager.off('priceUpdate', handlePriceUpdate);
    };
  }, []);

  const handlePriceUpdate = useCallback((data: any) => {
    if (symbols.includes(data.symbol)) {
      setPrices(prev => {
        const newPrices = new Map(prev);
        newPrices.set(data.symbol, {
          symbol: data.symbol,
          price: data.price,
          change24h: 0, // Would need additional data for 24h change
          volume24h: 0, // Would need additional data for volume
          timestamp: data.timestamp
        });
        return newPrices;
      });
      setLastUpdate(new Date());
    }
  }, [symbols]);

  const handleRefresh = useCallback(async () => {
    // Fallback to REST API if WebSocket is not available
    if (!isConnected) {
      try {
        for (const symbol of symbols) {
          const result = await smartApiManager.getPrice(symbol, { 
            useWebSocket: false,
            priority: 'high' 
          });
          
          setPrices(prev => {
            const newPrices = new Map(prev);
            newPrices.set(symbol, {
              symbol,
              price: result.data,
              change24h: 0,
              volume24h: 0,
              timestamp: result.timestamp
            });
            return newPrices;
          });
        }
        setLastUpdate(new Date());
      } catch (error) {
        console.error('[WebSocketPriceMonitor] Failed to fetch prices:', error);
      }
    }
  }, [isConnected, symbols]);

  const formatPrice = (price: string): string => {
    const numPrice = parseFloat(price);
    if (numPrice >= 1) {
      return `$${numPrice.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`;
    } else {
      return `$${numPrice.toFixed(6)}`;
    }
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-3 w-3 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-3 w-3 text-red-600" />;
    return <Minus className="h-3 w-3 text-gray-600" />;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Real-Time Prices
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? "WebSocket" : "REST API"}
            </Badge>
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            disabled={!isConnected}
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {symbols.map(symbol => {
            const priceData = prices.get(symbol);
            return (
              <div key={symbol} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="font-medium">{symbol}</div>
                  {priceData && getChangeIcon(priceData.change24h)}
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {priceData ? formatPrice(priceData.price) : 'Loading...'}
                  </div>
                  {priceData && (
                    <div className={`text-xs ${getChangeColor(priceData.change24h)}`}>
                      {priceData.change24h > 0 ? '+' : ''}{priceData.change24h.toFixed(2)}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {lastUpdate && (
          <div className="mt-4 text-xs text-muted-foreground text-center">
            Last update: {lastUpdate.toLocaleTimeString()}
          </div>
        )}

        {!isConnected && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm text-yellow-800">
              ⚠️ WebSocket disconnected. Using REST API fallback.
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
