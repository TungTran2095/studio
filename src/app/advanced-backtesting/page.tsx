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
import { Loader2, BarChart4, TrendingUp, Zap, Shield, Settings } from 'lucide-react';
import { format } from 'date-fns';

interface AdvancedBacktestConfig {
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
  walk_forward: {
    train_period_days: number;
    test_period_days: number;
    step_size_days: number;
  };
  monte_carlo: {
    n_simulations: number;
    confidence_level: number;
    time_horizon_days: number;
  };
  transaction_costs: {
    commission_rate: number;
    minimum_commission: number;
    maker_fee: number;
    taker_fee: number;
  };
  slippage: {
    base_slippage: number;
    volume_impact: number;
    volatility_impact: number;
  };
  enhanced_features: {
    position_sizing: string;
    multi_timeframe: boolean;
    dynamic_levels: boolean;
    divergence_detection: boolean;
    trend_confirmation: boolean;
    volatility_adjustment: boolean;
  };
}

export default function AdvancedBacktestingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [config, setConfig] = useState<AdvancedBacktestConfig>({
    trading: {
      symbol: 'BTCUSDT',
      timeframe: '1h',
      startDate: format(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
      endDate: format(new Date(), 'yyyy-MM-dd'),
      initialCapital: 10000
    },
    strategy: {
      type: 'advanced_rsi',
      parameters: {
        period: 14,
        overbought: 70,
        oversold: 30
      }
    },
    walk_forward: {
      train_period_days: 252,
      test_period_days: 63,
      step_size_days: 21
    },
    monte_carlo: {
      n_simulations: 1000,
      confidence_level: 0.95,
      time_horizon_days: 252
    },
    transaction_costs: {
      commission_rate: 0.001,
      minimum_commission: 1.0,
      maker_fee: 0.0005,
      taker_fee: 0.001
    },
    slippage: {
      base_slippage: 0.0001,
      volume_impact: 0.0002,
      volatility_impact: 0.5
    },
    enhanced_features: {
      position_sizing: 'kelly',
      multi_timeframe: true,
      dynamic_levels: true,
      divergence_detection: true,
      trend_confirmation: true,
      volatility_adjustment: true
    }
  });

  const strategies = [
    {
      id: 'advanced_rsi',
      name: 'Advanced RSI Strategy',
      description: 'RSI với các tính năng nâng cao: divergence, dynamic levels, multi-timeframe',
      features: ['Divergence Detection', 'Dynamic Levels', 'Multi-timeframe', 'Trend Confirmation']
    },
    {
      id: 'enhanced_strategy',
      name: 'Enhanced Strategy',
      description: 'Strategy framework với position sizing và risk management nâng cao',
      features: ['Kelly Criterion', 'Risk Parity', 'Volatility Adjustment']
    },
    {
      id: 'ma_crossover',
      name: 'Moving Average Crossover',
      description: 'Chiến lược giao dịch dựa trên giao cắt của hai đường trung bình động',
      features: ['Simple Crossover', 'Basic Risk Management']
    },
    {
      id: 'rsi',
      name: 'RSI Strategy',
      description: 'Chiến lược giao dịch dựa trên chỉ báo RSI cơ bản',
      features: ['Oversold/Overbought', 'Basic Signals']
    }
  ];

  const handleConfigChange = (section: string, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof AdvancedBacktestConfig],
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

  const handleFeatureToggle = (feature: string, enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      enhanced_features: {
        ...prev.enhanced_features,
        [feature]: enabled
      }
    }));
  };

  const runAdvancedBacktest = async () => {
    try {
      setLoading(true);
      setError(null);
      setResults(null);

      const experimentId = `advanced-${Date.now()}`;

      const response = await fetch('/api/research/advanced-backtest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experiment_id: experimentId,
          config: config
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to run advanced backtest');
      }

      setResults(data.results);
      console.log('Advanced backtest results:', data.results);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Advanced backtest error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getSelectedStrategy = () => {
    return strategies.find(s => s.id === config.strategy.type) || strategies[0];
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🚀 Advanced Backtesting</h1>
          <p className="text-muted-foreground">
            Backtesting nâng cao với Walk-Forward Analysis, Monte Carlo Simulation, Transaction Costs và Slippage Modeling
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          Advanced Features
        </Badge>
      </div>

      <Tabs defaultValue="configuration" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">⚙️ Configuration</TabsTrigger>
          <TabsTrigger value="features">🎯 Advanced Features</TabsTrigger>
          <TabsTrigger value="results">📊 Results</TabsTrigger>
          <TabsTrigger value="insights">🔍 Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="configuration" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Trading Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Trading Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="symbol">Symbol</Label>
                    <Input
                      id="symbol"
                      value={config.trading.symbol}
                      onChange={(e) => handleConfigChange('trading', 'symbol', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="timeframe">Timeframe</Label>
                    <Select value={config.trading.timeframe} onValueChange={(value) => handleConfigChange('trading', 'timeframe', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1m">1m</SelectItem>
                        <SelectItem value="5m">5m</SelectItem>
                        <SelectItem value="15m">15m</SelectItem>
                        <SelectItem value="1h">1h</SelectItem>
                        <SelectItem value="4h">4h</SelectItem>
                        <SelectItem value="1d">1d</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="startDate">Start Date</Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={config.trading.startDate}
                      onChange={(e) => handleConfigChange('trading', 'startDate', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="endDate">End Date</Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={config.trading.endDate}
                      onChange={(e) => handleConfigChange('trading', 'endDate', e.target.value)}
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="initialCapital">Initial Capital ($)</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    value={config.trading.initialCapital}
                    onChange={(e) => handleConfigChange('trading', 'initialCapital', parseFloat(e.target.value))}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Strategy Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart4 className="h-5 w-5" />
                  Strategy Selection
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

                {/* Strategy Parameters */}
                {config.strategy.type === 'advanced_rsi' && (
                  <div className="space-y-4">
                    <Label className="text-sm font-medium">RSI Parameters</Label>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label htmlFor="period">Period</Label>
                        <Input
                          id="period"
                          type="number"
                          value={config.strategy.parameters.period}
                          onChange={(e) => handleParameterChange('period', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="overbought">Overbought</Label>
                        <Input
                          id="overbought"
                          type="number"
                          value={config.strategy.parameters.overbought}
                          onChange={(e) => handleParameterChange('overbought', parseInt(e.target.value))}
                        />
                      </div>
                      <div>
                        <Label htmlFor="oversold">Oversold</Label>
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

        <TabsContent value="features" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Walk-Forward Analysis */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Walk-Forward Analysis
                </CardTitle>
                <CardDescription>
                  Chia dữ liệu thành nhiều period training/testing để đánh giá tính ổn định
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Training Period (days)</Label>
                  <Slider
                    value={[config.walk_forward.train_period_days]}
                    onValueChange={([value]) => handleConfigChange('walk_forward', 'train_period_days', value)}
                    max={500}
                    min={50}
                    step={10}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{config.walk_forward.train_period_days} days</span>
                </div>
                <div>
                  <Label>Testing Period (days)</Label>
                  <Slider
                    value={[config.walk_forward.test_period_days]}
                    onValueChange={([value]) => handleConfigChange('walk_forward', 'test_period_days', value)}
                    max={200}
                    min={10}
                    step={5}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{config.walk_forward.test_period_days} days</span>
                </div>
                <div>
                  <Label>Step Size (days)</Label>
                  <Slider
                    value={[config.walk_forward.step_size_days]}
                    onValueChange={([value]) => handleConfigChange('walk_forward', 'step_size_days', value)}
                    max={50}
                    min={5}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{config.walk_forward.step_size_days} days</span>
                </div>
              </CardContent>
            </Card>

            {/* Monte Carlo Simulation */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Monte Carlo Simulation
                </CardTitle>
                <CardDescription>
                  Mô phỏng nhiều scenarios để đánh giá rủi ro và tính ổn định
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Number of Simulations</Label>
                  <Slider
                    value={[config.monte_carlo.n_simulations]}
                    onValueChange={([value]) => handleConfigChange('monte_carlo', 'n_simulations', value)}
                    max={5000}
                    min={100}
                    step={100}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{config.monte_carlo.n_simulations} simulations</span>
                </div>
                <div>
                  <Label>Confidence Level</Label>
                  <Slider
                    value={[config.monte_carlo.confidence_level * 100]}
                    onValueChange={([value]) => handleConfigChange('monte_carlo', 'confidence_level', value / 100)}
                    max={99}
                    min={80}
                    step={1}
                    className="w-full"
                  />
                  <span className="text-sm text-muted-foreground">{(config.monte_carlo.confidence_level * 100).toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Transaction Costs */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Transaction Costs
                </CardTitle>
                <CardDescription>
                  Modeling phí giao dịch thực tế và market impact
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Commission Rate (%)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={config.transaction_costs.commission_rate * 100}
                    onChange={(e) => handleConfigChange('transaction_costs', 'commission_rate', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div>
                  <Label>Maker Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={config.transaction_costs.maker_fee * 100}
                    onChange={(e) => handleConfigChange('transaction_costs', 'maker_fee', parseFloat(e.target.value) / 100)}
                  />
                </div>
                <div>
                  <Label>Taker Fee (%)</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={config.transaction_costs.taker_fee * 100}
                    onChange={(e) => handleConfigChange('transaction_costs', 'taker_fee', parseFloat(e.target.value) / 100)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Enhanced Features
                </CardTitle>
                <CardDescription>
                  Các tính năng nâng cao cho strategy
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Multi-timeframe Analysis</Label>
                  <Switch
                    checked={config.enhanced_features.multi_timeframe}
                    onCheckedChange={(checked) => handleFeatureToggle('multi_timeframe', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Dynamic Levels</Label>
                  <Switch
                    checked={config.enhanced_features.dynamic_levels}
                    onCheckedChange={(checked) => handleFeatureToggle('dynamic_levels', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Divergence Detection</Label>
                  <Switch
                    checked={config.enhanced_features.divergence_detection}
                    onCheckedChange={(checked) => handleFeatureToggle('divergence_detection', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Trend Confirmation</Label>
                  <Switch
                    checked={config.enhanced_features.trend_confirmation}
                    onCheckedChange={(checked) => handleFeatureToggle('trend_confirmation', checked)}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Volatility Adjustment</Label>
                  <Switch
                    checked={config.enhanced_features.volatility_adjustment}
                    onCheckedChange={(checked) => handleFeatureToggle('volatility_adjustment', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {loading && (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Running Advanced Backtest...</span>
            </div>
          )}

          {results && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Walk-Forward Results */}
              {results.walk_forward_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle>🔄 Walk-Forward Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Periods:</span>
                        <span className="font-medium">{results.walk_forward_analysis.summary?.total_periods || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg OOS Return:</span>
                        <span className="font-medium">{(results.walk_forward_analysis.summary?.avg_out_of_sample_return || 0).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Consistency Score:</span>
                        <span className="font-medium">{(results.walk_forward_analysis.summary?.consistency_score || 0).toFixed(3)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Monte Carlo Results */}
              {results.monte_carlo_simulation && (
                <Card>
                  <CardHeader>
                    <CardTitle>🎲 Monte Carlo Simulation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>VaR (95%):</span>
                        <span className="font-medium">{(results.monte_carlo_simulation.risk_metrics?.var || 0).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Probability of Loss:</span>
                        <span className="font-medium">{(results.monte_carlo_simulation.risk_metrics?.probability_of_loss || 0).toFixed(1)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Expected Shortfall:</span>
                        <span className="font-medium">{(results.monte_carlo_simulation.risk_metrics?.expected_shortfall || 0).toFixed(2)}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Enhanced Backtest Results */}
              {results.enhanced_backtest && (
                <Card>
                  <CardHeader>
                    <CardTitle>📈 Enhanced Backtest</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Total Return:</span>
                        <span className="font-medium">{(results.enhanced_backtest.performance?.total_return || 0).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Sharpe Ratio:</span>
                        <span className="font-medium">{(results.enhanced_backtest.performance?.sharpe_ratio || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Max Drawdown:</span>
                        <span className="font-medium">{(results.enhanced_backtest.performance?.max_drawdown || 0).toFixed(2)}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Costs:</span>
                        <span className="font-medium">${(results.enhanced_backtest.cost_analysis?.total_costs || 0).toFixed(2)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Overall Assessment */}
              {results.summary && (
                <Card>
                  <CardHeader>
                    <CardTitle>🎯 Overall Assessment</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Strategy Robustness:</span>
                        <span className="font-medium">{(results.summary.strategy_robustness || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Risk-Adjusted Performance:</span>
                        <span className="font-medium">{(results.summary.risk_adjusted_performance || 0).toFixed(3)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Implementation Quality:</span>
                        <span className="font-medium">{(results.summary.implementation_quality || 0).toFixed(3)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          <div className="flex justify-center">
            <Button 
              onClick={runAdvancedBacktest} 
              disabled={loading}
              size="lg"
              className="px-8"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Zap className="mr-2 h-4 w-4" />
                  Run Advanced Backtest
                </>
              )}
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          {results?.strategy_insights && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* RSI Statistics */}
              <Card>
                <CardHeader>
                  <CardTitle>📊 RSI Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Mean RSI:</span>
                      <span className="font-medium">{(results.strategy_insights.rsi_statistics?.mean_rsi || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time in Overbought:</span>
                      <span className="font-medium">{(results.strategy_insights.rsi_statistics?.time_in_overbought || 0).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Time in Oversold:</span>
                      <span className="font-medium">{(results.strategy_insights.rsi_statistics?.time_in_oversold || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Divergence Analysis */}
              <Card>
                <CardHeader>
                  <CardTitle>🔄 Divergence Analysis</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Bullish Divergences:</span>
                      <span className="font-medium">{results.strategy_insights.divergence_analysis?.bullish_divergences || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bearish Divergences:</span>
                      <span className="font-medium">{results.strategy_insights.divergence_analysis?.bearish_divergences || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Divergence Frequency:</span>
                      <span className="font-medium">{(results.strategy_insights.divergence_analysis?.divergence_frequency || 0).toFixed(1)}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
} 