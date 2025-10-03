"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useApiMonitoring, ApiUsageStats } from '@/hooks/use-api-monitoring';
import { BinanceRateLimitMonitor } from '@/components/monitor/binance-rate-limit-monitor';
import { 
  Activity, 
  Clock, 
  Database, 
  Download, 
  RefreshCw, 
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface ApiMonitoringTabProps {
  className?: string;
}

export function ApiMonitoringTab({ className }: ApiMonitoringTabProps) {
  const { 
    isMonitoring, 
    startMonitoring, 
    stopMonitoring, 
    getApiUsageStats,
    cleanupOldCalls 
  } = useApiMonitoring();
  
  const [stats, setStats] = useState<ApiUsageStats[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Cập nhật stats mỗi 60 giây (EMERGENCY: tăng từ 15s để giảm API calls)
  useEffect(() => {
    const interval = setInterval(() => {
      setStats(getApiUsageStats());
      setLastUpdated(new Date());
    }, 60000); // EMERGENCY: Tăng từ 15s lên 60s

    return () => clearInterval(interval);
  }, [getApiUsageStats]);

  // Bắt đầu monitoring khi component mount
  useEffect(() => {
    if (!isMonitoring) {
      startMonitoring();
    }
    
    return () => {
      if (isMonitoring) {
        stopMonitoring();
      }
    };
  }, [isMonitoring, startMonitoring, stopMonitoring]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const getStatusColor = (successRate: number) => {
    if (successRate >= 95) return 'text-green-600';
    if (successRate >= 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusIcon = (successRate: number) => {
    if (successRate >= 95) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (successRate >= 80) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <XCircle className="h-4 w-4 text-red-600" />;
  };

  const getIntensityColor = (callsPerMinute: number) => {
    if (callsPerMinute >= 60) return 'bg-red-500';
    if (callsPerMinute >= 30) return 'bg-yellow-500';
    if (callsPerMinute >= 10) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getIntensityLabel = (callsPerMinute: number) => {
    if (callsPerMinute >= 60) return 'Rất cao';
    if (callsPerMinute >= 30) return 'Cao';
    if (callsPerMinute >= 10) return 'Trung bình';
    return 'Thấp';
  };

  const totalCalls = stats.reduce((sum, stat) => sum + stat.totalCalls, 0);
  const totalSuccessCalls = stats.reduce((sum, stat) => sum + stat.successCalls, 0);
  const totalErrorCalls = stats.reduce((sum, stat) => sum + stat.errorCalls, 0);
  const overallSuccessRate = totalCalls > 0 ? (totalSuccessCalls / totalCalls) * 100 : 0;
  const totalDataTransferred = stats.reduce((sum, stat) => sum + stat.totalDataTransferred, 0);

  return (
    <div className={`space-y-4 overflow-y-auto max-h-[600px] ${className}`}>
      {/* Header với controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          <h3 className="text-lg font-semibold">Monitoring API</h3>
          <Badge variant={isMonitoring ? "default" : "secondary"}>
            {isMonitoring ? "Đang theo dõi" : "Dừng"}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={cleanupOldCalls}
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Làm mới
          </Button>
          <div className="text-xs text-muted-foreground">
            Cập nhật: {lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Tổng quan thống kê */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tổng API calls</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCalls.toLocaleString()}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {stats.reduce((sum, stat) => sum + stat.callsPerMinute, 0)}/phút
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Tỷ lệ thành công</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getStatusColor(overallSuccessRate)}`}>
              {overallSuccessRate.toFixed(1)}%
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {getStatusIcon(overallSuccessRate)}
              {totalSuccessCalls}/{totalCalls} thành công
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Dữ liệu truyền tải</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatBytes(totalDataTransferred)}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Download className="h-3 w-3" />
              Tổng cộng
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">API endpoints</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.length}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Database className="h-3 w-3" />
              Đang sử dụng
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Binance Rate Limit Monitor */}
      <BinanceRateLimitMonitor />
    </div>
  );
}
