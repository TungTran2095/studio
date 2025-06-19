"use client";

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import { 
  ArrowLeft,
  Brain,
  TestTube,
  BarChart3,
  Settings,
  Plus,
  Play,
  Edit,
  Save,
  X,
  CheckCircle,
  Activity,
  Clock,
  TrendingUp,
  Download,
  Upload,
  FileText,
  Zap,
  Target,
  LineChart,
  Eye,
  AlertTriangle,
  HelpCircle,
  Terminal,
  Database
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DatasetSelector } from '../dataset-selector';
import { TrainingProgressModal } from '../training-progress-modal';
import { ModelPerformanceDisplay } from '../model-performance-display';
import { PriceChart } from '../price-chart';
import { format } from 'date-fns';

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
          <div className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">Settings</h3>
            <p className="text-muted-foreground">
              Cấu hình project settings
            </p>
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
    try {
      setIsLoadingModelDetails(true);
      console.log('🔍 Fetching model details from Supabase:', model.id);
      
      // Fetch latest model data from API including training_logs and performance_metrics
      const response = await fetch(`/api/research/models?id=${model.id}`);
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
          
          console.log('✅ Model details fetched:', {
            id: latestModel.id,
            name: latestModel.name,
            training_logs_count: latestModel.training_logs?.length || 0,
            has_performance_metrics: !!latestModel.performance_metrics
          });
          
          setSelectedModel(latestModel);
        } else {
          console.warn('⚠️ Model not found in response');
          setSelectedModel(model); // Fallback to original model data
        }
      } else {
        console.error('❌ Failed to fetch model details:', response.status);
        setSelectedModel(model); // Fallback to original model data
      }
    } catch (error) {
      console.error('❌ Error fetching model details:', error);
      setSelectedModel(model); // Fallback to original model data
    } finally {
      setIsLoadingModelDetails(false);
    }
    
    setShowLogs(true);
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
          <Button onClick={() => setShowCreateModel(true)}>
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
      {showLogs && selectedModel && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[90vh] w-[90vw] max-w-4xl">
          <div className="fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowLogs(false)}></div>
          <CardHeader className="sticky top-0 bg-background border-b w-full">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="h-5 w-5" />
                  Training Logs: {selectedModel.name}
                  {isLoadingModelDetails && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </CardTitle>
                <CardDescription>
                  Logs huấn luyện từ cột training_logs trong Supabase
                </CardDescription>
              </div>
              <div className="flex gap-2">
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
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Model Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Thông tin Model</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ID:</span>
                    <span className="font-mono text-xs">{selectedModel.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm:</span>
                    <span>{selectedModel.algorithm || selectedModel.model_type || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge variant={selectedModel.status === 'completed' ? 'default' : 'secondary'}>
                      {selectedModel.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(selectedModel.created_at).toLocaleString('vi-VN')}</span>
                  </div>
                  {selectedModel.description && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="text-sm mt-1">{selectedModel.description}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Performance Metrics</CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedModel.performance_metrics ? (
                    <div className="space-y-4">
                      {typeof selectedModel.performance_metrics === 'object' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* Training Metrics */}
                          {selectedModel.performance_metrics.train && (
                            <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded">
                              <h4 className="font-medium text-blue-300 mb-2">Training Set</h4>
                              <div className="space-y-2">
                                {Object.entries(selectedModel.performance_metrics.train).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{key}:</span>
                                    <span className="font-mono">
                                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Test/Validation Metrics */}
                          {(selectedModel.performance_metrics.test || selectedModel.performance_metrics.validation) && (
                            <div className="p-3 bg-green-900/20 border border-green-700/30 rounded">
                              <h4 className="font-medium text-green-300 mb-2">
                                {selectedModel.performance_metrics.test ? 'Test Set' : 'Validation Set'}
                              </h4>
                              <div className="space-y-2">
                                {Object.entries(selectedModel.performance_metrics.test || selectedModel.performance_metrics.validation).map(([key, value]) => (
                                  <div key={key} className="flex justify-between text-sm">
                                    <span className="text-muted-foreground capitalize">{key}:</span>
                                    <span className="font-mono">
                                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Other metrics */}
                          {Object.entries(selectedModel.performance_metrics)
                            .filter(([key]) => !['train', 'test', 'validation'].includes(key))
                            .map(([key, value]) => (
                              <div key={key} className="p-3 bg-slate-800/50 border border-slate-700/30 rounded">
                                <h4 className="font-medium text-slate-300 mb-2 capitalize">{key}</h4>
                                {typeof value === 'object' && value !== null ? (
                                  <div className="space-y-2">
                                    {Object.entries(value).map(([subKey, subValue]) => (
                                      <div key={subKey} className="flex justify-between text-sm">
                                        <span className="text-muted-foreground capitalize">{subKey}:</span>
                                        <span className="font-mono">
                                          {typeof subValue === 'number' ? subValue.toFixed(4) : String(subValue)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <div className="text-sm font-mono">
                                    {typeof value === 'number' ? value.toFixed(4) : String(value)}
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-800/50 border border-slate-700/30 rounded">
                          <p className="text-sm font-mono">{selectedModel.performance_metrics}</p>
                        </div>
                      )}
                      
                      {/* Model Status Badge */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">Model Status:</span>
                        <Badge variant={
                          selectedModel.status === 'completed' ? 'default' : 
                          selectedModel.status === 'training' ? 'secondary' : 
                          'outline'
                        }>
                          {selectedModel.status}
                        </Badge>
                        {selectedModel.updated_at && (
                          <span className="text-xs text-muted-foreground">
                            Updated: {new Date(selectedModel.updated_at).toLocaleString('vi-VN')}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BarChart3 className="h-8 w-8 mx-auto mb-2" />
                      <p>Chưa có performance metrics</p>
                      <p className="text-xs">Train model để xem kết quả performance</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Training Logs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Terminal className="h-4 w-4" />
                  Training Logs
                  {selectedModel.training_logs && selectedModel.training_logs.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {selectedModel.training_logs.length} entries
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedModel.training_logs && selectedModel.training_logs.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto bg-slate-900/50 border border-slate-700/30 p-3 rounded">
                    {selectedModel.training_logs.map((log: any, index: number) => {
                      // Handle different log formats
                      const timestamp = log.timestamp || log.time || new Date().toISOString();
                      const level = log.level || 'info';
                      const message = log.message || log.msg || String(log);
                      const source = log.source || 'system';
                      
                      return (
                        <div key={index} className="flex gap-3 text-sm font-mono border-b border-slate-700/50 pb-1">
                          <span className="text-muted-foreground whitespace-nowrap text-xs">
                            {new Date(timestamp).toLocaleTimeString('vi-VN')}
                          </span>
                          <span className={`
                            px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap
                            ${level === 'error' ? 'bg-red-900/60 text-red-300 border border-red-700/50' : 
                              level === 'warning' || level === 'warn' ? 'bg-yellow-900/60 text-yellow-300 border border-yellow-700/50' : 
                              level === 'success' ? 'bg-green-900/60 text-green-300 border border-green-700/50' :
                              'bg-blue-900/60 text-blue-300 border border-blue-700/50'}
                          `}>
                            {level.toUpperCase()}
                          </span>
                          {source && source !== 'system' && (
                            <span className="text-xs text-purple-400 whitespace-nowrap">
                              [{source}]
                            </span>
                          )}
                          <span className="flex-1 break-words text-slate-200">{message}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Terminal className="h-8 w-8 mx-auto mb-2" />
                    <p>Chưa có training logs</p>
                    <p className="text-xs">Logs sẽ xuất hiện khi train model</p>
                  </div>
                )}
                
                {selectedModel.training_logs && selectedModel.training_logs.length > 0 && (
                  <div className="mt-3 p-2 bg-blue-900/20 border border-blue-700/30 rounded text-sm">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-blue-400" />
                      <span className="text-blue-300">
                        Latest: {new Date(selectedModel.training_logs[selectedModel.training_logs.length - 1]?.timestamp || Date.now()).toLocaleString('vi-VN')}
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex gap-3">
              <Button 
                onClick={() => trainModel(selectedModel.id)}
                disabled={isTraining === selectedModel.id}
              >
                {isTraining === selectedModel.id ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Training...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    {selectedModel.status === 'completed' ? 'Retrain Model' : 'Train Model'}
                  </>
                )}
              </Button>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Logs
              </Button>
              <Button 
                variant="outline"
                onClick={() => refreshModelDetails(selectedModel.id)}
                disabled={isLoadingModelDetails}
              >
                <Activity className="h-4 w-4 mr-2" />
                {isLoadingModelDetails ? 'Đang tải...' : 'Refresh Logs'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Model Form */}
      {showCreateModel && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[90vh] w-[90vw] max-w-4xl">
          <div className="fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowCreateModel(false)}></div>
          <CardHeader className="sticky top-0 bg-background border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Tạo Model Mới
                </CardTitle>
                <CardDescription>
                  Chọn thuật toán AI/ML và cấu hình parameters
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => setShowCreateModel(false)}>
                <X className="h-4 w-4 mr-2" />
                Đóng
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
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
          </CardContent>
        </Card>
      )}

      {/* Data Selector Modal */}
      {showDataSelector && modelToTrain && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[90vh] w-[90vw] max-w-4xl">
          <div className="fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowDataSelector(false)}></div>
          <CardHeader className="sticky top-0 bg-background border-b w-full">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Chọn dữ liệu Training: {modelToTrain.name}
                  {isLoadingData && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </CardTitle>
                <CardDescription>
                  Chọn dữ liệu từ bảng OHLCV_BTC_USDT_1m để train model
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    console.log('🔄 [UI] Reload Data button clicked');
                    fetchAvailableData();
                  }}
                  disabled={isLoadingData}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {isLoadingData ? 'Đang tải...' : 'Reload Data'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setShowDataSelector(false);
                    setModelToTrain(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </Button>
              </div>
            </div>
          </CardHeader>
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
        </Card>
      )}
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
  strategyType?: string;
  rsiBuy?: string;
  rsiSell?: string;
  macdBuy?: string;
  macdSell?: string;
  aiRule?: string;
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
    takeProfit: 4
  });
  const [chartData, setChartData] = useState<OHLCV[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [selectedExperimentType, setSelectedExperimentType] = useState<'backtest' | 'hypothesis_test' | null>(null);
  const [showBacktestConfig, setShowBacktestConfig] = useState(false);
  const [showHypothesisConfig, setShowHypothesisConfig] = useState(false);
  const [selectedExperiment, setSelectedExperiment] = useState<any>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [hypothesisConfig, setHypothesisConfig] = useState({
    name: '',
    description: '',
    hypothesis: '',
    significanceLevel: '0.05',
    testType: 't-test'
  });
  const [pythonScript, setPythonScript] = useState<string>('');
  const [backtestResult, setBacktestResult] = useState<any>(null);

  const handleBacktestConfigChange = (field: string, value: string | number) => {
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

  const createBacktestExperiment = async () => {
    try {
      setCreatingExperiment(true);
      console.log('📝 Creating backtest experiment:', backtestConfig);
      const response = await fetch('/api/research/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: backtestConfig.name,
          type: 'backtest',
          description: backtestConfig.description,
          config: {
            startDate: backtestConfig.startDate,
            endDate: backtestConfig.endDate,
            initialCapital: backtestConfig.initialCapital,
            positionSize: backtestConfig.positionSize,
            stopLoss: backtestConfig.stopLoss,
            takeProfit: backtestConfig.takeProfit,
            pythonScript: pythonScript // gửi script lên backend
          }
        })
      });
      const data = await response.json();
      if (response.ok) {
        console.log('✅ Backtest experiment created:', data);
        setBacktestResult(data.result || null); // lưu kết quả trả về
        await fetchExperiments();
        setShowBacktestConfig(false);
        alert('✅ Đã tạo thí nghiệm backtest thành công!');
      } else {
        console.error('❌ Failed to create backtest experiment:', data.error);
        alert(`❌ Lỗi tạo thí nghiệm: ${data.error || 'Không xác định'}`);
      }
    } catch (error) {
      console.error('❌ Error creating backtest experiment:', error);
      alert('❌ Lỗi kết nối khi tạo thí nghiệm');
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
        alert('✅ Đã tạo thí nghiệm kiểm tra giả thuyết thành công!');
      } else {
        console.error('❌ Failed to create hypothesis test experiment:', data.error);
        alert(`❌ Lỗi tạo thí nghiệm: ${data.error || 'Không xác định'}`);
      }
    } catch (error) {
      console.error('❌ Error creating hypothesis test experiment:', error);
      alert('❌ Lỗi kết nối khi tạo thí nghiệm');
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
      console.log('📡 Fetching experiments for project:', projectId);
      
      const response = await fetch(`/api/research/experiments?project_id=${projectId}`);
      const data = await response.json();
      
      if (response.ok) {
        setExperiments(data.experiments || []);
        setSetupRequired(false);
        console.log('✅ Experiments loaded:', data.experiments?.length || 0);
      } else {
        console.error('❌ Failed to fetch experiments:', data.error);
        
        if (data.setup_required || response.status === 404) {
          console.log('⚠️ Database setup required');
          setSetupRequired(true);
          setExperiments([]);
        } else {
          console.error('Failed to fetch experiments:', data.error);
          setExperiments([]);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching experiments:', error);
      setExperiments([]);
    } finally {
      setLoading(false);
    }
  };

  const setupDatabase = async () => {
    try {
      setSettingUp(true);
      console.log('🔧 Setting up experiments database...');
      
      const response = await fetch('/api/research/setup-experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();
      
      if (result.success) {
        console.log('✅ Database setup successful');
        setSetupRequired(false);
        await fetchExperiments();
      } else {
        console.error('❌ Database setup failed:', result.error);
        alert(`❌ Lỗi setup database: ${result.error}`);
      }
    } catch (error) {
      console.error('❌ Setup error:', error);
      alert('❌ Lỗi kết nối khi setup database');
    } finally {
      setSettingUp(false);
    }
  };

  const viewExperimentDetails = async (experiment: any) => {
    try {
      console.log('🔍 [View Details] Clicked on experiment:', experiment);
      setIsLoadingDetails(true);
      setSelectedExperiment(experiment); // Set ngay lập tức để hiển thị modal
      setShowDetails(true);
      
      // Fetch thêm thông tin chi tiết từ API
      const response = await fetch(`/api/research/experiments?id=${experiment.id}`);
      if (response.ok) {
        const data = await response.json();
        console.log('✅ [View Details] Fetched experiment details:', data);
        if (data.experiment) {
          setSelectedExperiment(data.experiment);
        }
      } else {
        console.error('❌ [View Details] Failed to fetch details:', response.status);
      }
    } catch (error) {
      console.error('❌ [View Details] Error:', error);
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const startExperiment = async (experimentId: string) => {
    try {
      console.log('🚀 Starting experiment:', experimentId);
      
      const response = await fetch(`/api/research/experiments?id=${experimentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'running',
          started_at: new Date().toISOString()
        })
      });

      if (response.ok) {
        await fetchExperiments();
        alert('✅ Đã bắt đầu thí nghiệm!');
      } else {
        const error = await response.json();
        alert(`❌ Lỗi khi bắt đầu thí nghiệm: ${error.error || 'Không xác định'}`);
      }
    } catch (error) {
      console.error('Error starting experiment:', error);
      alert('❌ Lỗi kết nối khi bắt đầu thí nghiệm');
    }
  };

  const createMA20Backtest = async () => {
    try {
      setCreatingExperiment(true);
      console.log('📝 Creating MA20 backtest experiment for project:', projectId);
      
      const response = await fetch('/api/research/experiments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          name: 'Backtest Chiến lược MA20',
          type: 'backtest',
          description: 'Chiến lược: Mua khi giá đóng cửa vượt MA20, bán khi giá giảm dưới MA20',
          config: {
            strategy: {
              name: 'MA20 Crossover',
              type: 'moving_average',
              parameters: {
                ma_period: 20,
                ma_type: 'simple',
                signal_type: 'crossover'
              }
            },
            trading: {
              symbol: 'BTCUSDT',
              timeframe: '1h',
              start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 ngày trước
              end_date: new Date().toISOString(),
              initial_capital: 10000,
              position_size: 0.1, // 10% vốn mỗi lần
              stop_loss: 0.02, // 2%
              take_profit: 0.04 // 4%
            },
            risk_management: {
              max_positions: 1,
              max_drawdown: 0.1, // 10%
              trailing_stop: true,
              trailing_stop_distance: 0.01 // 1%
            }
          }
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log('✅ MA20 backtest created:', data);
        await fetchExperiments();
        alert('✅ Đã tạo thí nghiệm backtest MA20 thành công!');
      } else {
        console.error('❌ Failed to create MA20 backtest:', data.error);
        if (data.setup_required) {
          setSetupRequired(true);
          alert('⚠️ Cần setup database trước khi tạo thí nghiệm. Đang chuyển đến trang setup...');
        } else {
          alert(`❌ Lỗi tạo thí nghiệm: ${data.error || 'Không xác định'}`);
        }
      }
    } catch (error) {
      console.error('❌ Error creating MA20 backtest:', error);
      alert('❌ Lỗi kết nối khi tạo thí nghiệm');
    } finally {
      setCreatingExperiment(false);
    }
  };

  const handleCreateExperiment = () => {
    setShowExperimentTypeModal(true);
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
      
      // Tạo timestamp từ ngày và giờ
      const startTimestamp = new Date(`${backtestConfig.startDate}T${backtestConfig.startTime}`).getTime();
      const endTimestamp = new Date(`${backtestConfig.endDate}T${backtestConfig.endTime}`).getTime();

      // Gọi API để lấy dữ liệu
      const response = await fetch('/api/research/ohlcv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: backtestConfig.symbol,
          timeframe: backtestConfig.timeframe,
          startTime: startTimestamp,
          endTime: endTimestamp
        })
      });

      if (!response.ok) {
        throw new Error('Failed to fetch OHLCV data');
      }

      const data = await response.json();
      setChartData(data.ohlcv || []);
    } catch (error) {
      console.error('Error loading chart data:', error);
      alert('Lỗi khi tải dữ liệu biểu đồ');
    } finally {
      setLoadingChart(false);
    }
  };

  // Đặt dataForChart ở đây, ngoài mọi block, trước return
  const dataForChart: OHLCV[] = chartData
    .map((candle: any) => ({
      timestamp: typeof candle.timestamp === 'string'
        ? new Date(candle.timestamp).getTime()
        : (candle.timestamp > 1e12 ? candle.timestamp : candle.timestamp * 1000),
      open: parseFloat(candle.open),
      high: parseFloat(candle.high),
      low: parseFloat(candle.low),
      close: parseFloat(candle.close),
      volume: parseFloat(candle.volume)
    }))
    .filter((candle: OHLCV) => 
      typeof candle.timestamp === 'number' && !isNaN(candle.timestamp) &&
      typeof candle.close === 'number' && !isNaN(candle.close) &&
      typeof candle.open === 'number' && !isNaN(candle.open) &&
      typeof candle.high === 'number' && !isNaN(candle.high) &&
      typeof candle.low === 'number' && !isNaN(candle.low) &&
      typeof candle.volume === 'number' && !isNaN(candle.volume)
    );

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
          <h3 className="text-lg font-semibold">Danh sách Thí nghiệm ({experiments.length})</h3>
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

      {/* Backtest Configuration Modal */}
      {showBacktestConfig && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto animate-in scale-x-95 duration-300 w-[1500px] max-h-[90vh] left-[50%] top-[50%] transform translate-x-[-50%] translate-y-[-50%]">
          <CardHeader>
            <CardTitle>Cấu hình Backtest</CardTitle>
            <CardDescription>
              Thiết lập các tham số cho thí nghiệm backtest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
                            data: dataForChart.map(candle => [
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
                        Dữ liệu đã tải: {dataForChart.length} nến
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
      {dataForChart && dataForChart.length > 0 && (
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
                  const previewData = dataForChart || [];
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
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="data">Cấu hình dữ liệu</TabsTrigger>
                  <TabsTrigger value="config">Cấu hình backtest</TabsTrigger>
                  <TabsTrigger value="script">Python script</TabsTrigger>
                  <TabsTrigger value="result">Backtest result</TabsTrigger>
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
                        />
                        <Input 
                          type="time"
                          value={backtestConfig.startTime}
                          onChange={(e) => handleBacktestConfigChange('startTime', e.target.value)}
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
                        />
                        <Input 
                          type="time"
                          value={backtestConfig.endTime}
                          onChange={(e) => handleBacktestConfigChange('endTime', e.target.value)}
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Mô tả</Label>
                      <Input 
                        placeholder="Nhập mô tả" 
                        value={backtestConfig.description}
                        onChange={(e) => handleBacktestConfigChange('description', e.target.value)}
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
                          <SelectItem value="macd">MACD</SelectItem>
                          <SelectItem value="rsi">RSI</SelectItem>
                          <div className="px-2 py-1 text-xs text-muted-foreground">Chiến lược nâng cao (AI)</div>
                          {/* Lấy danh sách model đã train từ models */}
                          {models.filter((m: any) => m.status === 'completed').map((m: any) => (
                            <SelectItem key={m.id} value={`ai_${m.id}`}>{`AI Model: ${m.name}`}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Thêm ô nhập rule giao dịch */}
                    {backtestConfig.strategyType === 'rsi' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Rule giao dịch RSI</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Mua khi RSI > ..."
                            value={backtestConfig.rsiBuy || ''}
                            onChange={e => handleBacktestConfigChange('rsiBuy', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Bán khi RSI < ..."
                            value={backtestConfig.rsiSell || ''}
                            onChange={e => handleBacktestConfigChange('rsiSell', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    {backtestConfig.strategyType === 'macd' && (
                      <div className="space-y-2 col-span-2">
                        <Label>Rule giao dịch MACD</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            type="number"
                            placeholder="Mua khi MACD > ..."
                            value={backtestConfig.macdBuy || ''}
                            onChange={e => handleBacktestConfigChange('macdBuy', e.target.value)}
                          />
                          <Input
                            type="number"
                            placeholder="Bán khi MACD < ..."
                            value={backtestConfig.macdSell || ''}
                            onChange={e => handleBacktestConfigChange('macdSell', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
                    {backtestConfig.strategyType && backtestConfig.strategyType.startsWith('ai_') && (
                      <div className="space-y-2 col-span-2">
                        <Label>Rule giao dịch AI Model</Label>
                        <Textarea
                          placeholder="Nhập rule giao dịch cho AI model (ví dụ: Mua khi dự báo tăng > 0.7, bán khi dự báo giảm > 0.7)"
                          value={backtestConfig.aiRule || ''}
                          onChange={e => handleBacktestConfigChange('aiRule', e.target.value)}
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Kích thước vị thế (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.positionSize}
                        onChange={(e) => handleBacktestConfigChange('positionSize', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Stop Loss (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.stopLoss}
                        onChange={(e) => handleBacktestConfigChange('stopLoss', Number(e.target.value))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Take Profit (%)</Label>
                      <Input 
                        type="number"
                        value={backtestConfig.takeProfit}
                        onChange={(e) => handleBacktestConfigChange('takeProfit', Number(e.target.value))}
                      />
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
                <TabsContent value="result" className="space-y-4">
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
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
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
          </CardFooter>
        </Card>
      )}

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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {experiments.map((experiment) => (
            <Card key={experiment.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <TestTube className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{experiment.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          experiment.status === 'completed' ? 'default' :
                          experiment.status === 'running' ? 'secondary' :
                          experiment.status === 'failed' ? 'destructive' : 'outline'
                        }>
                          {experiment.status === 'completed' ? '✅ Hoàn thành' :
                           experiment.status === 'running' ? '🔄 Đang chạy' :
                           experiment.status === 'failed' ? '❌ Lỗi' : 
                           experiment.status === 'pending' ? '⏳ Chờ' : experiment.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {experiment.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Progress:</span>
                    <span>{experiment.progress}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Created:</span>
                    <span>{new Date(experiment.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  {experiment.description && (
                    <div className="pt-2 border-t">
                      <p className="text-xs text-muted-foreground">{experiment.description}</p>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 mt-4">
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

      {/* Experiment Details Modal */}
      {showDetails && selectedExperiment && (
        <Card className="fixed inset-4 z-50 bg-background border shadow-lg overflow-auto">
          <CardHeader className="sticky top-0 bg-background border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TestTube className="h-5 w-5" />
                  Chi tiết thí nghiệm: {selectedExperiment.name}
                  {isLoadingDetails && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  )}
                </CardTitle>
                <CardDescription>
                  Xem và quản lý chi tiết thí nghiệm
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => viewExperimentDetails(selectedExperiment)}
                  disabled={isLoadingDetails}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  {isLoadingDetails ? 'Đang tải...' : 'Refresh'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    console.log('🔍 [Modal] Closing details modal');
                    setShowDetails(false);
                    setSelectedExperiment(null);
                  }}
                >
                  <X className="h-4 w-4 mr-2" />
                  Đóng
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Thông tin cơ bản</CardTitle>
              </CardHeader>
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
                  <div>
                    <Label>Loại thí nghiệm</Label>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {selectedExperiment.type}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <Label>Ngày tạo</Label>
                    <div className="mt-1 text-sm">
                      {new Date(selectedExperiment.created_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                  <div>
                    <Label>Tiến độ</Label>
                    <div className="mt-1">
                      <Progress value={selectedExperiment.progress || 0} className="h-2" />
                      <span className="text-sm text-muted-foreground mt-1 block">
                        {selectedExperiment.progress || 0}%
                      </span>
                    </div>
                  </div>
                </div>
                {selectedExperiment.description && (
                  <div>
                    <Label>Mô tả</Label>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {selectedExperiment.description}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cấu hình</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-muted p-4 rounded-lg">
                  <pre className="text-sm overflow-auto">
                    {JSON.stringify(selectedExperiment.config || {}, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {selectedExperiment.results && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Kết quả</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-sm overflow-auto">
                      {JSON.stringify(selectedExperiment.results, null, 2)}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Error Log */}
            {selectedExperiment.error && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base text-red-500">Lỗi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-700/30">
                    <pre className="text-sm text-red-600 dark:text-red-400 overflow-auto">
                      {selectedExperiment.error}
                    </pre>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t">
              {selectedExperiment.status === 'pending' && (
                <Button 
                  onClick={() => startExperiment(selectedExperiment.id)}
                  className="flex-1"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Bắt đầu thí nghiệm
                </Button>
              )}
              {selectedExperiment.status === 'running' && (
                <Button 
                  variant="destructive"
                  className="flex-1"
                  onClick={() => {/* TODO: Stop experiment */}}
                >
                  <X className="h-4 w-4 mr-2" />
                  Dừng thí nghiệm
                </Button>
              )}
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => {/* TODO: Export results */}}
              >
                <Download className="h-4 w-4 mr-2" />
                Xuất kết quả
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart Section */}
      {(() => {
        return (
          <PriceChart 
            symbol={backtestConfig.symbol}
            timeframe={backtestConfig.timeframe}
            data={dataForChart}
          />
        );
      })()}
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

  useEffect(() => {
    fetchProjectDetails();
    fetchProjectModels();
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
          <TabsTrigger value="results">Kết quả</TabsTrigger>
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
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  onClick={() => setActiveTab('results')}
                >
                  <BarChart3 className="h-6 w-6" />
                  <span>Xem Results</span>
                  <span className="text-xs text-muted-foreground">Performance analysis</span>
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

        <TabsContent value="results" className="space-y-6">
          <ResultsTab projectId={projectId} models={models} />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SettingsTab project={project} onUpdate={fetchProjectDetails} />
        </TabsContent>
      </Tabs>
    </div>
  );
} 