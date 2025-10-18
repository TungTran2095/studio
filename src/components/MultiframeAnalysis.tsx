"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
// import { MultiframeBacktestEngine } from '@/lib/multiframe-backtest-engine'; // Temporarily disabled
import { 
  BarChart3, 
  Play, 
  Pause, 
  RefreshCw, 
  Download, 
  Settings,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface MultiframeConfig {
  strategy: string;
  timeframes: string[];
  symbols: string[];
  lookbackPeriod: number;
  initialCapital: number;
  positionSize: number;
  stopLoss: number;
  takeProfit: number;
}

interface MultiframeResult {
  timeframe: string;
  symbol: string;
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  trades: any[];
}

interface MultiframeAnalysisProps {
  className?: string;
}

export default function MultiframeAnalysis({ className = "" }: MultiframeAnalysisProps) {
  const [config, setConfig] = useState<MultiframeConfig>({
    strategy: 'ichimoku',
    timeframes: ['1h', '4h', '1d'],
    symbols: ['BTCUSDT', 'ETHUSDT'],
    lookbackPeriod: 365,
    initialCapital: 10000,
    positionSize: 0.1,
    stopLoss: 2.0,
    takeProfit: 4.0
  });

  const [results, setResults] = useState<MultiframeResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTest, setCurrentTest] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Mock data cho demo
  const mockResults: MultiframeResult[] = [
    {
      timeframe: '1h',
      symbol: 'BTCUSDT',
      totalTrades: 156,
      winRate: 68.5,
      totalReturn: 24.3,
      sharpeRatio: 1.85,
      maxDrawdown: 8.2,
      profitFactor: 2.1,
      avgWin: 1.8,
      avgLoss: -1.2,
      trades: []
    },
    {
      timeframe: '4h',
      symbol: 'BTCUSDT',
      totalTrades: 89,
      winRate: 72.1,
      totalReturn: 31.7,
      sharpeRatio: 2.1,
      maxDrawdown: 6.8,
      profitFactor: 2.4,
      avgWin: 2.1,
      avgLoss: -1.1,
      trades: []
    },
    {
      timeframe: '1d',
      symbol: 'BTCUSDT',
      totalTrades: 45,
      winRate: 75.6,
      totalReturn: 28.9,
      sharpeRatio: 1.95,
      maxDrawdown: 7.5,
      profitFactor: 2.2,
      avgWin: 2.8,
      avgLoss: -1.4,
      trades: []
    },
    {
      timeframe: '1h',
      symbol: 'ETHUSDT',
      totalTrades: 142,
      winRate: 65.2,
      totalReturn: 19.8,
      sharpeRatio: 1.6,
      maxDrawdown: 9.1,
      profitFactor: 1.9,
      avgWin: 1.6,
      avgLoss: -1.3,
      trades: []
    },
    {
      timeframe: '4h',
      symbol: 'ETHUSDT',
      totalTrades: 78,
      winRate: 70.5,
      totalReturn: 26.4,
      sharpeRatio: 1.8,
      maxDrawdown: 8.3,
      profitFactor: 2.0,
      avgWin: 1.9,
      avgLoss: -1.2,
      trades: []
    },
    {
      timeframe: '1d',
      symbol: 'ETHUSDT',
      totalTrades: 38,
      winRate: 73.7,
      totalReturn: 25.1,
      sharpeRatio: 1.7,
      maxDrawdown: 8.7,
      profitFactor: 2.1,
      avgWin: 2.5,
      avgLoss: -1.5,
      trades: []
    }
  ];

  const runMultiframeAnalysis = async () => {
    setIsRunning(true);
    setProgress(0);
    setError(null);
    setResults([]);

    try {
      // Temporarily use mock data instead of real engine
      // const engine = new MultiframeBacktestEngine(config);
      const totalTests = config.timeframes.length * config.symbols.length;
      let completedTests = 0;

      // Use mock results for now
      const realResults = mockResults; // await engine.runMultiframeAnalysis(config);
      
      // Cập nhật progress
      for (const symbol of config.symbols) {
        for (const timeframe of config.timeframes) {
          setCurrentTest(`${symbol} - ${timeframe}`);
          
          // Simulate processing delay
          await new Promise(resolve => setTimeout(resolve, 500));
          
          completedTests++;
          setProgress((completedTests / totalTests) * 100);
        }
      }

      setResults(realResults);
      setCurrentTest('Hoàn thành');
      
    } catch (err) {
      setError('Lỗi khi chạy phân tích multiframe: ' + (err as Error).message);
      console.error('Multiframe analysis error:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const getPerformanceColor = (value: number, type: 'return' | 'winrate' | 'sharpe' | 'drawdown') => {
    switch (type) {
      case 'return':
        return value > 0 ? 'text-green-600' : 'text-red-600';
      case 'winrate':
        return value > 60 ? 'text-green-600' : value > 50 ? 'text-yellow-600' : 'text-red-600';
      case 'sharpe':
        return value > 1.5 ? 'text-green-600' : value > 1.0 ? 'text-yellow-600' : 'text-red-600';
      case 'drawdown':
        return value < 10 ? 'text-green-600' : value < 20 ? 'text-yellow-600' : 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getPerformanceIcon = (value: number, type: 'return' | 'winrate' | 'sharpe' | 'drawdown') => {
    switch (type) {
      case 'return':
        return value > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
      case 'winrate':
        return value > 60 ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />;
      case 'sharpe':
        return value > 1.5 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
      case 'drawdown':
        return value < 10 ? <CheckCircle className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Panel */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cấu hình Multiframe Analysis
          </CardTitle>
          <CardDescription>
            Phân tích hiệu suất strategy trên nhiều timeframe và symbol
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Strategy</Label>
              <Select value={config.strategy} onValueChange={(value) => setConfig({...config, strategy: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ichimoku">Ichimoku Cloud</SelectItem>
                  <SelectItem value="rsi">RSI Strategy</SelectItem>
                  <SelectItem value="macd">MACD Strategy</SelectItem>
                  <SelectItem value="bollinger">Bollinger Bands</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="timeframes">Timeframes</Label>
              <Select value={config.timeframes.join(',')} onValueChange={(value) => setConfig({...config, timeframes: value.split(',')})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h,4h,1d">1h, 4h, 1d</SelectItem>
                  <SelectItem value="15m,1h,4h">15m, 1h, 4h</SelectItem>
                  <SelectItem value="5m,15m,1h">5m, 15m, 1h</SelectItem>
                  <SelectItem value="1h,4h,1d,1w">1h, 4h, 1d, 1w</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="symbols">Symbols</Label>
              <Select value={config.symbols.join(',')} onValueChange={(value) => setConfig({...config, symbols: value.split(',')})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BTCUSDT,ETHUSDT">BTC, ETH</SelectItem>
                  <SelectItem value="BTCUSDT">BTC Only</SelectItem>
                  <SelectItem value="ETHUSDT">ETH Only</SelectItem>
                  <SelectItem value="BTCUSDT,ETHUSDT,ADAUSDT">BTC, ETH, ADA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="lookback">Lookback Period (days)</Label>
              <Input
                id="lookback"
                type="number"
                value={config.lookbackPeriod}
                onChange={(e) => setConfig({...config, lookbackPeriod: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="capital">Initial Capital ($)</Label>
              <Input
                id="capital"
                type="number"
                value={config.initialCapital}
                onChange={(e) => setConfig({...config, initialCapital: parseInt(e.target.value)})}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="positionSize">Position Size (%)</Label>
              <Input
                id="positionSize"
                type="number"
                step="0.01"
                value={config.positionSize * 100}
                onChange={(e) => setConfig({...config, positionSize: parseFloat(e.target.value) / 100})}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={runMultiframeAnalysis} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? 'Đang chạy...' : 'Chạy Phân Tích'}
            </Button>
            
            <Button variant="outline" onClick={() => setResults([])}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          </div>

          {isRunning && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Tiến độ: {currentTest}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Kết Quả Multiframe Analysis
            </CardTitle>
            <CardDescription>
              So sánh hiệu suất strategy trên các timeframe và symbol khác nhau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Tổng Tests</span>
                  </div>
                  <div className="text-2xl font-bold">{results.length}</div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Avg Return</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {(results.reduce((sum, r) => sum + r.totalReturn, 0) / results.length).toFixed(1)}%
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium">Avg Win Rate</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {(results.reduce((sum, r) => sum + r.winRate, 0) / results.length).toFixed(1)}%
                  </div>
                </Card>
                
                <Card className="p-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm font-medium">Max Drawdown</span>
                  </div>
                  <div className="text-2xl font-bold text-red-600">
                    {Math.max(...results.map(r => r.maxDrawdown)).toFixed(1)}%
                  </div>
                </Card>
              </div>

              {/* Detailed Results Table */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Symbol</th>
                      <th className="text-left p-2">Timeframe</th>
                      <th className="text-left p-2">Trades</th>
                      <th className="text-left p-2">Win Rate</th>
                      <th className="text-left p-2">Return</th>
                      <th className="text-left p-2">Sharpe</th>
                      <th className="text-left p-2">Drawdown</th>
                      <th className="text-left p-2">Profit Factor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result, index) => (
                      <tr key={index} className="border-b hover:bg-muted/50">
                        <td className="p-2">
                          <Badge variant="outline">{result.symbol}</Badge>
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary">{result.timeframe}</Badge>
                        </td>
                        <td className="p-2 font-medium">{result.totalTrades}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getPerformanceIcon(result.winRate, 'winrate')}
                            <span className={getPerformanceColor(result.winRate, 'winrate')}>
                              {result.winRate.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getPerformanceIcon(result.totalReturn, 'return')}
                            <span className={getPerformanceColor(result.totalReturn, 'return')}>
                              {result.totalReturn.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getPerformanceIcon(result.sharpeRatio, 'sharpe')}
                            <span className={getPerformanceColor(result.sharpeRatio, 'sharpe')}>
                              {result.sharpeRatio.toFixed(2)}
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            {getPerformanceIcon(result.maxDrawdown, 'drawdown')}
                            <span className={getPerformanceColor(result.maxDrawdown, 'drawdown')}>
                              {result.maxDrawdown.toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant={result.profitFactor > 2 ? "default" : "secondary"}>
                            {result.profitFactor.toFixed(2)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Best Performance Highlight */}
              <Card className="bg-green-50 border-green-200">
                <CardHeader>
                  <CardTitle className="text-green-800 flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Kết Quả Tốt Nhất
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const bestResult = results.reduce((best, current) => 
                      current.totalReturn > best.totalReturn ? current : best
                    );
                    return (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{bestResult.symbol}</Badge>
                          <Badge variant="secondary">{bestResult.timeframe}</Badge>
                          <span className="text-lg font-bold text-green-600">
                            {bestResult.totalReturn.toFixed(1)}% Return
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Win Rate:</span>
                            <div className="font-medium">{bestResult.winRate.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sharpe Ratio:</span>
                            <div className="font-medium">{bestResult.sharpeRatio.toFixed(2)}</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Max Drawdown:</span>
                            <div className="font-medium">{bestResult.maxDrawdown.toFixed(1)}%</div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Profit Factor:</span>
                            <div className="font-medium">{bestResult.profitFactor.toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
