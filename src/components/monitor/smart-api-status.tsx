import React, { useEffect, useState, useCallback } from 'react';
import { binanceWebSocketManager } from '@/lib/websocket/binance-websocket';
import { smartApiManager } from '@/lib/api/smart-api-manager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, RefreshCw, Database, Zap } from 'lucide-react';

interface SmartApiStatusProps {
  className?: string;
}

export function SmartApiStatus({ className }: SmartApiStatusProps) {
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Monitor WebSocket connection status
  useEffect(() => {
    const updateConnectionStatus = () => {
      setIsWebSocketConnected(binanceWebSocketManager.isWebSocketConnected());
    };

    // Initial check
    updateConnectionStatus();

    // Listen for connection events
    binanceWebSocketManager.on('connected', updateConnectionStatus);
    binanceWebSocketManager.on('disconnected', updateConnectionStatus);

    return () => {
      binanceWebSocketManager.off('connected', updateConnectionStatus);
      binanceWebSocketManager.off('disconnected', updateConnectionStatus);
    };
  }, []);

  // Update cache stats periodically
  useEffect(() => {
    const updateStats = () => {
      setCacheStats(smartApiManager.getCacheStats());
      setLastUpdate(new Date());
    };

    updateStats();
    const interval = setInterval(updateStats, 60000); // EMERGENCY: Tăng từ 10s lên 60s để giảm API calls

    return () => clearInterval(interval);
  }, []);

  const handleReconnectWebSocket = useCallback(() => {
    if (isWebSocketConnected) {
      binanceWebSocketManager.disconnect();
    } else {
      binanceWebSocketManager.connect();
    }
  }, [isWebSocketConnected]);

  const handleClearCache = useCallback(() => {
    smartApiManager.clearAllCaches();
    setCacheStats(smartApiManager.getCacheStats());
  }, []);

  const handlePreloadData = useCallback(async () => {
    // This would need API key from context or props
    console.log('[SmartApiStatus] Preloading critical data...');
    // await smartApiManager.preloadCriticalData(apiKey);
  }, []);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Smart API Manager
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* WebSocket Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isWebSocketConnected ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-600" />
            )}
            <span className="text-sm font-medium">WebSocket</span>
          </div>
          <Badge variant={isWebSocketConnected ? "default" : "destructive"}>
            {isWebSocketConnected ? "Connected" : "Disconnected"}
          </Badge>
        </div>

        {/* Cache Statistics */}
        {cacheStats && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Cache Statistics
            </h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-muted-foreground">Price Cache:</span>
                <div className="font-medium">{cacheStats.priceCache.size} items</div>
              </div>
              <div>
                <span className="text-muted-foreground">Account Cache:</span>
                <div className="font-medium">{cacheStats.accountCache.size} items</div>
              </div>
              <div>
                <span className="text-muted-foreground">Pending Calls:</span>
                <div className="font-medium">{cacheStats.pendingCalls}</div>
              </div>
              <div>
                <span className="text-muted-foreground">Last Update:</span>
                <div className="font-medium">{lastUpdate.toLocaleTimeString()}</div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleReconnectWebSocket}
            className="flex-1"
          >
            <RefreshCw className="h-3 w-3 mr-1" />
            {isWebSocketConnected ? "Disconnect" : "Connect"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleClearCache}
            className="flex-1"
          >
            <Database className="h-3 w-3 mr-1" />
            Clear Cache
          </Button>
        </div>

        {/* Performance Tips */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div className="font-medium">💡 Performance Tips:</div>
          <div>• WebSocket reduces API calls by 90%</div>
          <div>• Cache reduces redundant requests</div>
          <div>• Smart deduplication prevents duplicate calls</div>
        </div>
      </CardContent>
    </Card>
  );
}
