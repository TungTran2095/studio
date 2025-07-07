"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Wifi, 
  WifiOff,
  Clock,
  Database,
  Activity,
  DollarSign,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Zap,
  Play,
  Pause
} from 'lucide-react';
import { TotalAssetsCard } from '@/components/trading/total-assets-card';

interface EnhancedMarketData {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume: number;
  marketCap: number;
  lastUpdate: Date;
  status: 'connected' | 'disconnected' | 'error';
  source: 'coinmarketcap' | 'binance' | 'cache';
  confidence: number;
}

interface ConnectionStatus {
  source: string;
  connected: boolean;
  latency?: number;
  status: string;
  lastTest: Date;
}

interface CollectionStats {
  totalRecords: number;
  recordsToday: number;
  activeSources: number;
  dataQuality: number;
  lastUpdate: Date;
  realTimeConnections: number;
}

export function RealTimeDataMonitor() {
  const [marketData, setMarketData] = useState<EnhancedMarketData[]>([]);
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);

  // Fetch enhanced real-time data
  const fetchRealTimeData = async () => {
    setIsLoading(true);
    try {
      console.log('🔄 [RealTime UI] Fetching real-time data...');
      const response = await fetch('/api/market-data/enhanced?action=realtime_data');
      const result = await response.json();
      
      if (result.success) {
        // Convert date strings back to Date objects
        const processedData = result.data.map((item: any) => ({
          ...item,
          lastUpdate: new Date(item.lastUpdate)
        }));
        setMarketData(processedData);
        setLastRefresh(new Date());
        console.log(`✅ [RealTime UI] Loaded ${processedData.length} crypto symbols`);
      } else {
        console.error('❌ [RealTime UI] Failed to fetch data:', result.error);
      }
    } catch (error) {
      console.error('❌ [RealTime UI] Error fetching real-time data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch connection status
  const fetchConnections = async () => {
    try {
      const response = await fetch('/api/market-data/enhanced?action=connections_check');
      const result = await response.json();
      
      if (result.success) {
        const processedConnections = result.data.map((item: any) => ({
          ...item,
          lastTest: new Date(item.lastTest)
        }));
        setConnections(processedConnections);
      }
    } catch (error) {
      console.error('❌ [RealTime UI] Error fetching connections:', error);
    }
  };

  // Fetch collection stats
  const fetchStats = async () => {
    try {
      const response = await fetch('/api/market-data/enhanced?action=collection_stats');
      const result = await response.json();
      
      if (result.success) {
        const processedStats = {
          ...result.data,
          lastUpdate: new Date(result.data.lastUpdate)
        };
        setStats(processedStats);
      }
    } catch (error) {
      console.error('❌ [RealTime UI] Error fetching stats:', error);
    }
  };

  // Refresh all data
  const refreshAllData = async () => {
    await Promise.all([
      fetchRealTimeData(),
      fetchConnections(),
      fetchStats()
    ]);
  };

  // Force refresh data
  const forceRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/market-data/enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'refresh_data' })
      });
      
      const result = await response.json();
      if (result.success) {
        const processedData = result.data.map((item: any) => ({
          ...item,
          lastUpdate: new Date(item.lastUpdate)
        }));
        setMarketData(processedData);
        setLastRefresh(new Date());
      }
    } catch (error) {
      console.error('❌ [RealTime UI] Force refresh failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Auto refresh effect
  useEffect(() => {
    refreshAllData();
    
    if (autoRefresh && isMonitoring) {
      const interval = setInterval(() => {
        fetchRealTimeData();
      }, 30000); // Refresh every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [autoRefresh, isMonitoring]);

  const formatPrice = (price: number) => {
    return price >= 1 
      ? `$${price.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}`
      : `$${price.toFixed(6)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`;
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`;
    return `$${volume.toFixed(2)}`;
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'text-green-600';
    if (confidence >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSourceBadge = (source: string) => {
    switch (source) {
      case 'coinmarketcap':
        return <Badge className="bg-blue-500">CMC</Badge>;
      case 'binance':
        return <Badge className="bg-yellow-500">Binance</Badge>;
      case 'cache':
        return <Badge variant="secondary">Cache</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleToggleMonitoring = () => {
    setIsMonitoring(!isMonitoring);
  };

  if (isLoading && marketData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Đang tải dữ liệu real-time...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header với controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Dữ liệu thị trường Real-time</h2>
          <p className="text-muted-foreground">
            Real-time crypto data với multiple sources và fallback strategy
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isMonitoring ? "destructive" : "default"}
            size="sm"
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            <Activity className="h-4 w-4 mr-2" />
            Auto {autoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button
            onClick={forceRefresh}
            disabled={isLoading}
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Force Refresh
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium">Total Records</p>
                  <p className="text-2xl font-bold">{stats.totalRecords.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-sm font-medium">Today's Records</p>
                  <p className="text-2xl font-bold">{stats.recordsToday.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Wifi className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm font-medium">Live Connections</p>
                  <p className="text-2xl font-bold">{stats.realTimeConnections}/{stats.activeSources}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm font-medium">Data Quality</p>
                  <p className="text-2xl font-bold">{stats.dataQuality.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="market-data" className="space-y-4">
        <TabsList>
          <TabsTrigger value="market-data">Market Data</TabsTrigger>
          <TabsTrigger value="connections">Connections</TabsTrigger>
          <TabsTrigger value="debug">Debug Info</TabsTrigger>
        </TabsList>

        <TabsContent value="market-data">
          {/* Last refresh info */}
          <Alert className="mb-4">
            <Clock className="h-4 w-4" />
            <AlertDescription>
              Last updated: {lastRefresh.toLocaleTimeString('vi-VN')} 
              {autoRefresh && isMonitoring && ' • Auto-refresh every 30s'}
              {!isMonitoring && ' • Monitoring paused'}
            </AlertDescription>
          </Alert>

          {/* Tổng tài sản */}
          <TotalAssetsCard />

          {/* Market Data Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {marketData.map((crypto) => (
              <Card key={crypto.symbol} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{crypto.name}</CardTitle>
                      <CardDescription>{crypto.symbol}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getSourceBadge(crypto.source)}
                      <div className={`text-sm font-medium ${getConfidenceColor(crypto.confidence)}`}>
                        {crypto.confidence}%
                      </div>
                      {isMonitoring && (
                        <Badge variant="outline" className="animate-pulse">
                          Live
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-3">
                    {/* Price */}
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-bold">{formatPrice(crypto.price)}</span>
                      <div className={`flex items-center gap-1 ${
                        crypto.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {crypto.change24h >= 0 ? 
                          <TrendingUp className="h-4 w-4" /> : 
                          <TrendingDown className="h-4 w-4" />
                        }
                        <span className="font-medium">{crypto.change24h.toFixed(2)}%</span>
                      </div>
                    </div>

                    {/* Volume & Market Cap */}
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Volume 24h</p>
                        <p className="font-medium">{formatVolume(crypto.volume)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Market Cap</p>
                        <p className="font-medium">{formatVolume(crypto.marketCap)}</p>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Updated: {crypto.lastUpdate.toLocaleTimeString('vi-VN')}</span>
                      <div className="flex items-center gap-1">
                        {crypto.status === 'connected' ? 
                          <Wifi className="h-3 w-3 text-green-500" /> :
                          <WifiOff className="h-3 w-3 text-red-500" />
                        }
                        <span>{crypto.status}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="connections">
          <div className="space-y-4">
            {connections.map((conn) => (
              <Card key={conn.source}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {conn.connected ? 
                        <CheckCircle className="h-5 w-5 text-green-500" /> :
                        <XCircle className="h-5 w-5 text-red-500" />
                      }
                      <div>
                        <h3 className="font-medium">{conn.source}</h3>
                        <p className="text-sm text-muted-foreground">{conn.status}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {conn.latency && (
                        <p className="text-sm font-medium">{conn.latency}ms</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Last test: {conn.lastTest.toLocaleTimeString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="debug">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Debug Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-2">Market Data Status</h4>
                    <p className="text-sm">Symbols loaded: {marketData.length}</p>
                    <p className="text-sm">Average confidence: {
                      marketData.length > 0 
                        ? (marketData.reduce((sum, item) => sum + item.confidence, 0) / marketData.length).toFixed(1)
                        : 0
                    }%</p>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Data Sources</h4>
                    {['coinmarketcap', 'binance', 'cache'].map(source => {
                      const count = marketData.filter(item => item.source === source).length;
                      return (
                        <p key={source} className="text-sm">
                          {source}: {count} symbols
                        </p>
                      );
                    })}
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2">Monitoring Status</h4>
                    <p className="text-sm">Monitoring: {isMonitoring ? 'Active' : 'Paused'}</p>
                    <p className="text-sm">Auto Refresh: {autoRefresh ? 'Enabled' : 'Disabled'}</p>
                    <p className="text-sm">Last refresh: {lastRefresh.toLocaleString('vi-VN')}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 