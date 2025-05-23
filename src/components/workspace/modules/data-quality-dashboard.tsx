"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Database,
  Clock,
  Zap,
  AlertCircle,
  RotateCcw
} from 'lucide-react';

interface QualityMetric {
  id: string;
  name: string;
  value: number;
  threshold: number;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
  trend: 'up' | 'down' | 'stable';
  lastChecked: Date;
}

interface DataIssue {
  id: string;
  type: 'missing' | 'duplicate' | 'anomaly' | 'latency';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedRecords: number;
  source: string;
  timestamp: Date;
}

export function DataQualityDashboard() {
  const [metrics, setMetrics] = useState<QualityMetric[]>([]);
  const [issues, setIssues] = useState<DataIssue[]>([]);
  const [overallScore, setOverallScore] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadQualityData();
  }, []);

  const loadQualityData = async () => {
    setIsLoading(true);
    // Simulate loading
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock metrics
    const mockMetrics: QualityMetric[] = [
      {
        id: 'completeness',
        name: 'Độ hoàn thiện',
        value: 96.8,
        threshold: 95,
        status: 'excellent',
        description: 'Tỷ lệ record có đầy đủ thông tin bắt buộc',
        trend: 'up',
        lastChecked: new Date(Date.now() - 5 * 60 * 1000)
      },
      {
        id: 'accuracy',
        name: 'Độ chính xác',
        value: 92.5,
        threshold: 90,
        status: 'good',
        description: 'Tỷ lệ dữ liệu không có anomaly hoặc giá trị bất thường',
        trend: 'down',
        lastChecked: new Date(Date.now() - 8 * 60 * 1000)
      },
      {
        id: 'timeliness',
        name: 'Tính kịp thời',
        value: 88.2,
        threshold: 85,
        status: 'good',
        description: 'Dữ liệu được cập nhật đúng thời gian dự kiến',
        trend: 'stable',
        lastChecked: new Date(Date.now() - 2 * 60 * 1000)
      },
      {
        id: 'consistency',
        name: 'Tính nhất quán',
        value: 75.6,
        threshold: 80,
        status: 'warning',
        description: 'Dữ liệu từ các nguồn khác nhau có tính nhất quán',
        trend: 'down',
        lastChecked: new Date(Date.now() - 12 * 60 * 1000)
      },
      {
        id: 'freshness',
        name: 'Độ tươi mới',
        value: 94.1,
        threshold: 90,
        status: 'excellent',
        description: 'Dữ liệu mới nhất có sẵn trong thời gian hợp lý',
        trend: 'up',
        lastChecked: new Date(Date.now() - 1 * 60 * 1000)
      },
      {
        id: 'volume',
        name: 'Khối lượng dữ liệu',
        value: 67.8,
        threshold: 70,
        status: 'critical',
        description: 'Khối lượng dữ liệu thu thập so với kỳ vọng',
        trend: 'down',
        lastChecked: new Date(Date.now() - 3 * 60 * 1000)
      }
    ];

    // Mock issues
    const mockIssues: DataIssue[] = [
      {
        id: 'issue-1',
        type: 'missing',
        severity: 'medium',
        description: 'Thiếu dữ liệu volume trong 15 phút qua từ Binance API',
        affectedRecords: 45,
        source: 'Binance API',
        timestamp: new Date(Date.now() - 15 * 60 * 1000)
      },
      {
        id: 'issue-2',
        type: 'anomaly',
        severity: 'high',
        description: 'Phát hiện giá BTC bất thường (chênh lệch >5% so với nguồn khác)',
        affectedRecords: 12,
        source: 'CoinMarketCap API',
        timestamp: new Date(Date.now() - 25 * 60 * 1000)
      },
      {
        id: 'issue-3',
        type: 'latency',
        severity: 'low',
        description: 'Độ trễ response từ Supabase cao hơn bình thường',
        affectedRecords: 156,
        source: 'Supabase Database',
        timestamp: new Date(Date.now() - 10 * 60 * 1000)
      },
      {
        id: 'issue-4',
        type: 'duplicate',
        severity: 'critical',
        description: 'Phát hiện 3.2% records bị trùng lặp trong bảng OHLCV',
        affectedRecords: 892,
        source: 'Data Pipeline',
        timestamp: new Date(Date.now() - 45 * 60 * 1000)
      }
    ];

    setMetrics(mockMetrics);
    setIssues(mockIssues);
    
    // Calculate overall score
    const avgScore = mockMetrics.reduce((sum, metric) => sum + metric.value, 0) / mockMetrics.length;
    setOverallScore(Math.round(avgScore * 10) / 10);
    
    setIsLoading(false);
  };

  const getStatusIcon = (status: QualityMetric['status']) => {
    switch (status) {
      case 'excellent':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'good':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: QualityMetric['status']) => {
    switch (status) {
      case 'excellent':
        return <Badge className="bg-green-500">Xuất sắc</Badge>;
      case 'good':
        return <Badge className="bg-blue-500">Tốt</Badge>;
      case 'warning':
        return <Badge className="bg-yellow-500">Cảnh báo</Badge>;
      case 'critical':
        return <Badge variant="destructive">Nguy hiểm</Badge>;
    }
  };

  const getTrendIcon = (trend: QualityMetric['trend']) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'stable':
        return <BarChart3 className="h-3 w-3 text-gray-500" />;
    }
  };

  const getIssueIcon = (type: DataIssue['type']) => {
    switch (type) {
      case 'missing':
        return <Database className="h-4 w-4 text-orange-500" />;
      case 'duplicate':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'anomaly':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'latency':
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: DataIssue['severity']) => {
    switch (severity) {
      case 'low':
        return <Badge variant="secondary">Thấp</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-500">Trung bình</Badge>;
      case 'high':
        return <Badge className="bg-orange-500">Cao</Badge>;
      case 'critical':
        return <Badge variant="destructive">Nguy hiểm</Badge>;
    }
  };

  const getOverallStatus = (score: number) => {
    if (score >= 90) return { status: 'excellent', color: 'text-green-600', text: 'Xuất sắc' };
    if (score >= 80) return { status: 'good', color: 'text-blue-600', text: 'Tốt' };
    if (score >= 70) return { status: 'warning', color: 'text-yellow-600', text: 'Cần cải thiện' };
    return { status: 'critical', color: 'text-red-600', text: 'Nguy hiểm' };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 className="h-8 w-8 animate-pulse mx-auto mb-2" />
          <p>Đang phân tích chất lượng dữ liệu...</p>
        </div>
      </div>
    );
  }

  const overallStatus = getOverallStatus(overallScore);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Chất lượng Dữ liệu</h2>
          <p className="text-sm text-muted-foreground">
            Giám sát và đánh giá chất lượng dữ liệu theo thời gian thực
          </p>
        </div>
        <Button onClick={loadQualityData} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Làm mới
        </Button>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Điểm tổng thể</h3>
              <p className="text-sm text-muted-foreground">
                Đánh giá chung về chất lượng dữ liệu
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold mb-1">
                <span className={overallStatus.color}>{overallScore}</span>
                <span className="text-lg text-muted-foreground">/100</span>
              </div>
              <Badge className={overallStatus.color.replace('text-', 'bg-').replace('-600', '-500')}>
                {overallStatus.text}
              </Badge>
            </div>
          </div>
          <Progress value={overallScore} className="mt-4" />
        </CardContent>
      </Card>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(metric.status)}
                  <CardTitle className="text-base">{metric.name}</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  {getTrendIcon(metric.trend)}
                  {getStatusBadge(metric.status)}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Giá trị hiện tại</span>
                  <span className="font-bold">{metric.value}%</span>
                </div>
                <Progress value={metric.value} />
                
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Ngưỡng: {metric.threshold}%</span>
                  <span>
                    Kiểm tra: {metric.lastChecked.toLocaleTimeString('vi-VN')}
                  </span>
                </div>
                
                <p className="text-xs text-muted-foreground">
                  {metric.description}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Issues Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Vấn đề chất lượng dữ liệu
          </CardTitle>
          <CardDescription>
            Các vấn đề được phát hiện trong dữ liệu gần đây
          </CardDescription>
        </CardHeader>
        <CardContent>
          {issues.length > 0 ? (
            <div className="space-y-3">
              {issues.map((issue) => (
                <div key={issue.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-0.5">
                    {getIssueIcon(issue.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium text-sm">{issue.description}</p>
                      {getSeverityBadge(issue.severity)}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Nguồn: {issue.source}</span>
                      <span>Ảnh hưởng: {issue.affectedRecords.toLocaleString()} records</span>
                      <span>
                        Thời gian: {issue.timestamp.toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Khắc phục
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-3" />
              <h3 className="text-lg font-medium mb-1">Không có vấn đề</h3>
              <p className="text-muted-foreground">
                Tất cả dữ liệu đều có chất lượng tốt
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 