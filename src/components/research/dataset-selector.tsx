"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Database, 
  Calendar,
  TrendingUp,
  BarChart3,
  Download,
  RefreshCw,
  Info,
  CheckCircle,
  AlertTriangle
} from "lucide-react";

interface DatasetConfig {
  sampleSize: number;
  trainTestSplit: number;
  startDate?: string;
  endDate?: string;
}

interface DatasetSelectorProps {
  onDatasetSelect: (config: DatasetConfig) => void;
  selectedConfig?: DatasetConfig;
  disabled?: boolean;
}

export function DatasetSelector({ onDatasetSelect, selectedConfig, disabled = false }: DatasetSelectorProps) {
  const [sampleSize, setSampleSize] = useState([50000]);
  const [trainTestSplit, setTrainTestSplit] = useState([80]);
  const [startDate, setStartDate] = useState('2025-01-01');
  const [endDate, setEndDate] = useState('2025-02-28');
  const [loading, setLoading] = useState(false);
  const [datasetInfo, setDatasetInfo] = useState<any>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);

  // Load initial dataset info
  useEffect(() => {
    fetchDatasetInfo();
  }, []);

  // Auto-refresh preview when date range changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchPreviewData();
    }
  }, [startDate, endDate]);

  // Update config when values change
  useEffect(() => {
    const config: DatasetConfig = {
      sampleSize: sampleSize[0],
      trainTestSplit: trainTestSplit[0],
      startDate: startDate || undefined,
      endDate: endDate || undefined
    };
    onDatasetSelect(config);
  }, [sampleSize, trainTestSplit, startDate, endDate, onDatasetSelect]);

  const fetchDatasetInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/datasets/supabase?limit=100');
      if (response.ok) {
        const data = await response.json();
        setTotalRecords(data.pagination.total);
        
        // Set default date range based on available data if not already set
        if (data.data.length > 0) {
          const firstRecord = data.data[data.data.length - 1]; // Oldest record (data is sorted desc)
          const lastRecord = data.data[0]; // Newest record
          
          if (!startDate && firstRecord.open_time) {
            const firstDate = new Date(firstRecord.open_time);
            setStartDate(firstDate.toISOString().split('T')[0]);
          }
          if (!endDate && lastRecord.open_time) {
            const lastDate = new Date(lastRecord.open_time);
            setEndDate(lastDate.toISOString().split('T')[0]);
          }

          // Set initial preview data
          setPreviewData(data.data.slice(0, 5));
        }
      }
    } catch (error) {
      console.error('❌ Failed to fetch dataset info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPreviewData = async () => {
    try {
      // Build query params for filtered preview
      const params = new URLSearchParams({
        limit: '5',
        ...(startDate && { start_date: startDate }),
        ...(endDate && { end_date: endDate })
      });

      const response = await fetch(`/api/datasets/supabase?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.data);
        console.log('📅 Preview updated for date range:', { startDate, endDate, records: data.data.length });
      }
    } catch (error) {
      console.error('❌ Failed to fetch preview data:', error);
    }
  };

  const previewDataset = async () => {
    try {
      setLoading(true);
      const config = {
        sampleSize: sampleSize[0],
        trainTestSplit: trainTestSplit[0],
        startDate: startDate || undefined,
        endDate: endDate || undefined
      };

      const response = await fetch('/api/datasets/supabase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        const data = await response.json();
        setDatasetInfo(data.dataset);
      } else {
        const error = await response.json();
        console.error('❌ Preview failed:', error);
      }
    } catch (error) {
      console.error('❌ Preview error:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('vi-VN').format(num);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Chọn Dataset từ Supabase
          </CardTitle>
          <CardDescription>
            Cấu hình dữ liệu OHLCV BTC/USDT 1m từ Supabase cho việc training model
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dataset Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{formatNumber(totalRecords)}</div>
              <div className="text-sm text-muted-foreground">Tổng số records</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-green-600">1m</div>
              <div className="text-sm text-muted-foreground">Timeframe</div>
            </div>
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-purple-600">BTC/USDT</div>
              <div className="text-sm text-muted-foreground">Trading pair</div>
            </div>
          </div>

          {/* Configuration */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sample Size */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="sample-size">Kích thước mẫu</Label>
                <span className="text-sm text-muted-foreground">{formatNumber(sampleSize[0])} records</span>
              </div>
              <Slider
                id="sample-size"
                min={1000}
                max={500000}
                step={1000}
                value={sampleSize}
                onValueChange={setSampleSize}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1K</span>
                <span>500K</span>
              </div>
              
              {/* Warning for small dataset */}
              {sampleSize[0] < 10000 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    ⚠️ Dataset nhỏ hơn 10K records có thể không đủ để training hiệu quả. 
                    Khuyến nghị sử dụng ít nhất 50K records.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Train/Test Split */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="train-split">Train/Test Split</Label>
                <span className="text-sm text-muted-foreground">{trainTestSplit[0]}% / {100 - trainTestSplit[0]}%</span>
              </div>
              <Slider
                id="train-split"
                min={60}
                max={90}
                step={5}
                value={trainTestSplit}
                onValueChange={setTrainTestSplit}
                disabled={disabled}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>60% Train</span>
                <span>90% Train</span>
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label htmlFor="start-date">Ngày bắt đầu</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                disabled={disabled}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">Ngày kết thúc</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={disabled}
              />
            </div>
          </div>

          {/* Preview Button */}
          <div className="flex gap-3">
            <Button 
              onClick={previewDataset} 
              disabled={loading || disabled}
              variant="outline"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              {loading ? 'Đang tải...' : 'Xem trước Dataset'}
            </Button>
            <Button 
              onClick={fetchDatasetInfo} 
              disabled={loading || disabled}
              variant="outline"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Làm mới
            </Button>
          </div>

          {/* Dataset Preview */}
          {datasetInfo && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">Dataset đã được chuẩn bị:</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Tổng: </span>
                      <span className="font-medium">{formatNumber(datasetInfo.total)} records</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Train: </span>
                      <span className="font-medium text-blue-600">{formatNumber(datasetInfo.metadata.trainSize)} records</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Test: </span>
                      <span className="font-medium text-green-600">{formatNumber(datasetInfo.metadata.testSize)} records</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Split: </span>
                      <span className="font-medium">{datasetInfo.metadata.trainTestSplit}%/{100 - datasetInfo.metadata.trainTestSplit}%</span>
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Data Preview Table */}
          {previewData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Xem trước dữ liệu</CardTitle>
                <CardDescription>5 records đầu tiên từ dataset</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Open Time</TableHead>
                      <TableHead>Open</TableHead>
                      <TableHead>High</TableHead>
                      <TableHead>Low</TableHead>
                      <TableHead>Close</TableHead>
                      <TableHead>Volume</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.map((record, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-xs">
                          {record.open_time ? formatDate(record.open_time) : 'N/A'}
                        </TableCell>
                        <TableCell className="font-mono">${record.open?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell className="font-mono">${record.high?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell className="font-mono">${record.low?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell className="font-mono">${record.close?.toFixed(2) || 'N/A'}</TableCell>
                        <TableCell className="font-mono">{record.volume?.toFixed(4) || 'N/A'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Configuration Summary */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Info className="h-4 w-4" />
                Tóm tắt cấu hình
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Kích thước mẫu:</span>
                  <span className="ml-2 font-medium">{formatNumber(sampleSize[0])} records</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Train/Test split:</span>
                  <span className="ml-2 font-medium">{trainTestSplit[0]}% / {100 - trainTestSplit[0]}%</span>
                </div>
                {startDate && (
                  <div>
                    <span className="text-muted-foreground">Từ ngày:</span>
                    <span className="ml-2 font-medium">{formatDate(startDate)}</span>
                  </div>
                )}
                {endDate && (
                  <div>
                    <span className="text-muted-foreground">Đến ngày:</span>
                    <span className="ml-2 font-medium">{formatDate(endDate)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
} 