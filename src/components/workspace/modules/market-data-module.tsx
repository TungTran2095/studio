"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  Download, 
  Play, 
  Pause, 
  Settings, 
  AlertCircle,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  RefreshCw,
  Square,
  BarChart3
} from 'lucide-react';
import { DataSourceManager } from './data-source-manager';
import { DataCollectionJobsManager } from './data-collection-jobs-manager';
import { DataQualityDashboard } from './data-quality-dashboard';
import { RealTimeDataMonitor } from './real-time-data-monitor';
import { MarketNewsMonitor } from './market-news-monitor';
import { realDataService, CollectionStats } from '@/lib/market-data/real-data-service';
import { ApiSetupNotice } from '@/components/ui/api-setup-notice';

interface MarketDataModuleProps {}

export function MarketDataModule({}: MarketDataModuleProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [isCollecting, setIsCollecting] = useState(false);
  const [collectionStats, setCollectionStats] = useState<CollectionStats>({
    totalRecords: 0,
    recordsToday: 0,
    activeSources: 0,
    dataQuality: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCollectionStats();
  }, []);

  const loadCollectionStats = async () => {
    try {
      setIsLoading(true);
      const stats = await realDataService.getCollectionStats();
      setCollectionStats(stats);
      
      // Kiểm tra xem có data sources nào đang hoạt động không
      const connections = await realDataService.checkDataSourceConnections();
      const activeConnections = connections.filter(conn => conn.connected).length;
      setIsCollecting(activeConnections > 0);
    } catch (error) {
      console.error('Error loading collection stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCollection = async () => {
    setIsCollecting(true);
    // Trigger data collection process - có thể gọi API để bắt đầu thu thập
    try {
      // Gọi API để bắt đầu thu thập dữ liệu
      const response = await fetch('/api/market-data/collect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'start_realtime',
          symbol: 'BTCUSDT'
        })
      });
      
      if (response.ok) {
        // Reload stats sau khi bắt đầu
        await loadCollectionStats();
      }
    } catch (error) {
      console.error('Error starting collection:', error);
      setIsCollecting(false);
    }
  };

  const handleStopCollection = () => {
    setIsCollecting(false);
    // Stop data collection process
  };

  const handleRefresh = () => {
    loadCollectionStats();
  };

  return (
    <div className="flex flex-col gap-4 p-4 min-h-full">
      {/* API Setup Notice */}
      <ApiSetupNotice />

      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Thu thập dữ liệu thị trường
          </h1>
          <p className="text-muted-foreground">
            Thu thập, xử lý và quản lý dữ liệu thị trường real-time
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant={isCollecting ? "destructive" : "default"}
            onClick={isCollecting ? handleStopCollection : handleStartCollection}
            className="flex items-center gap-2"
            disabled={isLoading}
          >
            {isCollecting ? (
              <>
                <Pause className="h-4 w-4" />
                Dừng thu thập
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Bắt đầu thu thập
              </>
            )}
          </Button>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng số records</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : collectionStats.totalRecords.toLocaleString()}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Records hôm nay</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : collectionStats.recordsToday.toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Nguồn dữ liệu</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : collectionStats.activeSources}
                </p>
              </div>
              <Activity className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Chất lượng dữ liệu</p>
                <p className="text-2xl font-bold">
                  {isLoading ? '...' : `${collectionStats.dataQuality}%`}
                </p>
                {!isLoading && (
                  <Progress value={collectionStats.dataQuality} className="mt-2" />
                )}
              </div>
              <CheckCircle className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Alert */}
      {isCollecting && !isLoading && (
        <Alert>
          <Zap className="h-4 w-4" />
          <AlertDescription>
            Đang thu thập dữ liệu từ {collectionStats.activeSources} nguồn. 
            Dữ liệu sẽ được cập nhật real-time từ Binance API, CoinMarketCap và lưu vào Supabase.
          </AlertDescription>
        </Alert>
      )}

      {!isCollecting && !isLoading && collectionStats.totalRecords === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Chưa có dữ liệu. Nhấn "Bắt đầu thu thập" để bắt đầu lấy dữ liệu từ các nguồn.
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="sources">Nguồn dữ liệu</TabsTrigger>
            <TabsTrigger value="jobs">Jobs thu thập</TabsTrigger>
            <TabsTrigger value="quality">Chất lượng</TabsTrigger>
            <TabsTrigger value="realtime">Real-time</TabsTrigger>
            <TabsTrigger value="news">Tin tức</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="overview" className="h-full">
              <OverviewTab isCollecting={isCollecting} collectionStats={collectionStats} />
            </TabsContent>

            <TabsContent value="sources" className="h-full">
              <DataSourceManager />
            </TabsContent>

            <TabsContent value="jobs" className="h-full">
              <DataCollectionJobsManager />
            </TabsContent>

            <TabsContent value="quality" className="h-full">
              <DataQualityDashboard />
            </TabsContent>

            <TabsContent value="realtime" className="h-full">
              <RealTimeDataMonitor />
            </TabsContent>

            <TabsContent value="news" className="h-full">
              <MarketNewsMonitor />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ isCollecting, collectionStats }: { 
  isCollecting: boolean; 
  collectionStats: CollectionStats; 
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
      {/* Data Collection Process */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Quy trình thu thập dữ liệu
          </CardTitle>
          <CardDescription>
            Quy trình tự động thu thập và xử lý dữ liệu thị trường từ các nguồn thực tế
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">Thu thập dữ liệu</p>
                <p className="text-sm text-muted-foreground">
                  Lấy dữ liệu từ Binance API và CoinMarketCap API
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-blue-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">Làm sạch dữ liệu</p>
                <p className="text-sm text-muted-foreground">
                  Xử lý giá trị thiếu và phát hiện anomalies
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-purple-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">Chuẩn hóa dữ liệu</p>
                <p className="text-sm text-muted-foreground">
                  Chuyển đổi về định dạng OHLCV chuẩn
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${isCollecting ? 'bg-orange-500' : 'bg-gray-300'}`} />
              <div>
                <p className="font-medium">Lưu trữ dữ liệu</p>
                <p className="text-sm text-muted-foreground">
                  Lưu vào Supabase database với bảng OHLCV_BTC_USDT_1m
                </p>
              </div>
            </div>
          </div>

          {/* Real-time stats */}
          {isCollecting && collectionStats.totalRecords > 0 && (
            <div className="mt-6 p-3 bg-muted rounded-lg">
              <div className="text-sm">
                <div className="flex justify-between mb-1">
                  <span>Records hôm nay:</span>
                  <span className="font-medium">{collectionStats.recordsToday.toLocaleString()}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Tổng records:</span>
                  <span className="font-medium">{collectionStats.totalRecords.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chất lượng:</span>
                  <span className="font-medium">{collectionStats.dataQuality}%</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data Types */}
      <Card>
        <CardHeader>
          <CardTitle>Loại dữ liệu thu thập</CardTitle>
          <CardDescription>
            Các loại dữ liệu được thu thập từ nguồn thực tế
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Dữ liệu giá OHLCV</h4>
                <Badge variant="secondary">Hoạt động</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Giá mở cửa, đóng cửa, cao nhất, thấp nhất và volume từ Binance
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Bảng: OHLCV_BTC_USDT_1m
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Market Overview</h4>
                <Badge variant="secondary">Hoạt động</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Tổng quan thị trường từ CoinMarketCap API
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Top 10 crypto, market cap, dominance
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Historical Data</h4>
                <Badge variant="secondary">Hoạt động</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Dữ liệu lịch sử từ Binance cho phân tích
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Hỗ trợ nhiều timeframes: 1m, 5m, 1h, 1d
              </p>
            </div>
            
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Real-time Prices</h4>
                <Badge variant="secondary">Hoạt động</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Giá real-time và thay đổi 24h
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Cập nhật liên tục từ CoinMarketCap
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 