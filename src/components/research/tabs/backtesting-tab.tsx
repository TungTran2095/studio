"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  BarChart3, 
  Play, 
  TrendingUp,
  Activity,
  Target,
  Zap,
  Clock,
  DollarSign,
  TrendingDown,
  X
} from 'lucide-react';

interface Backtest {
  id: string;
  name: string;
  description: string;
  strategy_config: any;
  backtest_config: any;
  performance_metrics?: any;
  status: string;
  created_at: string;
}

export function BacktestingTab() {
  const [loading, setLoading] = useState(false);
  const [backtests, setBacktests] = useState<Backtest[]>([]);
  const [newBacktest, setNewBacktest] = useState({
    name: '',
    strategy_type: 'momentum',
    initial_capital: 100000,
    lookback_period: 20,
    threshold: 0.02
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchBacktests();
  }, []);

  const fetchBacktests = async () => {
    try {
      const response = await fetch('/api/research/backtests');
      if (response.ok) {
        const data = await response.json();
        setBacktests(data.backtests || []);
      }
    } catch (error) {
      console.error('Error fetching backtests:', error);
    }
  };

  const runBacktest = async (immediate = true) => {
    try {
      setLoading(true);
      
      const backtestData = {
        name: newBacktest.name || `${newBacktest.strategy_type} Strategy Test`,
        description: `Backtesting ${newBacktest.strategy_type} strategy with ${newBacktest.lookback_period} period`,
        strategy_config: {
          type: newBacktest.strategy_type,
          lookback_period: newBacktest.lookback_period,
          threshold: newBacktest.threshold
        },
        backtest_config: {
          initial_capital: newBacktest.initial_capital,
          start_date: '2023-01-01',
          end_date: '2023-12-31'
        },
        run_immediately: immediate
      };

      const response = await fetch('/api/research/backtests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backtestData)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Backtest result:', result);
        await fetchBacktests(); // Refresh list
        
        // Reset form
        setNewBacktest({
          name: '',
          strategy_type: 'momentum',
          initial_capital: 100000,
          lookback_period: 20,
          threshold: 0.02
        });
      } else {
        console.error('Backtest failed');
      }
    } catch (error) {
      console.error('Error running backtest:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPercentage = (value: number) => {
    return (value * 100).toFixed(2) + '%';
  };

  const formatNumber = (value: number) => {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Backtesting Engine</h2>
          <p className="text-muted-foreground">
            Kiểm tra hiệu suất chiến lược với dữ liệu thực và backtesting engine
          </p>
        </div>
        <Button onClick={() => runBacktest(true)} disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Đang chạy...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Quick Backtest
            </>
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Strategy Configuration
            </CardTitle>
            <CardDescription>
              Configure parameters cho backtest
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="backtest-name">Tên Backtest</Label>
              <Input
                id="backtest-name"
                value={newBacktest.name}
                onChange={(e) => setNewBacktest(prev => ({ ...prev, name: e.target.value }))}
                placeholder="VD: BTC Momentum Strategy"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="strategy-type">Loại Strategy</Label>
              <Select 
                value={newBacktest.strategy_type} 
                onValueChange={(value) => setNewBacktest(prev => ({ ...prev, strategy_type: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="momentum">Momentum Strategy</SelectItem>
                  <SelectItem value="mean_reversion">Mean Reversion</SelectItem>
                  <SelectItem value="breakout">Breakout Strategy</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="initial-capital">Initial Capital ($)</Label>
                <Input
                  id="initial-capital"
                  type="number"
                  value={newBacktest.initial_capital}
                  onChange={(e) => setNewBacktest(prev => ({ ...prev, initial_capital: parseInt(e.target.value) }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lookback-period">Lookback Period</Label>
                <Input
                  id="lookback-period"
                  type="number"
                  value={newBacktest.lookback_period}
                  onChange={(e) => setNewBacktest(prev => ({ ...prev, lookback_period: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="threshold">Signal Threshold</Label>
              <Input
                id="threshold"
                type="number"
                step="0.01"
                value={newBacktest.threshold}
                onChange={(e) => setNewBacktest(prev => ({ ...prev, threshold: parseFloat(e.target.value) }))}
              />
            </div>

            <Button onClick={() => runBacktest(true)} className="w-full" disabled={loading}>
              {loading ? 'Đang chạy...' : 'Run Backtest'}
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Backtest Statistics</CardTitle>
            <CardDescription>Tổng quan performance từ {backtests.length} backtests</CardDescription>
          </CardHeader>
          <CardContent>
            {backtests.length > 0 ? (
              <div className="space-y-4">
                {backtests.slice(0, 3).map((backtest) => (
                  <div key={backtest.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm">{backtest.name}</h4>
                      <Badge variant={backtest.status === 'completed' ? 'default' : 'secondary'}>
                        {backtest.status}
                      </Badge>
                    </div>
                    {backtest.performance_metrics && (
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="flex items-center gap-1">
                          <BarChart3 className="h-3 w-3 text-blue-500" />
                          <span>Trades: {backtest.performance_metrics.total_trades || 0}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Target className="h-3 w-3 text-purple-500" />
                          <span>Win Rate: {formatPercentage(backtest.performance_metrics.win_rate || 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3 text-green-500" />
                          <span>Avg Win: {(backtest.performance_metrics.avg_win_net || backtest.performance_metrics.avg_win || 0).toFixed(2)}%</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <TrendingDown className="h-3 w-3 text-red-500" />
                          <span>Avg Loss: {Math.abs(backtest.performance_metrics.avg_loss_net || backtest.performance_metrics.avg_loss || 0).toFixed(2)}%</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="h-12 w-12 mx-auto mb-4" />
                <p>Chưa có backtest nào</p>
                <p className="text-sm">Chạy backtest đầu tiên để xem kết quả</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Backtest Results */}
      <Card>
        <CardHeader>
          <CardTitle>Kết quả Backtests</CardTitle>
          <CardDescription>Chi tiết performance metrics từ các backtests đã chạy</CardDescription>
        </CardHeader>
        <CardContent>
          {backtests.length > 0 ? (
            <div className="space-y-4">
              {backtests.map((backtest) => (
                <div key={backtest.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium">{backtest.name}</h3>
                      <p className="text-sm text-muted-foreground">{backtest.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={backtest.status === 'completed' ? 'default' : 'secondary'}>
                        {backtest.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(backtest.created_at).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </div>

                  {backtest.performance_metrics && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-lg font-bold text-blue-600">
                          {backtest.performance_metrics.total_trades || 0}
                        </div>
                        <div className="text-xs text-muted-foreground">Số lượng Trade</div>
                      </div>
                      <div className="text-center p-3 bg-purple-50 rounded-lg">
                        <div className="text-lg font-bold text-purple-600">
                          {formatPercentage(backtest.performance_metrics.win_rate || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Winrate</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {(backtest.performance_metrics.avg_win_net || backtest.performance_metrics.avg_win || 0).toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Tỷ lệ lãi net trung bình</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-lg font-bold text-red-600">
                          {Math.abs(backtest.performance_metrics.avg_loss_net || backtest.performance_metrics.avg_loss || 0).toFixed(2)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Tỷ lệ lỗ net trung bình</div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-lg font-bold text-green-600">
                          {formatPercentage(backtest.performance_metrics.total_return || 0)}
                        </div>
                        <div className="text-xs text-muted-foreground">Tổng lợi nhuận</div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Chưa có backtest nào</h3>
              <p className="text-sm mb-4">
                Tạo và chạy backtest đầu tiên để đánh giá strategy performance
              </p>
              <Button onClick={() => runBacktest(true)} disabled={loading}>
                <Play className="h-4 w-4 mr-2" />
                Chạy Backtest Đầu Tiên
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showConfigModal && (
        <Card className="fixed z-50 bg-background border shadow-lg overflow-auto top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%] max-h-[90vh] w-[90vw] max-w-4xl">
          <div className="fixed inset-0 bg-black/50 z-[-1]" onClick={() => setShowConfigModal(false)}></div>
          {/* Add your modal content here */}
        </Card>
      )}
    </div>
  );
} 