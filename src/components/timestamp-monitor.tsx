'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, Clock, Server, Wifi, WifiOff } from 'lucide-react';

interface TimestampInfo {
  local: {
    timestamp: number;
    formatted: string;
    description: string;
  };
  server: {
    timestamp: number | null;
    formatted: string | null;
    error: string | null;
    description: string;
  };
  offset: {
    value: number;
    description: string;
  };
  adjusted: {
    timestamp: number;
    formatted: string;
    description: string;
  };
  safe: {
    timestamp: number;
    formatted: string;
    description: string;
  };
  trading: {
    timestamp: number;
    formatted: string;
    description: string;
  };
  sync: {
    isSynchronized: boolean;
    description: string;
  };
  differences: {
    localVsServer: number;
    adjustedVsServer: number;
    safeVsServer: number;
    tradingVsServer: number;
    description: string;
  } | null;
  statistics: {
    totalSyncs: number;
    successfulSyncs: number;
    successRate: number;
    avgOffset: number;
    lastSyncTime: number;
    lastSyncFormatted: string;
  };
  history: Array<{
    timestamp: number;
    serverTime: number;
    offset: number;
    success: boolean;
    error?: string;
  }>;
}

interface TimestampMonitorResponse {
  success: boolean;
  timestamp: number;
  info: TimestampInfo;
  recommendations: string[];
  error?: string;
}

export default function TimestampMonitor() {
  const [data, setData] = useState<TimestampMonitorResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  const fetchTimestampInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/timestamp-monitor');
      const result = await response.json();
      
      if (result.success) {
        setData(result);
      } else {
        setError(result.error || 'Không thể lấy thông tin timestamp');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timestamp-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'sync' }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchTimestampInfo(); // Refresh data after sync
      } else {
        setError(result.error || 'Không thể sync timestamp');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timestamp-monitor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'reset' }),
      });
      
      const result = await response.json();
      if (result.success) {
        await fetchTimestampInfo(); // Refresh data after reset
      } else {
        setError(result.error || 'Không thể reset timestamp');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleForceSync = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/timestamp-monitor/force-sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      const result = await response.json();
      if (result.success) {
        console.log('Force sync results:', result);
        await fetchTimestampInfo(); // Refresh data after force sync
      } else {
        setError(result.error || 'Không thể force sync');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  const handleRestartBot = async (botName: string) => {
    setLoading(true);
    try {
      const response = await fetch('/api/timestamp-monitor/restart-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ botName }),
      });
      
      const result = await response.json();
      if (result.success) {
        console.log(`Restart bot ${botName} results:`, result);
        await fetchTimestampInfo(); // Refresh data after restart
      } else {
        setError(result.error || `Không thể restart bot ${botName}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi không xác định');
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchTimestampInfo, 30000); // EMERGENCY: Tăng từ 5s lên 30s để giảm API calls
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initial load
  useEffect(() => {
    fetchTimestampInfo();
  }, []);

  const formatDuration = (ms: number) => {
    const abs = Math.abs(ms);
    if (abs < 1000) return `${ms}ms`;
    if (abs < 60000) return `${Math.round(ms / 1000)}s`;
    return `${Math.round(ms / 60000)}m`;
  };

  const getStatusColor = (isSynchronized: boolean) => {
    return isSynchronized ? 'bg-green-500' : 'bg-red-500';
  };

  const getDifferenceColor = (diff: number) => {
    if (Math.abs(diff) < 1000) return 'text-green-600';
    if (Math.abs(diff) < 5000) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (error) {
    return (
      <Alert className="mb-4">
        <WifiOff className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Timestamp Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={autoRefresh ? 'bg-green-50' : ''}
              >
                {autoRefresh ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                Auto Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchTimestampInfo}
                disabled={loading}
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSync}
                disabled={loading}
              >
                Sync
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={loading}
              >
                Reset
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleForceSync}
                disabled={loading}
              >
                Force Sync & Restart All Bots
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRestartBot('Farmer02')}
                disabled={loading}
                className="bg-blue-50 hover:bg-blue-100"
              >
                Restart Farmer02
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {data && (
        <>
          {/* Status Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Trạng thái đồng bộ
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge className={`${getStatusColor(data.info.sync.isSynchronized)} text-white`}>
                  {data.info.sync.isSynchronized ? 'Đã đồng bộ' : 'Chưa đồng bộ'}
                </Badge>
                <span className="text-sm text-gray-600">
                  Offset: {data.info.offset.value}ms
                </span>
                <span className="text-sm text-gray-600">
                  Success Rate: {data.info.statistics.successRate.toFixed(1)}%
                </span>
              </div>

              {/* Recommendations */}
              {data.recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium">Khuyến nghị:</h4>
                  {data.recommendations.map((rec, index) => (
                    <Alert key={index} className="text-sm">
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Time Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Local Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  <div className="font-mono text-sm">{data.info.local.formatted}</div>
                  <div className="text-xs text-gray-500">{data.info.local.description}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Server Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {data.info.server.formatted ? (
                    <>
                      <div className="font-mono text-sm">{data.info.server.formatted}</div>
                      <div className="text-xs text-gray-500">{data.info.server.description}</div>
                    </>
                  ) : (
                    <div className="text-red-500 text-sm">
                      {data.info.server.error || 'Không thể kết nối'}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Time Difference</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {data.info.differences && (
                    <>
                      <div className={`font-mono text-sm ${getDifferenceColor(data.info.differences.localVsServer)}`}>
                        {formatDuration(data.info.differences.localVsServer)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Local {data.info.differences.localVsServer > 0 ? 'nhanh hơn' : 'chậm hơn'} server
                      </div>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Timestamp Types */}
          <Card>
            <CardHeader>
              <CardTitle>Timestamp Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">Adjusted</h4>
                  <div className="font-mono text-sm">{data.info.adjusted.formatted}</div>
                  <div className="text-xs text-gray-500">{data.info.adjusted.description}</div>
                  {data.info.differences && (
                    <div className={`text-xs ${getDifferenceColor(data.info.differences.adjustedVsServer)}`}>
                      {formatDuration(data.info.differences.adjustedVsServer)} vs server
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Safe</h4>
                  <div className="font-mono text-sm">{data.info.safe.formatted}</div>
                  <div className="text-xs text-gray-500">{data.info.safe.description}</div>
                  {data.info.differences && (
                    <div className={`text-xs ${getDifferenceColor(data.info.differences.safeVsServer)}`}>
                      {formatDuration(data.info.differences.safeVsServer)} vs server
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="font-medium">Trading</h4>
                  <div className="font-mono text-sm">{data.info.trading.formatted}</div>
                  <div className="text-xs text-gray-500">{data.info.trading.description}</div>
                  {data.info.differences && (
                    <div className={`text-xs ${getDifferenceColor(data.info.differences.tradingVsServer)}`}>
                      {formatDuration(data.info.differences.tradingVsServer)} vs server
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Sync Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.info.statistics.totalSyncs}</div>
                  <div className="text-xs text-gray-500">Total Syncs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{data.info.statistics.successfulSyncs}</div>
                  <div className="text-xs text-gray-500">Successful</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.info.statistics.successRate.toFixed(1)}%</div>
                  <div className="text-xs text-gray-500">Success Rate</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{data.info.statistics.avgOffset}ms</div>
                  <div className="text-xs text-gray-500">Avg Offset</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm text-gray-600">
                  Last Sync: {data.info.statistics.lastSyncFormatted}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sync History */}
          {data.info.history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Sync History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {data.info.history.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <Badge className={entry.success ? 'bg-green-500' : 'bg-red-500'}>
                          {entry.success ? 'Success' : 'Failed'}
                        </Badge>
                        <span className="text-sm font-mono">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Offset: {entry.offset}ms
                        {entry.error && (
                          <div className="text-red-500 text-xs">{entry.error}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
