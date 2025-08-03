"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { 
  Brain, 
  TrendingUp, 
  Settings, 
  Play, 
  Save,
  Plus,
  Eye,
  BarChart3,
  Zap,
  Code,
  Download,
  Star,
  CheckCircle,
  Clock,
  Activity,
  Database,
  Calendar,
  Layers,
  FileCode,
  Terminal
} from "lucide-react";
import { ModelPerformanceDisplay } from '../model-performance-display';

interface Model {
  id: string;
  project_id: string;
  name: string;
  category: string;
  algorithm_type?: string;
  model_type?: string;
  algorithm?: string;
  status: string;
  performance_metrics?: any;
  data_config?: any;
  training_config?: any;
  created_at: string;
}

interface DataConfig {
  source_table: string;
  sample_size: number;
  time_range: {
    start_date: string;
    end_date: string;
    period: string; // '1d', '1w', '1m', '3m', '6m', '1y', 'all'
  };
  train_test_split: number; // percentage for training (70-90%)
  features: string[];
  target_column: string;
  preprocessing: {
    normalize: boolean;
    handle_missing: string; // 'drop', 'fill_mean', 'fill_forward'
    remove_outliers: boolean;
  };
}

export function ModelBuilderTab() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('');

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    setSelectedAlgorithm(''); // Reset algorithm when category changes
  };
  const [loading, setLoading] = useState(false);
  const [models, setModels] = useState<Model[]>([]);
  const [modelsLoading, setModelsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  
  // Model creation form states
  const [modelName, setModelName] = useState('');
  const [modelDescription, setModelDescription] = useState('');
  
  // Data configuration states
  const [dataConfig, setDataConfig] = useState<DataConfig>({
    source_table: 'crypto_ohlcv_1h',
    sample_size: 10000,
    time_range: {
      start_date: '2024-01-01',
      end_date: '2024-12-31',
      period: '6m'
    },
    train_test_split: 80,
    features: ['open', 'high', 'low', 'close', 'volume'],
    target_column: 'close',
    preprocessing: {
      normalize: true,
      handle_missing: 'fill_forward',
      remove_outliers: false
    }
  });

  const [trainTestSplit, setTrainTestSplit] = useState([80]);
  const [sampleSize, setSampleSize] = useState([10000]);

  // Code Editor states
  const [pythonScript, setPythonScript] = useState<string>('');
  const [scriptVisible, setScriptVisible] = useState(false);

  const availableTables = [
    { id: 'crypto_ohlcv_1h', name: 'Crypto OHLCV (1H)', description: 'Hourly crypto price data', records: '2.7M' },
    { id: 'crypto_ohlcv_1d', name: 'Crypto OHLCV (1D)', description: 'Daily crypto price data', records: '45K' },
    { id: 'stock_prices', name: 'Stock Prices', description: 'Stock market data', records: '1.2M' },
    { id: 'market_indicators', name: 'Market Indicators', description: 'Economic indicators', records: '50K' }
  ];

  const timePeriods = [
    { id: '1w', name: '1 tuần', days: 7 },
    { id: '1m', name: '1 tháng', days: 30 },
    { id: '3m', name: '3 tháng', days: 90 },
    { id: '6m', name: '6 tháng', days: 180 },
    { id: '1y', name: '1 năm', days: 365 },
    { id: 'all', name: 'Tất cả', days: null }
  ];

  const modelCategories = [
    {
      id: 'statistical',
      name: 'Mô hình Thống kê',
      description: 'Các mô hình dựa trên thống kê và econometrics',
      algorithms: [
        { id: 'linear_regression', name: 'Hồi quy tuyến tính', difficulty: 'beginner' },
        { id: 'arima', name: 'ARIMA', difficulty: 'intermediate' },
        { id: 'garch', name: 'GARCH', difficulty: 'advanced' },
        { id: 'var', name: 'Vector Autoregression (VAR)', difficulty: 'advanced' },
        { id: 'cointegration', name: 'Cointegration', difficulty: 'advanced' }
      ]
    },
    {
      id: 'machine_learning',
      name: 'Học máy',
      description: 'Các thuật toán machine learning và deep learning',
      algorithms: [
        { id: 'random_forest', name: 'Random Forest', difficulty: 'beginner' },
        { id: 'gradient_boosting', name: 'Gradient Boosting', difficulty: 'intermediate' },
        { id: 'xgboost', name: 'XGBoost', difficulty: 'intermediate' },
        { id: 'neural_network', name: 'Neural Network', difficulty: 'advanced' },
        { id: 'lstm', name: 'LSTM', difficulty: 'advanced' },
        { id: 'svm', name: 'Support Vector Machine', difficulty: 'intermediate' }
      ]
    },
    {
      id: 'financial_math',
      name: 'Toán tài chính',
      description: 'Các mô hình toán học tài chính chuyên dụng',
      algorithms: [
        { id: 'black_scholes', name: 'Black-Scholes', difficulty: 'intermediate' },
        { id: 'capm', name: 'CAPM', difficulty: 'beginner' },
        { id: 'var_model', name: 'Value at Risk', difficulty: 'intermediate' },
        { id: 'monte_carlo', name: 'Monte Carlo', difficulty: 'advanced' },
        { id: 'binomial_tree', name: 'Binomial Tree', difficulty: 'intermediate' }
      ]
    }
  ];

  const templates = [
    {
      id: 'lstm-btc',
      name: 'Bitcoin LSTM Predictor',
      category: 'Deep Learning',
      description: 'LSTM neural network để predict BTC price',
      difficulty: 'Advanced',
      rating: 4.8,
      downloads: 1247
    },
    {
      id: 'rf-momentum',
      name: 'Random Forest Momentum',
      category: 'Machine Learning',
      description: 'Random Forest cho momentum strategy',
      difficulty: 'Intermediate',
      rating: 4.6,
      downloads: 2134
    },
    {
      id: 'arima-forecast',
      name: 'ARIMA Price Forecast',
      category: 'Statistical',
      description: 'Time series forecasting với ARIMA',
      difficulty: 'Beginner',
      rating: 4.3,
      downloads: 3421
    }
  ];

  useEffect(() => {
    fetchModels();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/research/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
        if (data.projects?.length > 0 && !selectedProject) {
          setSelectedProject(data.projects[0].id);
        }
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
    }
  };

  const fetchModels = async () => {
    try {
      setModelsLoading(true);
      console.log('🧠 Fetching all models...');
      
      const response = await fetch('/api/research/models');
      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Retrieved ${data.models?.length || 0} models`);
        setModels(data.models || []);
      } else {
        console.error('❌ Failed to fetch models:', data);
      }
    } catch (error) {
      console.error('❌ Error fetching models:', error);
    } finally {
      setModelsLoading(false);
    }
  };

  const createModel = async () => {
    console.log('🔍 [Create Model] Validation check:', {
      modelName: modelName.trim(),
      selectedCategory,
      selectedAlgorithm,
      selectedProject
    });

    if (!modelName.trim() || !selectedCategory || !selectedAlgorithm || !selectedProject) {
      alert('Vui lòng điền đầy đủ thông tin model');
      return;
    }

    setLoading(true);
    try {
      const modelData = {
        project_id: selectedProject,
        name: modelName.trim(),
        description: modelDescription.trim(),
        category: selectedCategory,
        algorithm_type: selectedAlgorithm,
        status: 'draft',
        feature_config: dataConfig,
        training_config: {
          train_test_split: trainTestSplit[0] / 100,
          sample_size: sampleSize[0],
          created_by: 'user',
          created_at: new Date().toISOString()
        }
      };

      console.log('📋 [Create Model] Sending model data:', modelData);

      const response = await fetch('/api/research/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(modelData)
      });

      console.log('📡 [Create Model] Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Model created:', result.model);
        await fetchModels();
        
        // Reset form
        setModelName('');
        setModelDescription('');
        setSelectedCategory('');
        setSelectedAlgorithm('');
        setDataConfig({
          source_table: 'crypto_ohlcv_1h',
          sample_size: 10000,
          time_range: {
            start_date: '2024-01-01',
            end_date: '2024-12-31',
            period: '6m'
          },
          train_test_split: 80,
          features: ['open', 'high', 'low', 'close', 'volume'],
          target_column: 'close',
          preprocessing: {
            normalize: true,
            handle_missing: 'fill_forward',
            remove_outliers: false
          }
        });
        
        alert('✅ Model đã được tạo thành công!');
      } else {
        const error = await response.json();
        console.error('❌ Failed to create model:', error);
        console.error('❌ Error details:', {
          status: response.status,
          statusText: response.statusText,
          error: error
        });
        alert(`❌ Lỗi tạo model: ${error.error || error.details || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      alert('❌ Lỗi kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async (modelId: string) => {
    try {
      console.log('🚀 Starting training for model:', modelId);
      
      const response = await fetch('/api/research/models/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          modelId,
          action: 'train',
          config: { generate_script: true }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Training started:', result);
        
        // If Python script was generated, show it in code editor
        if (result.pythonScript) {
          setPythonScript(result.pythonScript);
          setScriptVisible(true);
          
          // Switch to code editor tab
          setTimeout(() => {
            const codeTab = document.querySelector('[value="code-editor"]') as HTMLElement;
            codeTab?.click();
          }, 500);
        }
        
        await fetchModels();
        alert('✅ Training đã bắt đầu! Python script đã được tạo - kiểm tra tab Code Editor.');
      } else {
        const error = await response.json();
        console.error('❌ Failed to train model:', error);
        alert(`❌ Lỗi training: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Training error:', error);
      alert('❌ Lỗi kết nối khi training model');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Enhanced Model Builder</h2>
          <p className="text-muted-foreground">
            Xây dựng models với real data configuration và Python script generation
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchModels} disabled={modelsLoading}>
            <Activity className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => {
            // Switch to enhanced builder tab
            const builderTab = document.querySelector('[value="enhanced-builder"]') as HTMLElement;
            builderTab?.click();
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Model Mới
          </Button>
        </div>
      </div>

      <Tabs defaultValue="my-models" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="my-models">My Models ({models.length})</TabsTrigger>
          <TabsTrigger value="enhanced-builder">Enhanced Builder</TabsTrigger>
          <TabsTrigger value="data-config">Data Config</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="code-editor">Code Editor</TabsTrigger>
        </TabsList>

        <TabsContent value="my-models" className="space-y-4">
          {modelsLoading ? (
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Đang tải models...</span>
            </div>
          ) : models.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {models.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{model.name}</CardTitle>
                        <CardDescription>{model.model_type || model.algorithm}</CardDescription>
                      </div>
                      <Badge variant={
                        model.status === 'completed' ? 'default' :
                        model.status === 'training' ? 'secondary' : 'outline'
                      }>
                        {model.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
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
                            {model.data_config.source_table} • {model.data_config.sample_size.toLocaleString()} samples
                          </div>
                        </div>
                      )}
                      {model.performance_metrics && (
                        <ModelPerformanceDisplay 
                          performanceMetrics={model.performance_metrics}
                          compact={true}
                        />
                      )}
                    </div>
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" className="flex-1">
                        <Eye className="h-3 w-3 mr-1" />
                        View
                      </Button>
                      <Button size="sm" variant="outline">
                        <Settings className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                      {model.status === 'draft' && (
                        <Button 
                          size="sm" 
                          variant="default"
                          onClick={() => trainModel(model.id)}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          Train
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">Chưa có model nào</h3>
                <p className="text-muted-foreground mb-4">
                  Tạo model đầu tiên với Enhanced Builder
                </p>
                <Button onClick={() => {
                  const builderTab = document.querySelector('[value="enhanced-builder"]') as HTMLElement;
                  builderTab?.click();
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Tạo Model Đầu Tiên
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="enhanced-builder" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Model Builder</CardTitle>
              <CardDescription>
                Tạo model với data configuration và Python script generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Thông tin cơ bản</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="project-select">Dự án</Label>
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn dự án" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="model-name">Tên Model</Label>
                    <Input
                      id="model-name"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="Ví dụ: Bitcoin LSTM Predictor"
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="model-description">Mô tả</Label>
                  <Textarea
                    id="model-description"
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    placeholder="Mô tả chi tiết về model và mục đích sử dụng"
                    rows={3}
                  />
                </div>
              </div>

              <Separator />

              {/* Algorithm Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Lựa chọn thuật toán</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Loại Model</Label>
                    <Select value={selectedCategory} onValueChange={handleCategoryChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn loại model" />
                      </SelectTrigger>
                      <SelectContent>
                        {modelCategories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Thuật toán</Label>
                    <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn thuật toán" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedCategory && modelCategories
                          .find(cat => cat.id === selectedCategory)?.algorithms
                          .map((algorithm) => (
                          <SelectItem key={algorithm.id} value={algorithm.id}>
                            <div className="flex items-center gap-2">
                              <span>{algorithm.name}</span>
                              <Badge variant={algorithm.difficulty === 'beginner' ? 'secondary' : 'default'} className="text-xs">
                                {algorithm.difficulty}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Data Config Preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Cấu hình dữ liệu</h3>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const dataTab = document.querySelector('[value="data-config"]') as HTMLElement;
                      dataTab?.click();
                    }}
                  >
                    <Database className="h-4 w-4 mr-2" />
                    Chi tiết
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Bảng dữ liệu</div>
                    <div className="font-medium">{dataConfig.source_table}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Số mẫu</div>
                    <div className="font-medium">{dataConfig.sample_size.toLocaleString()}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Thời gian</div>
                    <div className="font-medium">{dataConfig.time_range.period}</div>
                  </Card>
                  <Card className="p-3">
                    <div className="text-sm text-muted-foreground">Train/Test</div>
                    <div className="font-medium">{dataConfig.train_test_split}%/{ 100 - dataConfig.train_test_split}%</div>
                  </Card>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  onClick={createModel}
                  disabled={loading || !modelName.trim() || !selectedCategory || !selectedAlgorithm || !selectedProject}
                  className="flex-1"
                >
                  {loading ? (
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
                <Button 
                  variant="outline"
                  onClick={async () => {
                    try {
                      const testData = {
                        project_id: selectedProject,
                        name: modelName.trim() || 'Test Model',
                        description: modelDescription.trim() || 'Test description',
                        category: selectedCategory || 'machine_learning',
                        algorithm_type: selectedAlgorithm || 'linear_regression'
                      };
                      
                      console.log('🧪 Testing with data:', testData);
                      
                      const response = await fetch('/api/research/models/test', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(testData)
                      });
                      
                      const result = await response.json();
                      console.log('🧪 Test result:', result);
                      
                      if (response.ok) {
                        alert('✅ Test thành công! Kiểm tra console để xem chi tiết.');
                      } else {
                        alert(`❌ Test thất bại: ${result.error || result.details || 'Unknown error'}`);
                      }
                    } catch (error) {
                      console.error('❌ Test error:', error);
                      alert('❌ Lỗi test');
                    }
                  }}
                >
                  🧪 Test
                </Button>
                <Button variant="outline">
                  <Save className="h-4 w-4 mr-2" />
                  Lưu Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="data-config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cấu hình dữ liệu
              </CardTitle>
              <CardDescription>
                Thiết lập chi tiết về nguồn dữ liệu và preprocessing
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Data Source */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Nguồn dữ liệu</h3>
                
                <div>
                  <Label>Bảng dữ liệu</Label>
                  <Select value={dataConfig.source_table} onValueChange={(value) => 
                    setDataConfig(prev => ({ ...prev, source_table: value }))
                  }>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTables.map((table) => (
                        <SelectItem key={table.id} value={table.id}>
                          <div className="flex flex-col items-start">
                            <span className="font-medium">{table.name}</span>
                            <span className="text-xs text-muted-foreground">{table.description} • {table.records} records</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Khoảng thời gian</Label>
                    <Select value={dataConfig.time_range.period} onValueChange={(value) => 
                      setDataConfig(prev => ({ 
                        ...prev, 
                        time_range: { ...prev.time_range, period: value }
                      }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {timePeriods.map((period) => (
                          <SelectItem key={period.id} value={period.id}>
                            {period.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Target Column</Label>
                    <Select value={dataConfig.target_column} onValueChange={(value) => 
                      setDataConfig(prev => ({ ...prev, target_column: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dataConfig.features.map((feature) => (
                          <SelectItem key={feature} value={feature}>
                            {feature}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sampling Configuration */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Cấu hình mẫu</h3>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Số lượng mẫu</Label>
                    <span className="text-sm text-muted-foreground">{sampleSize[0].toLocaleString()}</span>
                  </div>
                  <Slider
                    value={sampleSize}
                    onValueChange={(value) => {
                      setSampleSize(value);
                      setDataConfig(prev => ({ ...prev, sample_size: value[0] }));
                    }}
                    min={1000}
                    max={100000}
                    step={1000}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>1K</span>
                    <span>100K</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Label>Train/Test Split</Label>
                    <span className="text-sm text-muted-foreground">{trainTestSplit[0]}% / {100 - trainTestSplit[0]}%</span>
                  </div>
                  <Slider
                    value={trainTestSplit}
                    onValueChange={(value) => {
                      setTrainTestSplit(value);
                      setDataConfig(prev => ({ ...prev, train_test_split: value[0] }));
                    }}
                    min={60}
                    max={90}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>60%</span>
                    <span>90%</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Preprocessing Options */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Preprocessing</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Normalize Data</Label>
                      <p className="text-xs text-muted-foreground">Scale features to 0-1 range</p>
                    </div>
                    <Switch
                      checked={dataConfig.preprocessing.normalize}
                      onCheckedChange={(checked) => 
                        setDataConfig(prev => ({ 
                          ...prev, 
                          preprocessing: { ...prev.preprocessing, normalize: checked }
                        }))
                      }
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Remove Outliers</Label>
                      <p className="text-xs text-muted-foreground">Filter extreme values</p>
                    </div>
                    <Switch
                      checked={dataConfig.preprocessing.remove_outliers}
                      onCheckedChange={(checked) => 
                        setDataConfig(prev => ({ 
                          ...prev, 
                          preprocessing: { ...prev.preprocessing, remove_outliers: checked }
                        }))
                      }
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Missing Values</Label>
                    <Select value={dataConfig.preprocessing.handle_missing} onValueChange={(value) => 
                      setDataConfig(prev => ({ 
                        ...prev, 
                        preprocessing: { ...prev.preprocessing, handle_missing: value }
                      }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="drop">Drop rows</SelectItem>
                        <SelectItem value="fill_mean">Fill with mean</SelectItem>
                        <SelectItem value="fill_forward">Forward fill</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <Alert>
                <Database className="h-4 w-4" />
                <AlertDescription>
                  Cấu hình sẽ được áp dụng khi tạo model mới. Có thể preview dữ liệu trước khi training.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </div>
                    <Badge variant="outline">{template.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span>{template.rating}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      <span>{template.downloads.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Play className="h-3 w-3 mr-1" />
                      Use Template
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-3 w-3 mr-1" />
                      Preview
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="code-editor" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCode className="h-5 w-5" />
                Python Code Editor
              </CardTitle>
              <CardDescription>
                Generated Python scripts cho model training
              </CardDescription>
            </CardHeader>
            <CardContent>
              {scriptVisible && pythonScript ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Generated Script</Badge>
                      <span className="text-sm text-muted-foreground">
                        Ready to execute
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          navigator.clipboard.writeText(pythonScript);
                          alert('✅ Script copied to clipboard!');
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Copy
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          const blob = new Blob([pythonScript], { type: 'text/plain' });
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'model_training_script.py';
                          document.body.appendChild(a);
                          a.click();
                          window.URL.revokeObjectURL(url);
                          document.body.removeChild(a);
                        }}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  </div>

                  <div className="border rounded-md">
                    <div className="bg-muted px-3 py-2 border-b">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="ml-2 text-sm font-mono">model_training_script.py</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <pre className="text-sm font-mono overflow-x-auto max-h-96 bg-gray-50 p-4 rounded border whitespace-pre-wrap">
                        {pythonScript}
                      </pre>
                    </div>
                  </div>

                  <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Cách chạy script:</strong>
                      <br />
                      1. Copy script hoặc download file
                      <br />
                      2. Cài đặt dependencies: <code className="bg-muted px-1 rounded">pip install pandas numpy scikit-learn supabase</code>
                      <br />
                      3. Set environment variables cho Supabase
                      <br />
                      4. Chạy: <code className="bg-muted px-1 rounded">python model_training_script.py</code>
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Zap className="h-4 w-4 text-blue-500" />
                        <span className="font-medium text-sm">Quick Run</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Run script in cloud environment
                      </p>
                      <Button size="sm" className="mt-2 w-full" disabled>
                        <Play className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="h-4 w-4 text-green-500" />
                        <span className="font-medium text-sm">Edit Script</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Modify và customize training logic
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 w-full" disabled>
                        <Settings className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Button>
                    </Card>

                    <Card className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="h-4 w-4 text-purple-500" />
                        <span className="font-medium text-sm">Monitor</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Track training progress real-time
                      </p>
                      <Button size="sm" variant="outline" className="mt-2 w-full" disabled>
                        <Activity className="h-3 w-3 mr-1" />
                        Coming Soon
                      </Button>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <FileCode className="h-12 w-12 mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Script Generated Yet</h3>
                  <p className="mb-4">
                    Tạo model và click "Train" để generate Python script tự động
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const builderTab = document.querySelector('[value="enhanced-builder"]') as HTMLElement;
                        builderTab?.click();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo Model
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const modelsTab = document.querySelector('[value="my-models"]') as HTMLElement;
                        modelsTab?.click();
                      }}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Models
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 