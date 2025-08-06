"use client";

import React, { useState, useEffect, useMemo } from 'react';
import MonteCarloHistogram from '@/components/MonteCarloHistogram';
import MonteCarloProfitSimulation from '@/components/MonteCarloProfitSimulation';
import MonteCarloEquityCurve from '@/components/MonteCarloEquityCurve';

// Helper functions để tạo text signal dựa trên chiến lược
function getBuySignalText(experiment: any, trade: any): string {
  if (!experiment?.config?.strategy?.type) {
    return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }

  const strategyType = experiment.config.strategy.type;
  const params = experiment.config.strategy.parameters || {};

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm mua
      const buyRsiValue = trade.entry_rsi || trade.rsi_value || trade.indicator_value;
      if (buyRsiValue !== undefined && buyRsiValue !== null) {
        return `RSI = ${buyRsiValue.toFixed(2)} (Quá bán)`;
      }
      return `RSI < ${params.oversold || 30} (Quá bán)`;
    case 'macd':
      return `MACD cắt lên Signal`;
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt lên MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải dưới BB`;
    case 'moving_average':
      return `Giá > MA${params.period || 20}`;
    case 'momentum':
      return `Momentum tăng > 2%`;
    case 'mean_reversion':
      return `Giá < SMA${params.period || 20} - 3%`;
    default:
      return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }
}

function getSellSignalText(experiment: any, trade: any): string {
  // Ưu tiên hiển thị exit_reason từ backend nếu có
  if (trade.exit_reason) {
    switch (trade.exit_reason) {
      case 'stoploss':
        return 'Stoploss';
      case 'take_profit':
        return 'Take Profit';
      case 'signal':
        // Nếu là signal, hiển thị theo strategy type
        break;
      default:
        return trade.exit_reason;
    }
  }

  if (!experiment?.config?.strategy?.type) {
    return trade.sell_signal || '-';
  }

  const strategyType = experiment.config.strategy.type;
  const params = experiment.config.strategy.parameters || {};

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm bán
      const sellRsiValue = trade.exit_rsi || trade.rsi_value || trade.indicator_value;
      if (sellRsiValue !== undefined && sellRsiValue !== null) {
        return `RSI = ${sellRsiValue.toFixed(2)} (Quá mua)`;
      }
      return `RSI > ${params.overbought || 70} (Quá mua)`;
    case 'macd':
      return `MACD cắt xuống Signal`;
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt xuống MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải trên BB`;
    case 'moving_average':
      return `Giá < MA${params.period || 20}`;
    case 'momentum':
      return `Momentum giảm > 1%`;
    case 'mean_reversion':
      return `Giá > SMA${params.period || 20}`;
    default:
      return trade.sell_signal || '-';
  }
}

// Helper function để format thời gian giao dịch
function formatTradeTime(timeValue: any): string {
  if (!timeValue) return '-';
  
  try {
    // Nếu là timestamp (số), chuyển thành Date
    if (typeof timeValue === 'number') {
      return new Date(timeValue).toLocaleString('vi-VN');
    }
    
    // Nếu là string, thử parse
    if (typeof timeValue === 'string') {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleString('vi-VN');
      }
    }
    
    // Nếu là Date object
    if (timeValue instanceof Date) {
      return timeValue.toLocaleString('vi-VN');
    }
    
    return '-';
  } catch (error) {
    console.error('Error formatting trade time:', error, timeValue);
    return '-';
  }
}

// Hàm tính toán tỷ lệ lãi/lỗ net trung bình từ dữ liệu thực
function calculateNetProfitRatios(trades: any[]) {
  console.log('🔍 calculateNetProfitRatios - Input trades:', trades);
  
  if (!trades || trades.length === 0) {
    console.log('🔍 calculateNetProfitRatios - No trades data');
    return { avgWinNet: 0, avgLossNet: 0 };
  }

  // Tính tỷ lệ lợi nhuận cho từng giao dịch (giống như trong bảng)
  const tradesWithRatios = trades.map(trade => {
    const entry = Number(trade.entry_price);
    const exit = Number(trade.exit_price);
    const size = Number(trade.size);
    const gross = (isFinite(entry) && isFinite(exit) && isFinite(size)) ? (exit - entry) * size : 0;
    const fee = (trade.entry_fee || 0) + (trade.exit_fee || 0);
    const net = gross - fee;
    const tradeValue = entry * size;
    const profitRatio = tradeValue > 0 ? (net / tradeValue) * 100 : 0;
    
    console.log('🔍 Trade calculation:', {
      entry, exit, size, gross, fee, net, tradeValue, profitRatio
    });
    
    return {
      ...trade,
      net,
      profitRatio
    };
  });

  // Phân loại giao dịch thắng/thua
  const winningTrades = tradesWithRatios.filter(trade => trade.net > 0);
  const losingTrades = tradesWithRatios.filter(trade => trade.net < 0);

  console.log('🔍 Trades classification:', {
    total: tradesWithRatios.length,
    winning: winningTrades.length,
    losing: losingTrades.length
  });

  // Tính tỷ lệ lãi net trung bình = avg tỷ lệ lợi nhuận các giao dịch lãi
  const avgWinNet = winningTrades.length > 0
    ? winningTrades.reduce((sum, trade) => sum + trade.profitRatio, 0) / winningTrades.length
    : 0;

  // Tính tỷ lệ lỗ net trung bình = avg tỷ lệ lợi nhuận các giao dịch lỗ
  const avgLossNet = losingTrades.length > 0
    ? losingTrades.reduce((sum, trade) => sum + trade.profitRatio, 0) / losingTrades.length
    : 0;

  console.log('🔍 Final results:', { avgWinNet, avgLossNet });

  return { avgWinNet, avgLossNet };
}
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { MacOSCloseButton } from '@/components/ui/macos-close-button';
import { 
  ArrowLeft, 
  Plus, 
  Brain, 
  Database, 
  Activity, 
  Play, 
  X, 
  Download, 
  Edit, 
  Save, 
  Eye,
  BarChart3,
  Clock,
  TestTube,
  TrendingUp,
  PieChart,
  LineChart,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Info,
  Settings,
  Terminal,
  Upload,
  FileText,
  Zap,
  Target,
  HelpCircle,
  Bug,
  Trash2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { cn } from '@/lib/utils';
import { DatasetSelector } from '../dataset-selector';
import { TrainingProgressModal } from '../training-progress-modal';
import { ModelPerformanceDisplay } from '../model-performance-display';
import { PriceChart } from '../price-chart';
import { format } from 'date-fns';
import { useToast } from "@/components/ui/use-toast";
import { supabase } from '@/lib/supabase-client';
import { ProjectBotsTab } from './project-bots';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer as RechartsResponsiveContainer
} from 'recharts';

interface Project {
  id: string;
  name: string;
  description: string;
  objective: string;
  status: string;
  progress: number;
  created_at: string;
  updated_at: string;
}

interface Model {
  id: string;
  project_id: string;
  name: string;
  category: string;
  algorithm: string;
  model_type: string;
  status: string;
  performance_metrics?: any;
  created_at: string;
}

interface ProjectDetailViewProps {
  projectId: string;
  onBack: () => void;
}

// Project progress calculation
const calculateProjectProgress = (project: Project, models: Model[]) => {
  const tasks = [
    { name: 'Thiết lập dự án', weight: 10, completed: true },
    { name: 'Thu thập dữ liệu', weight: 20, completed: true },
    { name: 'Phân tích dữ liệu', weight: 15, completed: true },
    { name: 'Xây dựng mô hình', weight: 25, completed: models.length > 0 },
    { name: 'Huấn luyện mô hình', weight: 20, completed: models.some(m => m.status === 'completed') },
    { name: 'Kiểm tra và tối ưu', weight: 10, completed: false }
  ];

  const completedWeight = tasks
    .filter(task => task.completed)
    .reduce((sum, task) => sum + task.weight, 0);

  return { progress: completedWeight, tasks };
};

// Forward declarations for tab components
function ResultsTab({ projectId, models }: any) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Phân tích kết quả</CardTitle>
          <CardDescription>
            Chọn model để xem chi tiết performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Chưa có kết quả</h3>
            <p className="text-muted-foreground">
              Hoàn thành training model để xem kết quả
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsTab({ project, onUpdate }: any) {
  const [name, setName] = useState(project?.name || "");
  const [status, setStatus] = useState(project?.status || "active");
  const [notifications, setNotifications] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setName(project?.name || "");
    setStatus(project?.status || "active");
    // Lấy trạng thái thông báo từ localStorage (theo project id)
    if (project?.id) {
      const noti = localStorage.getItem(`project_notify_${project.id}`);
      setNotifications(noti === 'true');
    }
  }, [project]);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      // Gọi API cập nhật project
      const res = await fetch(`/api/research/projects?id=${project.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status })
      });
      if (res.ok) {
        // Lưu trạng thái thông báo vào localStorage
        localStorage.setItem(`project_notify_${project.id}`, notifications ? 'true' : 'false');
        setMessage('Cập nhật thành công!');
        onUpdate && onUpdate();
      } else {
        const data = await res.json();
        setMessage(data?.error || 'Có lỗi xảy ra khi cập nhật');
      }
    } catch (err) {
      setMessage('Có lỗi mạng hoặc server!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Cài đặt Project</CardTitle>
          <CardDescription>
            Cấu hình các thiết lập cho project
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6 max-w-md mx-auto">
            <div>
              <Label htmlFor="project-name">Tên Project</Label>
              <Input
                id="project-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Nhập tên project mới"
              />
            </div>
            <div>
              <Label htmlFor="project-status">Trạng thái Project</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="project-status">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Đang hoạt động</SelectItem>
                  <SelectItem value="archived">Lưu trữ</SelectItem>
                  <SelectItem value="paused">Tạm dừng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="project-notifications"
                checked={notifications}
                onChange={e => setNotifications(e.target.checked)}
              />
              <Label htmlFor="project-notifications">Bật thông báo cho project này</Label>
            </div>
            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
            {message && (
              <Alert className="mt-2">
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ModelsTab({ models, onCreateModel, onRefresh, projectId }: any) {
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedModel, setSelectedModel] = useState<any>(null);
  const [showLogs, setShowLogs] = useState(false);
  const [isTraining, setIsTraining] = useState<string | null>(null);
  const [isLoadingModelDetails, setIsLoadingModelDetails] = useState(false);
  const [showDataSelector, setShowDataSelector] = useState(false);
  const [modelToTrain, setModelToTrain] = useState<any>(null);
  const [trainingData, setTrainingData] = useState({
    startDate: '',
    endDate: '',
    features: ['open_price', 'high_price', 'low_price', 'close_price', 'volume'],
    target: 'close_price',
    testSize: 0.2,
    dataLimit: 10000,
    timeframe: '1m' // Thêm trường timeframe
  });
  const [availableData, setAvailableData] = useState<any[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const { toast } = useToast();
  
  // Train/Test Split state
  const [trainTestSplit, setTrainTestSplit] = useState<{
    trainData: any[],
    testData: any[],
    splitApplied: boolean
  }>({
    trainData: [],
    testData: [],
    splitApplied: false
  });
  
  // Form state for creating models
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    category: 'prediction',
    algorithm_type: '',
    config_params: {
      test_size: 0.2,
      random_state: 42
    }
  });

  // Available model types and algorithms
  const modelTypes = {
    'Machine Learning - Cơ bản': [
      { value: 'linear_regression', label: 'Linear Regression', category: 'regression', description: 'Hồi quy tuyến tính đơn giản', difficulty: 'Dễ' },
      { value: 'decision_tree', label: 'Decision Tree', category: 'both', description: 'Cây quyết định', difficulty: 'Dễ' }
    ],
    'Machine Learning - Nâng cao': [
      { value: 'random_forest', label: 'Random Forest', category: 'both', description: 'Rừng ngẫu nhiên', difficulty: 'Trung bình' },
      { value: 'xgboost', label: 'XGBoost', category: 'both', description: 'Gradient boosting hiệu quả', difficulty: 'Trung bình' },
      { value: 'lightgbm', label: 'LightGBM', category: 'both', description: 'Light gradient boosting', difficulty: 'Trung bình' },
      { value: 'svm', label: 'Support Vector Machine', category: 'both', description: 'Máy vector hỗ trợ', difficulty: 'Khó' }
    ],
    'Deep Learning': [
      { value: 'lstm', label: 'LSTM Neural Network', category: 'prediction', description: 'Mạng nơ-ron LSTM cho dự báo', difficulty: 'Khó' },
      { value: 'gru', label: 'GRU Neural Network', category: 'prediction', description: 'Mạng nơ-ron GRU', difficulty: 'Khó' },
      { value: 'nbeats', label: 'N-BEATS', category: 'forecasting', description: 'Neural basis expansion analysis', difficulty: 'Khó' },
      { value: 'informer', label: 'Informer', category: 'forecasting', description: 'Transformer cho time series', difficulty: 'Khó' },
      { value: 'deepar', label: 'DeepAR', category: 'forecasting', description: 'Deep autoregressive forecasting', difficulty: 'Khó' },
      { value: 'dlinear', label: 'DLinear', category: 'forecasting', description: 'Direct linear forecasting', difficulty: 'Trung bình' }
    ],
    'Time Series - Thống kê': [
      { value: 'arima', label: 'ARIMA', category: 'forecasting', description: 'Auto-regressive integrated moving average', difficulty: 'Trung bình' },
      { value: 'var', label: 'Vector Autoregression (VAR)', category: 'forecasting', description: 'Tự hồi quy vector', difficulty: 'Khó' },
      { value: 'garch', label: 'GARCH', category: 'forecasting', description: 'Generalized autoregressive conditional heteroskedasticity', difficulty: 'Khó' },
      { value: 'prophet', label: 'Facebook Prophet', category: 'forecasting', description: 'Dự báo time series của Facebook', difficulty: 'Dễ' },
      { value: 'exponential_smoothing', label: 'Exponential Smoothing', category: 'forecasting', description: 'Làm mượt hàm mũ', difficulty: 'Dễ' }
    ]
  };

  // Get algorithm-specific parameters
  const getAlgorithmParams = (algorithm: string) => {
    const defaultParams = {
      test_size: 0.2,
      random_state: 42
    };

    const algorithmSpecific: { [key: string]: any } = {
      // Machine Learning - Regression
      'linear_regression': {
        ...defaultParams,
        fit_intercept: true,
        normalize: false,
        copy_X: true
      },
      'decision_tree': {
        ...defaultParams,
        max_depth: 10,
        min_samples_split: 2,
        min_samples_leaf: 1,
        criterion: 'squared_error',
        splitter: 'best'
      },
      'random_forest': {
        ...defaultParams,
        n_estimators: 100,
        max_depth: 10,
        min_samples_split: 2,
        min_samples_leaf: 1,
        max_features: 'sqrt',
        bootstrap: true,
        oob_score: false
      },
      'xgboost': {
        ...defaultParams,
        n_estimators: 100,
        learning_rate: 0.1,
        max_depth: 6,
        min_child_weight: 1,
        subsample: 1.0,
        colsample_bytree: 1.0,
        gamma: 0,
        reg_alpha: 0,
        reg_lambda: 1
      },
      'lightgbm': {
        ...defaultParams,
        n_estimators: 100,
        learning_rate: 0.1,
        num_leaves: 31,
        feature_fraction: 0.9,
        bagging_fraction: 0.8,
        bagging_freq: 5,
        boosting_type: 'gbdt'
      },
      'svm': {
        ...defaultParams,
        C: 1.0,
        kernel: 'rbf',
        gamma: 'scale',
        epsilon: 0.1,
        degree: 3,
        shrinking: true,
        cache_size: 200
      },
      
      // Deep Learning
      'lstm': {
        ...defaultParams,
        sequence_length: 60,
        hidden_units: 50,
        num_layers: 2,
        epochs: 50,
        batch_size: 32,
        dropout: 0.2,
        learning_rate: 0.001,
        optimizer: 'adam'
      },
      'gru': {
        ...defaultParams,
        sequence_length: 60,
        hidden_units: 50,
        num_layers: 2,
        epochs: 50,
        batch_size: 32,
        dropout: 0.2,
        learning_rate: 0.001,
        optimizer: 'adam'
      },
      'nbeats': {
        ...defaultParams,
        input_chunk_length: 24,
        output_chunk_length: 12,
        generic_architecture: true,
        num_stacks: 30,
        num_blocks: 1,
        num_layers: 4,
        layer_widths: 256,
        epochs: 100,
        batch_size: 32,
        learning_rate: 0.001
      },
      'informer': {
        ...defaultParams,
        seq_len: 96,
        label_len: 48,
        pred_len: 24,
        d_model: 512,
        n_heads: 8,
        e_layers: 2,
        d_layers: 1,
        d_ff: 2048,
        factor: 5,
        epochs: 10,
        batch_size: 32,
        learning_rate: 0.0001
      },
      'deepar': {
        ...defaultParams,
        input_chunk_length: 24,
        output_chunk_length: 12,
        hidden_size: 40,
        rnn_layers: 2,
        dropout: 0.0,
        likelihood: 'Gaussian',
        epochs: 100,
        batch_size: 32,
        learning_rate: 0.001
      },
      'dlinear': {
        ...defaultParams,
        seq_len: 96,
        pred_len: 24,
        individual: false,
        enc_in: 7,
        epochs: 100,
        batch_size: 32,
        learning_rate: 0.0001
      },
      
      // Time Series
      'arima': {
        ...defaultParams,
        p: 1,
        d: 1,
        q: 1,
        seasonal_order: [1, 1, 1, 12],
        enforce_stationarity: true,
        enforce_invertibility: true
      },
      'var': {
        ...defaultParams,
        maxlags: 15,
        ic: 'aic',
        trend: 'c'
      },
      'garch': {
        ...defaultParams,
        vol: 'GARCH',
        p: 1,
        q: 1,
        mean: 'Constant',
        dist: 'normal'
      },
      'prophet': {
        ...defaultParams,
        yearly_seasonality: true,
        weekly_seasonality: true,
        daily_seasonality: false,
        seasonality_mode: 'additive',
        changepoint_prior_scale: 0.05,
        seasonality_prior_scale: 10.0,
        holidays_prior_scale: 10.0,
        add_hourly_seasonality: false,
        add_monthly_seasonality: false
      },
      'exponential_smoothing': {
        ...defaultParams,
        trend: 'add',
        seasonal: 'add',
        seasonal_periods: 12,
        damped_trend: false,
        initialization_method: 'estimated',
        use_boxcox: false
      }
    };

    return algorithmSpecific[algorithm] || defaultParams;
  };

  const handleAlgorithmChange = (algorithm: string) => {
    setCreateForm(prev => ({
      ...prev,
      algorithm_type: algorithm,
      config_params: getAlgorithmParams(algorithm)
    }));
  };

  const updateConfigParam = (key: string, value: any) => {
    setCreateForm(prev => ({
      ...prev,
      config_params: {
        ...prev.config_params,
        [key]: value
      }
    }));
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.algorithm_type) {
      alert('Vui lòng điền tên model và chọn thuật toán!');
      return;
    }

    const result = await handleCreateModel({
      ...createForm,
      parameters: createForm.config_params
    });

    if (result.success) {
      // Reset form
      setCreateForm({
        name: '',
        description: '',
        category: 'prediction',
        algorithm_type: '',
        config_params: {
          test_size: 0.2,
          random_state: 42
        }
      });
    }
  };

  const handleCreateModel = async (modelData: any) => {
    try {
      console.log('🚀 Creating model:', modelData);
      const payload = {
        project_id: projectId,
        name: modelData.name.trim(),
        description: modelData.description || '',
        algorithm: modelData.algorithm_type,
        model_type: modelData.algorithm_type,
        status: 'draft',
        parameters: JSON.stringify(modelData.parameters || {}),
        training_config: JSON.stringify({
          algorithm: modelData.algorithm_type,
          hyperparameters: modelData.parameters || {},
          created_by: 'user',
          created_at: new Date().toISOString()
        }),
        created_at: new Date().toISOString()
      };
      const response = await fetch('/api/research/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        return { success: false, error: 'Invalid server response' };
      }
      if (response.ok) {
        console.log('✅ Model created successfully:', result.model);
        await onRefresh();
        return { success: true, model: result.model };
      } else {
        console.error('❌ Model creation failed:', { status: response.status, result });
        return {
          success: false,
          error: result?.error || result?.message || `Server error (${response.status})`
        };
      }
    } catch (error) {
      console.error('❌ Model creation network error:', error);
      return { success: false, error: 'Network error - check connection' };
    }
  };

  const trainModel = async (modelId: string) => {
    // Show data selector modal instead of training directly
    const model = models.find((m: any) => m.id === modelId);
    if (model) {
      setModelToTrain(model);
      await fetchAvailableData();
      setShowDataSelector(true);
    }
  };

  const fetchAvailableData = async () => {
    try {
      setIsLoadingData(true);
      console.log('🔍 [Reload Data] Fetching available OHLCV data...');
      
      // Build query with filters based on user selection
      let query = `/api/data/ohlcv?limit=${trainingData.dataLimit}&order=timestamp.desc`;
      
      // Thêm timeframe vào query
      if (trainingData.timeframe) {
        query += `&timeframe=${trainingData.timeframe}`;
      }
      
      // Add date filters if specified
      if (trainingData.startDate && trainingData.endDate) {
        const startDateTime = `${trainingData.startDate}T00:00:00Z`;
        const endDateTime = `${trainingData.endDate}T23:59:59Z`;
        query += `&start_date=${encodeURIComponent(startDateTime)}&end_date=${encodeURIComponent(endDateTime)}`;
        
        console.log('📅 [Reload Data] Using date range filter:', {
          startDate: trainingData.startDate,
          endDate: trainingData.endDate,
          query: query
        });
      } else {
        console.log('📅 [Reload Data] No date range filter - fetching latest records');
      }
      
      console.log('🔗 [Reload Data] API Query:', query);
      
      let data = null;
      // Nếu timeframe là 1m thì lấy trực tiếp từ API
      if (trainingData.timeframe === '1m') {
        const response = await fetch(query);
        if (response.ok) {
          data = await response.json();
        }
      } else {
        // Nếu timeframe khác 1m, lấy dữ liệu 1m rồi tổng hợp lại
        let baseQuery = query.replace(`&timeframe=${trainingData.timeframe}`, '&timeframe=1m');
        const response = await fetch(baseQuery);
        if (response.ok) {
          const raw = await response.json();
          // Hàm tổng hợp dữ liệu 1m thành timeframe lớn hơn
          data = { data: aggregateOHLCV(raw.data || [], trainingData.timeframe) };
        }
      }
      if (data) {
        setAvailableData(data.data || []);
        // ... giữ nguyên các xử lý sau khi setAvailableData ...
        if ((!trainingData.startDate || !trainingData.endDate) && data.data && data.data.length > 0) {
          const latest = data.data[0].open_time;
          const earliest = data.data[data.data.length - 1].open_time;
          setTrainingData(prev => ({
            ...prev,
            endDate: latest ? latest.split('T')[0] : '',
            startDate: earliest ? earliest.split('T')[0] : ''
          }));
          console.log('📅 [Reload Data] Auto-set date range (first time):', {
            startDate: earliest ? earliest.split('T')[0] : '',
            endDate: latest ? latest.split('T')[0] : '',
            totalRecords: data.data.length
          });
        } else {
          console.log('📅 [Reload Data] Keeping user-selected date range:', {
            startDate: trainingData.startDate,
            endDate: trainingData.endDate,
            totalRecords: data.data?.length || 0
          });
        }
        console.log('✅ [Reload Data] Data loaded successfully:', data.data?.length || 0, 'records');
        if (data.data && data.data.length > 0) {
          const dateRangeInfo = trainingData.startDate && trainingData.endDate 
            ? `📅 Date range: ${trainingData.startDate} to ${trainingData.endDate}`
            : `📅 Latest records: ${data.data[data.data.length - 1].open_time?.split('T')[0]} to ${data.data[0].open_time?.split('T')[0]}`;
          alert(`✅ Đã reload ${data.data.length.toLocaleString()} records!\n${dateRangeInfo}`);
        }
      } else {
        alert('❌ Không thể tải dữ liệu OHLCV');
      }
    } catch (error) {
      console.error('❌ [Reload Data] Error fetching data:', error);
      alert(`❌ Lỗi khi tải dữ liệu: ${error}`);
    } finally {
      setIsLoadingData(false);
      console.log('🏁 [Reload Data] Loading finished');
    }
  };

  // Hàm tổng hợp OHLCV từ 1m sang timeframe lớn hơn
  function aggregateOHLCV(data: any[], timeframe: string) {
    // Hỗ trợ các timeframe: 1m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d
    const tfMap: any = {
      '1m': 1,
      '5m': 5,
      '15m': 15,
      '30m': 30,
      '1h': 60,
      '2h': 120,
      '4h': 240,
      '6h': 360,
      '8h': 480,
      '12h': 720,
      '1d': 1440
    };

    const tf = tfMap[timeframe];
    if (!tf || tf === 1) return data; // Nếu là 1m hoặc timeframe không hợp lệ, trả về nguyên data

    const result = [];
    let currentChunk: any[] = [];
    let currentTimestamp: string | null = null;

    // Hàm kiểm tra xem một timestamp có thuộc về cùng một nhóm timeframe không
    const isSameTimeframe = (timestamp1: string, timestamp2: string) => {
      const date1 = new Date(timestamp1);
      const date2 = new Date(timestamp2);
      
      const minutes1 = date1.getUTCHours() * 60 + date1.getUTCMinutes();
      const minutes2 = date2.getUTCHours() * 60 + date2.getUTCMinutes();
      
      return Math.floor(minutes1 / tf) === Math.floor(minutes2 / tf) &&
             date1.getUTCFullYear() === date2.getUTCFullYear() &&
             date1.getUTCMonth() === date2.getUTCMonth() &&
             date1.getUTCDate() === date2.getUTCDate();
    };

    // Hàm tính giá trị OHLCV cho một chunk
    const calculateOHLCV = (chunk: any[]) => {
      if (chunk.length === 0) return null;
      
      const openTime = chunk[0].open_time;
      const open = chunk[0].open_price || chunk[0].open;
      const close = chunk[chunk.length - 1].close_price || chunk[chunk.length - 1].close;
      const high = Math.max(...chunk.map(x => x.high_price || x.high));
      const low = Math.min(...chunk.map(x => x.low_price || x.low));
      const volume = chunk.reduce((sum, x) => sum + Number(x.volume), 0);
      
      return {
        open_time: openTime,
        open_price: open,
        high_price: high,
        low_price: low,
        close_price: close,
        volume: volume,
        // Thêm các trường tương thích ngược
        open: open,
        high: high,
        low: low,
        close: close
      };
    };

    // Xử lý từng candle
    for (const candle of data) {
      if (!currentTimestamp) {
        currentTimestamp = candle.open_time;
        currentChunk = [candle];
      } else if (isSameTimeframe(currentTimestamp, candle.open_time)) {
        currentChunk.push(candle);
      } else {
        // Khi gặp candle thuộc timeframe mới
        const ohlcv = calculateOHLCV(currentChunk);
        if (ohlcv) result.push(ohlcv);
        
        // Bắt đầu chunk mới
        currentTimestamp = candle.open_time;
        currentChunk = [candle];
      }
    }

    // Xử lý chunk cuối cùng
    if (currentChunk.length > 0) {
      const ohlcv = calculateOHLCV(currentChunk);
      if (ohlcv) result.push(ohlcv);
    }

    return result;
  }

  // Auto-update train/test split when data or testSize changes
  useEffect(() => {
    if (availableData.length > 0) {
      const trainSize = Math.floor(availableData.length * (1 - trainingData.testSize));
      const trainData = availableData.slice(0, trainSize);
      const testData = availableData.slice(trainSize);
      
      setTrainTestSplit({
        trainData,
        testData,
        splitApplied: true
      });
      
      console.log('📊 Train/Test Split Updated:', {
        totalRecords: availableData.length,
        trainRecords: trainData.length,
        testRecords: testData.length,
        testSize: trainingData.testSize,
      });
    }
  }, [availableData, trainingData.testSize]);

  const startTrainingWithData = async () => {
    if (!modelToTrain) return;
    
    try {
      setIsTraining(modelToTrain.id);
      console.log('🚀 Starting training with selected data:', trainingData);
      console.log('📊 Train/Test Split data:', {
        trainRecords: trainTestSplit.trainData.length,
        testRecords: trainTestSplit.testData.length,
        splitApplied: trainTestSplit.splitApplied
      });
      
      // Prepare training config with actual train/test data
      const trainingConfig = {
        ...trainingData,
        // Pass actual split data to API
        trainData: trainTestSplit.trainData,
        testData: trainTestSplit.testData,
        splitInfo: {
          trainSize: trainTestSplit.trainData.length,
          testSize: trainTestSplit.testData.length,
          testRatio: trainingData.testSize,
          splitApplied: trainTestSplit.splitApplied
        }
      };
      
      const response = await fetch('/api/research/models/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId: modelToTrain.id,
          action: 'train',
          config: { 
            generate_script: true,
            data_config: trainingConfig
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Training started with data config:', result);
        await onRefresh();
        
        setShowDataSelector(false);
        setModelToTrain(null);
        
        // If model details modal is open, refresh the model data
        if (showLogs && selectedModel && selectedModel.id === modelToTrain.id) {
          await refreshModelDetails(modelToTrain.id);
        }
        
        // Show success message with train/test split info
        const { trainData, testData } = trainTestSplit;
        alert(`✅ Training đã bắt đầu!\n📊 Train: ${trainData.length.toLocaleString()} records\n📊 Test: ${testData.length.toLocaleString()} records\n🤖 Algorithm: ${modelToTrain.algorithm || modelToTrain.model_type}`);
      } else {
        const error = await response.json();
        console.error('❌ Failed to train model:', error);
        alert(`❌ Lỗi training: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Training error:', error);
      alert('❌ Lỗi kết nối khi training model');
    } finally {
      setIsTraining(null);
    }
  };

  const refreshModelDetails = async (modelId: string) => {
    try {
      setIsLoadingModelDetails(true);
      console.log('🔄 Refreshing model details:', modelId);
      
      const response = await fetch(`/api/research/models?id=${modelId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.models && data.models.length > 0) {
          const latestModel = data.models[0];
          
          // Parse training_logs if it's a JSON string
          if (latestModel.training_logs && typeof latestModel.training_logs === 'string') {
            try {
              latestModel.training_logs = JSON.parse(latestModel.training_logs);
            } catch (e) {
              console.warn('Failed to parse training_logs:', e);
              latestModel.training_logs = [];
            }
          }
          
          // Ensure training_logs is an array
          if (!Array.isArray(latestModel.training_logs)) {
            latestModel.training_logs = [];
          }
          
          // Parse performance_metrics if it's a JSON string
          if (latestModel.performance_metrics && typeof latestModel.performance_metrics === 'string') {
            try {
              latestModel.performance_metrics = JSON.parse(latestModel.performance_metrics);
            } catch (e) {
              console.warn('Failed to parse performance_metrics:', e);
              latestModel.performance_metrics = null;
            }
          }
          
          setSelectedModel(latestModel);
          console.log('✅ Model details refreshed successfully');
        }
      }
    } catch (error) {
      console.error('❌ Error refreshing model details:', error);
    } finally {
      setIsLoadingModelDetails(false);
    }
  };

  const viewLogs = async (model: any) => {
    if (model.id === selectedModel?.id && showLogs) {
      setShowLogs(false);
      return;
    }
    
    // Đảm bảo training_logs là một mảng
    if (model.training_logs && typeof model.training_logs === 'string') {
      try {
        model.training_logs = JSON.parse(model.training_logs);
      } catch (e) {
        console.error("Lỗi parse training_logs:", e);
        model.training_logs = [{ timestamp: new Date().toISOString(), message: "Lỗi hiển thị logs, dữ liệu không hợp lệ." }];
      }
    } else if (!Array.isArray(model.training_logs)) {
      model.training_logs = [];
    }

    setSelectedModel(model);
    setShowLogs(true);
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa model này không? Hành động này không thể hoàn tác.')) {
      return;
    }

    if (!supabase) {
      toast({ title: 'Lỗi', description: 'Supabase client chưa được khởi tạo.', variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('research_models')
      .delete()
      .eq('id', modelId);

    if (error) {
      toast({
        title: 'Lỗi xóa model',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Xóa model thành công',
        description: 'Model đã được xóa thành công.',
      });
      onRefresh();
    }
  };

  if (!models || models.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Mô hình trong Project
              <Button onClick={() => setShowCreateModel(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Model
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Chưa có model nào</h3>
              <p className="text-muted-foreground mb-4">
                Tạo model đầu tiên để bắt đầu nghiên cứu
              </p>
              <Button onClick={() => setShowCreateModel(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Model Đầu Tiên
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Danh sách Models ({models.length})</h3>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các mô hình AI/ML trong project
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onRefresh}>
            <Activity className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={() => {
            console.log('🔘 [Modal] Button clicked!');
            alert('Button clicked! Modal should open now.');
            setShowCreateModel(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Model Mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {models.map((model: any) => (
          <Card key={model.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Brain className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{model.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={
                        model.status === 'completed' ? 'default' :
                        model.status === 'training' ? 'secondary' :
                        model.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {model.status === 'completed' ? '✅ Hoàn thành' :
                         model.status === 'training' ? '🔄 Đang train' :
                         model.status === 'failed' ? '❌ Lỗi' : 
                         model.status === 'draft' ? '📝 Nháp' : model.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Algorithm:</span>
                  <span className="capitalize">{model.algorithm || model.model_type || model.algorithm_type || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Category:</span>
                  <span className="capitalize">{model.category}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Created:</span>
                  <span>{new Date(model.created_at).toLocaleDateString('vi-VN')}</span>
                </div>
                {model.data_config && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Data Config:</div>
                    <div className="text-blue-600 font-medium text-xs">
                      {model.data_config.source_table} • {model.data_config.sample_size?.toLocaleString() || 'N/A'} samples
                    </div>
                  </div>
                )}
                {model.performance_metrics && (
                  <div className="pt-2 border-t">
                    <div className="text-xs text-muted-foreground mb-1">Performance:</div>
                    <div className="text-green-600 font-medium text-xs">
                      {typeof model.performance_metrics === 'object' 
                        ? `Accuracy: ${model.performance_metrics.accuracy || 'N/A'}`
                        : 'Available'
                      }
                    </div>
                  </div>
                )}
                {model.description && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-muted-foreground">{model.description}</p>
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-4">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => viewLogs(model)}
                      >
                        <Terminal className="h-3 w-3 mr-1" />
                        View Logs
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Xem training logs từ Supabase</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                {(model.status === 'draft' || model.status === 'completed' || model.status === 'failed') && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => trainModel(model.id)}
                          disabled={isTraining === model.id}
                        >
                          {isTraining === model.id ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1"></div>
                          ) : (
                            <Play className="h-3 w-3 mr-1" />
                          )}
                          {model.status === 'completed' ? 'Retrain' : 'Train'}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{model.status === 'completed' ? 'Train lại model' : 'Bắt đầu train model'}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleDeleteModel(model.id)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Models</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{models.length}</div>
              <div className="text-sm text-muted-foreground">Tổng Models</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {models.filter((m: any) => m.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {models.filter((m: any) => m.status === 'training').length}
              </div>
              <div className="text-sm text-muted-foreground">Đang Training</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {models.filter((m: any) => m.status === 'draft').length}
              </div>
              <div className="text-sm text-muted-foreground">Draft</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {models.filter((m: any) => m.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Logs Modal */}
      <Dialog open={showLogs && !!selectedModel} onOpenChange={setShowLogs}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Terminal className="h-5 w-5" />
              Training Logs: {selectedModel?.name}
              {isLoadingModelDetails && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              )}
            </DialogTitle>
            <DialogDescription>
              Logs huấn luyện từ cột training_logs trong Supabase
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 mb-4 justify-end">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => refreshModelDetails(selectedModel.id)}
              disabled={isLoadingModelDetails}
            >
              <Activity className="h-4 w-4 mr-2" />
              {isLoadingModelDetails ? 'Đang tải...' : 'Refresh'}
            </Button>
            <Button variant="outline" onClick={() => setShowLogs(false)}>
              <X className="h-4 w-4 mr-2" />
              Đóng
            </Button>
          </div>
          {/* Training Logs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                Training Logs
                {selectedModel?.training_logs && selectedModel.training_logs.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {selectedModel.training_logs.length} entries
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedModel?.training_logs && selectedModel.training_logs.length > 0 ? (
                <div className="space-y-1 max-h-[50vh] overflow-y-auto font-mono text-xs">
                  {selectedModel.training_logs.map((log: any, idx: number) => (
                    <div key={idx} className="whitespace-pre-wrap">
                      <span className="text-gray-500">[{String(idx + 1).padStart(3, '0')}]</span> {typeof log === 'string' ? log : log.message}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">
                  {isLoadingModelDetails ? 'Đang tải training logs...' : 'Không có logs huấn luyện'}
                </div>
              )}
            </CardContent>
          </Card>
        </DialogContent>
      </Dialog>

      {/* Test Modal */}
      {showCreateModel && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '20px',
            borderRadius: '8px',
            maxWidth: '80vw',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h2>🧪 Test Modal - Hoạt động!</h2>
            <p>Nếu bạn thấy cái này thì modal đang hoạt động bình thường.</p>
            <p>State: {String(showCreateModel)}</p>
            <button onClick={() => setShowCreateModel(false)}>Đóng Modal</button>
          </div>
        </div>
      )}

      {/* Create Model Form */}
      <Dialog open={showCreateModel} onOpenChange={setShowCreateModel}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Tạo Model Mới
            </DialogTitle>
            <DialogDescription>
              Chọn thuật toán AI/ML và cấu hình parameters
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin Model</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="model-name">Tên Model *</Label>
                  <Input
                    id="model-name"
                    value={createForm.name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ví dụ: BTC Price Prediction v1"
                  />
                </div>
                <div>
                  <Label htmlFor="model-category">Category</Label>
                  <Select 
                    value={createForm.category} 
                    onValueChange={(value) => setCreateForm(prev => ({ ...prev, category: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn loại model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prediction">Prediction (Dự đoán)</SelectItem>
                      <SelectItem value="classification">Classification (Phân loại)</SelectItem>
                      <SelectItem value="regression">Regression (Hồi quy)</SelectItem>
                      <SelectItem value="forecasting">Forecasting (Dự báo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="model-description">Mô tả (tùy chọn)</Label>
                  <Textarea
                    id="model-description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Mô tả ngắn gọn về model..."
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>
            {/* Algorithm Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Chọn thuật toán *</CardTitle>
                <CardDescription>
                  Chọn thuật toán phù hợp với dữ liệu và mục tiêu của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {Object.entries(modelTypes).map(([category, algorithms]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium text-sm text-foreground">{category}</h4>
                        <div className="flex-1 h-px bg-border"></div>
                        <Badge variant="secondary" className="text-xs">
                          {algorithms.length} thuật toán
                        </Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {algorithms.map((algo) => (
                          <div
                            key={algo.value}
                            className={`
                              p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md
                              ${createForm.algorithm_type === algo.value 
                                ? 'bg-blue-50 border-blue-200 shadow-sm dark:bg-blue-900/20 dark:border-blue-700/30' 
                                : 'hover:bg-accent border-border'}
                            `}
                            onClick={() => handleAlgorithmChange(algo.value)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="font-medium text-sm">{algo.label}</div>
                                  <Badge 
                                    variant="outline" 
                                    className={`text-xs
                                      ${algo.difficulty === 'Dễ' ? 'text-green-600 border-green-200' : 
                                        algo.difficulty === 'Trung bình' ? 'text-yellow-600 border-yellow-200' : 
                                        'text-red-600 border-red-200'}
                                    `}
                                  >
                                    {algo.difficulty}
                                  </Badge>
                                </div>
                                <div className="text-xs text-muted-foreground mb-2">
                                  {algo.description}
                                </div>
                                <div className="text-xs text-muted-foreground capitalize">
                                  Dùng cho: {algo.category}
                                </div>
                              </div>
                              {createForm.algorithm_type === algo.value && (
                                <CheckCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            {/* Algorithm Parameters */}
            {createForm.algorithm_type && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Hyperparameters - {modelTypes['Machine Learning - Cơ bản'].concat(modelTypes['Machine Learning - Nâng cao'], modelTypes['Deep Learning'], modelTypes['Time Series - Thống kê']).find(a => a.value === createForm.algorithm_type)?.label}
                  </CardTitle>
                  <CardDescription>
                    Cấu hình parameters cho thuật toán đã chọn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(createForm.config_params).map(([key, value]) => (
                      <div key={key}>
                        <Label htmlFor={key} className="capitalize text-sm">
                          {key.replace(/_/g, ' ')}
                        </Label>
                        {typeof value === 'boolean' ? (
                          <Select 
                            value={String(value)} 
                            onValueChange={(val) => updateConfigParam(key, val === 'true')}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="true">True</SelectItem>
                              <SelectItem value="false">False</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : typeof value === 'string' ? (
                          <Input
                            id={key}
                            value={value}
                            onChange={(e) => updateConfigParam(key, e.target.value)}
                          />
                        ) : (
                          <Input
                            id={key}
                            type="number"
                            value={value}
                            onChange={(e) => updateConfigParam(key, parseFloat(e.target.value) || 0)}
                            step={key.includes('rate') || key.includes('size') ? 0.01 : 1}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => setShowCreateModel(false)}
                variant="outline"
                className="flex-1"
              >
                Hủy
              </Button>
              <Button 
                onClick={handleCreateSubmit}
                disabled={isCreating || !createForm.name || !createForm.algorithm_type}
                className="flex-1"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Model
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Data Selector Modal */}
      <Dialog open={showDataSelector && !!modelToTrain} onOpenChange={setShowDataSelector}>
        <DialogContent className="max-w-4xl w-[90vw] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Chọn dữ liệu Training: {modelToTrain?.name}
              {isLoadingData && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
              )}
            </DialogTitle>
            <DialogDescription>
              Chọn dữ liệu từ bảng OHLCV_BTC_USDT_1m để train model
            </DialogDescription>
          </DialogHeader>
          <CardContent className="space-y-6">
            {/* Data Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Dữ liệu có sẵn</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoadingData ? (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                    <p className="text-muted-foreground">Đang tải dữ liệu...</p>
                  </div>
                ) : availableData.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{availableData.length.toLocaleString()}</div>
                      <div className="text-sm text-muted-foreground">Tổng records</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">1m</div>
                      <div className="text-sm text-muted-foreground">Timeframe</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">5</div>
                      <div className="text-sm text-muted-foreground">Features</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">BTC/USDT</div>
                      <div className="text-sm text-muted-foreground">Pair</div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <Database className="h-8 w-8 mx-auto mb-2" />
                    <p>Không có dữ liệu</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Data Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cấu hình dữ liệu Training</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start-date">Ngày bắt đầu</Label>
                    <Input
                      id="start-date"
                      type="date"
                      value={trainingData.startDate}
                      onChange={(e) => setTrainingData(prev => ({ ...prev, startDate: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date">Ngày kết thúc</Label>
                    <Input
                      id="end-date"
                      type="date"
                      value={trainingData.endDate}
                      onChange={(e) => setTrainingData(prev => ({ ...prev, endDate: e.target.value }))}
                    />
                  </div>
                  {/* Thêm chọn timeframe */}
                  <div>
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select
                      value={trainingData.timeframe}
                      onValueChange={(value) => setTrainingData(prev => ({ ...prev, timeframe: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn timeframe" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1 phút</SelectItem>
                        <SelectItem value="5m">5 phút</SelectItem>
                        <SelectItem value="15m">15 phút</SelectItem>
                        <SelectItem value="1h">1 giờ</SelectItem>
                        <SelectItem value="4h">4 giờ</SelectItem>
                        <SelectItem value="1d">1 ngày</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="target">Target Variable</Label>
                    <Select 
                      value={trainingData.target} 
                      onValueChange={(value) => setTrainingData(prev => ({ ...prev, target: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn target" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="close_price">Close Price</SelectItem>
                        <SelectItem value="high_price">High Price</SelectItem>
                        <SelectItem value="low_price">Low Price</SelectItem>
                        <SelectItem value="volume">Volume</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="test-size">Test Size</Label>
                    <Input
                      id="test-size"
                      type="number"
                      min="0.1"
                      max="0.5"
                      step="0.05"
                      value={trainingData.testSize}
                      onChange={(e) => setTrainingData(prev => ({ ...prev, testSize: parseFloat(e.target.value) }))}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="data-limit">Giới hạn dữ liệu (records)</Label>
                  <Input
                    id="data-limit"
                    type="number"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={trainingData.dataLimit}
                    onChange={(e) => setTrainingData(prev => ({ ...prev, dataLimit: parseInt(e.target.value) }))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Số lượng records sử dụng để training (tối đa 100,000)
                  </p>
                </div>

                <div>
                  <Label>Features</Label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-2">
                    {['open_price', 'high_price', 'low_price', 'close_price', 'volume'].map((feature) => (
                      <label key={feature} className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={trainingData.features.includes(feature)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTrainingData(prev => ({
                                ...prev,
                                features: [...prev.features, feature]
                              }));
                            } else {
                              setTrainingData(prev => ({
                                ...prev,
                                features: prev.features.filter(f => f !== feature)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm">
                          {feature === 'open_price' ? 'Open' :
                           feature === 'high_price' ? 'High' :
                           feature === 'low_price' ? 'Low' :
                           feature === 'close_price' ? 'Close' : 'Volume'}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Train/Test Split Display */}
            {trainTestSplit.splitApplied && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    Train/Test Split
                  </CardTitle>
                  <CardDescription>
                    Chia dữ liệu thành training set và testing set
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {trainTestSplit.trainData.length.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Training Records</div>
                      <div className="text-xs text-blue-600 font-medium">
                        {((trainTestSplit.trainData.length / (trainTestSplit.trainData.length + trainTestSplit.testData.length)) * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700/30 rounded-lg text-center">
                      <div className="text-2xl font-bold text-orange-600">
                        {trainTestSplit.testData.length.toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">Testing Records</div>
                      <div className="text-xs text-orange-600 font-medium">
                        {((trainTestSplit.testData.length / (trainTestSplit.trainData.length + trainTestSplit.testData.length)) * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Test Size Ratio:</span>
                      <span className="font-medium">{(trainingData.testSize * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Total Records:</span>
                      <span className="font-medium">{(trainTestSplit.trainData.length + trainTestSplit.testData.length).toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview */}
            {availableData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Xem trước dữ liệu</CardTitle>
                  <CardDescription>
                    Sample dữ liệu từ bảng OHLCV_BTC_USDT_1m
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border">
                      <thead>
                        <tr className="border-b bg-muted">
                          <th className="text-left p-3">Open Time</th>
                          <th className="text-right p-3">Open Price</th>
                          <th className="text-right p-3">High Price</th>
                          <th className="text-right p-3">Low Price</th>
                          <th className="text-right p-3">Close Price</th>
                          <th className="text-right p-3">Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {availableData.slice(0, 5).map((row, idx) => (
                          <tr key={idx} className="border-b hover:bg-muted/50">
                            <td className="p-3 font-mono text-xs">
                              {row.open_time ? new Date(row.open_time).toLocaleString('vi-VN', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : 'N/A'}
                            </td>
                            <td className="text-right p-3 font-mono">
                              {row.open_price ? `$${Number(row.open_price).toLocaleString('vi-VN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}` : 'N/A'}
                            </td>
                            <td className="text-right p-3 font-mono">
                              {row.high_price ? `$${Number(row.high_price).toLocaleString('vi-VN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}` : 'N/A'}
                            </td>
                            <td className="text-right p-3 font-mono">
                              {row.low_price ? `$${Number(row.low_price).toLocaleString('vi-VN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}` : 'N/A'}
                            </td>
                            <td className="text-right p-3 font-mono font-medium">
                              {row.close_price ? `$${Number(row.close_price).toLocaleString('vi-VN', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2
                              })}` : 'N/A'}
                            </td>
                            <td className="text-right p-3 font-mono">
                              {row.volume ? Number(row.volume).toLocaleString('vi-VN', {
                                minimumFractionDigits: 4,
                                maximumFractionDigits: 4
                              }) : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-4 p-3 bg-muted rounded-lg">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Hiển thị:</span>
                        <span className="ml-2 font-medium">5 / {availableData.length.toLocaleString()} records</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Timeframe:</span>
                        <span className="ml-2 font-medium">1 phút</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Symbol:</span>
                        <span className="ml-2 font-medium">BTC/USDT</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Source:</span>
                        <span className="ml-2 font-medium">Binance</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Debug info (temporary) */}
                  {availableData.length > 0 && (
                    <details className="mt-2">
                      <summary className="text-xs text-muted-foreground cursor-pointer">Debug: Raw data sample</summary>
                      <pre className="text-xs bg-gray-100 p-2 rounded mt-2 overflow-auto">
                        {JSON.stringify(availableData[0], null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              <Button 
                onClick={() => {
                  setShowDataSelector(false);
                  setModelToTrain(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Hủy
              </Button>
              <Button 
                onClick={startTrainingWithData}
                disabled={isTraining === modelToTrain?.id || trainingData.features.length === 0}
                className="flex-1"
              >
                {isTraining === modelToTrain?.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Bắt đầu Training
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface BacktestConfig {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timeframe: string;
  symbol: string;
  initialCapital: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
  maxPositions?: number;
  maxDrawdown?: number;
  trailingStop?: boolean;
  trailingStopDistance?: number;
  strategyType?: string;
  rsiBuy?: string;
  rsiSell?: string;
  macdBuy?: string;
  macdSell?: string;
  aiRule?: string;
  fastPeriod?: number;
  slowPeriod?: number;
  rsiPeriod?: number;
  overbought?: number;
  oversold?: number;
  fastEMA?: number;
  slowEMA?: number;
  signalPeriod?: number;
  period?: number;
  stdDev?: number;
  bbPeriod?: number;
  bbStdDev?: number;
  multiplier?: number;
  channelPeriod?: number;
  maker_fee?: number;
  taker_fee?: number;
  prioritizeStoploss?: boolean;
  useTakeProfit?: boolean;
}

interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function ExperimentsTab({ projectId, models }: { projectId: string, models: any[] }) {
  const { toast } = useToast();
  const [experiments, setExperiments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingExperiment, setCreatingExperiment] = useState(false);
  const [showExperimentTypeModal, setShowExperimentTypeModal] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);
  const [settingUp, setSettingUp] = useState(false);
  const [backtestConfig, setBacktestConfig] = useState<BacktestConfig>({
    name: '',
    description: '',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    startTime: '00:00',
    endTime: '23:59',
    timeframe: '1h',
    symbol: 'BTCUSDT',
    initialCapital: 10000,
    positionSize: 1,
    stopLoss: 2,
    takeProfit: 4,
    strategyType: '',
    aiRule: '',
    fastPeriod: 10,
    slowPeriod: 20,
    rsiPeriod: 14,
    overbought: 70,
    oversold: 30,
    fastEMA: 12,
    slowEMA: 26,
    signalPeriod: 9,
    bbPeriod: 20,
    bbStdDev: 2,
    channelPeriod: 20,
    multiplier: 2,
    maker_fee: 0.1,
    taker_fee: 0.1,
  });
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectedExperimentType, setSelectedExperimentType] = useState<'backtest' | 'hypothesis_test' | null>(null);
  const [showBacktestConfig, setShowBacktestConfig] = useState(false);
  const [showHypothesisConfig, setShowHypothesisConfig] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [experimentChartData, setExperimentChartData] = useState<OHLCV[]>([]);
  const [loadingExperimentChart, setLoadingExperimentChart] = useState(false);
  const [hypothesisConfig, setHypothesisConfig] = useState({
    name: '',
    description: '',
    hypothesis: '',
    significanceLevel: '0.05',
    testType: 't-test'
  });
  const [pythonScript, setPythonScript] = useState<string>('');
  const [backtestResult, setBacktestResult] = useState<any>(null);
  // Thêm state filter
  const [filter, setFilter] = useState({
    fromDate: '',
    toDate: '',
    minTotalReturn: '',
    maxTotalReturn: '',
    minSharpe: '',
    maxSharpe: '',
    minWinrate: '',
    maxWinrate: '',
    minAvgWinNet: '',
    maxAvgWinNet: '',
    minAvgLossNet: '',
    maxAvgLossNet: '',
    status: '',
    type: '',
  });
  // Thêm state cho backtests completed
  const [backtests, setBacktests] = useState<any[]>([]);
  const [useDefaultFee, setUseDefaultFee] = useState(true);
  
  // State cho Monte Carlo simulation
  const [monteCarloResults, setMonteCarloResults] = useState<any[]>([]);

  const handleBacktestConfigChange = (field: string, value: string | number | boolean) => {
    setBacktestConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHypothesisConfigChange = (field: string, value: string) => {
    setHypothesisConfig(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeeChange = (field: 'maker_fee' | 'taker_fee', value: string) => {
    setBacktestConfig(prev => ({
      ...prev,
      [field]: parseFloat(value)
    }));
  };

  const createBacktestExperiment = async () => {
    if (!supabase) {
      toast({
        title: 'Lỗi kết nối',
        description: 'Không thể kết nối đến database. Vui lòng thử lại.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setCreatingExperiment(true);
      console.log('📝 Creating backtest experiment:', backtestConfig);

      // Chuẩn bị cấu hình chiến lược dựa trên loại chiến lược được chọn
      let strategyConfig = {};
      switch (backtestConfig.strategyType) {
        case 'ma_crossover':
          strategyConfig = {
            type: 'ma_crossover',
            parameters: {
              fastPeriod: backtestConfig.fastPeriod || 10,
              slowPeriod: backtestConfig.slowPeriod || 20
            }
          };
          break;
        case 'rsi':
          strategyConfig = {
            type: 'rsi',
            parameters: {
              period: backtestConfig.rsiPeriod || 14,
              overbought: backtestConfig.overbought || 70,
              oversold: backtestConfig.oversold || 30
            }
          };
          break;
        case 'macd':
          strategyConfig = {
            type: 'macd',
            parameters: {
              fastEMA: backtestConfig.fastEMA || 12,
              slowEMA: backtestConfig.slowEMA || 26,
              signalPeriod: backtestConfig.signalPeriod || 9
            }
          };
          break;
        case 'bollinger_bands':
          strategyConfig = {
            type: 'bollinger_bands',
            parameters: {
              period: backtestConfig.bbPeriod || 20,
              stdDev: backtestConfig.bbStdDev || 2
            }
          };
          break;
        case 'breakout':
          strategyConfig = {
            type: 'breakout',
            parameters: {
              channelPeriod: backtestConfig.channelPeriod || 20,
              multiplier: backtestConfig.multiplier || 2
            }
          };
          break;
      }

      // Chuẩn bị cấu hình đầy đủ cho backtest
      const fullConfig = {
        strategy: strategyConfig,
        trading: {
          symbol: backtestConfig.symbol,
          timeframe: backtestConfig.timeframe,
          startDate: backtestConfig.startDate,
          endDate: backtestConfig.endDate,
          startTime: backtestConfig.startTime,
          endTime: backtestConfig.endTime,
          initialCapital: backtestConfig.initialCapital || 10000,
          positionSize: backtestConfig.positionSize || 1
        },
        riskManagement: {
          stopLoss: backtestConfig.stopLoss || 2,
          takeProfit: backtestConfig.takeProfit || 4,
          maxPositions: backtestConfig.maxPositions || 1,
          maxDrawdown: backtestConfig.maxDrawdown || 10,
          trailingStop: backtestConfig.trailingStop || true,
          trailingStopDistance: backtestConfig.trailingStopDistance || 1,
          prioritizeStoploss: backtestConfig.prioritizeStoploss || false,
          useTakeProfit: backtestConfig.useTakeProfit || false
        },
        transaction_costs: {
          maker_fee: backtestConfig.maker_fee ?? 0.1,
          taker_fee: backtestConfig.taker_fee ?? 0.1
        }
      };

      // Lưu experiment vào database
      const { data: experiment, error } = await supabase
        .from('research_experiments')
        .insert([
          {
            name: backtestConfig.name,
            description: backtestConfig.description,
            type: 'backtest',
            status: 'pending',
            config: fullConfig,
            project_id: projectId
          }
        ])
        .select()
        .single();

      if (error) throw error;

      // Gọi API để chạy backtest
      const response = await fetch('/api/research/backtests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          experimentId: experiment.id,
          config: fullConfig
        })
      });

      let result = null;
      if (response.ok) {
        result = await response.json();
        // Nếu có trades, update lại bản ghi với trades
        if (result && result.trades) {
          await supabase
            .from('research_experiments')
            .update({ trades: result.trades })
            .eq('id', experiment.id);
        }
      } else {
        throw new Error('Failed to start backtest');
      }

      // Đóng modal cấu hình backtest
      setShowBacktestConfig(false);

      // Reset form
      setBacktestConfig({
        name: '',
        description: '',
        startDate: format(new Date(), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
        startTime: '00:00',
        endTime: '23:59',
        symbol: 'BTCUSDT',
        timeframe: '1h',
        strategyType: '',
        initialCapital: 10000,
        positionSize: 1,
        stopLoss: 2,
        takeProfit: 4,
        aiRule: '',
        fastPeriod: 10,
        slowPeriod: 20,
        rsiPeriod: 14,
        overbought: 70,
        oversold: 30,
        fastEMA: 12,
        slowEMA: 26,
        signalPeriod: 9,
        bbPeriod: 20,
        bbStdDev: 2,
        channelPeriod: 20,
        multiplier: 2,
        maker_fee: 0.1,
        taker_fee: 0.1,
      });

      toast({
        title: 'Backtest đã được tạo',
        description: 'Backtest đang được chạy trong background. Kết quả sẽ được cập nhật sau khi hoàn thành.',
      });

      // Refresh danh sách experiments
      await fetchExperiments();
    } catch (error) {
      console.error('Error creating backtest experiment:', error);
      toast({
        title: 'Lỗi',
        description: 'Không thể tạo backtest experiment. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setCreatingExperiment(false);
    }
  };

  const createHypothesisExperiment = async () => {
    try {
      setCreatingExperiment(true);
      console.log('📝 Creating hypothesis test experiment:', hypothesisConfig);
      
      const response = await fetch('/api/research/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: hypothesisConfig.name,
          type: 'hypothesis_test',
          description: hypothesisConfig.description,
          config: {
            hypothesis: hypothesisConfig.hypothesis,
            significanceLevel: parseFloat(hypothesisConfig.significanceLevel),
            testType: hypothesisConfig.testType
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ Hypothesis test experiment created:', data);
        await fetchExperiments();
        setShowHypothesisConfig(false);
        toast({ title: 'Thành công', description: 'Đã tạo thí nghiệm kiểm tra giả thuyết thành công!' });
      } else {
        console.error('❌ Failed to create hypothesis test experiment:', data.error);
        toast({ title: 'Lỗi', description: `Lỗi tạo thí nghiệm: ${data.error || 'Không xác định'}`, variant: 'destructive' });
      }
    } catch (error) {
      console.error('❌ Error creating hypothesis test experiment:', error);
      toast({ title: 'Lỗi', description: 'Lỗi kết nối khi tạo thí nghiệm', variant: 'destructive' });
    } finally {
      setCreatingExperiment(false);
    }
  };

  useEffect(() => {
    fetchExperiments();
  }, [projectId]);

  const fetchExperiments = async () => {
    try {
      setLoading(true);
      if (supabase) {
        const { data, error } = await supabase
          .from('research_experiments')
          .select('*')
          .eq('project_id', projectId);

        if (error) {
          console.error('Error fetching experiments:', error);
          if ((error as any).details.includes("does not exist")) {
            setSetupRequired(true);
          } else {
            toast({ title: "Lỗi", description: "Không thể tải danh sách thí nghiệm.", variant: "destructive" });
          }
          setExperiments([]);
        } else {
          setExperiments(data || []);
          setSetupRequired(false);
        }
      }
    } catch (error) {
      console.error('Error fetching experiments:', error);
      toast({ title: "Lỗi", description: "Lỗi kết nối khi tải thí nghiệm.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };
  
  const setupDatabase = async () => {
    setSettingUp(true);
    try {
      // Setup experiments table
      const response = await fetch('/api/research/experiments/setup', { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        // Setup indicators column
        const indicatorsResponse = await fetch('/api/research/setup-indicators', { method: 'POST' });
        const indicatorsData = await indicatorsResponse.json();
        
        if (indicatorsResponse.ok) {
          toast({ title: "Thành công", description: "Setup database và indicators column thành công! Đang tải lại..." });
        } else {
          toast({ title: "Cảnh báo", description: `Setup database thành công nhưng indicators column thất bại: ${indicatorsData.error}`, variant: "destructive" });
        }
        await fetchExperiments();
      } else {
        toast({ title: "Lỗi", description: `Setup database thất bại: ${data.error}`, variant: "destructive" });
      }
    } catch (error) {
      console.error('Error setting up database:', error);
      toast({ title: "Lỗi", description: "Lỗi kết nối khi setup database.", variant: "destructive" });
    } finally {
      setSettingUp(false);
    }
  };

  const viewExperimentDetails = async (experiment: any) => {
    const loadData = async (exp: any) => {
      if (!exp || exp.type !== 'backtest' || !exp.config?.trading) {
        setExperimentChartData([]);
        return;
      }
      setLoadingExperimentChart(true);
      try {
        const { symbol, timeframe, startDate, startTime, endDate, endTime } = exp.config.trading;
        const startTimestamp = new Date(`${startDate}T${startTime || '00:00:00'}`).getTime();
        const endTimestamp = new Date(`${endDate}T${endTime || '23:59:59'}`).getTime();
        const response = await fetch('/api/research/ohlcv', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, timeframe, startTime: startTimestamp, endTime: endTimestamp }),
        });
        if (!response.ok) throw new Error('Failed to fetch OHLCV data');
        const data = await response.json();
        const formattedData = (data.ohlcv || []).map((candle: any) => ({
          timestamp: new Date(candle.timestamp).getTime(),
          open: parseFloat(candle.open),
          high: parseFloat(candle.high),
          low: parseFloat(candle.low),
          close: parseFloat(candle.close),
          volume: parseFloat(candle.volume)
        })).filter((c: OHLCV) => !Object.values(c).some(v => isNaN(v)));
        setExperimentChartData(formattedData);
      } catch (error) {
        console.error('Error loading experiment chart data:', error);
        toast({ title: 'Lỗi', description: 'Không thể tải dữ liệu biểu đồ.', variant: 'destructive' });
        setExperimentChartData([]);
      } finally {
        setLoadingExperimentChart(false);
      }
    };

    try {
      setIsLoadingDetails(true);
      setShowDetails(true);
      const response = await fetch(`/api/research/experiments?id=${experiment.id}`);
      let finalExperiment = experiment;
      if (response.ok) {
        const data = await response.json();
        if (data.experiment) {
          finalExperiment = data.experiment;
        }
      }
      // Nếu có trades ở DB, gán vào results để UI bảng giao dịch lấy đúng nguồn
      if (finalExperiment.trades) {
        if (!finalExperiment.results) finalExperiment.results = {};
        finalExperiment.results.trades = finalExperiment.trades;
      }
      setSelectedExperiment(finalExperiment);
      if (finalExperiment.type === 'backtest') {
        await loadData(finalExperiment);
      }
    } catch (error) {
      console.error('Error fetching details:', error);
      setSelectedExperiment(experiment);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const startExperiment = async (experimentId: string) => {
    try {
      const response = await fetch(`/api/research/experiments?id=${experimentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'running', started_at: new Date().toISOString() })
      });
      if (response.ok) {
        await fetchExperiments();
        toast({ title: "Thành công", description: "Đã bắt đầu thí nghiệm!" });
      } else {
        const error = await response.json();
        toast({ title: "Lỗi", description: `Lỗi khi bắt đầu thí nghiệm: ${error.error || 'Không xác định'}`, variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error starting experiment:', error);
      toast({ title: "Lỗi", description: "Lỗi kết nối khi bắt đầu thí nghiệm", variant: 'destructive' });
    }
  };

  const createMA20Backtest = async () => {
    try {
      setCreatingExperiment(true);
      const response = await fetch('/api/research/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: 'Backtest Chiến lược MA20',
          type: 'backtest',
          description: 'Chiến lược: Mua khi giá đóng cửa vượt MA20, bán khi giá giảm dưới MA20',
          config: {
            strategy: { name: 'MA20 Crossover', type: 'moving_average', parameters: { ma_period: 20, ma_type: 'simple', signal_type: 'crossover' } },
            trading: { symbol: 'BTCUSDT', timeframe: '1h', start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end_date: new Date().toISOString(), initial_capital: 10000, position_size: 0.1, stop_loss: 0.02, take_profit: 0.04 },
            risk_management: { max_positions: 1, max_drawdown: 0.1, trailing_stop: true, trailing_stop_distance: 0.01 }
          }
        })
      });
      const data = await response.json();
      if (response.ok) {
        await fetchExperiments();
        toast({ title: "Thành công", description: "Đã tạo thí nghiệm backtest MA20 thành công!" });
      } else {
        if (data.setup_required) {
          setSetupRequired(true);
          toast({ title: "Cảnh báo", description: "Cần setup database trước khi tạo thí nghiệm.", variant: "destructive" });
        } else {
          toast({ title: "Lỗi", description: `Lỗi tạo thí nghiệm: ${data.error || 'Không xác định'}`, variant: "destructive" });
        }
      }
    } catch (error) {
      console.error('❌ Error creating MA20 backtest:', error);
      toast({ title: "Lỗi", description: "Lỗi kết nối khi tạo thí nghiệm", variant: "destructive" });
    } finally {
      setCreatingExperiment(false);
    }
  };

  const handleCreateExperiment = () => {
    setShowBacktestConfig(true);
  };

  const handleSelectExperimentType = (type: 'backtest' | 'hypothesis_test') => {
    setSelectedExperimentType(type);
    setShowExperimentTypeModal(false);
    if (type === 'backtest') {
      setShowBacktestConfig(true);
    } else {
      setShowHypothesisConfig(true);
    }
  };

  const loadChartData = async () => {
    try {
      setLoadingChart(true);
      const startTimestamp = new Date(`${backtestConfig.startDate}T${backtestConfig.startTime}`).getTime();
      const endTimestamp = new Date(`${backtestConfig.endDate}T${backtestConfig.endTime}`).getTime();
      const response = await fetch('/api/research/ohlcv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: backtestConfig.symbol,
          timeframe: backtestConfig.timeframe,
          startTime: startTimestamp,
          endTime: endTimestamp
        })
      });
      if (!response.ok) throw new Error('Failed to fetch OHLCV data');
      const data = await response.json();
      const formattedData = (data.ohlcv || []).map((candle: any) => ({
        timestamp: new Date(candle.timestamp).getTime(),
        open: parseFloat(candle.open),
        high: parseFloat(candle.high),
        low: parseFloat(candle.low),
        close: parseFloat(candle.close),
        volume: parseFloat(candle.volume)
      })).filter((c: OHLCV) => !Object.values(c).some(v => isNaN(v)));
      setChartData(formattedData);
    } catch (error) {
      console.error('Error loading chart data:', error);
      toast({ title: 'Lỗi', description: 'Lỗi khi tải dữ liệu biểu đồ', variant: 'destructive' });
    } finally {
      setLoadingChart(false);
    }
  };

  // Hàm reset filter
  const resetFilter = () => setFilter({
    fromDate: '',
    toDate: '',
    minTotalReturn: '',
    maxTotalReturn: '',
    minSharpe: '',
    maxSharpe: '',
    minWinrate: '',
    maxWinrate: '',
    minAvgWinNet: '',
    maxAvgWinNet: '',
    minAvgLossNet: '',
    maxAvgLossNet: '',
    status: '',
    type: '',
  });

  // Hàm lọc danh sách
  const filteredExperiments = useMemo(() => {
    return experiments.filter((exp) => {
      // Lọc theo loại thí nghiệm
      if (filter.type && exp.type !== filter.type) return false;
      // Lọc theo trạng thái
      if (filter.status && exp.status !== filter.status) return false;
      // Lọc theo ngày tạo
      if (filter.fromDate && new Date(exp.created_at) < new Date(filter.fromDate)) return false;
      if (filter.toDate && new Date(exp.created_at) > new Date(filter.toDate + 'T23:59:59')) return false;
      // Chỉ filter các trường backtest nếu là backtest và có results
      if (exp.type === 'backtest' && exp.results) {
        const { total_return, sharpe_ratio, win_rate } = exp.results;
        if (filter.minTotalReturn && (total_return === undefined || Number(total_return) < Number(filter.minTotalReturn))) return false;
        if (filter.maxTotalReturn && (total_return === undefined || Number(total_return) > Number(filter.maxTotalReturn))) return false;
        if (filter.minSharpe && (sharpe_ratio === undefined || Number(sharpe_ratio) < Number(filter.minSharpe))) return false;
        if (filter.maxSharpe && (sharpe_ratio === undefined || Number(sharpe_ratio) > Number(filter.maxSharpe))) return false;
        if (filter.minWinrate && (win_rate === undefined || Number(win_rate) < Number(filter.minWinrate))) return false;
        if (filter.maxWinrate && (win_rate === undefined || Number(win_rate) > Number(filter.maxWinrate))) return false;
        
        // Tính toán tỷ lệ lãi/lỗ net trung bình từ dữ liệu thực
        let avgWinNet = 0;
        let avgLossNet = 0;
        
        // Sử dụng dữ liệu thực từ database
        avgWinNet = Number(exp.results?.avg_win_net || 0);
        avgLossNet = Number(exp.results?.avg_loss_net || 0);
        
        // Filter theo tỷ lệ lãi net trung bình
        if (filter.minAvgWinNet && avgWinNet < Number(filter.minAvgWinNet)) return false;
        if (filter.maxAvgWinNet && avgWinNet > Number(filter.maxAvgWinNet)) return false;
        
        // Filter theo tỷ lệ lỗ net trung bình
        if (filter.minAvgLossNet && avgLossNet < Number(filter.minAvgLossNet)) return false;
        if (filter.maxAvgLossNet && avgLossNet > Number(filter.maxAvgLossNet)) return false;
      }
      return true;
    });
  }, [experiments, filter]);

  // Hàm lấy danh sách backtest completed
  const fetchCompletedBacktests = async () => {
    try {
      const response = await fetch(`/api/research/experiments?project_id=${projectId}&type=backtest&status=completed`);
      if (response.ok) {
        const data = await response.json();
        // Nếu API trả về mảng experiments
        setBacktests(data.experiments || []);
      } else {
        setBacktests([]);
      }
    } catch (error) {
      setBacktests([]);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-2">Đang tải experiments...</span>
      </div>
    );
  }

  if (setupRequired) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Database Setup Required
            </CardTitle>
            <CardDescription>
              Bảng experiments chưa được tạo. Cần setup database trước khi sử dụng.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Chức năng Experiments cần bảng <code>research_experiments</code> trong database. 
                Click nút bên dưới để tự động tạo bảng.
              </AlertDescription>
            </Alert>
            
            <div className="flex gap-3">
              <Button 
                onClick={setupDatabase}
                disabled={settingUp}
                className="flex-1"
              >
                {settingUp ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang setup...
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4 mr-2" />
                    Setup Database
                  </>
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={fetchExperiments}
                disabled={settingUp}
              >
                Thử lại
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Danh sách Thí nghiệm ({filteredExperiments.length})</h3>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các thí nghiệm trong project
          </p>
        </div>
        <div className="flex gap-2 relative">
          <Button variant="outline" onClick={fetchExperiments}>
            <Activity className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
          <Button onClick={handleCreateExperiment} disabled={creatingExperiment}>
            {creatingExperiment ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang tạo...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                Tạo thí nghiệm mới
              </>
            )}
          </Button>

          {/* Experiment Type Selection Modal */}
          {showExperimentTypeModal && (
            <Card className="absolute z-50 bg-background border shadow-lg overflow-auto animate-in zoom-in-95 duration-300 max-w-sm max-h-[90vh] top-0 right-0 transform translate-x-[-50%] translate-y-[-50%] fixed left-[50%] top-[50%]">
              <CardHeader>
                <CardTitle>Chọn loại thí nghiệm</CardTitle>
                <CardDescription>
                  Chọn loại thí nghiệm bạn muốn tạo
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card 
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => handleSelectExperimentType('backtest')}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <LineChart className="h-5 w-5" />
                        Backtest Strategy
                      </CardTitle>
                      <CardDescription>
                        Test chiến lược trading trên dữ liệu lịch sử
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2">
                        <li>• Test strategy trên dữ liệu quá khứ</li>
                        <li>• Đánh giá hiệu suất và rủi ro</li>
                        <li>• Tối ưu hóa tham số</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card 
                    className="cursor-pointer hover:border-blue-500 transition-colors"
                    onClick={() => handleSelectExperimentType('hypothesis_test')}
                  >
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TestTube className="h-5 w-5" />
                        Kiểm tra giả thuyết
                      </CardTitle>
                      <CardDescription>
                        Kiểm định các giả thuyết thống kê
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-2">
                        <li>• Kiểm định giả thuyết thống kê</li>
                        <li>• Phân tích mối quan hệ</li>
                        <li>• Đánh giá ý nghĩa thống kê</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setShowExperimentTypeModal(false)}
                  className="w-full"
                >
                  Hủy
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle>Thống kê Thí nghiệm</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{experiments.length}</div>
              <div className="text-sm text-muted-foreground">Tổng thí nghiệm</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {experiments.filter(e => e.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Hoàn thành</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {experiments.filter(e => e.status === 'running').length}
              </div>
              <div className="text-sm text-muted-foreground">Đang chạy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {experiments.filter(e => e.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Chờ</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {experiments.filter(e => e.status === 'failed').length}
              </div>
              <div className="text-sm text-muted-foreground">Lỗi</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bộ lọc danh sách thí nghiệm */}
      <Card className="mb-2">
        <CardContent className="pt-4 pb-2">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <Label htmlFor="type">Loại thí nghiệm</Label>
              <Select value={filter.type || 'all'} onValueChange={v => setFilter(f => ({ ...f, type: v === 'all' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="backtest">Backtest</SelectItem>
                  <SelectItem value="hypothesis_test">Kiểm định</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="status">Trạng thái</Label>
              <Select value={filter.status || 'all'} onValueChange={v => setFilter(f => ({ ...f, status: v === 'all' ? '' : v }))}>
                <SelectTrigger><SelectValue placeholder="Tất cả" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="completed">Hoàn thành</SelectItem>
                  <SelectItem value="running">Đang chạy</SelectItem>
                  <SelectItem value="pending">Chờ</SelectItem>
                  <SelectItem value="failed">Lỗi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="fromDate">Từ ngày</Label>
              <Input id="fromDate" type="date" value={filter.fromDate} onChange={e => setFilter(f => ({ ...f, fromDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="toDate">Đến ngày</Label>
              <Input id="toDate" type="date" value={filter.toDate} onChange={e => setFilter(f => ({ ...f, toDate: e.target.value }))} />
            </div>
            <div>
              <Label htmlFor="minTotalReturn">Lợi nhuận (%)</Label>
              <div className="flex gap-1">
                <Input id="minTotalReturn" type="number" step="0.01" min="-100" max="1000" placeholder="Từ" value={filter.minTotalReturn} onChange={e => setFilter(f => ({ ...f, minTotalReturn: e.target.value }))} />
                <Input id="maxTotalReturn" type="number" step="0.01" min="-100" max="1000" placeholder="Đến" value={filter.maxTotalReturn} onChange={e => setFilter(f => ({ ...f, maxTotalReturn: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="minSharpe">Sharpe Ratio</Label>
              <div className="flex gap-1">
                <Input id="minSharpe" type="number" step="0.01" placeholder="Từ" value={filter.minSharpe} onChange={e => setFilter(f => ({ ...f, minSharpe: e.target.value }))} />
                <Input id="maxSharpe" type="number" step="0.01" placeholder="Đến" value={filter.maxSharpe} onChange={e => setFilter(f => ({ ...f, maxSharpe: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="minWinrate">Winrate (%)</Label>
              <div className="flex gap-1">
                <Input id="minWinrate" type="number" step="0.1" min="0" max="100" placeholder="Từ" value={filter.minWinrate} onChange={e => setFilter(f => ({ ...f, minWinrate: e.target.value }))} />
                <Input id="maxWinrate" type="number" step="0.1" min="0" max="100" placeholder="Đến" value={filter.maxWinrate} onChange={e => setFilter(f => ({ ...f, maxWinrate: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="minAvgWinNet">Tỷ lệ lãi net TB (%)</Label>
              <div className="flex gap-1">
                <Input id="minAvgWinNet" type="number" step="0.01" min="0" max="50" placeholder="Từ" value={filter.minAvgWinNet} onChange={e => setFilter(f => ({ ...f, minAvgWinNet: e.target.value }))} />
                <Input id="maxAvgWinNet" type="number" step="0.01" min="0" max="50" placeholder="Đến" value={filter.maxAvgWinNet} onChange={e => setFilter(f => ({ ...f, maxAvgWinNet: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label htmlFor="minAvgLossNet">Tỷ lệ lỗ net TB (%)</Label>
              <div className="flex gap-1">
                <Input id="minAvgLossNet" type="number" step="0.01" min="-50" max="0" placeholder="Từ" value={filter.minAvgLossNet} onChange={e => setFilter(f => ({ ...f, minAvgLossNet: e.target.value }))} />
                <Input id="maxAvgLossNet" type="number" step="0.01" min="-50" max="0" placeholder="Đến" value={filter.maxAvgLossNet} onChange={e => setFilter(f => ({ ...f, maxAvgLossNet: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <Button variant="outline" type="button" onClick={resetFilter}>Reset</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Backtest Configuration Modal */}
      <Dialog open={showBacktestConfig} onOpenChange={setShowBacktestConfig}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-6xl">
          <DialogHeader>
            <DialogTitle>Cấu hình Backtest</DialogTitle>
            <DialogDescription>
              Thiết lập các tham số cho thí nghiệm backtest
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-6 -mr-6">
            {/* Phần 1: Biểu đồ nến */}
            <div className="space-y-4">
              <div className="border rounded-lg p-4 h-[400px] flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">BTC/USDT</h3>
                </div>
                <div className="h-full">
                  {loadingChart ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="ml-2 text-sm">Đang tải dữ liệu...</span>
                    </div>
                  ) : chartData.length > 0 ? (
                    <div className="w-full h-full">
                      <HighchartsReact
                        highcharts={Highcharts}
                        options={{
                          chart: {
                            height: 350,
                            style: {
                              fontFamily: 'inherit'
                            },
                            spacing: [5, 5, 5, 5],
                            backgroundColor: 'transparent'
                          },
                          title: {
                            text: undefined
                          },
                          xAxis: {
                            type: 'datetime',
                            labels: {
                              style: {
                                fontSize: '10px',
                                color: '#888888'
                              }
                            },
                            lineColor: '#2e2e2e',
                            tickColor: '#2e2e2e'
                          },
                          yAxis: {
                            title: {
                              text: 'Price',
                              style: {
                                color: '#888888'
                              }
                            },
                            labels: {
                              style: {
                                fontSize: '10px',
                                color: '#888888'
                              }
                            },
                            gridLineColor: '#2e2e2e'
                          },
                          plotOptions: {
                            line: {
                              color: '#22c55e',
                              lineWidth: 1.5
                            }
                          },
                          series: [{
                            name: 'Close Price',
                            type: 'line',
                            data: chartData.map(candle => [
                              candle.timestamp,
                              candle.close
                            ]),
                            color: '#3b82f6',
                            lineWidth: 1,
                            marker: {
                              enabled: false
                            }
                          }],
                          tooltip: {
                            xDateFormat: '%Y-%m-%d %H:%M:%S',
                            valueDecimals: 2
                          },
                          legend: {
                            enabled: false
                          },
                          credits: {
                            enabled: false
                          }
                        }}
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Dữ liệu đã tải: {chartData.length} nến
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                      Chọn khoảng thời gian và nhấn "Tải dữ liệu" để xem biểu đồ
                    </div>
                  )}
                </div>
              </div>
            </div>

                  {/* Bảng preview dữ liệu 5 dòng đầu */}
      {chartData && chartData.length > 0 && (
        <div className="mt-4 mb-4">
          <h4 className="font-semibold text-sm mb-2">5 dòng dữ liệu đầu tiên (Timeframe: {backtestConfig.timeframe})</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs border">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="p-2 text-left">Time</th>
                  <th className="p-2 text-right">Open</th>
                  <th className="p-2 text-right">High</th>
                  <th className="p-2 text-right">Low</th>
                  <th className="p-2 text-right">Close</th>
                  <th className="p-2 text-right">Volume</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Lấy dữ liệu đã được gộp theo timeframe
                  const previewData = chartData || [];
                  return previewData.slice(0, 5).map((row: any, idx: number) => {
                    let timeStr = 'N/A';
                    const timestamp = row.timestamp || row.open_time;
                    if (timestamp) {
                      const d = new Date(typeof timestamp === 'number' ? timestamp : timestamp);
                      // Format theo timeframe
                      const hours = d.getHours();
                      const minutes = d.getMinutes();
                      const date = d.toLocaleDateString('vi-VN');
                      
                      switch(backtestConfig.timeframe) {
                        case '1d':
                          timeStr = date;
                          break;
                        case '4h':
                          // Làm tròn xuống 4 giờ gần nhất
                          const hour4h = Math.floor(hours / 4) * 4;
                          timeStr = `${String(hour4h).padStart(2, '0')}:00 ${date}`;
                          break;
                        case '1h':
                          // Hiển thị đúng giờ, phút luôn là 00
                          timeStr = `${String(hours).padStart(2, '0')}:00 ${date}`;
                          break;
                        default:
                          // Cho các timeframe nhỏ hơn 1h, hiển thị cả giờ và phút
                          timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${date}`;
                      }
                    }
                    return (
                      <tr key={idx} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono text-xs">{timeStr}</td>
                        <td className="p-2 text-right font-mono">{(row.open_price || row.open)?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono">{(row.high_price || row.high)?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono">{(row.low_price || row.low)?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono font-medium">{(row.close_price || row.close)?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-mono">{row.volume?.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

            {/* Phần 2: Các tab */}
            <div className="space-y-4">
              <Tabs defaultValue="data" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="data">Cấu hình dữ liệu</TabsTrigger>
                  <TabsTrigger value="config">Cấu hình backtest</TabsTrigger>
                </TabsList>
                <TabsContent value="data" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Thời gian bắt đầu</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="date"
                          value={backtestConfig.startDate}
                          onChange={(e) => handleBacktestConfigChange('startDate', e.target.value)}
                          className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                        />
                        <Input 
                          type="time"
                          value={backtestConfig.startTime}
                          onChange={(e) => handleBacktestConfigChange('startTime', e.target.value)}
                          className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Thời gian kết thúc</Label>
                      <div className="flex gap-2">
                        <Input 
                          type="date"
                          value={backtestConfig.endDate}
                          onChange={(e) => handleBacktestConfigChange('endDate', e.target.value)}
                          className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                        />
                        <Input 
                          type="time"
                          value={backtestConfig.endTime}
                          onChange={(e) => handleBacktestConfigChange('endTime', e.target.value)}
                          className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Timeframe</Label>
                      <Select 
                        value={backtestConfig.timeframe}
                        onValueChange={(value) => handleBacktestConfigChange('timeframe', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn timeframe" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1m">1 phút</SelectItem>
                          <SelectItem value="5m">5 phút</SelectItem>
                          <SelectItem value="15m">15 phút</SelectItem>
                          <SelectItem value="30m">30 phút</SelectItem>
                          <SelectItem value="1h">1 giờ</SelectItem>
                          <SelectItem value="4h">4 giờ</SelectItem>
                          <SelectItem value="1d">1 ngày</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cặp giao dịch</Label>
                      <Select 
                        value={backtestConfig.symbol}
                        onValueChange={(value) => handleBacktestConfigChange('symbol', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn cặp giao dịch" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="BTCUSDT">BTC/USDT</SelectItem>
                          <SelectItem value="ETHUSDT">ETH/USDT</SelectItem>
                          <SelectItem value="BNBUSDT">BNB/USDT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button 
                      variant="outline"
                      onClick={loadChartData}
                      disabled={loadingChart}
                    >
                      {loadingChart ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Đang tải...
                        </>
                      ) : (
                        <>
                          <Clock className="h-4 w-4 mr-2" />
                          Tải dữ liệu
                        </>
                      )}
                    </Button>
                  </div>
                </TabsContent>
                <TabsContent value="config" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Tên thí nghiệm</Label>
                      <Input 
                        placeholder="Nhập tên thí nghiệm" 
                        value={backtestConfig.name}
                        onChange={(e) => handleBacktestConfigChange('name', e.target.value)}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Input 
                        placeholder="Nhập mô tả" 
                        value={backtestConfig.description}
                        onChange={(e) => handleBacktestConfigChange('description', e.target.value)}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    {/* BỎ 2 mục ngày bắt đầu, ngày kết thúc ở đây */}
                    {/* Thêm dropdown chọn chiến lược */}
                    <div className="space-y-2 col-span-2">
                      <Label>Chọn chiến lược</Label>
                      <Select
                        value={backtestConfig.strategyType || ''}
                        onValueChange={value => handleBacktestConfigChange('strategyType', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn chiến lược backtest" />
                        </SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 text-xs text-muted-foreground">Chiến lược cơ bản</div>
                          <SelectItem value="ma_crossover">Moving Average Crossover</SelectItem>
                          <SelectItem value="macd">MACD</SelectItem>
                          <SelectItem value="rsi">RSI</SelectItem>
                          <SelectItem value="bollinger_bands">Bollinger Bands</SelectItem>
                          <SelectItem value="breakout">Breakout</SelectItem>
                          <div className="px-2 py-1 text-xs text-muted-foreground">Chiến lược nâng cao (AI)</div>
                          {/* Lấy danh sách model đã train từ models */}
                          {models.filter((m: any) => m.status === 'completed').map((m: any) => (
                            <SelectItem key={m.id} value={`ai_${m.id}`}>{`AI Model: ${m.name}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Cấu hình cho từng chiến lược */}
                    {backtestConfig.strategyType === 'ma_crossover' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Chu kỳ MA nhanh</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.fastPeriod || 10}
                            onChange={(e) => handleBacktestConfigChange('fastPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Chu kỳ MA chậm</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.slowPeriod || 20}
                            onChange={(e) => handleBacktestConfigChange('slowPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    )}

                    {backtestConfig.strategyType === 'rsi' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Chu kỳ RSI</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.rsiPeriod || 14}
                            onChange={(e) => handleBacktestConfigChange('rsiPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ngưỡng quá mua</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={backtestConfig.overbought || 70}
                            onChange={(e) => handleBacktestConfigChange('overbought', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Ngưỡng quá bán</Label>
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            value={backtestConfig.oversold || 30}
                            onChange={(e) => handleBacktestConfigChange('oversold', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    )}

                    {backtestConfig.strategyType === 'macd' && (
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>EMA nhanh</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.fastEMA || 12}
                            onChange={(e) => handleBacktestConfigChange('fastEMA', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>EMA chậm</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.slowEMA || 26}
                            onChange={(e) => handleBacktestConfigChange('slowEMA', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Chu kỳ tín hiệu</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.signalPeriod || 9}
                            onChange={(e) => handleBacktestConfigChange('signalPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    )}

                    {backtestConfig.strategyType === 'bollinger_bands' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Chu kỳ</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.bbPeriod || 20}
                            onChange={(e) => handleBacktestConfigChange('bbPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Độ lệch chuẩn</Label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={backtestConfig.bbStdDev || 2}
                            onChange={(e) => handleBacktestConfigChange('bbStdDev', parseFloat(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    )}

                    {backtestConfig.strategyType === 'breakout' && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Chu kỳ kênh giá</Label>
                          <Input
                            type="number"
                            min="1"
                            value={backtestConfig.channelPeriod || 20}
                            onChange={(e) => handleBacktestConfigChange('channelPeriod', parseInt(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hệ số nhân</Label>
                          <Input
                            type="number"
                            min="0.1"
                            step="0.1"
                            value={backtestConfig.multiplier || 2}
                            onChange={(e) => handleBacktestConfigChange('multiplier', parseFloat(e.target.value))}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    )}
                    {/* Thêm ô nhập rule giao dịch */}
                    {backtestConfig.strategyType && backtestConfig.strategyType.startsWith('ai_') && (
                      <div className="space-y-2 col-span-2">
                        <Label>Rule giao dịch AI Model</Label>
                        <Textarea
                          placeholder="Nhập rule giao dịch cho AI model (ví dụ: Mua khi dự báo tăng > 0.7, bán khi dự báo giảm > 0.7)"
                          value={backtestConfig.aiRule || ''}
                          onChange={e => handleBacktestConfigChange('aiRule', e.target.value)}
                          className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                        />
                      </div>
                    )}
                    {/* Các trường còn lại */}
                    <div className="space-y-2">
                      <Label>Vốn ban đầu</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.initialCapital}
                        onChange={(e) => handleBacktestConfigChange('initialCapital', Number(e.target.value))}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kích thước vị thế (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.positionSize}
                        onChange={(e) => handleBacktestConfigChange('positionSize', Number(e.target.value))}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stop Loss (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.stopLoss}
                        onChange={(e) => handleBacktestConfigChange('stopLoss', Number(e.target.value))}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Take Profit (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.takeProfit}
                        onChange={(e) => handleBacktestConfigChange('takeProfit', Number(e.target.value))}
                        className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={backtestConfig.prioritizeStoploss || false}
                          onChange={(e) => handleBacktestConfigChange('prioritizeStoploss', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>Ưu tiên bán theo stoploss</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Khi bật: Stoploss (ưu tiên 1) → Sell Signal (ưu tiên 2) → Take Profit (ưu tiên 3)
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={backtestConfig.useTakeProfit || false}
                          onChange={(e) => handleBacktestConfigChange('useTakeProfit', e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <span>Sử dụng Take Profit</span>
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Khi bật: Take Profit sẽ được sử dụng làm ưu tiên số 3. Khi tắt: chỉ có Stoploss và Sell Signal
                      </p>
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label>
                        <input
                          type="checkbox"
                          checked={useDefaultFee}
                          onChange={e => {
                            setUseDefaultFee(e.target.checked);
                            setBacktestConfig(prev => ({
                              ...prev,
                              maker_fee: e.target.checked ? 0.1 : prev.maker_fee,
                              taker_fee: e.target.checked ? 0.1 : prev.taker_fee
                            }));
                          }}
                          className="mr-2"
                        />
                        Sử dụng phí giao dịch mặc định (Maker/Taker: 0.1%)
                      </Label>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Maker fee (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={backtestConfig.maker_fee}
                            disabled={useDefaultFee}
                            onChange={e => handleFeeChange('maker_fee', e.target.value)}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Taker fee (%)</Label>
                          <Input
                            type="number"
                            min="0"
                            step="0.0001"
                            value={backtestConfig.taker_fee}
                            disabled={useDefaultFee}
                            onChange={e => handleFeeChange('taker_fee', e.target.value)}
                            className="border border-input bg-background px-3 py-2 text-sm text-black font-normal"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="script" className="space-y-4">
                  <div className="h-[300px] border rounded-lg p-4 flex flex-col">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Python Script</h3>
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            alert('Đã lưu script!');
                          }}
                        >
                          <Save className="h-4 w-4 mr-2" />
                          Lưu script
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      className="flex-1 font-mono text-sm resize-none"
                      placeholder="Paste hoặc viết code Python backtest ở đây..."
                      value={pythonScript}
                      onChange={e => setPythonScript(e.target.value)}
                      style={{ minHeight: 200, maxHeight: 220 }}
                    />
                  </div>
                </TabsContent>
                <TabsContent value="results" className="space-y-4">
                  <div className="h-[300px] border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Kết quả Backtest</h3>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Tải kết quả
                        </Button>
                      </div>
                    </div>
                    <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                      {backtestResult ? (
                        <pre className="text-xs text-left w-full h-full overflow-auto">{JSON.stringify(backtestResult, null, 2)}</pre>
                      ) : (
                        'Kết quả backtest sẽ được hiển thị ở đây'
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => setShowBacktestConfig(false)}>
              Hủy
            </Button>
            <Button onClick={createBacktestExperiment} disabled={creatingExperiment}>
              {creatingExperiment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Chạy backtest
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Hypothesis Test Configuration Modal */}
      {showHypothesisConfig && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto animate-in scale-x-95 duration-300 max-w-4xl max-h-[90vh]">
          <CardHeader>
            <CardTitle>Cấu hình Kiểm tra giả thuyết</CardTitle>
            <CardDescription>
              Thiết lập các tham số cho thí nghiệm kiểm tra giả thuyết
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tên thí nghiệm</Label>
                <Input 
                  placeholder="Nhập tên thí nghiệm" 
                  value={hypothesisConfig.name}
                  onChange={(e) => handleHypothesisConfigChange('name', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mô tả</Label>
                <Input 
                  placeholder="Nhập mô tả" 
                  value={hypothesisConfig.description}
                  onChange={(e) => handleHypothesisConfigChange('description', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Giả thuyết</Label>
                <Textarea 
                  placeholder="Nhập giả thuyết cần kiểm tra" 
                  value={hypothesisConfig.hypothesis}
                  onChange={(e) => handleHypothesisConfigChange('hypothesis', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Mức ý nghĩa</Label>
                <Select 
                  value={hypothesisConfig.significanceLevel}
                  onValueChange={(value) => handleHypothesisConfigChange('significanceLevel', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn mức ý nghĩa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0.01">0.01 (1%)</SelectItem>
                    <SelectItem value="0.05">0.05 (5%)</SelectItem>
                    <SelectItem value="0.1">0.1 (10%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Loại kiểm định</Label>
                <Select 
                  value={hypothesisConfig.testType}
                  onValueChange={(value) => handleHypothesisConfigChange('testType', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn loại kiểm định" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="t-test">T-test</SelectItem>
                    <SelectItem value="z-test">Z-test</SelectItem>
                    <SelectItem value="chi-square">Chi-square</SelectItem>
                    <SelectItem value="anova">ANOVA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowHypothesisConfig(false)}
              className="flex-1"
            >
              Hủy
            </Button>
            <Button 
              onClick={createHypothesisExperiment}
              disabled={creatingExperiment}
              className="flex-1"
            >
              {creatingExperiment ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang tạo...
                </>
              ) : (
                'Tạo thí nghiệm'
              )}
            </Button>
          </CardFooter>
        </Card>
      )}

      {experiments.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Thí nghiệm Trading & Research</CardTitle>
            <CardDescription>Test strategies, phân tích rủi ro và tối ưu hóa portfolio</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Chưa có thí nghiệm nào</h3>
              <p className="text-muted-foreground mb-4">
                Bắt đầu với một template có sẵn hoặc tự tạo experiment
              </p>
              <div className="flex flex-col gap-2 max-w-sm mx-auto">
                <Button 
                  onClick={createMA20Backtest}
                  disabled={creatingExperiment}
                  className="w-full"
                >
                  {creatingExperiment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <LineChart className="h-4 w-4 mr-2" />
                      Tạo Backtest MA20
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleCreateExperiment}
                  disabled={creatingExperiment}
                  variant="outline"
                  className="w-full"
                >
                  {creatingExperiment ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang tạo...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo thí nghiệm tùy chỉnh
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredExperiments.map((experiment) => (
            <Card key={experiment.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold truncate">{experiment.name}</CardTitle>
                        <Badge variant="outline" className="capitalize text-xs">
                          {experiment.type === 'backtest' ? 'Backtest' :
                           experiment.type === 'hypothesis_test' ? 'Kiểm định' : experiment.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Hiển thị mô tả nếu có */}
                {experiment.description && (
                  <div className="mb-4">
                    <p className="text-sm text-muted-foreground line-clamp-2">{experiment.description}</p>
                  </div>
                )}

                {/* Hiển thị chỉ số backtest nếu có kết quả */}
                {experiment.status === 'completed' && experiment.results && experiment.type === 'backtest' && (
                  <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                    <h4 className="text-sm font-medium mb-2 text-foreground">Kết quả Backtest</h4>
                    <div className="grid grid-cols-5 gap-2 text-xs">
                      {experiment.results.total_trades !== undefined && (
                        <div className="text-center">
                          <div className="font-semibold text-blue-600" title="Số lượng Trade: Tổng số giao dịch đã thực hiện">
                            {experiment.results.total_trades}
                          </div>
                          <div className="text-muted-foreground">Số lượng Trade</div>
                        </div>
                      )}
                      {experiment.results.win_rate !== undefined && (
                        <div className="text-center">
                          <div className="font-semibold text-purple-600" title="Winrate: Tỷ lệ giao dịch thắng">
                            {experiment.results.win_rate?.toFixed(1)}%
                          </div>
                          <div className="text-muted-foreground">Winrate</div>
                        </div>
                      )}
                      {(() => {
                        let avgWinNet = 0;
                        let avgLossNet = 0;
                        
                        // Sử dụng dữ liệu thực từ database
                        avgWinNet = Number(experiment.results?.avg_win_net || 0);
                        avgLossNet = Number(experiment.results?.avg_loss_net || 0);
                        
                        return (
                          <>
                            <div className="text-center">
                              <div className="font-semibold text-green-600" title="Tỷ lệ lãi net trung bình: Lãi trung bình sau khi đã trừ chi phí">
                                {avgWinNet.toFixed(2)}%
                              </div>
                              <div className="text-muted-foreground">Tỷ lệ lãi net trung bình</div>
                            </div>
                            <div className="text-center">
                              <div className="font-semibold text-red-600" title="Tỷ lệ lỗ net trung bình: Lỗ trung bình sau khi đã trừ chi phí">
                                {Math.abs(avgLossNet).toFixed(2)}%
                              </div>
                              <div className="text-muted-foreground">Tỷ lệ lỗ net trung bình</div>
                            </div>
                          </>
                        );
                      })()}
                      {experiment.results.total_return !== undefined && (
                        <div className="text-center">
                          <div className={`font-semibold ${
                            experiment.results.total_return >= 0 ? 'text-green-600' : 'text-red-600'
                          }`} title="Tổng lợi nhuận: Chỉ số này cho thấy hiệu suất tổng thể của chiến lược">
                            {experiment.results.total_return >= 0 ? '+' : ''}{experiment.results.total_return?.toFixed(2)}%
                          </div>
                          <div className="text-muted-foreground">Tổng lợi nhuận</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Hiển thị thông tin chiến lược nếu có */}
                {experiment.config?.strategy && experiment.type === 'backtest' && (
                  <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200 dark:border-blue-800">
                    <div className="text-xs text-blue-700 dark:text-blue-300 font-medium mb-1">
                      Chiến lược: {experiment.config.strategy.type || 'N/A'}
                    </div>
                    {experiment.config.trading && (
                      <div className="text-xs text-blue-600 dark:text-blue-400">
                        {experiment.config.trading.symbol} • {experiment.config.trading.timeframe}
                      </div>
                    )}
                  </div>
                )}

                {/* Hiển thị thông tin thời gian */}
                <div className="text-xs text-muted-foreground mb-4">
                  Tạo lúc: {new Date(experiment.created_at).toLocaleString('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => {
                      console.log('🔍 [Button Click] View details clicked for experiment:', experiment);
                      viewExperimentDetails(experiment);
                    }}
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    Chi tiết
                  </Button>
                  {experiment.status === 'pending' && (
                    <Button 
                      size="sm" 
                      variant="default"
                      className="flex-1"
                      onClick={() => startExperiment(experiment.id)}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      Bắt đầu
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Quick Stats */}

      {/* Experiment Details Modal */}
      {selectedExperiment && (
        <Dialog open={showDetails} onOpenChange={(open) => {
          if (!open) {
            setShowDetails(false);
            setSelectedExperiment(null);
            setExperimentChartData([]); // Reset data chart
          }
        }}>
        <DialogContent className="max-h-[90vh] flex flex-col max-w-6xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Chi tiết thí nghiệm: {selectedExperiment?.name}
                  {isLoadingDetails && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Xem và quản lý chi tiết thí nghiệm
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => selectedExperiment && viewExperimentDetails(selectedExperiment)}
                  disabled={isLoadingDetails}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {isLoadingDetails ? 'Đang tải...' : 'Refresh'}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    if (!selectedExperiment) return;
                    try {
                      const response = await fetch(`/api/research/debug-indicators?experiment_id=${selectedExperiment.id}`);
                      const data = await response.json();
                      console.log('🔍 Debug Indicators Data:', data);
                      alert(`Debug data logged to console. Check browser console for details.\n\nExperiment: ${data.experiment?.name}\nHas Indicators: ${data.experiment?.hasIndicators}\nKeys: ${data.experiment?.indicatorsKeys?.join(', ')}`);
                    } catch (error) {
                      console.error('Debug error:', error);
                      alert('Error debugging indicators');
                    }
                  }}
                >
                  <Bug className="h-4 w-4 mr-2" />
                  Debug
                </Button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-6 pr-6 -mr-6">
            <div>
              {selectedExperiment.type === 'backtest' ? (
                <>
                  <div className="border rounded-lg p-4 h-[400px] flex flex-col justify-center">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-semibold">{selectedExperiment.config?.trading?.symbol || 'Symbol'}</h3>
                    </div>
                    <div className="h-full">
                      {loadingExperimentChart ? (
                        <div className="flex items-center justify-center h-full">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                          <span className="ml-2 text-sm">Đang tải dữ liệu biểu đồ...</span>
                        </div>
                      ) : experimentChartData.length > 0 ? (
                        (() => {
                          // Lấy trades từ kết quả backtest nếu có
                          let tradeMarkers: any[] = [];
                          if (selectedExperiment.results && Array.isArray(selectedExperiment.results.trades)) {
                            tradeMarkers = selectedExperiment.results.trades.flatMap((trade: any, idx: number) => {
                              const markers = [];
                              if (trade.entry_time && trade.entry_price) {
                                markers.push({
                                  x: new Date(trade.entry_time).getTime(),
                                  y: Number(trade.entry_price),
                                  marker: {
                                    symbol: 'triangle',
                                    fillColor: '#22c55e',
                                    lineColor: '#22c55e',
                                    radius: 6
                                  },
                                  title: { text: 'Mua', style: { color: '#22c55e', fontWeight: 'bold' } },
                                  side: trade.side || trade.type || 'buy',
                                  tradeIdx: idx,
                                  type: 'buy'
                                });
                              }
                              if (trade.exit_time && trade.exit_price) {
                                markers.push({
                                  x: new Date(trade.exit_time).getTime(),
                                  y: Number(trade.exit_price),
                                  marker: {
                                    symbol: 'triangle-down',
                                    fillColor: '#ef4444',
                                    lineColor: '#ef4444',
                                    radius: 6
                                  },
                                  title: { text: 'Bán', style: { color: '#ef4444', fontWeight: 'bold' } },
                                  side: trade.side || trade.type || 'sell',
                                  tradeIdx: idx,
                                  type: 'sell'
                                });
                              }
                              return markers;
                            });
                          }

                          // Chuẩn bị series cho chart
                          const series: any[] = [
                            {
                              name: 'Close Price',
                              type: 'line',
                              data: experimentChartData.map(candle => [candle.timestamp, candle.close]),
                              color: '#3b82f6',
                              lineWidth: 1,
                              marker: { enabled: false }
                            }
                          ];

                          // Thêm indicators dựa trên loại chiến lược
                          const strategyType = selectedExperiment.config?.strategy?.type || selectedExperiment.config?.strategyType;
                          const indicators = selectedExperiment.indicators;

                          // Debug logging
                          console.log('🔍 Debug indicators:', {
                            strategyType,
                            config: selectedExperiment.config,
                            configKeys: selectedExperiment.config ? Object.keys(selectedExperiment.config) : [],
                            strategyConfig: selectedExperiment.config?.strategy,
                            strategyTypeFromStrategy: selectedExperiment.config?.strategy?.type,
                            strategyTypeFromConfig: selectedExperiment.config?.strategyType,
                            indicators,
                            hasIndicators: !!indicators,
                            indicatorsKeys: indicators ? Object.keys(indicators) : [],
                            experimentId: selectedExperiment.id,
                            experimentType: selectedExperiment.type
                          });

                          // Test: Thêm indicators mẫu nếu không có dữ liệu thực
                          if (!indicators && experimentChartData.length > 0) {
                            console.log('🔍 Adding sample indicators for testing');
                            const sampleTimestamps = experimentChartData.map(candle => candle.timestamp);
                            const samplePrices = experimentChartData.map(candle => candle.close);
                            
                            // Tạo RSI mẫu
                            const sampleRSI = samplePrices.map((price, idx) => {
                              if (idx < 14) return null;
                              const recentPrices = samplePrices.slice(idx - 14, idx + 1);
                              const gains = recentPrices.map((p, i) => i > 0 ? Math.max(0, p - recentPrices[i-1]) : 0);
                              const losses = recentPrices.map((p, i) => i > 0 ? Math.max(0, recentPrices[i-1] - p) : 0);
                              const avgGain = gains.reduce((a, b) => a + b, 0) / 14;
                              const avgLoss = losses.reduce((a, b) => a + b, 0) / 14;
                              return avgLoss === 0 ? 100 : 100 - (100 / (1 + avgGain / avgLoss));
                            });
                            
                            series.push({
                              name: 'Sample RSI',
                              type: 'line',
                              data: sampleTimestamps.map((ts, idx) => [ts, sampleRSI[idx]]).filter(item => item[1] !== null),
                              color: '#f59e0b',
                              lineWidth: 1,
                              marker: { enabled: false },
                              yAxis: 1
                            });
                          }

                          if (indicators && strategyType) {
                            if (strategyType === 'rsi' && indicators.rsi) {
                              // Lọc bỏ các giá trị null/undefined
                              const validData = indicators.timestamps.map((ts: number, idx: number) => {
                                const rsiValue = indicators.rsi[idx];
                                return rsiValue !== null && rsiValue !== undefined ? [ts, rsiValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              // Thêm RSI vào chart riêng biệt
                              series.push({
                                name: 'RSI',
                                type: 'line',
                                data: validData,
                                color: '#f59e0b',
                                lineWidth: 1,
                                marker: { enabled: false },
                                yAxis: 1
                              });
                              
                              // Thêm đường ngưỡng overbought (70)
                              series.push({
                                name: 'Overbought (70)',
                                type: 'line',
                                data: indicators.timestamps.map((ts: number) => [ts, 70]),
                                color: '#ef4444',
                                lineWidth: 1,
                                marker: { enabled: false },
                                yAxis: 1,
                                dashStyle: 'dash'
                              });
                              
                              // Thêm đường ngưỡng oversold (30)
                              series.push({
                                name: 'Oversold (30)',
                                type: 'line',
                                data: indicators.timestamps.map((ts: number) => [ts, 30]),
                                color: '#10b981',
                                lineWidth: 1,
                                marker: { enabled: false },
                                yAxis: 1,
                                dashStyle: 'dash'
                              });
                            } else if (strategyType === 'macd' && indicators.macd) {
                              // Lọc bỏ các giá trị null/undefined cho MACD
                              const macdData = indicators.timestamps.map((ts: number, idx: number) => {
                                const macdValue = indicators.macd[idx];
                                return macdValue !== null && macdValue !== undefined ? [ts, macdValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              const signalData = indicators.timestamps.map((ts: number, idx: number) => {
                                const signalValue = indicators.signal[idx];
                                return signalValue !== null && signalValue !== undefined ? [ts, signalValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              const histogramData = indicators.timestamps.map((ts: number, idx: number) => {
                                const histogramValue = indicators.histogram[idx];
                                return histogramValue !== null && histogramValue !== undefined ? [ts, histogramValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              // Thêm MACD vào chart riêng biệt
                              series.push(
                                {
                                  name: 'MACD',
                                  type: 'line',
                                  data: macdData,
                                  color: '#3b82f6',
                                  lineWidth: 1,
                                  marker: { enabled: false },
                                  yAxis: 1
                                },
                                {
                                  name: 'Signal',
                                  type: 'line',
                                  data: signalData,
                                  color: '#ef4444',
                                  lineWidth: 1,
                                  marker: { enabled: false },
                                  yAxis: 1
                                },
                                {
                                  name: 'Histogram',
                                  type: 'column',
                                  data: histogramData,
                                  color: '#10b981',
                                  yAxis: 1
                                }
                              );
                              
                              // Thêm đường zero cho MACD
                              series.push({
                                name: 'Zero Line',
                                type: 'line',
                                data: indicators.timestamps.map((ts: number) => [ts, 0]),
                                color: '#888888',
                                lineWidth: 1,
                                marker: { enabled: false },
                                yAxis: 1,
                                dashStyle: 'dash'
                              });
                            } else if (strategyType === 'ma_crossover' && indicators.fast_ma) {
                              // Lọc bỏ các giá trị null/undefined cho MA
                              const fastMaData = indicators.timestamps.map((ts: number, idx: number) => {
                                const fastMaValue = indicators.fast_ma[idx];
                                return fastMaValue !== null && fastMaValue !== undefined ? [ts, fastMaValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              const slowMaData = indicators.timestamps.map((ts: number, idx: number) => {
                                const slowMaValue = indicators.slow_ma[idx];
                                return slowMaValue !== null && slowMaValue !== undefined ? [ts, slowMaValue] : null;
                              }).filter((item: any) => item !== null);
                              
                              // Thêm Moving Averages vào cùng chart với giá
                              series.push(
                                {
                                  name: 'Fast MA',
                                  type: 'line',
                                  data: fastMaData,
                                  color: '#f59e0b',
                                  lineWidth: 1,
                                  marker: { enabled: false }
                                },
                                {
                                  name: 'Slow MA',
                                  type: 'line',
                                  data: slowMaData,
                                  color: '#8b5cf6',
                                  lineWidth: 1,
                                  marker: { enabled: false }
                                }
                              );
                            } else if (strategyType === 'bollinger_bands' && indicators.upper) {
                              // Thêm Bollinger Bands vào cùng chart với giá
                              series.push(
                                {
                                  name: 'Upper Band',
                                  type: 'line',
                                  data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.upper[idx]]),
                                  color: '#ef4444',
                                  lineWidth: 1,
                                  marker: { enabled: false }
                                },
                                {
                                  name: 'Middle Band',
                                  type: 'line',
                                  data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.middle[idx]]),
                                  color: '#f59e0b',
                                  lineWidth: 1,
                                  marker: { enabled: false }
                                },
                                {
                                  name: 'Lower Band',
                                  type: 'line',
                                  data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.lower[idx]]),
                                  color: '#10b981',
                                  lineWidth: 1,
                                  marker: { enabled: false }
                                }
                              );
                            } else if (indicators) {
                              // Fallback: hiển thị indicators ngay cả khi không có strategyType
                              console.log('🔍 Fallback: Hiển thị indicators không có strategyType');
                              console.log('🔍 Indicators data:', {
                                timestamps: indicators.timestamps?.length || 0,
                                rsi: indicators.rsi?.length || 0,
                                macd: indicators.macd?.length || 0,
                                fast_ma: indicators.fast_ma?.length || 0,
                                slow_ma: indicators.slow_ma?.length || 0,
                                upper: indicators.upper?.length || 0,
                                middle: indicators.middle?.length || 0,
                                lower: indicators.lower?.length || 0,
                                signal: indicators.signal?.length || 0,
                                histogram: indicators.histogram?.length || 0
                              });
                              
                              // Thử hiển thị tất cả indicators có sẵn
                              if (indicators.rsi && indicators.timestamps && indicators.rsi.length > 0) {
                                console.log('🔍 Adding RSI indicator');
                                const validData = indicators.timestamps.map((ts: number, idx: number) => {
                                  const rsiValue = indicators.rsi[idx];
                                  return rsiValue !== null && rsiValue !== undefined ? [ts, rsiValue] : null;
                                }).filter((item: any) => item !== null);
                                
                                if (validData.length > 0) {
                                  series.push({
                                    name: 'RSI',
                                    type: 'line',
                                    data: validData,
                                    color: '#f59e0b',
                                    lineWidth: 1,
                                    marker: { enabled: false },
                                    yAxis: 1
                                  });
                                  
                                  // Thêm đường ngưỡng
                                  series.push(
                                    {
                                      name: 'Overbought (70)',
                                      type: 'line',
                                      data: indicators.timestamps.map((ts: number) => [ts, 70]),
                                      color: '#ef4444',
                                      lineWidth: 1,
                                      marker: { enabled: false },
                                      yAxis: 1,
                                      dashStyle: 'dash'
                                    },
                                    {
                                      name: 'Oversold (30)',
                                      type: 'line',
                                      data: indicators.timestamps.map((ts: number) => [ts, 30]),
                                      color: '#10b981',
                                      lineWidth: 1,
                                      marker: { enabled: false },
                                      yAxis: 1,
                                      dashStyle: 'dash'
                                    }
                                  );
                                }
                              }
                              
                              if (indicators.macd && indicators.timestamps && indicators.macd.length > 0) {
                                console.log('🔍 Adding MACD indicator');
                                const macdData = indicators.timestamps.map((ts: number, idx: number) => {
                                  const macdValue = indicators.macd[idx];
                                  return macdValue !== null && macdValue !== undefined ? [ts, macdValue] : null;
                                }).filter((item: any) => item !== null);
                                
                                if (macdData.length > 0) {
                                  series.push({
                                    name: 'MACD',
                                    type: 'line',
                                    data: macdData,
                                    color: '#3b82f6',
                                    lineWidth: 1,
                                    marker: { enabled: false },
                                    yAxis: 1
                                  });
                                }
                                
                                if (indicators.signal && indicators.signal.length > 0) {
                                  const signalData = indicators.timestamps.map((ts: number, idx: number) => {
                                    const signalValue = indicators.signal[idx];
                                    return signalValue !== null && signalValue !== undefined ? [ts, signalValue] : null;
                                  }).filter((item: any) => item !== null);
                                  
                                  if (signalData.length > 0) {
                                    series.push({
                                      name: 'Signal',
                                      type: 'line',
                                      data: signalData,
                                      color: '#ef4444',
                                      lineWidth: 1,
                                      marker: { enabled: false },
                                      yAxis: 1
                                    });
                                  }
                                }
                              }
                              
                              if (indicators.fast_ma && indicators.timestamps && indicators.fast_ma.length > 0) {
                                console.log('🔍 Adding MA indicators');
                                const fastMaData = indicators.timestamps.map((ts: number, idx: number) => {
                                  const fastMaValue = indicators.fast_ma[idx];
                                  return fastMaValue !== null && fastMaValue !== undefined ? [ts, fastMaValue] : null;
                                }).filter((item: any) => item !== null);
                                
                                if (fastMaData.length > 0) {
                                  series.push({
                                    name: 'Fast MA',
                                    type: 'line',
                                    data: fastMaData,
                                    color: '#f59e0b',
                                    lineWidth: 1,
                                    marker: { enabled: false }
                                  });
                                }
                                
                                if (indicators.slow_ma && indicators.slow_ma.length > 0) {
                                  const slowMaData = indicators.timestamps.map((ts: number, idx: number) => {
                                    const slowMaValue = indicators.slow_ma[idx];
                                    return slowMaValue !== null && slowMaValue !== undefined ? [ts, slowMaValue] : null;
                                  }).filter((item: any) => item !== null);
                                  
                                  if (slowMaData.length > 0) {
                                    series.push({
                                      name: 'Slow MA',
                                      type: 'line',
                                      data: slowMaData,
                                      color: '#8b5cf6',
                                      lineWidth: 1,
                                      marker: { enabled: false }
                                    });
                                  }
                                }
                              }
                              
                              if (indicators.upper && indicators.timestamps && indicators.upper.length > 0) {
                                console.log('🔍 Adding Bollinger Bands indicators');
                                series.push(
                                  {
                                    name: 'Upper Band',
                                    type: 'line',
                                    data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.upper[idx]]),
                                    color: '#ef4444',
                                    lineWidth: 1,
                                    marker: { enabled: false }
                                  },
                                  {
                                    name: 'Middle Band',
                                    type: 'line',
                                    data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.middle[idx]]),
                                    color: '#f59e0b',
                                    lineWidth: 1,
                                    marker: { enabled: false }
                                  },
                                  {
                                    name: 'Lower Band',
                                    type: 'line',
                                    data: indicators.timestamps.map((ts: number, idx: number) => [ts, indicators.lower[idx]]),
                                    color: '#10b981',
                                    lineWidth: 1,
                                    marker: { enabled: false }
                                  }
                                );
                              }
                            }
                          }

                          // Thêm series marker cho buy/sell
                          if (tradeMarkers.length > 0) {
                            series.push({
                              name: 'Buy/Sell',
                              type: 'scatter',
                              data: tradeMarkers.map(m => ({ x: m.x, y: m.y, marker: m.marker, tradeIdx: m.tradeIdx, type: m.type })),
                              tooltip: {
                                pointFormatter: function(this: any): string {
                                  return `${this.type === 'buy' ? 'Mua' : 'Bán'}<br/>Giá: <b>${this.y}</b><br/>Thời gian: <b>${Highcharts.dateFormat('%Y-%m-%d %H:%M:%S', this.x)}</b>`;
                                }
                              },
                              marker: { enabled: true, symbol: 'circle', radius: 6 },
                              color: undefined,
                              zIndex: 10
                            });
                          }

                          // Chuẩn bị yAxis dựa trên loại indicator
                          const yAxis = [
                            {
                              title: {
                                text: 'Price',
                                style: { color: '#888888' }
                              },
                              labels: {
                                style: { fontSize: '10px', color: '#888888' }
                              },
                              gridLineColor: '#2e2e2e'
                            }
                          ];

                          // Thêm yAxis thứ 2 cho RSI và MACD
                          if (strategyType === 'rsi' || strategyType === 'macd') {
                            yAxis.push({
                              title: {
                                text: strategyType === 'rsi' ? 'RSI' : 'MACD',
                                style: { color: '#888888' }
                              },
                              labels: {
                                style: { fontSize: '10px', color: '#888888' }
                              },
                              gridLineColor: '#2e2e2e'
                            });
                          }

                          return (
                            <HighchartsReact
                              highcharts={Highcharts}
                              options={{
                                chart: { height: 350, style: { fontFamily: 'inherit' }, spacing: [5, 5, 5, 5], backgroundColor: 'transparent' },
                                title: { text: undefined },
                                xAxis: { type: 'datetime', labels: { style: { fontSize: '10px', color: '#888888' } }, lineColor: '#2e2e2e', tickColor: '#2e2e2e' },
                                yAxis: yAxis,
                                plotOptions: { line: { color: '#22c55e', lineWidth: 1.5 } },
                                series: series,
                                tooltip: { xDateFormat: '%Y-%m-%d %H:%M:%S', valueDecimals: 2, shared: true },
                                legend: { enabled: true, itemStyle: { fontSize: '10px' } },
                                credits: { enabled: false }
                              }}
                            />
                          );
                        })()
                      ) : (
                        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
                          Không có dữ liệu nến để hiển thị
                        </div>
                      )}
                    </div>
                  </div>

                  {experimentChartData.length > 0 && (
                    <div className="mt-4 mb-4">
                      <h4 className="font-semibold text-sm mb-2">5 dòng dữ liệu đầu tiên (Timeframe: {selectedExperiment.config?.trading?.timeframe})</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-xs border">
                          <thead>
                            <tr className="bg-muted border-b">
                              <th className="p-2 text-left">Time</th>
                              <th className="p-2 text-right">Open</th>
                              <th className="p-2 text-right">High</th>
                              <th className="p-2 text-right">Low</th>
                              <th className="p-2 text-right">Close</th>
                              <th className="p-2 text-right">Volume</th>
                            </tr>
                          </thead>
                          <tbody>
                            {experimentChartData.slice(0, 5).map((row, idx) => {
                              let timeStr = 'N/A';
                              const timestamp = row.timestamp;
                              if (timestamp) {
                                const d = new Date(timestamp);
                                const hours = d.getHours();
                                const minutes = d.getMinutes();
                                const date = d.toLocaleDateString('vi-VN');
                                switch (selectedExperiment.config?.trading?.timeframe) {
                                  case '1d': timeStr = date; break;
                                  case '4h': const hour4h = Math.floor(hours / 4) * 4; timeStr = `${String(hour4h).padStart(2, '0')}:00 ${date}`; break;
                                  case '1h': timeStr = `${String(hours).padStart(2, '0')}:00 ${date}`; break;
                                  default: timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${date}`;
                                }
                              }
                              return (
                                <tr key={idx} className="border-b hover:bg-muted/50">
                                  <td className="p-2 font-mono text-xs">{timeStr}</td>
                                  <td className="p-2 text-right font-mono">{row.open?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2 text-right font-mono">{row.high?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2 text-right font-mono">{row.low?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2 text-right font-mono font-medium">{row.close?.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  <td className="p-2 text-right font-mono">{row.volume?.toLocaleString('vi-VN', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <Tabs defaultValue="config" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="config">Cấu hình backtest</TabsTrigger>
                      <TabsTrigger value="result">Kết quả backtest</TabsTrigger>
                    </TabsList>
                    <TabsContent value="config" className="space-y-4">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Cấu hình đã chọn</CardTitle></CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label>Khoảng thời gian</Label>
                              <div className="mt-1 text-sm">
                                {`${selectedExperiment.config?.trading?.startDate} ${selectedExperiment.config?.trading?.startTime || ''}`.trim()} ~ {`${selectedExperiment.config?.trading?.endDate} ${selectedExperiment.config?.trading?.endTime || ''}`.trim()}
                              </div>
                            </div>
                            <div><Label>Timeframe</Label><div className="mt-1 text-sm">{selectedExperiment.config?.trading?.timeframe}</div></div>
                            <div><Label>Cặp giao dịch</Label><div className="mt-1 text-sm">{selectedExperiment.config?.trading?.symbol}</div></div>
                            <div>
                              <Label>Config chiến lược</Label>
                              <div className="mt-1 text-xs bg-muted p-2 rounded">
                                <pre className="text-xs overflow-auto max-h-40">{JSON.stringify(selectedExperiment.config?.strategy, null, 2)}</pre>
                              </div>
                            </div>
                            
                            {/* Thêm thông tin chiến lược chi tiết */}
                            {selectedExperiment.config?.strategy?.type && (
                              <div>
                                <Label>Thông tin chiến lược</Label>
                                <div className="mt-1 text-xs bg-muted p-2 rounded space-y-1">
                                  <div className="font-medium">Loại chiến lược: {selectedExperiment.config.strategy.type}</div>
                                  {selectedExperiment.config.strategy.type === 'rsi' && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div>Period: {selectedExperiment.config.strategy.parameters?.period || 14}</div>
                                      <div>Overbought: {selectedExperiment.config.strategy.parameters?.overbought || 70}</div>
                                      <div>Oversold: {selectedExperiment.config.strategy.parameters?.oversold || 30}</div>
                                    </div>
                                  )}
                                  {selectedExperiment.config.strategy.type === 'macd' && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div>Fast EMA: {selectedExperiment.config.strategy.parameters?.fastEMA || 12}</div>
                                      <div>Slow EMA: {selectedExperiment.config.strategy.parameters?.slowEMA || 26}</div>
                                      <div>Signal Period: {selectedExperiment.config.strategy.parameters?.signalPeriod || 9}</div>
                                    </div>
                                  )}
                                  {selectedExperiment.config.strategy.type === 'ma_crossover' && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div>Fast Period: {selectedExperiment.config.strategy.parameters?.fastPeriod || 10}</div>
                                      <div>Slow Period: {selectedExperiment.config.strategy.parameters?.slowPeriod || 20}</div>
                                    </div>
                                  )}
                                  {selectedExperiment.config.strategy.type === 'bollinger_bands' && (
                                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                                      <div>Period: {selectedExperiment.config.strategy.parameters?.period || 20}</div>
                                      <div>Std Dev: {selectedExperiment.config.strategy.parameters?.stdDev || 2}</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Debug panel cho indicators */}
                            <div className="col-span-2">
                              <Label>Debug Indicators</Label>
                              <div className="mt-1 text-xs bg-red-50 p-2 rounded border border-red-200">
                                <div className="font-medium text-red-700 mb-1">Thông tin Indicators:</div>
                                <div className="space-y-1 text-[10px]">
                                  <div><strong>Strategy Type:</strong> {selectedExperiment.config?.strategy?.type || 'N/A'}</div>
                                  <div><strong>Has Indicators:</strong> {selectedExperiment.indicators ? 'Yes' : 'No'}</div>
                                  <div><strong>Indicators Keys:</strong> {selectedExperiment.indicators ? Object.keys(selectedExperiment.indicators).join(', ') : 'None'}</div>
                                  <div><strong>Timestamps Count:</strong> {selectedExperiment.indicators?.timestamps?.length || 0}</div>
                                  {selectedExperiment.config?.strategy?.type === 'rsi' && (
                                    <div><strong>RSI Values Count:</strong> {selectedExperiment.indicators?.rsi?.length || 0}</div>
                                  )}
                                  {selectedExperiment.config?.strategy?.type === 'macd' && (
                                    <div><strong>MACD Values Count:</strong> {selectedExperiment.indicators?.macd?.length || 0}</div>
                                  )}
                                  {selectedExperiment.config?.strategy?.type === 'ma_crossover' && (
                                    <div><strong>Fast MA Count:</strong> {selectedExperiment.indicators?.fast_ma?.length || 0}</div>
                                  )}
                                  {selectedExperiment.config?.strategy?.type === 'bollinger_bands' && (
                                    <div><strong>Upper Band Count:</strong> {selectedExperiment.indicators?.upper?.length || 0}</div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    <TabsContent value="result" className="space-y-4">
                      <Card>
                        <CardHeader><CardTitle className="text-base">Kết quả backtest</CardTitle></CardHeader>
                        <CardContent>
                          {selectedExperiment.results || selectedExperiment.metrics ? (
                            (() => {
                              const resultObj = selectedExperiment.results || selectedExperiment.metrics || {};
                              return <>
                                <BacktestResultDetail results={resultObj} />
                                
                                {/* Monte Carlo Profit Simulation */}
                                {resultObj.total_trades && resultObj.win_rate && (
                                  <div className="mt-6 space-y-6">
                                    {(() => {
                                      const metrics = {
                                        totalTrades: Number(resultObj.total_trades) || 0,
                                        winRate: Number(resultObj.win_rate) || 0,
                                        avgWinNet: Number(resultObj.avg_win_net) || 2.0,
                                        avgLossNet: Number(resultObj.avg_loss_net) || -1.5
                                      };

                                      return (
                                        <MonteCarloProfitSimulation 
                                          backtestMetrics={metrics}
                                          initialCapital={selectedExperiment.config?.trading?.initialCapital || 10000}
                                          simulations={1000}
                                          backtestResult={{
                                            totalReturn: resultObj.total_return,
                                            maxDrawdown: resultObj.max_drawdown,
                                            totalProfit: resultObj.total_profit || resultObj.total_return ? (resultObj.total_return / 100) * (selectedExperiment.config?.trading?.initialCapital || 10000) : 0
                                          }}
                                          onSimulationComplete={setMonteCarloResults}
                                          experimentId={selectedExperiment.id}
                                        />
                                      );
                                    })()}
                                    
                                    {/* Equity Curve Analysis */}
                                    {monteCarloResults.length > 0 && (
                                      <MonteCarloEquityCurve
                                        simulationResults={monteCarloResults}
                                        initialCapital={selectedExperiment.config?.trading?.initialCapital || 10000}
                                        backtestEquityCurve={resultObj.equity_curve}
                                      />
                                    )}
                                  </div>
                                )}
                                
                                {/* Hiển thị bảng trades nếu có */}
                                {Array.isArray(resultObj.trades) && resultObj.trades.length > 0 ? (
                                  <div className="mb-6">
                                    <h4 className="font-semibold mb-2">Danh sách giao dịch ({resultObj.trades.length} trades)</h4>
                                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto border rounded">
                                      <table className="min-w-full text-xs">
                                        <thead className="sticky top-0 bg-muted border-b">
                                          <tr>
                                            <th className="p-2 text-left">Thời gian vào</th>
                                            <th className="p-2 text-left">Thời gian ra</th>
                                            <th className="p-2 text-center">Loại</th>
                                            <th className="p-2 text-right">Giá vào</th>
                                            <th className="p-2 text-center">Signal mua</th>
                                            <th className="p-2 text-right">Giá ra</th>
                                            <th className="p-2 text-center">Signal bán</th>
                                            <th className="p-2 text-right">Khối lượng</th>
                                            <th className="p-2 text-right">Lợi nhuận (Gross)</th>
                                            <th className="p-2 text-right">Phí giao dịch</th>
                                            <th className="p-2 text-right">Lợi nhuận (Net)</th>
                                            <th className="p-2 text-right">Tỷ lệ lợi nhuận</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {resultObj.trades.map((trade: any, idx: number) => {
                                            const entry = Number(trade.entry_price);
                                            const exit = Number(trade.exit_price);
                                            const size = Number(trade.size);
                                            const gross = (isFinite(entry) && isFinite(exit) && isFinite(size)) ? (exit - entry) * size : 0;
                                            const fee = (trade.entry_fee || 0) + (trade.exit_fee || 0);
                                            const net = gross - fee;
                                            const tradeValue = entry * size; // Giá vào * Khối lượng
                                            const profitRatio = tradeValue > 0 ? (net / tradeValue) * 100 : 0; // Tỷ lệ lợi nhuận (%)
                                            return (
                                              <tr key={idx} className="border-b hover:bg-muted/30">
                                                <td className="p-2">{formatTradeTime(trade.entry_time || trade.entryTime || trade.open_time)}</td>
                                                <td className="p-2">{formatTradeTime(trade.exit_time || trade.exitTime || trade.close_time)}</td>
                                                <td className="p-2 text-center">{trade.side || trade.type || '-'}</td>
                                                <td className="p-2 text-right">{trade.entry_price !== undefined ? trade.entry_price : '-'}</td>
                                                <td className="p-2 text-center text-xs">
                                                  {getBuySignalText(selectedExperiment, trade)}
                                                </td>
                                                <td className="p-2 text-right">{trade.exit_price !== undefined ? trade.exit_price : '-'}</td>
                                                <td className="p-2 text-center text-xs">
                                                  {getSellSignalText(selectedExperiment, trade)}
                                                </td>
                                                <td className="p-2 text-right">{trade.size !== undefined ? trade.size : '-'}</td>
                                                <td className={`p-2 text-right font-semibold ${gross > 0 ? 'text-green-600' : gross < 0 ? 'text-red-600' : ''}`}>{gross.toFixed(2)}</td>
                                                <td className="p-2 text-right">{fee > 0 ? fee.toFixed(2) : '-'}</td>
                                                <td className={`p-2 text-right font-semibold ${net > 0 ? 'text-green-600' : net < 0 ? 'text-red-600' : ''}`}>{net.toFixed(2)}</td>
                                                <td className={`p-2 text-right font-semibold ${profitRatio > 0 ? 'text-green-600' : profitRatio < 0 ? 'text-red-600' : ''}`}>{profitRatio.toFixed(2)}%</td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                        <tfoot className="sticky bottom-0 bg-muted/70 border-t">
                                          <tr className="font-bold">
                                            <td className="p-2 text-right" colSpan={8}>Tổng cộng</td>
                                            <td className="p-2 text-right">
                                              {(() => {
                                                const total = resultObj.trades.reduce((sum: number, t: any) => {
                                                  const entry = Number(t.entry_price);
                                                  const exit = Number(t.exit_price);
                                                  const size = Number(t.size);
                                                  const gross = (isFinite(entry) && isFinite(exit) && isFinite(size)) ? (exit - entry) * size : 0;
                                                  return sum + gross;
                                                }, 0);
                                                return <span className={total > 0 ? 'text-green-700' : total < 0 ? 'text-red-700' : ''}>{total.toFixed(2)}</span>;
                                              })()}
                                            </td>
                                            <td className="p-2 text-right">
                                              {(() => {
                                                const totalFee = resultObj.trades.reduce((sum: number, t: any) => (sum + (t.entry_fee || 0) + (t.exit_fee || 0)), 0);
                                                return <span className={totalFee > 0 ? 'text-yellow-700' : ''}>{totalFee.toFixed(2)}</span>;
                                              })()}
                                            </td>
                                            <td className="p-2 text-right">
                                              {(() => {
                                                const totalNet = resultObj.trades.reduce((sum: number, t: any) => {
                                                  const entry = Number(t.entry_price);
                                                  const exit = Number(t.exit_price);
                                                  const size = Number(t.size);
                                                  const gross = (isFinite(entry) && isFinite(exit) && isFinite(size)) ? (exit - entry) * size : 0;
                                                  const fee = (t.entry_fee || 0) + (t.exit_fee || 0);
                                                  return sum + (gross - fee);
                                                }, 0);
                                                return <span className={totalNet > 0 ? 'text-green-700' : totalNet < 0 ? 'text-red-700' : ''}>{totalNet.toFixed(2)}</span>;
                                              })()}
                                            </td>
                                            <td className="p-2 text-right">
                                              {(() => {
                                                const totalTradeValue = resultObj.trades.reduce((sum: number, t: any) => {
                                                  const entry = Number(t.entry_price);
                                                  const size = Number(t.size);
                                                  return sum + (entry * size);
                                                }, 0);
                                                const totalNet = resultObj.trades.reduce((sum: number, t: any) => {
                                                  const entry = Number(t.entry_price);
                                                  const exit = Number(t.exit_price);
                                                  const size = Number(t.size);
                                                  const gross = (isFinite(entry) && isFinite(exit) && isFinite(size)) ? (exit - entry) * size : 0;
                                                  const fee = (t.entry_fee || 0) + (t.exit_fee || 0);
                                                  return sum + (gross - fee);
                                                }, 0);
                                                const avgProfitRatio = totalTradeValue > 0 ? (totalNet / totalTradeValue) * 100 : 0;
                                                return <span className={avgProfitRatio > 0 ? 'text-green-700' : avgProfitRatio < 0 ? 'text-red-700' : ''}>{avgProfitRatio.toFixed(2)}%</span>;
                                              })()}
                                            </td>
                                          </tr>
                                        </tfoot>
                                      </table>
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">* Hiển thị tất cả {resultObj.trades.length} giao dịch</div>
                                  </div>
                                ) : (
                                  <div className="text-xs text-muted-foreground mb-4">Không có giao dịch nào trong backtest này.</div>
                                )}
                              </>;
                            })()
                          ) : (
                            <div className="text-center text-muted-foreground">Chưa có kết quả backtest</div>
                          )}
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </>
              ) : (
                <>
                  {/* UI cũ cho các loại thí nghiệm khác */}
                  <Card>
                    <CardHeader><CardTitle className="text-base">Thông tin cơ bản</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Trạng thái</Label>
                          <div className="mt-1">
                            <Badge variant={
                              selectedExperiment.status === 'completed' ? 'default' :
                              selectedExperiment.status === 'running' ? 'secondary' :
                              selectedExperiment.status === 'failed' ? 'destructive' : 'outline'
                            }>
                              {selectedExperiment.status === 'completed' ? '✅ Hoàn thành' :
                               selectedExperiment.status === 'running' ? '🔄 Đang chạy' :
                               selectedExperiment.status === 'failed' ? '❌ Lỗi' :
                               selectedExperiment.status === 'pending' ? '⏳ Chờ' : selectedExperiment.status}
                            </Badge>
                          </div>
                        </div>
                        <div><Label>Loại thí nghiệm</Label><div className="mt-1"><Badge variant="outline" className="capitalize">{selectedExperiment.type}</Badge></div></div>
                        <div><Label>Ngày tạo</Label><div className="mt-1 text-sm">{new Date(selectedExperiment.created_at).toLocaleString('vi-VN')}</div></div>
                        <div>
                          <Label>Tiến độ</Label>
                          <div className="mt-1">
                            <Progress value={selectedExperiment.progress || 0} className="h-2" />
                            <span className="text-sm text-muted-foreground mt-1 block">{selectedExperiment.progress || 0}%</span>
                          </div>
                        </div>
                      </div>
                      {selectedExperiment.description && (
                        <div>
                          <Label>Mô tả</Label>
                          <p className="mt-1 text-sm text-muted-foreground">{selectedExperiment.description}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {selectedExperiment.config && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Cấu hình</CardTitle></CardHeader>
                      <CardContent>
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-sm overflow-auto">{JSON.stringify(selectedExperiment.config, null, 2)}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedExperiment.results && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Kết quả</CardTitle></CardHeader>
                      <CardContent>
                        {/* Hiển thị tổng phí giao dịch nếu có */}
                        {selectedExperiment.results.total_transaction_costs || (selectedExperiment.results.cost_analysis && selectedExperiment.results.cost_analysis.total_transaction_costs) ? (
                          <div className="mb-3 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                            <span className="font-semibold text-yellow-700 dark:text-yellow-200">Tổng phí giao dịch đã trả: </span>
                            <span className="font-mono text-yellow-900 dark:text-yellow-100">
                              {(selectedExperiment.results.total_transaction_costs || (selectedExperiment.results.cost_analysis && selectedExperiment.results.cost_analysis.total_transaction_costs)).toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                            <span className="text-xs text-yellow-700 dark:text-yellow-200 ml-2">(VNĐ hoặc USD tuỳ cấu hình)</span>
                          </div>
                        ) : null}
                        <div className="bg-muted p-4 rounded-lg">
                          <pre className="text-sm overflow-auto">{JSON.stringify(selectedExperiment.results, null, 2)}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {selectedExperiment.error && (
                    <Card>
                      <CardHeader><CardTitle className="text-base text-red-500">Lỗi</CardTitle></CardHeader>
                      <CardContent>
                        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700/30">
                          <pre className="text-sm text-red-600 dark:text-red-400 overflow-auto">{selectedExperiment.error}</pre>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-3 pt-4 border-t">
                    {selectedExperiment.status === 'pending' && (
                      <Button onClick={() => startExperiment(selectedExperiment.id)} className="flex-1">
                        <Play className="h-4 w-4 mr-2" />Bắt đầu thí nghiệm
                      </Button>
                    )}
                    {selectedExperiment.status === 'running' && (
                      <Button variant="destructive" className="flex-1" onClick={() => {/* TODO: Stop experiment */}}>
                        <X className="h-4 w-4 mr-2" />Dừng thí nghiệm
                      </Button>
                    )}
                    <Button variant="outline" className="flex-1" onClick={() => {/* TODO: Export results */}}>
                      <Download className="h-4 w-4 mr-2" />Xuất kết quả
                    </Button>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
      )}
    </div>
  );
}

// Thêm component hiển thị chi tiết kết quả backtest
function BacktestResultDetail({ results }: { results: any }) {
  if (!results) return null;
  // Loại bỏ trades nếu đã có bảng riêng
  const { trades, ...metrics } = results;
  const explain: Record<string, string> = {
    win_rate: 'Tỷ lệ giao dịch thắng trên tổng số giao dịch.',
    average_win: 'Lợi nhuận trung bình mỗi lệnh thắng.',
    average_loss: 'Thua lỗ trung bình mỗi lệnh thua.',
    max_drawdown: 'Mức sụt giảm lớn nhất của tài khoản.',
    sharpe_ratio: 'Đo lường hiệu suất điều chỉnh theo rủi ro.',
    total_return: 'Tổng phần trăm lợi nhuận so với vốn ban đầu.',
    total_trades: 'Tổng số lệnh đã thực hiện.',
    final_capital: 'Số dư cuối cùng sau backtest.',
    losing_trades: 'Số lệnh thua.',
    winning_trades: 'Số lệnh thắng.',
    total_transaction_costs: 'Tổng phí giao dịch đã trả trong toàn bộ backtest.'
  };
  // Lấy tổng phí giao dịch nếu có
  const totalFee = metrics.total_transaction_costs || (metrics.cost_analysis && metrics.cost_analysis.total_transaction_costs);
  return (
    <div className="mb-6">
      <h4 className="font-semibold mb-2">Chỉ số Backtest chi tiết</h4>
      {typeof totalFee === 'number' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg mb-2">
          <span className="font-semibold text-yellow-700 dark:text-yellow-200">Tổng phí giao dịch:</span>
          <span className="font-mono text-yellow-900 dark:text-yellow-100">{totalFee.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          <span className="text-xs text-yellow-700 dark:text-yellow-200">(VNĐ hoặc USD tuỳ cấu hình)</span>
        </div>
      )}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(metrics).map(([key, value]) => (
          key !== 'cost_analysis' && key !== 'total_transaction_costs' && (
            <div key={key} className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <span className="font-semibold">{key.replace(/_/g, ' ')}:</span>
              <span className="font-mono">{typeof value === 'number' ? Number(value).toFixed(4) : String(value)}</span>
              <span className="relative group cursor-pointer">
                <span className="text-blue-500 border border-blue-400 rounded-full px-1 text-xs ml-1">i</span>
                <span className="absolute left-1/2 z-10 hidden group-hover:block bg-black text-white text-xs rounded px-2 py-1 whitespace-nowrap -translate-x-1/2 mt-2 shadow-lg">{explain[key] || key}</span>
              </span>
            </div>
          )
        ))}
      </div>
    </div>
  );
}

export function ProjectDetailView({ projectId, onBack }: ProjectDetailViewProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    objective: ''
  });
  // Đảm bảo backtests và fetchCompletedBacktests nằm ở đây
  const [backtests, setBacktests] = useState<any[]>([]);
  const fetchCompletedBacktests = async () => {
    try {
      const response = await fetch(`/api/research/experiments?project_id=${projectId}&type=backtest&status=completed`);
      if (response.ok) {
        const data = await response.json();
        setBacktests(data.experiments || []);
      } else {
        setBacktests([]);
      }
    } catch (error) {
      setBacktests([]);
    }
  };

  useEffect(() => {
    fetchProjectDetails();
    fetchProjectModels();
    fetchCompletedBacktests();
  }, [projectId]);

  const fetchProjectDetails = async () => {
    try {
      const response = await fetch('/api/research/projects');
      if (response.ok) {
        const data = await response.json();
        const foundProject = data.projects.find((p: any) => p.id === projectId);
        if (foundProject) {
          setProject(foundProject);
          setEditForm({
            name: foundProject.name,
            description: foundProject.description || '',
            objective: foundProject.objective || ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
    }
  };

  const fetchProjectModels = async () => {
    try {
      const response = await fetch(`/api/research/models?project_id=${projectId}`);
      if (response.ok) {
        const data = await response.json();
        setModels(data.models || []);
      }
    } catch (error) {
      console.error('Error fetching project models:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProject = async () => {
    try {
      const response = await fetch(`/api/research/projects?id=${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });
      if (response.ok) {
        await fetchProjectDetails();
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving project:', error);
    }
  };

  const createModel = async (modelData: any) => {
    try {
      console.log('🚀 Creating model:', modelData);
      const payload = {
        project_id: projectId,
        name: modelData.name.trim(),
        description: modelData.description || '',
        algorithm: modelData.algorithm_type,
        model_type: modelData.algorithm_type,
        status: 'draft',
        parameters: JSON.stringify(modelData.parameters || {}),
        training_config: JSON.stringify({
          algorithm: modelData.algorithm_type,
          hyperparameters: modelData.parameters || {},
          created_by: 'user',
          created_at: new Date().toISOString()
        }),
        created_at: new Date().toISOString()
      };
      const response = await fetch('/api/research/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      let result;
      try {
        result = await response.json();
      } catch (parseError) {
        console.error('❌ Failed to parse response:', parseError);
        return { success: false, error: 'Invalid server response' };
      }
      if (response.ok) {
        console.log('✅ Model created successfully:', result.model);
        await fetchProjectModels();
        return { success: true, model: result.model };
      } else {
        console.error('❌ Model creation failed:', { status: response.status, result });
        return {
          success: false,
          error: result?.error || result?.message || `Server error (${response.status})`
        };
      }
    } catch (error) {
      console.error('❌ Model creation network error:', error);
      return { success: false, error: 'Network error - check connection' };
    }
  };

  // Thêm state cho indicator
  const [indicatorData, setIndicatorData] = useState<any>(null);
  useEffect(() => {
    async function fetchIndicator() {
      const res = await fetch(`/api/trading/bot/indicator-history?botId=${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setIndicatorData(data);
      }
    }
    fetchIndicator();
  }, [projectId]);

  if (!project) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Project không tìm thấy</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Quay lại
        </Button>
      </div>
    );
  }

  const { progress, tasks } = calculateProjectProgress(project, models);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Quay lại Projects
          </Button>
          <div>
            {isEditing ? (
              <div className="space-y-2">
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  className="text-xl font-bold"
                />
              </div>
            ) : (
              <h1 className="text-2xl font-bold">{project.name}</h1>
            )}
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
                {project.status}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Created: {new Date(project.created_at).toLocaleDateString('vi-VN')}
              </span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2">
          {isEditing ? (
            <>
              <Button onClick={saveProject}>
                <Save className="h-4 w-4 mr-2" />
                Lưu
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <X className="h-4 w-4 mr-2" />
                Hủy
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setIsEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                <Activity className="h-4 w-4 mr-2" />
                Làm mới
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Project Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Tiến độ dự án
          </CardTitle>
          <CardDescription>Theo dõi các giai đoạn phát triển nghiên cứu</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{progress}%</span>
              <Badge variant={progress > 50 ? 'default' : 'secondary'}>
                {progress < 30 ? 'Khởi động' : progress < 70 ? 'Đang phát triển' : 'Gần hoàn thành'}
              </Badge>
            </div>
            <Progress value={progress} className="h-3" />
            
            {/* Task Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {tasks.map((task, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className={`w-3 h-3 rounded-full ${task.completed ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{task.name}</div>
                    <div className="text-xs text-muted-foreground">{task.weight}% trọng số</div>
                  </div>
                  {task.completed && <CheckCircle className="h-4 w-4 text-green-500" />}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Project Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>Thông tin Project</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Textarea
                  id="description"
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Mô tả chi tiết về project..."
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="objective">Mục tiêu</Label>
                <Textarea
                  id="objective"
                  value={editForm.objective}
                  onChange={(e) => setEditForm(prev => ({ ...prev, objective: e.target.value }))}
                  placeholder="Mục tiêu nghiên cứu và kết quả mong đợi..."
                  rows={3}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Mô tả</h4>
                <p className="mt-1">{project.description || 'Chưa có mô tả'}</p>
              </div>
              <div>
                <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Mục tiêu</h4>
                <p className="mt-1">{project.objective || 'Chưa định nghĩa mục tiêu'}</p>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Models</h4>
                  <p className="text-2xl font-bold">{models.length}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Trained</h4>
                  <p className="text-2xl font-bold">{models.filter(m => m.status === 'completed').length}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">Performance</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {models.some(m => m.performance_metrics) ? '✓' : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="models">Mô hình ({models.length})</TabsTrigger>
          <TabsTrigger value="experiments">Thí nghiệm</TabsTrigger>
          <TabsTrigger value="bots">Chạy bot</TabsTrigger>
          <TabsTrigger value="settings">Cài đặt</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Hành động nhanh</CardTitle>
              <CardDescription>Các tác vụ thường dùng trong dự án nghiên cứu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col gap-2"
                  onClick={() => setActiveTab('models')}
                >
                  <Brain className="h-6 w-6" />
                  <span>Tạo Model</span>
                  <span className="text-xs text-muted-foreground">Xây dựng thuật toán mới</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col gap-2"
                  onClick={() => setActiveTab('experiments')}
                >
                  <TestTube className="h-6 w-6" />
                  <span>Chạy Test</span>
                  <span className="text-xs text-muted-foreground">Backtesting & validation</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-auto p-4 flex-col gap-2"
                  onClick={() => setActiveTab('settings')}
                >
                  <Settings className="h-6 w-6" />
                  <span>Cài đặt</span>
                  <span className="text-xs text-muted-foreground">Project configuration</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Hoạt động gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {models.slice(0, 3).map((model) => (
                  <div key={model.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <Brain className="h-4 w-4 text-blue-500" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{model.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {model.model_type || model.algorithm} • {new Date(model.created_at).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                    <Badge variant="outline">{model.status}</Badge>
                  </div>
                ))}
                {models.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Chưa có hoạt động nào. Tạo model đầu tiên để bắt đầu!
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <ModelsTab 
            models={models} 
            onCreateModel={createModel}
            onRefresh={fetchProjectModels}
            projectId={projectId}
          />
        </TabsContent>

        <TabsContent value="experiments" className="space-y-6">
          <ExperimentsTab projectId={projectId} models={models} />
        </TabsContent>

        <TabsContent value="bots" className="space-y-6">
          {/* Xoá Card chỉ số indicator & trigger ở đây */}
          <ProjectBotsTab projectId={projectId} backtests={backtests} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab project={project} onUpdate={fetchProjectDetails} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 