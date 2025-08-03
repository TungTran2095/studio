"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Loader2, 
  BarChart4, 
  TrendingUp, 
  Zap, 
  Shield, 
  Settings, 
  Target,
  Activity,
  LineChart,
  PieChart,
  Scatter,
  Calendar,
  Clock,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Play,
  Pause,
  RotateCcw,
  Download,
  Upload,
  Eye,
  EyeOff
} from 'lucide-react';
import { format } from 'date-fns';


interface OptimizationConfig {
  trading: {
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
  };
  strategy: {
    type: string;
    parameters: Record<string, any>;
  };
  monte_carlo: {
    n_simulations: number;
    confidence_level: number;
    time_horizon_days: number;
    risk_free_rate: number;
    volatility_model: string;
  };
  walk_forward: {
    train_period_days: number;
    test_period_days: number;
    step_size_days: number;
    optimization_method: string;
    validation_metric: string;
  };
  cross_validation: {
    n_folds: number;
    cv_method: string;
    hyperparameter_tuning: boolean;
    optimization_algorithm: string;
  };
  performance_tracking: {
    real_time_monitoring: boolean;
    alert_thresholds: Record<string, number>;
    auto_rebalancing: boolean;
    risk_metrics: string[];
  };
  optimization: {
    objective_function: string;
    constraints: Record<string, any>;
    optimization_runs: number;
    parallel_processing: boolean;
  };
}

const strategies = [
  {
    id: 'rsi_strategy',
    name: 'RSI Strategy',
    description: 'Relative Strength Index với các tín hiệu overbought/oversold',
    features: ['Momentum', 'Mean Reversion', 'Signal Filtering']
  },
  {
    id: 'macd_strategy',
    name: 'MACD Strategy',
    description: 'Moving Average Convergence Divergence',
    features: ['Trend Following', 'Signal Crossover', 'Divergence Detection']
  },
  {
    id: 'bollinger_bands',
    name: 'Bollinger Bands',
    description: 'Volatility-based strategy với mean reversion',
    features: ['Volatility', 'Mean Reversion', 'Breakout Detection']
  },
  {
    id: 'ma_crossover',
    name: 'Moving Average Crossover',
    description: 'Dual moving average crossover system',
    features: ['Trend Following', 'Crossover Signals', 'Filtering']
  }
];

export default function StrategyOptimizationPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [activeOptimization, setActiveOptimization] = useState<string | null>(null);
  const [optimizationProgress, setOptimizationProgress] = useState(0);
  const [config, setConfig] = useState<OptimizationConfig>({
    trading: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      startDate: format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      initialCapital: 10000
    },
    strategy: {
      type: 'rsi_strategy',
      parameters: {
        period: 14,
        overbought: 70,
        oversold: 30
      }
    },
    monte_carlo: {
      n_simulations: 1000,
      confidence_level: 0.95,
      time_horizon_days: 252,
      risk_free_rate: 0.02,
      volatility_model: 'historical'
    },
    walk_forward: {
      train_period_days: 252,
      test_period_days: 63,
      step_size_days: 21,
      optimization_method: 'grid_search',
      validation_metric: 'sharpe_ratio'
    },
    cross_validation: {
      n_folds: 5,
      cv_method: 'time_series_split',
      hyperparameter_tuning: true,
      optimization_algorithm: 'bayesian'
    },
    performance_tracking: {
      real_time_monitoring: true,
      alert_thresholds: {
        max_drawdown: 10,
        min_sharpe: 1.0,
        max_var: 5
      },
      auto_rebalancing: false,
      risk_metrics: ['sharpe_ratio', 'max_drawdown', 'var', 'calmar_ratio']
    },
    optimization: {
      objective_function: 'sharpe_ratio',
      constraints: {
        max_drawdown: 20,
        min_trades: 10
      },
      optimization_runs: 100,
      parallel_processing: true
    }
  });

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof OptimizationConfig],
        [field]: value
      }
    }));
  };

  const handleStrategyChange = (strategyType: string) => {
    setConfig(prev => ({
      ...prev,
      strategy: {
        ...prev.strategy,
        type: strategyType
      }
    }));
  };

  const handleParameterChange = (parameter: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      strategy: {
        ...prev.strategy,
        parameters: {
          ...prev.strategy.parameters,
          [parameter]: value
        }
      }
    }));
  };

  const runOptimization = async (type: string) => {
    setLoading(true);
    setError(null);
    setActiveOptimization(type);
    setOptimizationProgress(0);

    try {
      // Simulate optimization progress
      const interval = setInterval(() => {
        setOptimizationProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await fetch('/api/strategy-optimization', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          config
        }),
      });

      clearInterval(interval);
      setOptimizationProgress(100);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run optimization');
      }

      setResults(data.results);
      console.log(`${type} optimization results:`, data.results);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error(`${type} optimization error:`, err);
    } finally {
      setLoading(false);
      setActiveOptimization(null);
    }
  };

  const getSelectedStrategy = () => {
    return strategies.find(s => s.id === config.strategy.type) || strategies[0];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Strategy Optimization & Monitoring</h1>
          <p className="text-muted-foreground">
            Theo dõi và tối ưu hóa thuật toán giao dịch với Monte Carlo, Walk Forward Analysis, Cross Validation
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            Advanced Analytics
          </Badge>
          <Badge variant="outline" className="text-sm">
            Real-time Monitoring
          </Badge>
        </div>
      </div>

      {/* Progress Bar for Active Optimization */}
      {activeOptimization && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="font-medium">
                  Running {activeOptimization.replace('_', ' ').toUpperCase()} Optimization...
                </span>
              </div>
              <span className="text-sm text-muted-foreground">
                {Math.round(optimizationProgress)}%
              </span>
            </div>
            <Progress value={optimizationProgress} className="w-full" />
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="walk-forward" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="walk-forward">📈 Walk Forward</TabsTrigger>
          <TabsTrigger value="cross-validation">🔄 Cross Validation</TabsTrigger>
          <TabsTrigger value="performance">📊 Performance Tracking</TabsTrigger>
          <TabsTrigger value="optimization">⚙️ Optimization</TabsTrigger>
        </TabsList>



        {/* Walk Forward Analysis Tab */}
        <TabsContent value="walk-forward" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Walk Forward Configuration
                </CardTitle>
                <CardDescription>
                  Phân tích walk-forward để đánh giá tính ổn định của thuật toán
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="train_period">Training Period (Days)</Label>
                    <Input
                      id="train_period"
                      type="number"
                      value={config.walk_forward.train_period_days}
                      onChange={(e) => handleConfigChange('walk_forward', 'train_period_days', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="test_period">Test Period (Days)</Label>
                    <Input
                      id="test_period"
                      type="number"
                      value={config.walk_forward.test_period_days}
                      onChange={(e) => handleConfigChange('walk_forward', 'test_period_days', parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="step_size">Step Size (Days)</Label>
                  <Input
                    id="step_size"
                    type="number"
                    value={config.walk_forward.step_size_days}
                    onChange={(e) => handleConfigChange('walk_forward', 'step_size_days', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="optimization_method">Optimization Method</Label>
                  <Select 
                    value={config.walk_forward.optimization_method} 
                    onValueChange={(value) => handleConfigChange('walk_forward', 'optimization_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="grid_search">Grid Search</SelectItem>
                      <SelectItem value="bayesian">Bayesian Optimization</SelectItem>
                      <SelectItem value="genetic">Genetic Algorithm</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="validation_metric">Validation Metric</Label>
                  <Select 
                    value={config.walk_forward.validation_metric} 
                    onValueChange={(value) => handleConfigChange('walk_forward', 'validation_metric', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharpe_ratio">Sharpe Ratio</SelectItem>
                      <SelectItem value="calmar_ratio">Calmar Ratio</SelectItem>
                      <SelectItem value="total_return">Total Return</SelectItem>
                      <SelectItem value="max_drawdown">Max Drawdown</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => runOptimization('walk_forward')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && activeOptimization === 'walk_forward' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Walk Forward Analysis
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LineChart className="h-5 w-5" />
                  Walk Forward Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results?.walk_forward ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.walk_forward.avg_performance?.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Avg Performance</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {results.walk_forward.stability_score?.toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Stability Score</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Best Period</span>
                        <span className="font-medium">{results.walk_forward.best_period?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Worst Period</span>
                        <span className="font-medium">{results.walk_forward.worst_period?.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consistency</span>
                        <span className="font-medium">{results.walk_forward.consistency?.toFixed(2)}%</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run Walk Forward analysis to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cross Validation Tab */}
        <TabsContent value="cross-validation" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RotateCcw className="h-5 w-5" />
                  Cross Validation Configuration
                </CardTitle>
                <CardDescription>
                  Cross validation để đánh giá độ tin cậy của thuật toán
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="n_folds">Number of Folds</Label>
                  <Input
                    id="n_folds"
                    type="number"
                    value={config.cross_validation.n_folds}
                    onChange={(e) => handleConfigChange('cross_validation', 'n_folds', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="cv_method">CV Method</Label>
                  <Select 
                    value={config.cross_validation.cv_method} 
                    onValueChange={(value) => handleConfigChange('cross_validation', 'cv_method', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="time_series_split">Time Series Split</SelectItem>
                      <SelectItem value="k_fold">K-Fold</SelectItem>
                      <SelectItem value="stratified">Stratified</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="hyperparameter_tuning"
                    checked={config.cross_validation.hyperparameter_tuning}
                    onCheckedChange={(checked) => handleConfigChange('cross_validation', 'hyperparameter_tuning', checked)}
                  />
                  <Label htmlFor="hyperparameter_tuning">Enable Hyperparameter Tuning</Label>
                </div>
                <div>
                  <Label htmlFor="optimization_algorithm">Optimization Algorithm</Label>
                  <Select 
                    value={config.cross_validation.optimization_algorithm} 
                    onValueChange={(value) => handleConfigChange('cross_validation', 'optimization_algorithm', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bayesian">Bayesian Optimization</SelectItem>
                      <SelectItem value="random_search">Random Search</SelectItem>
                      <SelectItem value="grid_search">Grid Search</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={() => runOptimization('cross_validation')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && activeOptimization === 'cross_validation' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Cross Validation
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Cross Validation Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                {results?.cross_validation ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {results.cross_validation.mean_score?.toFixed(3)}
                        </div>
                        <div className="text-sm text-muted-foreground">Mean Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {results.cross_validation.std_score?.toFixed(3)}
                        </div>
                        <div className="text-sm text-muted-foreground">Std Score</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Best Fold</span>
                        <span className="font-medium">{results.cross_validation.best_fold?.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Worst Fold</span>
                        <span className="font-medium">{results.cross_validation.worst_fold?.toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Confidence Interval</span>
                        <span className="font-medium">{results.cross_validation.confidence_interval?.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <RotateCcw className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Run Cross Validation to see results</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Performance Tracking Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Real-time Monitoring
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="real_time_monitoring"
                    checked={config.performance_tracking.real_time_monitoring}
                    onCheckedChange={(checked) => handleConfigChange('performance_tracking', 'real_time_monitoring', checked)}
                  />
                  <Label htmlFor="real_time_monitoring">Enable Real-time Monitoring</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="auto_rebalancing"
                    checked={config.performance_tracking.auto_rebalancing}
                    onCheckedChange={(checked) => handleConfigChange('performance_tracking', 'auto_rebalancing', checked)}
                  />
                  <Label htmlFor="auto_rebalancing">Auto Rebalancing</Label>
                </div>
                <div>
                  <Label>Risk Metrics</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {config.performance_tracking.risk_metrics.map((metric, index) => (
                      <Badge key={metric} variant="outline" className="text-xs">
                        {metric.replace('_', ' ')}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Alert Thresholds
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="max_drawdown">Max Drawdown (%)</Label>
                  <Input
                    id="max_drawdown"
                    type="number"
                    value={config.performance_tracking.alert_thresholds.max_drawdown}
                    onChange={(e) => handleConfigChange('performance_tracking', 'alert_thresholds', {
                      ...config.performance_tracking.alert_thresholds,
                      max_drawdown: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="min_sharpe">Min Sharpe Ratio</Label>
                  <Input
                    id="min_sharpe"
                    type="number"
                    value={config.performance_tracking.alert_thresholds.min_sharpe}
                    onChange={(e) => handleConfigChange('performance_tracking', 'alert_thresholds', {
                      ...config.performance_tracking.alert_thresholds,
                      min_sharpe: parseFloat(e.target.value)
                    })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_var">Max VaR (%)</Label>
                  <Input
                    id="max_var"
                    type="number"
                    value={config.performance_tracking.alert_thresholds.max_var}
                    onChange={(e) => handleConfigChange('performance_tracking', 'alert_thresholds', {
                      ...config.performance_tracking.alert_thresholds,
                      max_var: parseFloat(e.target.value)
                    })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Current Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span>System Status</span>
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Last Update</span>
                    <span className="text-sm text-muted-foreground">
                      {format(new Date(), 'HH:mm:ss')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active Alerts</span>
                    <Badge variant="outline">0</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Optimization Tab */}
        <TabsContent value="optimization" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Optimization Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="objective_function">Objective Function</Label>
                  <Select 
                    value={config.optimization.objective_function} 
                    onValueChange={(value) => handleConfigChange('optimization', 'objective_function', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sharpe_ratio">Sharpe Ratio</SelectItem>
                      <SelectItem value="calmar_ratio">Calmar Ratio</SelectItem>
                      <SelectItem value="total_return">Total Return</SelectItem>
                      <SelectItem value="sortino_ratio">Sortino Ratio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="optimization_runs">Optimization Runs</Label>
                  <Input
                    id="optimization_runs"
                    type="number"
                    value={config.optimization.optimization_runs}
                    onChange={(e) => handleConfigChange('optimization', 'optimization_runs', parseInt(e.target.value))}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="parallel_processing"
                    checked={config.optimization.parallel_processing}
                    onCheckedChange={(checked) => handleConfigChange('optimization', 'parallel_processing', checked)}
                  />
                  <Label htmlFor="parallel_processing">Parallel Processing</Label>
                </div>
                <div>
                  <Label>Constraints</Label>
                  <div className="space-y-2 mt-2">
                    <div>
                      <Label htmlFor="max_drawdown_constraint" className="text-sm">Max Drawdown (%)</Label>
                      <Input
                        id="max_drawdown_constraint"
                        type="number"
                        value={config.optimization.constraints.max_drawdown}
                        onChange={(e) => handleConfigChange('optimization', 'constraints', {
                          ...config.optimization.constraints,
                          max_drawdown: parseFloat(e.target.value)
                        })}
                      />
                    </div>
                    <div>
                      <Label htmlFor="min_trades" className="text-sm">Min Trades</Label>
                      <Input
                        id="min_trades"
                        type="number"
                        value={config.optimization.constraints.min_trades}
                        onChange={(e) => handleConfigChange('optimization', 'constraints', {
                          ...config.optimization.constraints,
                          min_trades: parseInt(e.target.value)
                        })}
                      />
                    </div>
                  </div>
                </div>
                <Button 
                  onClick={() => runOptimization('full_optimization')}
                  disabled={loading}
                  className="w-full"
                >
                  {loading && activeOptimization === 'full_optimization' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Play className="h-4 w-4 mr-2" />
                  )}
                  Run Full Optimization
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Strategy Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Strategy Type</Label>
                  <Select value={config.strategy.type} onValueChange={handleStrategyChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {strategies.map(strategy => (
                        <SelectItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm font-medium">Strategy Features</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {getSelectedStrategy().features.map(feature => (
                      <Badge key={feature} variant="outline" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </div>

                {config.strategy.type === 'rsi_strategy' && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">RSI Parameters</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="period" className="text-xs">Period</Label>
                        <Input
                          id="period"
                          type="number"
                          value={config.strategy.parameters.period}
                          onChange={(e) => handleParameterChange('period', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="overbought" className="text-xs">Overbought</Label>
                        <Input
                          id="overbought"
                          type="number"
                          value={config.strategy.parameters.overbought}
                          onChange={(e) => handleParameterChange('overbought', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="oversold" className="text-xs">Oversold</Label>
                        <Input
                          id="oversold"
                          type="number"
                          value={config.strategy.parameters.oversold}
                          onChange={(e) => handleParameterChange('oversold', parseInt(e.target.value))}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Global Actions */}
      <div className="flex justify-between items-center pt-6 border-t">
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import Config
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Results
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View Logs
          </Button>
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>
    </div>
  );
} 