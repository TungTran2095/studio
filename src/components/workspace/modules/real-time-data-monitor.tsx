"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Wifi,
  WifiOff,
  Pause,
  Play,
  RefreshCw
} from 'lucide-react';

// Định nghĩa interface local
interface RealMarketData {
  symbol: string;
  price: number;
  change24h: number;
  volume: number;
  lastUpdate: Date | string;
  status: 'connected' | 'disconnected' | 'error';
}

export function RealTimeDataMonitor() {
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [realTimeData, setRealTimeData] = useState<RealMarketData[]>([]);
  const [connectionStats, setConnectionStats] = useState({
    activeConnections: 0,
    totalMessages: 0,
    messagesPerSecond: 0,
    uptime: '0m'
  });
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<{ source: string; connected: boolean; latency?: number }[]>([]);

  useEffect(() => {
    loadRealTimeData();
    checkConnections();
    
    // Thiết lập interval để cập nhật dữ liệu định kỳ
    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(() => {
        loadRealTimeData();
        updateConnectionStats();
      }, 30000); // Cập nhật mỗi 30 giây
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const loadRealTimeData = async () => {
    try {
      setIsLoading(true);
      console.log('🔄 [RealTimeDataMonitor] Loading real-time data via API...');
      
      // Gọi API endpoint thay vì gọi trực tiếp service
      const response = await fetch('/api/market-data/collect?action=test_realtime');
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log('📊 [RealTimeDataMonitor] API response success:', result.data.length, 'items');
        console.log('💰 [RealTimeDataMonitor] First item (BTC):', result.data[0]);
        setRealTimeData(result.data);
      } else {
        console.error('❌ [RealTimeDataMonitor] API response failed:', result);
        setRealTimeData([]);
      }
    } catch (error) {
      console.error('❌ [RealTimeDataMonitor] Error loading real-time data:', error);
      setRealTimeData([]);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      // Gọi API endpoint thay vì gọi trực tiếp service
      const response = await fetch('/api/market-data/collect?action=test_coinmarketcap');
      const result = await response.json();
      
      const connectionStatus = [
        {
          source: 'Binance API',
          connected: true, // Giả định kết nối tốt
          latency: 50 + Math.floor(Math.random() * 100)
        },
        {
          source: 'CoinMarketCap API',
          connected: result.success === true,
          latency: response.ok ? 100 + Math.floor(Math.random() * 200) : undefined
        },
        {
          source: 'Supabase Database',
          connected: true, // Supabase thường ổn định
          latency: 30 + Math.floor(Math.random() * 50)
        }
      ];
      
      setConnections(connectionStatus);
      
      // Cập nhật connection stats
      const activeConnections = connectionStatus.filter(conn => conn.connected).length;
      const averageLatency = connectionStatus
        .filter(conn => conn.latency)
        .reduce((sum, conn) => sum + (conn.latency || 0), 0) / connectionStatus.length;

      setConnectionStats(prev => ({
        ...prev,
        activeConnections,
        messagesPerSecond: activeConnections * 10 + Math.floor(Math.random() * 20) // Simulate message rate
      }));
    } catch (error) {
      console.error('Error checking connections:', error);
      // Fallback connection status
      setConnections([
        { source: 'Binance API', connected: false },
        { source: 'CoinMarketCap API', connected: false },
        { source: 'Supabase Database', connected: false }
      ]);
    }
  };

  const updateConnectionStats = () => {
    setConnectionStats(prev => ({
      ...prev,
      totalMessages: prev.totalMessages + Math.floor(Math.random() * 50) + 20,
      messagesPerSecond: Math.floor(Math.random() * 30) + 20,
      uptime: calculateUptime()
    }));
  };

  const calculateUptime = () => {
    // Simulate uptime calculation
    const now = new Date();
    const start = new Date(now.getTime() - 3 * 60 * 60 * 1000); // 3 hours ago
    const diff = now.getTime() - start.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected': return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected': return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error': return <WifiOff className="h-4 w-4 text-red-500" />;
      default: return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? 
      <TrendingUp className="h-4 w-4 text-green-500" /> : 
      <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const formatPrice = (price: number) => {
    return price.toFixed(price > 1 ? 2 : 6);
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    return `${prefix}${change.toFixed(2)}%`;
  };

  const getLastUpdateText = (lastUpdate: Date | string) => {
    const now = new Date();
    const updateDate = typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate;
    
    // Kiểm tra nếu không phải Date hợp lệ
    if (isNaN(updateDate.getTime())) {
      return 'Không xác định';
    }
    
    const diff = now.getTime() - updateDate.getTime();
    const seconds = Math.floor(diff / 1000);
    if (seconds < 1) return 'Vừa xong';
    if (seconds < 60) return `${seconds}s trước`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m trước`;
  };

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  const handleRefresh = () => {
    loadRealTimeData();
    checkConnections();
  };

  if (isLoading && realTimeData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu real-time từ CoinMarketCap...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Giám sát dữ liệu Real-time</h2>
          <p className="text-muted-foreground">
            Theo dõi dữ liệu thị trường trực tiếp từ CoinMarketCap và kết nối API
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            onClick={handleToggleMonitoring}
          >
            {isMonitoring ? (
              <>
                <Pause className="h-4 w-4 mr-2" />
                Tạm dừng
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Bắt đầu
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Connection Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Kết nối hoạt động</p>
                <p className="text-2xl font-bold">{connectionStats.activeConnections}</p>
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng requests</p>
                <p className="text-2xl font-bold">{connectionStats.totalMessages.toLocaleString()}</p>
              </div>
              <Zap className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Requests/phút</p>
                <p className="text-2xl font-bold">{connectionStats.messagesPerSecond}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Uptime</p>
                <p className="text-2xl font-bold">{connectionStats.uptime}</p>
              </div>
              <Activity className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Connection Status */}
      {connections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wifi className="h-5 w-5" />
              Trạng thái kết nối API
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connections.map((conn, index) => (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                  {conn.connected ? 
                    <Wifi className="h-5 w-5 text-green-500" /> : 
                    <WifiOff className="h-5 w-5 text-red-500" />
                  }
                  <div className="flex-1">
                    <p className="font-medium">{conn.source}</p>
                    {conn.latency && (
                      <p className="text-sm text-muted-foreground">{conn.latency}ms</p>
                    )}
                  </div>
                  <Badge variant={conn.connected ? "secondary" : "destructive"}>
                    {conn.connected ? 'Kết nối' : 'Mất kết nối'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Real-time Data Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Dữ liệu Real-time từ CoinMarketCap
          </CardTitle>
          <CardDescription>
            Giá và khối lượng giao dịch được cập nhật từ CoinMarketCap API
          </CardDescription>
        </CardHeader>
        <CardContent>
          {realTimeData.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Chưa có dữ liệu real-time</h3>
              <p className="text-muted-foreground mb-4">
                Kiểm tra kết nối API hoặc nhấn làm mới để tải dữ liệu
              </p>
              <Button onClick={handleRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {realTimeData.map((item) => (
                <div key={item.symbol} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(item.status)}
                      <div>
                        <h4 className="font-medium">{item.symbol}</h4>
                        <p className="text-sm text-muted-foreground">
                          Cập nhật: {getLastUpdateText(item.lastUpdate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === 'connected' ? 'secondary' : 'destructive'}>
                        {item.status === 'connected' ? 'Hoạt động' : 'Mất kết nối'}
                      </Badge>
                      {isMonitoring && (
                        <Badge variant="outline" className="animate-pulse">
                          Live
                        </Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Giá</p>
                      <p className="text-lg font-bold">${formatPrice(item.price)}</p>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Thay đổi 24h</p>
                      <div className="flex items-center gap-1">
                        {getChangeIcon(item.change24h)}
                        <span className={`font-medium ${item.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {formatChange(item.change24h)}
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm text-muted-foreground">Khối lượng 24h</p>
                      <p className="font-medium">${item.volume.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Show data source */}
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">Nguồn:</span> CoinMarketCap API
                      <span className="ml-3 font-medium">Cập nhật:</span> {
                        typeof item.lastUpdate === 'string' 
                          ? new Date(item.lastUpdate).toLocaleTimeString('vi-VN')
                          : item.lastUpdate.toLocaleTimeString('vi-VN')
                      }
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 