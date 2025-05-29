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
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Settings, 
  TrendingUp, 
  Target,
  Play, 
  Save,
  Plus,
  Eye,
  Download,
  Clock,
  Zap,
  Brain,
  BarChart3,
  HelpCircle,
  CheckCircle,
  AlertTriangle,
  Pause,
  RotateCcw,
  FileText
} from "lucide-react";

interface OptimizationJob {
  id: string;
  name: string;
  method: string;
  objective: string;
  progress: number;
  currentIteration: number;
  totalIterations: number;
  bestScore: number;
  estimatedTimeRemaining: number;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startedAt?: string;
  completedAt?: string;
  config?: any;
  bestParams?: any;
  improvementPct?: number;
}

interface OptimizationTabProps {
  projects?: any[];
  availableModels?: any[];
}

export function OptimizationTab({ projects = [], availableModels = [] }: OptimizationTabProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>('bayesian_optimization');
  const [selectedObjective, setSelectedObjective] = useState<string>('maximize_sharpe');
  const [selectedModel, setSelectedModel] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [optimizationJobs, setOptimizationJobs] = useState<OptimizationJob[]>([]);
  const [jobName, setJobName] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  
  // Parameter configuration states
  const [enableGridSearch, setEnableGridSearch] = useState(true);
  const [enableBayesianOpt, setEnableBayesianOpt] = useState(false);
  const [enableRandomSearch, setEnableRandomSearch] = useState(false);
  const [maxIterations, setMaxIterations] = useState([100]);
  const [nJobs, setNJobs] = useState([4]);
  const [crossValidationFolds, setCrossValidationFolds] = useState([5]);
  const [randomState, setRandomState] = useState(42);

  // Auto-select first project when projects load
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0].id);
    }
  }, [projects, selectedProject]);

  // Filter models based on selected project
  const filteredModels = availableModels.filter(model => 
    !selectedProject || model.project_id === selectedProject
  );

  // Fetch existing optimization jobs
  useEffect(() => {
    if (selectedProject) {
      fetchOptimizationJobs();
    }
  }, [selectedProject]);

  const fetchOptimizationJobs = async () => {
    if (!selectedProject) return;
    
    try {
      const response = await fetch(`/api/research/optimization?project_id=${selectedProject}`);
      if (response.ok) {
        const data = await response.json();
        setOptimizationJobs(data.jobs || []);
      }
    } catch (error) {
      console.error('❌ Failed to fetch optimization jobs:', error);
    }
  };

  const createOptimizationJob = async () => {
    if (!selectedProject || !selectedModel || !jobName.trim()) {
      alert('Vui lòng chọn dự án, model và nhập tên job');
      return;
    }

    setLoading(true);
    try {
      const config = {
        method: selectedMethod,
        objective: selectedObjective,
        maxIterations: maxIterations[0],
        crossValidationFolds: crossValidationFolds[0],
        nJobs: nJobs[0],
        randomState,
        enabledMethods: {
          gridSearch: enableGridSearch,
          bayesianOpt: enableBayesianOpt,
          randomSearch: enableRandomSearch
        }
      };

      const response = await fetch('/api/research/optimization', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: selectedProject,
          model_id: selectedModel,
          name: jobName.trim(),
          description: jobDescription.trim(),
          method: selectedMethod,
          objective: selectedObjective,
          parameter_space: generateParameterSpace(selectedModel),
          max_iterations: maxIterations[0],
          config
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Optimization job created:', data.job);
        await fetchOptimizationJobs();
        setActiveTab('running');
        
        // Reset form
        setJobName('');
        setJobDescription('');
      } else {
        const error = await response.json();
        console.error('❌ Failed to create optimization job:', error);
        alert('Lỗi tạo optimization job: ' + (error.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Network error:', error);
      alert('Lỗi kết nối mạng');
    } finally {
      setLoading(false);
    }
  };

  const generateParameterSpace = (modelId: string) => {
    // Get the model and generate parameter space based on algorithm type
    const model = filteredModels.find(m => m.id === modelId);
    if (!model) return {};

    const algorithm = model.model_type || model.algorithm || 'Linear Regression';
    
    if (algorithm.includes('LSTM') || algorithm.includes('GRU')) {
      return {
        learning_rate: [0.0001, 0.01, 'log-uniform'],
        hidden_units: [32, 256, 'int'],
        epochs: [50, 200, 'int'],
        batch_size: [16, 128, 'int'],
        dropout: [0.1, 0.5, 'uniform']
      };
    }
    
    if (algorithm.includes('Random Forest')) {
      return {
        n_estimators: [50, 500, 'int'],
        max_depth: [5, 50, 'int'],
        min_samples_split: [2, 20, 'int'],
        min_samples_leaf: [1, 10, 'int']
      };
    }
    
    if (algorithm.includes('ARIMA')) {
      return {
        p: [0, 5, 'int'],
        d: [0, 2, 'int'],
        q: [0, 5, 'int'],
        seasonal_p: [0, 2, 'int'],
        seasonal_d: [0, 1, 'int'],
        seasonal_q: [0, 2, 'int']
      };
    }

    // Default parameter space
    return {
      learning_rate: [0.001, 0.1, 'log-uniform'],
      regularization: [0.0001, 0.1, 'log-uniform']
    };
  };

  const controlOptimizationJob = async (jobId: string, action: 'pause' | 'resume' | 'stop') => {
    try {
      const response = await fetch(`/api/research/optimization/${jobId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        await fetchOptimizationJobs();
      } else {
        const error = await response.json();
        console.error(`❌ Failed to ${action} job:`, error);
      }
    } catch (error) {
      console.error(`❌ Network error controlling job:`, error);
    }
  };

  const downloadResults = async (jobId: string) => {
    try {
      const response = await fetch(`/api/research/optimization/${jobId}/results`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `optimization_results_${jobId}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('❌ Failed to download results:', error);
    }
  };

  // Tooltip explanations for parameters
  const parameterHelp = {
    maxIterations: {
      title: "Số lần lặp tối đa",
      explanation: "Số lần thử nghiệm tối đa mà thuật toán sẽ chạy để tìm tham số tối ưu. Số càng cao thì có thể tìm được kết quả tốt hơn nhưng sẽ mất nhiều thời gian hơn."
    },
    crossValidation: {
      title: "Cross Validation Folds",
      explanation: "Chia dữ liệu thành K phần để đánh giá model. Số fold càng cao thì đánh giá càng chính xác nhưng thời gian training sẽ lâu hơn. Thường dùng 5 hoặc 10 folds."
    },
    nJobs: {
      title: "Số luồng xử lý",
      explanation: "Số CPU cores được sử dụng để chạy song song. -1 nghĩa là dùng tất cả cores có sẵn. Tăng số này sẽ chạy nhanh hơn nhưng tốn nhiều tài nguyên hệ thống."
    },
    randomState: {
      title: "Random State",
      explanation: "Seed để đảm bảo kết quả có thể tái tạo được. Cùng một random state sẽ cho ra cùng kết quả mỗi lần chạy. Hữu ích để debug và so sánh các experiment."
    },
    gridSearch: {
      title: "Grid Search",
      explanation: "Thử tất cả các tổ hợp tham số có thể trong một lưới định sẵn. Đảm bảo tìm được tối ưu trong không gian tìm kiếm nhưng rất chậm với nhiều tham số."
    },
    bayesianOpt: {
      title: "Bayesian Optimization",
      explanation: "Sử dụng Gaussian Process để dự đoán tham số tốt nhất tiếp theo dựa trên kết quả trước đó. Thông minh và hiệu quả hơn Grid Search, phù hợp khi số lượng tham số lớn."
    },
    randomSearch: {
      title: "Random Search",
      explanation: "Chọn ngẫu nhiên các tham số trong không gian tìm kiếm. Nhanh hơn Grid Search và thường cho kết quả tốt với high-dimensional parameter space."
    }
  };

  const optimizationMethods = [
    {
      id: 'grid_search',
      name: 'Grid Search',
      description: 'Tìm kiếm toàn bộ không gian tham số theo lưới',
      pros: ['Đơn giản', 'Đảm bảo tìm được tối ưu trong không gian tìm kiếm'],
      cons: ['Chậm với nhiều tham số', 'Curse of dimensionality'],
      difficulty: 'beginner',
      estimatedTime: 'Chậm'
    },
    {
      id: 'random_search',
      name: 'Random Search',
      description: 'Tìm kiếm ngẫu nhiên trong không gian tham số',
      pros: ['Nhanh hơn Grid Search', 'Hiệu quả với high-dimensional space'],
      cons: ['Không đảm bảo tìm được global optimum', 'Kém hiệu quả với discrete parameters'],
      difficulty: 'beginner',
      estimatedTime: 'Trung bình'
    },
    {
      id: 'bayesian_optimization',
      name: 'Bayesian Optimization',
      description: 'Sử dụng Gaussian Process để tối ưu hóa thông minh',
      pros: ['Hiệu quả với ít iterations', 'Tự động balance exploration/exploitation'],
      cons: ['Phức tạp hơn', 'Khó tune hyperparameters'],
      difficulty: 'advanced',
      estimatedTime: 'Nhanh'
    },
    {
      id: 'genetic_algorithm',
      name: 'Genetic Algorithm',
      description: 'Mô phỏng quá trình tiến hóa để tối ưu hóa',
      pros: ['Tốt với non-convex problems', 'Có thể tìm global optimum'],
      cons: ['Chậm', 'Nhiều hyperparameters cần tune'],
      difficulty: 'advanced',
      estimatedTime: 'Chậm'
    }
  ];

  const objectives = [
    {
      id: 'maximize_sharpe',
      name: 'Maximize Sharpe Ratio',
      description: 'Tối đa hóa tỷ lệ return/risk',
      formula: '(Return - Risk Free Rate) / Volatility'
    },
    {
      id: 'minimize_drawdown',
      name: 'Minimize Drawdown',
      description: 'Giảm thiểu mức lỗ tối đa',
      formula: 'Min(Max Drawdown %)'
    },
    {
      id: 'maximize_return',
      name: 'Maximize Return',
      description: 'Tối đa hóa lợi nhuận tuyệt đối',
      formula: 'Max(Total Return %)'
    },
    {
      id: 'minimize_volatility',
      name: 'Minimize Volatility',
      description: 'Giảm thiểu độ biến động',
      formula: 'Min(Standard Deviation of Returns)'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'paused': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <Zap className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'failed': return <AlertTriangle className="h-4 w-4" />;
      case 'paused': return <Pause className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const completedJobs = optimizationJobs.filter(job => job.status === 'completed');
  const runningJobs = optimizationJobs.filter(job => ['running', 'pending', 'paused'].includes(job.status));

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Tối ưu hóa Tham số</h2>
            <p className="text-muted-foreground">
              Tự động tìm kiếm tham số tối ưu cho strategy và models
            </p>
          </div>
          <Button onClick={fetchOptimizationJobs} variant="outline">
            <RotateCcw className="h-4 w-4 mr-2" />
            Làm mới
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">Tạo Optimization</TabsTrigger>
            <TabsTrigger value="running">Đang chạy ({runningJobs.length})</TabsTrigger>
            <TabsTrigger value="results">Kết quả ({completedJobs.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="create" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Cấu hình Optimization Job
                </CardTitle>
                <CardDescription>
                  Thiết lập parameters cho thuật toán tối ưu hóa
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Job Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
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
                      <Label htmlFor="job-name">Tên Job</Label>
                      <Input
                        id="job-name"
                        value={jobName}
                        onChange={(e) => setJobName(e.target.value)}
                        placeholder="Ví dụ: LSTM Hyperparameter Tuning"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="model-select">Model</Label>
                      <Select value={selectedModel} onValueChange={setSelectedModel}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn model để optimize" />
                        </SelectTrigger>
                        <SelectContent>
                          {filteredModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.algorithm_type})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="job-description">Mô tả (tùy chọn)</Label>
                      <Textarea
                        id="job-description"
                        value={jobDescription}
                        onChange={(e) => setJobDescription(e.target.value)}
                        placeholder="Mô tả chi tiết về mục tiêu optimization..."
                        rows={3}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Optimization Method Selection */}
                    <div>
                      <Label className="text-base font-medium">Phương pháp tối ưu hóa</Label>
                      <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn phương pháp tối ưu hóa" />
                        </SelectTrigger>
                        <SelectContent>
                          {optimizationMethods.map((method) => (
                            <SelectItem key={method.id} value={method.id}>
                              <div className="flex items-center gap-2">
                                <span>{method.name}</span>
                                <Badge variant={method.difficulty === 'beginner' ? 'secondary' : 'default'}>
                                  {method.difficulty}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Objective Function Selection */}
                    <div>
                      <Label className="text-base font-medium">Hàm mục tiêu</Label>
                      <Select value={selectedObjective} onValueChange={setSelectedObjective}>
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn hàm mục tiêu" />
                        </SelectTrigger>
                        <SelectContent>
                          {objectives.map((objective) => (
                            <SelectItem key={objective.id} value={objective.id}>
                              {objective.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Parameter Configuration Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* General Parameters */}
                  <div className="space-y-6">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Tham số chung
                    </h4>

                    {/* Max Iterations */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="max-iterations">Số lần lặp tối đa</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{parameterHelp.maxIterations.title}</p>
                                <p className="text-sm">{parameterHelp.maxIterations.explanation}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-muted-foreground">{maxIterations[0]}</span>
                      </div>
                      <Slider
                        id="max-iterations"
                        min={10}
                        max={1000}
                        step={10}
                        value={maxIterations}
                        onValueChange={setMaxIterations}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>10</span>
                        <span>1000</span>
                      </div>
                    </div>

                    {/* Cross Validation Folds */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="cv-folds">Số fold CV</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{parameterHelp.crossValidation.title}</p>
                                <p className="text-sm">{parameterHelp.crossValidation.explanation}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-muted-foreground">{crossValidationFolds[0]}</span>
                      </div>
                      <Slider
                        id="cv-folds"
                        min={3}
                        max={10}
                        step={1}
                        value={crossValidationFolds}
                        onValueChange={setCrossValidationFolds}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>3</span>
                        <span>10</span>
                      </div>
                    </div>

                    {/* Random State */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Label htmlFor="random-state">Random State</Label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-medium">{parameterHelp.randomState.title}</p>
                              <p className="text-sm">{parameterHelp.randomState.explanation}</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Input
                        id="random-state"
                        type="number"
                        value={randomState}
                        onChange={(e) => setRandomState(parseInt(e.target.value))}
                        placeholder="42"
                      />
                    </div>
                  </div>

                  {/* Method Specific Parameters */}
                  <div className="space-y-6">
                    <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                      Tham số cụ thể
                    </h4>

                    {/* N Jobs */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Label htmlFor="n-jobs">Số luồng xử lý</Label>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <div className="space-y-1">
                                <p className="font-medium">{parameterHelp.nJobs.title}</p>
                                <p className="text-sm">{parameterHelp.nJobs.explanation}</p>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <span className="text-sm text-muted-foreground">{nJobs[0]}</span>
                      </div>
                      <Slider
                        id="n-jobs"
                        min={1}
                        max={16}
                        step={1}
                        value={nJobs}
                        onValueChange={setNJobs}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>1</span>
                        <span>16</span>
                      </div>
                    </div>

                    {/* Enable Methods */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="enable-grid">Grid Search</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{parameterHelp.gridSearch.title}</p>
                                  <p className="text-sm">{parameterHelp.gridSearch.explanation}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Tìm kiếm toàn diện</p>
                        </div>
                        <Switch
                          id="enable-grid"
                          checked={enableGridSearch}
                          onCheckedChange={setEnableGridSearch}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="enable-bayesian">Bayesian Optimization</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{parameterHelp.bayesianOpt.title}</p>
                                  <p className="text-sm">{parameterHelp.bayesianOpt.explanation}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Tối ưu thông minh</p>
                        </div>
                        <Switch
                          id="enable-bayesian"
                          checked={enableBayesianOpt}
                          onCheckedChange={setEnableBayesianOpt}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Label htmlFor="enable-random">Random Search</Label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <HelpCircle className="h-3 w-3 text-muted-foreground cursor-help" />
                              </TooltipTrigger>
                              <TooltipContent className="max-w-xs">
                                <div className="space-y-1">
                                  <p className="font-medium">{parameterHelp.randomSearch.title}</p>
                                  <p className="text-sm">{parameterHelp.randomSearch.explanation}</p>
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                          <p className="text-xs text-muted-foreground">Tìm kiếm ngẫu nhiên</p>
                        </div>
                        <Switch
                          id="enable-random"
                          checked={enableRandomSearch}
                          onCheckedChange={setEnableRandomSearch}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    className="flex-1" 
                    disabled={loading || !selectedProject || !selectedModel || !jobName.trim()}
                    onClick={createOptimizationJob}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {loading ? 'Đang tạo...' : 'Bắt đầu Optimization'}
                  </Button>
                  <Button variant="outline" disabled={loading}>
                    <Save className="h-4 w-4 mr-2" />
                    Lưu cấu hình
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="running" className="space-y-4">
            {runningJobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Không có optimization job nào đang chạy</p>
                  <Button className="mt-4" onClick={() => setActiveTab('create')}>
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo Optimization Job
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {runningJobs.map((job) => (
                  <Card key={job.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(job.status)}`} />
                          <div>
                            <CardTitle className="text-lg">{job.name}</CardTitle>
                            <CardDescription>
                              {job.method} • {job.objective}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {job.status === 'running' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => controlOptimizationJob(job.id, 'pause')}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                          )}
                          {job.status === 'paused' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => controlOptimizationJob(job.id, 'resume')}
                            >
                              <Play className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => controlOptimizationJob(job.id, 'stop')}
                          >
                            Stop
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Tiến độ</Label>
                            <div className="text-2xl font-bold">{job.progress}%</div>
                            <Progress value={job.progress} className="mt-1" />
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Iteration</Label>
                            <div className="text-2xl font-bold">
                              {job.currentIteration}/{job.totalIterations}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Best Score</Label>
                            <div className="text-2xl font-bold text-green-600">
                              {job.bestScore.toFixed(3)}
                            </div>
                          </div>
                        </div>
                        
                        {job.estimatedTimeRemaining > 0 && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Clock className="h-4 w-4" />
                            Thời gian còn lại: ~{job.estimatedTimeRemaining} phút
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            {completedJobs.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Chưa có kết quả optimization nào</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Kết quả Optimization</CardTitle>
                    <CardDescription>
                      Các optimization job đã hoàn thành và kết quả tốt nhất
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tên Job</TableHead>
                          <TableHead>Phương pháp</TableHead>
                          <TableHead>Best Score</TableHead>
                          <TableHead>Improvement</TableHead>
                          <TableHead>Hoàn thành</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedJobs.map((job) => (
                          <TableRow key={job.id}>
                            <TableCell className="font-medium">{job.name}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{job.method}</Badge>
                            </TableCell>
                            <TableCell className="font-mono text-green-600">
                              {job.bestScore.toFixed(3)}
                            </TableCell>
                            <TableCell>
                              {job.improvementPct && (
                                <span className="text-green-600">
                                  +{job.improvementPct.toFixed(1)}%
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {job.completedAt && new Date(job.completedAt).toLocaleDateString('vi-VN')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => downloadResults(job.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button size="sm" variant="outline">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
} 