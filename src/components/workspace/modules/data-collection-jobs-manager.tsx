"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { 
  Play, 
  Pause, 
  Square, 
  RotateCcw,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Database,
  Calendar,
  Timer,
  Plus,
  Trash2
} from 'lucide-react';

interface DataCollectionJob {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'completed' | 'scheduled';
  progress: number;
  lastRun: Date;
  nextRun: Date | null;
  recordsCollected: number;
  source: string;
  frequency: string;
  config: {
    symbol?: string;
    interval?: string;
    rateLimit?: number;
    autoStart?: boolean;
    // Job scheduling - Khi nào job sẽ bắt đầu chạy
    startDate?: string;
    startTime?: string;
    // Data collection period - Thời gian thu thập dữ liệu thực tế
    dataStartDate?: string;
    dataEndDate?: string;
    dataEndTime?: string;
    // Target destination - Nơi lưu dữ liệu
    targetDatabase?: string;
    targetTable?: string;
    // Timeframe collection - Khung thời gian thu thập
    timeframe?: string;
    lookback?: number; // số ngày/giờ look back
  };
}

export function DataCollectionJobsManager() {
  const [jobs, setJobs] = useState<DataCollectionJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    loadJobs();
  }, []);

  const loadJobs = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/jobs');
      const result = await response.json();
      
      if (result.success) {
        // Convert date strings back to Date objects
        const processedJobs = result.data.map((job: any) => ({
          ...job,
          lastRun: new Date(job.lastRun),
          nextRun: job.nextRun ? new Date(job.nextRun) : null
        }));
        setJobs(processedJobs);
      } else {
        console.error('Error loading jobs:', result.error);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJobAction = async (jobId: string, action: 'start' | 'stop' | 'restart' | 'delete') => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action, jobId }),
      });

      const result = await response.json();
      
      if (result.success) {
        if (action === 'delete') {
          setJobs(prev => prev.filter(job => job.id !== jobId));
        } else {
          // Convert date strings back to Date objects
          const processedJobs = result.data.map((job: any) => ({
            ...job,
            lastRun: new Date(job.lastRun),
            nextRun: job.nextRun ? new Date(job.nextRun) : null
          }));
          setJobs(processedJobs);
        }
        console.log(`${action} job ${jobId} thành công`);
      } else {
        console.error('Error:', result.error);
      }
    } catch (error) {
      console.error('Error managing job:', error);
    }
  };

  const testBinanceJob = async (symbol: string = 'BTCUSDT') => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'test_binance', 
          jobData: { symbol, interval: '1m' } 
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Test Binance job thành công:', result.data);
        alert(`Test thành công! Thu thập được ${result.data.recordsCollected} records cho ${symbol}`);
      } else {
        console.error('❌ Test job thất bại:', result.error);
        alert(`Test thất bại: ${result.error}`);
      }
    } catch (error) {
      console.error('Test job error:', error);
      alert('Lỗi khi test job');
    }
  };

  const createJob = async (jobData: any) => {
    try {
      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'create', jobData }),
      });

      const result = await response.json();
      
      if (result.success) {
        const newJob = {
          ...result.data,
          lastRun: new Date(result.data.lastRun),
          nextRun: result.data.nextRun ? new Date(result.data.nextRun) : null
        };
        setJobs(prev => [...prev, newJob]);
        setIsDialogOpen(false);
        console.log('Tạo job mới thành công:', newJob.name);
      } else {
        console.error('Error creating job:', result.error);
      }
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const getStatusIcon = (status: DataCollectionJob['status']) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'stopped':
        return <AlertCircle className="h-4 w-4 text-gray-500" />;
      case 'scheduled':
        return <Timer className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: DataCollectionJob['status']) => {
    switch (status) {
      case 'running':
        return <Badge className="bg-blue-500">Đang chạy</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Hoàn thành</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      case 'stopped':
        return <Badge variant="secondary">Đã dừng</Badge>;
      case 'scheduled':
        return <Badge className="bg-orange-500">Đã lên lịch</Badge>;
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('vi-VN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('vi-VN', { 
      day: '2-digit', 
      month: '2-digit' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Đang tải jobs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold">Jobs Thu thập Dữ liệu</h2>
          <p className="text-sm text-muted-foreground">
            Quản lý và theo dõi các jobs tự động thu thập dữ liệu
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadJobs} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={() => testBinanceJob('BTCUSDT')} variant="outline">
            <Database className="h-4 w-4 mr-2" />
            Test Binance
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Job Mới
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Tạo Job Thu thập Dữ liệu</DialogTitle>
                <DialogDescription>
                  Tạo job mới để tự động thu thập dữ liệu từ các nguồn
                </DialogDescription>
              </DialogHeader>
              <CreateJobForm onCreateJob={createJob} onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tổng jobs</p>
                <p className="text-2xl font-bold">{jobs.length}</p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Đang chạy</p>
                <p className="text-2xl font-bold text-green-600">
                  {jobs.filter(j => j.status === 'running').length}
                </p>
              </div>
              <Play className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Có lỗi</p>
                <p className="text-2xl font-bold text-red-600">
                  {jobs.filter(j => j.status === 'error').length}
                </p>
              </div>
              <XCircle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Records hôm nay</p>
                <p className="text-2xl font-bold">
                  {jobs.reduce((sum, job) => sum + job.recordsCollected, 0).toLocaleString()}
                </p>
              </div>
              <Calendar className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Jobs List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {jobs.map((job) => (
          <Card key={job.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getStatusIcon(job.status)}
                  <CardTitle className="text-base">{job.name}</CardTitle>
                </div>
                {getStatusBadge(job.status)}
              </div>
              <CardDescription>{job.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Progress */}
                {job.status === 'running' && (
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Tiến độ</span>
                      <span>{job.progress}%</span>
                    </div>
                    <Progress value={job.progress} />
                  </div>
                )}

                {/* Job Info */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Nguồn:</span>
                    <p className="font-medium">{job.source}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tần suất:</span>
                    <p className="font-medium">{job.frequency}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Lần chạy cuối:</span>
                    <p className="font-medium">
                      {formatDate(job.lastRun)} {formatTime(job.lastRun)}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">
                      {job.status === 'scheduled' ? 'Sẽ bắt đầu:' : 'Lần chạy tiếp:'}
                    </span>
                    <p className="font-medium">
                      {job.nextRun ? `${formatDate(job.nextRun)} ${formatTime(job.nextRun)}` : 'Không lên lịch'}
                    </p>
                  </div>
                </div>

                {/* Scheduled Job Info */}
                {job.status === 'scheduled' && job.config.startDate && job.config.startTime && (
                  <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="h-4 w-4 text-orange-600" />
                      <span className="text-sm font-medium text-orange-800">Job được lên lịch</span>
                    </div>
                    <p className="text-sm text-orange-700">
                      Job sẽ tự động bắt đầu vào <strong>{job.config.startDate}</strong> lúc <strong>{job.config.startTime}</strong>
                    </p>
                  </div>
                )}

                {/* Data Collection Period Info */}
                {job.config.dataStartDate && job.config.dataEndDate && (
                  <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Database className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium text-green-800">Thời gian thu thập dữ liệu</span>
                    </div>
                    <div className="text-sm text-green-700 space-y-1">
                      <p>Từ: <strong>{job.config.dataStartDate}</strong> đến <strong>{job.config.dataEndDate}</strong></p>
                      {job.config.dataEndTime && (
                        <p>Kết thúc lúc: <strong>{job.config.dataEndTime}</strong></p>
                      )}
                      {job.config.dataStartDate < new Date().toISOString().split('T')[0] && (
                        <p className="text-orange-600">⚠️ Backfill dữ liệu từ quá khứ</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Config Info */}
                {job.config.symbol && (
                  <div className="text-xs text-muted-foreground">
                    Symbol: {job.config.symbol} | Interval: {job.config.interval} | Rate Limit: {job.config.rateLimit}/phút
                  </div>
                )}

                {/* Records Collected */}
                <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
                  <Database className="h-4 w-4" />
                  <span className="text-sm">
                    <strong>{job.recordsCollected.toLocaleString()}</strong> records đã thu thập
                  </span>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  {job.status === 'running' ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleJobAction(job.id, 'stop')}
                    >
                      <Pause className="h-4 w-4 mr-1" />
                      Dừng
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={() => handleJobAction(job.id, 'start')}
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Chạy
                    </Button>
                  )}
                  
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleJobAction(job.id, 'restart')}
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Khởi động lại
                  </Button>

                  <Button 
                    size="sm" 
                    variant="destructive"
                    onClick={() => handleJobAction(job.id, 'delete')}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Xóa
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {jobs.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có jobs</h3>
            <p className="text-muted-foreground mb-4">
              Tạo job đầu tiên để bắt đầu thu thập dữ liệu tự động
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Tạo Job Mới
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CreateJobForm({ onCreateJob, onClose }: { onCreateJob: (jobData: any) => void; onClose: () => void }) {
  // Set default values for today and next hour
  const now = new Date();
  const defaultDate = now.toISOString().split('T')[0]; // Today
  const defaultTime = `${(now.getHours() + 1).toString().padStart(2, '0')}:00`; // Next hour

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    source: 'Binance API',
    frequency: 'Mỗi 1 phút',
    symbol: '',
    interval: '1m',
    rateLimit: 1200,
    autoStart: false,
    // Job scheduling
    startDate: defaultDate,
    startTime: defaultTime,
    // Data collection period
    dataStartDate: defaultDate,
    dataEndDate: '',
    dataEndTime: '23:59',
    // Target destination
    targetDatabase: 'Supabase',
    targetTable: 'OHLCV_BTC_USDT_1m',
    // Timeframe collection
    timeframe: '1m',
    lookback: 100
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const jobData = {
      name: formData.name,
      description: formData.description,
      source: formData.source,
      frequency: formData.frequency,
      config: {
        symbol: formData.symbol || undefined,
        interval: formData.interval,
        rateLimit: formData.rateLimit,
        autoStart: formData.autoStart,
        startDate: formData.startDate,
        startTime: formData.startTime,
        dataStartDate: formData.dataStartDate,
        dataEndDate: formData.dataEndDate,
        dataEndTime: formData.dataEndTime,
        targetDatabase: formData.targetDatabase,
        targetTable: formData.targetTable,
        timeframe: formData.timeframe,
        lookback: formData.lookback
      }
    };

    onCreateJob(jobData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <Label htmlFor="name">Tên Job</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Ví dụ: BTC Real-time Data"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="description">Mô tả</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Mô tả về job này"
            required
          />
        </div>
      </div>

      {/* Configuration - 3 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="source">Nguồn dữ liệu</Label>
          <Select value={formData.source} onValueChange={(value) => setFormData(prev => ({ ...prev, source: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Binance API">Binance API</SelectItem>
              <SelectItem value="CoinMarketCap API">CoinMarketCap API</SelectItem>
              <SelectItem value="Multiple APIs">Multiple APIs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="frequency">Tần suất thu thập</Label>
          <Select value={formData.frequency} onValueChange={(value) => setFormData(prev => ({ ...prev, frequency: value }))}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Mỗi 1 phút">Mỗi 1 phút</SelectItem>
              <SelectItem value="Mỗi 5 phút">Mỗi 5 phút</SelectItem>
              <SelectItem value="Mỗi 15 phút">Mỗi 15 phút</SelectItem>
              <SelectItem value="Mỗi 1 giờ">Mỗi 1 giờ</SelectItem>
              <SelectItem value="Mỗi 24 giờ">Mỗi 24 giờ</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {formData.source === 'Binance API' && (
          <div>
            <Label htmlFor="symbol">Symbol</Label>
            <Input
              id="symbol"
              value={formData.symbol}
              onChange={(e) => setFormData(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
              placeholder="BTCUSDT, ETHUSDT..."
            />
          </div>
        )}
      </div>

      {/* Two main sections side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Job Scheduling Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Lịch trình Job
          </h4>
          <p className="text-sm text-muted-foreground">Xác định khi nào job sẽ bắt đầu chạy</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="startDate">Ngày khởi động</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                min={new Date().toISOString().split('T')[0]}
                required
              />
            </div>
            
            <div>
              <Label htmlFor="startTime">Giờ khởi động</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
                required
              />
            </div>
          </div>
        </div>

        {/* Data Collection Period Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Database className="h-4 w-4" />
            Thời gian Thu thập Dữ liệu
          </h4>
          <p className="text-sm text-muted-foreground">Xác định khoảng thời gian dữ liệu cần thu thập</p>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="dataStartDate">Từ ngày</Label>
              <Input
                id="dataStartDate"
                type="date"
                value={formData.dataStartDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dataStartDate: e.target.value }))}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">Có thể chọn ngày quá khứ để backfill</p>
            </div>
            
            <div>
              <Label htmlFor="dataEndDate">Đến ngày</Label>
              <Input
                id="dataEndDate"
                type="date"
                value={formData.dataEndDate}
                onChange={(e) => setFormData(prev => ({ ...prev, dataEndDate: e.target.value }))}
                min={formData.dataStartDate}
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="dataEndTime">Giờ kết thúc</Label>
            <Input
              id="dataEndTime"
              type="time"
              value={formData.dataEndTime}
              onChange={(e) => setFormData(prev => ({ ...prev, dataEndTime: e.target.value }))}
              required
            />
          </div>
        </div>
      </div>

      {/* Target Destination Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Nơi lưu dữ liệu
        </h4>
        <p className="text-sm text-muted-foreground">Xác định nơi lưu trữ dữ liệu thu thập được</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="targetDatabase">Cơ sở dữ liệu</Label>
            <Select value={formData.targetDatabase} onValueChange={(value) => setFormData(prev => ({ ...prev, targetDatabase: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Supabase">Supabase PostgreSQL</SelectItem>
                <SelectItem value="MySQL">MySQL Database</SelectItem>
                <SelectItem value="MongoDB">MongoDB</SelectItem>
                <SelectItem value="PostgreSQL">PostgreSQL</SelectItem>
                <SelectItem value="Redis">Redis Cache</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div>
            <Label htmlFor="targetTable">Bảng dữ liệu</Label>
            <Select value={formData.targetTable} onValueChange={(value) => setFormData(prev => ({ ...prev, targetTable: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="OHLCV_BTC_USDT_1m">OHLCV_BTC_USDT_1m</SelectItem>
                <SelectItem value="OHLCV_ETH_USDT_1m">OHLCV_ETH_USDT_1m</SelectItem>
                <SelectItem value="OHLCV_BNB_USDT_1m">OHLCV_BNB_USDT_1m</SelectItem>
                <SelectItem value="OHLCV_ADA_USDT_1m">OHLCV_ADA_USDT_1m</SelectItem>
                <SelectItem value="OHLCV_SOL_USDT_1m">OHLCV_SOL_USDT_1m</SelectItem>
                <SelectItem value="market_data_raw">market_data_raw</SelectItem>
                <SelectItem value="crypto_prices">crypto_prices</SelectItem>
                <SelectItem value="trading_signals">trading_signals</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Chọn hoặc tạo bảng mới trong database</p>
          </div>
        </div>
      </div>

      {/* Timeframe Collection Section */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          Cấu hình Timeframe
        </h4>
        <p className="text-sm text-muted-foreground">Xác định interval của candlestick và số lượng records</p>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timeframe">Timeframe Interval</Label>
            <Select value={formData.timeframe} onValueChange={(value) => setFormData(prev => ({ ...prev, timeframe: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1m">1m (1 phút)</SelectItem>
                <SelectItem value="3m">3m (3 phút)</SelectItem>
                <SelectItem value="5m">5m (5 phút)</SelectItem>
                <SelectItem value="15m">15m (15 phút)</SelectItem>
                <SelectItem value="30m">30m (30 phút)</SelectItem>
                <SelectItem value="1h">1h (1 giờ)</SelectItem>
                <SelectItem value="2h">2h (2 giờ)</SelectItem>
                <SelectItem value="4h">4h (4 giờ)</SelectItem>
                <SelectItem value="6h">6h (6 giờ)</SelectItem>
                <SelectItem value="8h">8h (8 giờ)</SelectItem>
                <SelectItem value="12h">12h (12 giờ)</SelectItem>
                <SelectItem value="1d">1d (1 ngày)</SelectItem>
                <SelectItem value="3d">3d (3 ngày)</SelectItem>
                <SelectItem value="1w">1w (1 tuần)</SelectItem>
                <SelectItem value="1M">1M (1 tháng)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Interval cho candlestick data</p>
          </div>
          
          <div>
            <Label htmlFor="lookback">Số lượng records</Label>
            <Select value={formData.lookback.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, lookback: parseInt(value) }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="50">50 records</SelectItem>
                <SelectItem value="100">100 records</SelectItem>
                <SelectItem value="200">200 records</SelectItem>
                <SelectItem value="500">500 records</SelectItem>
                <SelectItem value="1000">1,000 records</SelectItem>
                <SelectItem value="5000">5,000 records</SelectItem>
                <SelectItem value="0">Không giới hạn</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Số lượng candlestick tối đa mỗi lần thu thập</p>
          </div>
        </div>
      </div>

      {/* Advanced Settings - Horizontal layout */}
      <div className="border rounded-lg p-4 space-y-4">
        <h4 className="font-medium flex items-center gap-2">
          <Database className="h-4 w-4" />
          Cài đặt nâng cao
        </h4>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="rateLimit">Rate Limit (requests/phút)</Label>
            <Input
              id="rateLimit"
              type="number"
              value={formData.rateLimit}
              onChange={(e) => setFormData(prev => ({ ...prev, rateLimit: parseInt(e.target.value) }))}
              min="1"
            />
          </div>

          <div className="flex items-center space-x-2 pt-6">
            <Switch
              id="autoStart"
              checked={formData.autoStart}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, autoStart: checked }))}
            />
            <Label htmlFor="autoStart">Tự động khởi động sau khi tạo</Label>
          </div>
        </div>
      </div>
      
      {/* Summary Information */}
      {formData.dataStartDate && formData.dataEndDate && (
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Tóm tắt cấu hình:</span>
          </div>
          <div className="text-sm text-blue-700 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
            <p><strong>Job khởi động:</strong> {formData.startDate} lúc {formData.startTime}</p>
            <p><strong>Thu thập:</strong> {formData.dataStartDate} → {formData.dataEndDate}</p>
            <p><strong>Tần suất:</strong> {formData.frequency.toLowerCase()}</p>
            <p><strong>Lưu tại:</strong> {formData.targetDatabase}/{formData.targetTable}</p>
            <p><strong>Interval:</strong> {formData.timeframe}</p>
            <p><strong>Records:</strong> {formData.lookback === 0 ? 'Không giới hạn' : formData.lookback.toLocaleString()}</p>
            {formData.symbol && (
              <p><strong>Symbol:</strong> {formData.symbol}</p>
            )}
            {formData.dataStartDate < new Date().toISOString().split('T')[0] && (
              <p className="text-orange-600 lg:col-span-4"><strong>⚠️ Lưu ý:</strong> Sẽ thực hiện backfill dữ liệu từ quá khứ</p>
            )}
          </div>
        </div>
      )}
      
      <div className="flex gap-2 pt-4">
        <Button type="submit" className="flex-1">
          Tạo Job
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </form>
  );
} 