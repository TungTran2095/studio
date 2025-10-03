"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Shield,
  Zap,
  TrendingUp,
  Database,
  Info
} from 'lucide-react';
import { BinanceRateLimit } from '@/lib/monitor/binance-rate-tracker';

interface EndpointStat {
  endpoint: string;
  weight: number;
  calls1m: number;
  calls10s: number;
  weight1m: number;
  orderCalls1m: number;
  orderCalls10s: number;
  lastCall: number;
}

interface RateLimitData {
  usedWeight1m: number;
  usedWeight1d: number;
  orderCount10s: number;
  orderCount1m: number;
  orderCount1d: number;
  rawRequests1m: number;
  totalCalls: number;
  lastUpdated: number;
  endpointStats: EndpointStat[];
}

interface BinanceRateLimitMonitorProps {
  className?: string;
}

export function BinanceRateLimitMonitor({ className }: BinanceRateLimitMonitorProps) {
  const [rateLimits, setRateLimits] = useState<BinanceRateLimit[]>([]);
  const [endpointStats, setEndpointStats] = useState<EndpointStat[]>([]);
  const [cacheStats, setCacheStats] = useState<any>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(true);

  // Fetch data from server API
  const fetchRateData = async () => {
    try {
      const [rateResponse, cacheResponse] = await Promise.all([
        fetch('/api/monitor/binance-rates'),
        fetch('/api/monitor/cache-stats')
      ]);
      
      if (rateResponse.ok) {
        const result = await rateResponse.json();
        if (result.success) {
          const data = result.data;
          console.log('Rate limit data:', data);
          console.log('Endpoint stats:', data.endpointStats);
          
          // Default limits (can be configured via env)
          const limits = {
            weight1m: Number(process.env.NEXT_PUBLIC_BINANCE_WEIGHT_1M || 1200),
            weight1d: Number(process.env.NEXT_PUBLIC_BINANCE_WEIGHT_1D || 100000),
            orders10s: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_10S || 50),
            orders1m: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_1M || 1600),
            orders1d: Number(process.env.NEXT_PUBLIC_BINANCE_ORDERS_1D || 200000),
            rawRequests1m: Number(process.env.NEXT_PUBLIC_BINANCE_RAW_1M || 6000),
          };

          const createLimit = (name: string, current: number, limit: number, windowMs: number): BinanceRateLimit => {
            const percentage = limit > 0 ? (current / limit) * 100 : 0;
            const status = percentage >= 90 ? 'danger' : percentage >= 70 ? 'warning' : 'safe';
            const resetTime = Date.now() + windowMs;
            
            return { name, current, limit, windowMs, resetTime, percentage, status };
          };

          const newRateLimits = [
            createLimit('Used Weight (1m)', data.usedWeight1m, limits.weight1m, 60 * 1000),
            createLimit('Used Weight (1d)', data.usedWeight1d, limits.weight1d, 24 * 60 * 60 * 1000),
            createLimit('Orders (10s)', data.orderCount10s, limits.orders10s, 10 * 1000),
            createLimit('Orders (1m)', data.orderCount1m, limits.orders1m, 60 * 1000),
            createLimit('Orders (1d)', data.orderCount1d, limits.orders1d, 24 * 60 * 60 * 1000),
            createLimit('Raw Requests (1m)', data.rawRequests1m, limits.rawRequests1m, 60 * 1000),
          ];

          setRateLimits(newRateLimits);
          setEndpointStats(data.endpointStats || []);
          setLastUpdated(new Date(data.lastUpdated));
        }
      }
      
      if (cacheResponse.ok) {
        const cacheResult = await cacheResponse.json();
        if (cacheResult.success) {
          setCacheStats(cacheResult.data);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch rate data:', error);
      setLoading(false);
    }
  };

  // Fetch data every 10 seconds (giảm từ 3s để giảm API calls)
  useEffect(() => {
    fetchRateData();
    const interval = setInterval(fetchRateData, 10000); // Tăng từ 3s lên 10s
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: BinanceRateLimit['status']) => {
    switch (status) {
      case 'safe': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
      case 'danger': return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
  };

  const getStatusColor = (status: BinanceRateLimit['status']) => {
    switch (status) {
      case 'safe': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'danger': return 'text-red-600';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatTimeRemaining = (resetTime: number) => {
    const now = Date.now();
    const remaining = Math.max(0, resetTime - now);
    
    if (remaining < 60 * 1000) {
      return `${Math.ceil(remaining / 1000)}s`;
    } else if (remaining < 60 * 60 * 1000) {
      return `${Math.ceil(remaining / (60 * 1000))}m`;
    } else {
      return `${Math.ceil(remaining / (60 * 60 * 1000))}h`;
    }
  };

  const dangerLimits = rateLimits.filter(l => l.status === 'danger');
  const warningLimits = rateLimits.filter(l => l.status === 'warning');

  // Mapping rate limits to their corresponding endpoints
  const getEndpointsForLimit = (limitName: string): string[] => {
    switch (limitName) {
      case 'Used Weight (1m)':
      case 'Used Weight (1d)':
        return [
          'https://api.binance.com/api/v3/klines',
          'https://api.binance.com/api/v3/ticker/24hr',
          'https://api.binance.com/api/v3/ticker/price',
          'https://api.binance.com/api/v3/depth',
          'https://api.binance.com/api/v3/account',
          'https://api.binance.com/api/v3/myTrades',
          'https://api.binance.com/api/v3/exchangeInfo',
          'https://api.binance.com/api/v3/avgPrice',
          'https://api.binance.com/api/v3/trades',
          'https://api.binance.com/api/v3/historicalTrades',
          'https://api.binance.com/sapi/v1/margin/account',
          'https://api.binance.com/fapi/v1/account',
          'https://api.binance.com/fapi/v1/balance'
        ];
      case 'Orders (10s)':
      case 'Orders (1m)':
      case 'Orders (1d)':
        return [
          'https://api.binance.com/api/v3/order (POST)',
          'https://api.binance.com/api/v3/order (DELETE)',
          'https://api.binance.com/api/v3/orderList (POST)',
          'https://api.binance.com/api/v3/orderList (DELETE)',
          'https://api.binance.com/sapi/v1/margin/order (POST)',
          'https://api.binance.com/sapi/v1/margin/order (DELETE)',
          'https://api.binance.com/fapi/v1/order (POST)',
          'https://api.binance.com/fapi/v1/order (DELETE)',
          'https://api.binance.com/fapi/v1/batchOrders (POST)'
        ];
      case 'Raw Requests (1m)':
        return [
          'Tất cả các endpoint Binance',
          'https://api.binance.com/api/v3/*',
          'https://api.binance.com/sapi/v1/*',
          'https://api.binance.com/fapi/v1/*',
          'https://api.binance.com/dapi/v1/*',
          'Bao gồm cả market data và trading endpoints'
        ];
      default:
        return [];
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Binance Rate Limit Monitor</h3>
          <Badge variant={dangerLimits.length > 0 ? "destructive" : warningLimits.length > 0 ? "secondary" : "default"}>
            {dangerLimits.length > 0 ? "Nguy hiểm" : warningLimits.length > 0 ? "Cảnh báo" : "An toàn"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchRateData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </Button>
          <div className="text-xs text-muted-foreground">
            Cập nhật: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Cảnh báo nếu có */}
      {dangerLimits.length > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Nguy hiểm!</strong> {dangerLimits.length} rate limit đang ở mức nguy hiểm (≥90%). 
            Bot có thể bị lỗi 418/429. Hãy giảm tần suất gọi API.
          </AlertDescription>
        </Alert>
      )}

      {warningLimits.length > 0 && dangerLimits.length === 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Cảnh báo:</strong> {warningLimits.length} rate limit đang ở mức cảnh báo (≥70%). 
            Hãy theo dõi và cân nhắc giảm tần suất API.
          </AlertDescription>
        </Alert>
      )}

      {/* Tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4" />
              Trạng thái tổng
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dangerLimits.length > 0 ? "Nguy hiểm" : warningLimits.length > 0 ? "Cảnh báo" : "An toàn"}
            </div>
            <div className="text-xs text-muted-foreground">
              {rateLimits.filter(l => l.status === 'safe').length}/{rateLimits.length} giới hạn an toàn
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Cao nhất
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.max(...rateLimits.map(l => l.percentage), 0).toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">
              {rateLimits.find(l => l.percentage === Math.max(...rateLimits.map(r => r.percentage)))?.name || 'N/A'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Database className="h-4 w-4" />
              Tổng calls
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {rateLimits.find(l => l.name.includes('Raw Requests'))?.current || 0}
            </div>
            <div className="text-xs text-muted-foreground">
              Trong 1 phút qua
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chi tiết từng rate limit */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết Rate Limits</CardTitle>
          <CardDescription>
            Theo dõi real-time các giới hạn API của Binance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {rateLimits.map((limit, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(limit.status)}
                    <span className="font-medium">{limit.name}</span>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 hover:bg-muted">
                          <Info className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="start">
                        <div className="space-y-2">
                          <h4 className="font-medium text-sm">Endpoints áp dụng cho {limit.name}:</h4>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {getEndpointsForLimit(limit.name).map((endpoint, idx) => (
                              <div key={idx} className="text-xs font-mono bg-muted p-1 rounded break-all">
                                {endpoint}
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-muted-foreground pt-2 border-t">
                            <strong>Lưu ý:</strong> Rate limit này áp dụng cho tất cả các endpoint trên
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                    <Badge variant="outline" className="text-xs">
                      {limit.current}/{limit.limit}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Reset trong {formatTimeRemaining(limit.resetTime)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={limit.percentage} 
                    className="h-2"
                  />
                  <div className="flex justify-between text-xs">
                    <span className={getStatusColor(limit.status)}>
                      {limit.percentage.toFixed(1)}% sử dụng
                    </span>
                    <span className="text-muted-foreground">
                      Còn lại: {limit.limit - limit.current}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cache Statistics */}
      {cacheStats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cache Statistics</CardTitle>
            <CardDescription>
              Hiệu quả của việc cache API calls để giảm tải
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Account Info Cache</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={cacheStats.cacheStats.accountInfo.isValid ? "default" : "secondary"}>
                      {cacheStats.cacheStats.accountInfo.isValid ? "Valid" : "Expired"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Age:</span>
                    <span>{Math.round(cacheStats.cacheStats.accountInfo.age / 1000)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TTL:</span>
                    <span>{Math.round(cacheStats.cacheStats.accountInfo.ttl / 1000)}s</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cacheStats.recommendations.accountInfo.suggestion}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  <span className="font-medium">Exchange Info Cache</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Status:</span>
                    <Badge variant={cacheStats.cacheStats.exchangeInfo.isValid ? "default" : "secondary"}>
                      {cacheStats.cacheStats.exchangeInfo.isValid ? "Valid" : "Expired"}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span>Age:</span>
                    <span>{Math.round(cacheStats.cacheStats.exchangeInfo.age / 1000)}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TTL:</span>
                    <span>{Math.round(cacheStats.cacheStats.exchangeInfo.ttl / 1000)}s</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {cacheStats.recommendations.exchangeInfo.suggestion}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-4 p-3 bg-muted rounded text-xs">
              <strong>Lợi ích của Cache:</strong>
              <ul className="mt-1 space-y-1 ml-4">
                <li>• <strong>Account Info:</strong> Giảm từ 12 calls/phút xuống ~2 calls/phút (83% giảm)</li>
                <li>• <strong>Exchange Info:</strong> Giảm từ 2 calls/phút xuống ~0.2 calls/phút (90% giảm)</li>
                <li>• <strong>Tổng Weight:</strong> Giảm ~140 weight/phút (từ 120+20 xuống ~20+2)</li>
                <li>• <strong>Rate Limit:</strong> Giảm nguy cơ 418/429 errors đáng kể</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chi tiết từng endpoint */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chi tiết từng Endpoint</CardTitle>
          <CardDescription>
            {endpointStats.length > 0 
              ? `Tất cả ${endpointStats.length} endpoint được sắp xếp theo mức độ sử dụng (nhiều → ít)`
              : 'Chưa có dữ liệu endpoint nào được track. Hãy chạy bot để thấy chi tiết.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {endpointStats.length > 0 ? (
            <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
              {endpointStats.map((endpoint, index) => (
                <div key={index} className="p-3 border rounded-lg bg-muted/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <code className="text-sm font-mono bg-background px-2 py-1 rounded">
                        {endpoint.endpoint}
                      </code>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Lần cuối: {new Date(endpoint.lastCall).toLocaleTimeString()}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Weight/Request</div>
                      <div className="font-medium">{endpoint.weight}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Calls (1m)</div>
                      <div className="font-medium">{endpoint.calls1m}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Weight (1m)</div>
                      <div className="font-medium">{endpoint.weight1m}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">Order Calls (1m)</div>
                      <div className="font-medium">{endpoint.orderCalls1m}</div>
                    </div>
                  </div>
                  
                  {endpoint.calls10s > 0 && (
                    <div className="mt-2 pt-2 border-t">
                      <div className="text-xs text-muted-foreground">
                        Calls trong 10s: <span className="font-medium">{endpoint.calls10s}</span>
                        {endpoint.orderCalls10s > 0 && (
                          <span className="ml-2">
                            | Order calls: <span className="font-medium">{endpoint.orderCalls10s}</span>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-sm">Chưa có dữ liệu endpoint nào</p>
              <p className="text-xs mt-1">Hãy chạy bot để thấy chi tiết API calls</p>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-muted rounded text-xs">
            <strong>Giải thích:</strong>
            <ul className="mt-1 space-y-1 ml-4">
              <li>• <strong>Weight/Request:</strong> Trọng số của endpoint theo Binance API docs</li>
              <li>• <strong>Calls (1m):</strong> Số lần gọi endpoint trong 1 phút qua</li>
              <li>• <strong>Weight (1m):</strong> Tổng trọng số đã sử dụng trong 1 phút</li>
              <li>• <strong>Order Calls:</strong> Số lần gọi endpoint liên quan đến order</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Hướng dẫn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Hướng dẫn xử lý</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>An toàn (0-70%):</strong> Hoạt động bình thường</div>
            <div><strong>Cảnh báo (70-90%):</strong> Cân nhắc giảm tần suất bot hoặc tăng interval</div>
            <div><strong>Nguy hiểm (90-100%):</strong> Dừng bot tạm thời hoặc giảm mạnh tần suất để tránh 418/429</div>
            <div className="mt-3 p-2 bg-muted rounded text-xs">
              <strong>Mẹo:</strong> Có thể config giới hạn qua env: NEXT_PUBLIC_BINANCE_WEIGHT_1M, NEXT_PUBLIC_BINANCE_ORDERS_10S, etc.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
