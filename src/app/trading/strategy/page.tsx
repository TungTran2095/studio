'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { BarChart, LineChart, ArrowRight, Settings, Sliders, TrendingUp } from 'lucide-react';
import { Signal, BacktestResult, StrategyParams, PositionSizingType } from '@/lib/trading/strategy';

// Tạm thời sử dụng dữ liệu giả
const mockTradingStrategies = [
  { id: 'trend-following', name: 'Chiến lược theo xu hướng (Trend Following)' },
  { id: 'momentum', name: 'Chiến lược xung lượng (Momentum)' },
];

const initialParams: StrategyParams = {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  capital: 10000,
  leverageMultiplier: 1,
  positionSizingType: PositionSizingType.PERCENTAGE,
  positionSize: 10,
  riskPerTrade: 1,
  maxOpenPositions: 1,
  maxLoss: 30,
  trailingStopEnabled: true,
  trailingStopActivation: 2,
  trailingStopDistance: 1,
  
  // Tham số bổ sung cho trend following
  fastEMA: 10,
  slowEMA: 21,
  longSMA: 50,
  rsiPeriod: 14,
  rsiOverbought: 70,
  rsiOversold: 30,
  volumeThreshold: 150,
  minTrendStrength: 0.5,
  stopLossPercentage: 2,
  takeProfitPercentage: 5,
  riskRewardRatio: 2.5
};

export default function TradingStrategy() {
  const { toast } = useToast();
  const [selectedStrategy, setSelectedStrategy] = useState(mockTradingStrategies[0].id);
  const [params, setParams] = useState<StrategyParams>(initialParams);
  const [isLoading, setIsLoading] = useState(false);
  const [isBacktesting, setIsBacktesting] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [latestSignal, setLatestSignal] = useState<Signal | null>(null);
  const [backtestResult, setBacktestResult] = useState<BacktestResult | null>(null);
  const [activeTab, setActiveTab] = useState('parameters');

  // Lấy tín hiệu giao dịch
  const fetchSignals = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/trading/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'analyze',
          strategyType: selectedStrategy,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi phân tích dữ liệu');
      }

      const data = await response.json();
      setSignals(data.signals);
      setLatestSignal(data.latestSignal);
      
      toast({
        title: 'Đã phân tích dữ liệu thành công',
        description: `Đã tạo ${data.signals.length} tín hiệu giao dịch`,
      });
    } catch (error) {
      console.error('Lỗi:', error);
      toast({
        title: 'Lỗi phân tích dữ liệu',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Chạy backtest
  const runBacktest = async () => {
    setIsBacktesting(true);
    try {
      const response = await fetch('/api/trading/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'backtest',
          strategyType: selectedStrategy,
          params,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi chạy backtest');
      }

      const data = await response.json();
      setBacktestResult(data.result);
      setActiveTab('backtest');
      
      toast({
        title: 'Đã chạy backtest thành công',
        description: `Lợi nhuận: ${data.result.totalReturn.toFixed(2)}%, Số giao dịch: ${data.result.totalTrades}`,
      });
    } catch (error) {
      console.error('Lỗi:', error);
      toast({
        title: 'Lỗi chạy backtest',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsBacktesting(false);
    }
  };

  // Tối ưu hóa tham số
  const optimizeParameters = async () => {
    setIsOptimizing(true);
    try {
      // Định nghĩa phạm vi tham số
      const paramRanges = {
        fastEMA: [5, 20, 5],
        slowEMA: [15, 30, 5],
        rsiPeriod: [7, 21, 7],
      };

      const response = await fetch('/api/trading/strategy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'optimize',
          strategyType: selectedStrategy,
          params,
          paramRanges,
        }),
      });

      if (!response.ok) {
        throw new Error('Lỗi khi tối ưu hóa tham số');
      }

      const data = await response.json();
      setParams(data.optimizedParams);
      setBacktestResult(data.backtestResult);
      setActiveTab('backtest');
      
      toast({
        title: 'Đã tối ưu hóa tham số thành công',
        description: `Lợi nhuận tối ưu: ${data.backtestResult.totalReturn.toFixed(2)}%`,
      });
    } catch (error) {
      console.error('Lỗi:', error);
      toast({
        title: 'Lỗi tối ưu hóa tham số',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Thay đổi chiến lược
  const handleStrategyChange = (strategyId: string) => {
    setSelectedStrategy(strategyId);
    // Reset dữ liệu
    setSignals([]);
    setLatestSignal(null);
    setBacktestResult(null);
  };

  // Thay đổi tham số
  const handleParamChange = (key: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Chiến lược giao dịch tự động</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Chọn chiến lược</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTradingStrategies.map((strategy) => (
                  <Button
                    key={strategy.id}
                    variant={selectedStrategy === strategy.id ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => handleStrategyChange(strategy.id)}
                  >
                    <TrendingUp className="w-4 h-4 mr-2" />
                    {strategy.name}
                  </Button>
                ))}

                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Hành động</h3>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={fetchSignals}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <ArrowRight className="w-4 h-4 mr-2" />
                      )}
                      Phân tích tín hiệu
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={runBacktest}
                      disabled={isBacktesting}
                    >
                      {isBacktesting ? (
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <BarChart className="w-4 h-4 mr-2" />
                      )}
                      Chạy Backtest
                    </Button>
                    
                    <Button
                      variant="outline"
                      className="w-full justify-start"
                      onClick={optimizeParameters}
                      disabled={isOptimizing}
                    >
                      {isOptimizing ? (
                        <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                      ) : (
                        <Sliders className="w-4 h-4 mr-2" />
                      )}
                      Tối ưu hóa tham số
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main content */}
        <div className="md:col-span-3">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="parameters">
                <Settings className="w-4 h-4 mr-2" />
                Tham số
              </TabsTrigger>
              <TabsTrigger value="signals">
                <ArrowRight className="w-4 h-4 mr-2" />
                Tín hiệu
              </TabsTrigger>
              <TabsTrigger value="backtest">
                <LineChart className="w-4 h-4 mr-2" />
                Kết quả Backtest
              </TabsTrigger>
            </TabsList>

            <TabsContent value="parameters" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Tham số chiến lược</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Chỉ hiển thị một số tham số cơ bản để đơn giản */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Cặp giao dịch</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={params.symbol}
                          onChange={(e) => handleParamChange('symbol', e.target.value)}
                        >
                          <option value="BTCUSDT">BTC/USDT</option>
                          <option value="ETHUSDT">ETH/USDT</option>
                          <option value="BNBUSDT">BNB/USDT</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Khung thời gian</label>
                        <select
                          className="w-full p-2 border rounded"
                          value={params.timeframe}
                          onChange={(e) => handleParamChange('timeframe', e.target.value)}
                        >
                          <option value="5m">5 phút</option>
                          <option value="15m">15 phút</option>
                          <option value="1h">1 giờ</option>
                          <option value="4h">4 giờ</option>
                          <option value="1d">1 ngày</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Vốn giao dịch</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={params.capital}
                          onChange={(e) => handleParamChange('capital', Number(e.target.value))}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium mb-1">Kích thước vị thế (%)</label>
                        <input
                          type="number"
                          className="w-full p-2 border rounded"
                          value={params.positionSize}
                          onChange={(e) => handleParamChange('positionSize', Number(e.target.value))}
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      {selectedStrategy === 'trend-following' && (
                        <>
                          <div>
                            <label className="block text-sm font-medium mb-1">EMA nhanh</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={params.fastEMA}
                              onChange={(e) => handleParamChange('fastEMA', Number(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">EMA chậm</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={params.slowEMA}
                              onChange={(e) => handleParamChange('slowEMA', Number(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">SMA dài hạn</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={params.longSMA}
                              onChange={(e) => handleParamChange('longSMA', Number(e.target.value))}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-sm font-medium mb-1">RSI Period</label>
                            <input
                              type="number"
                              className="w-full p-2 border rounded"
                              value={params.rsiPeriod}
                              onChange={(e) => handleParamChange('rsiPeriod', Number(e.target.value))}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signals">
              <Card>
                <CardHeader>
                  <CardTitle>Tín hiệu giao dịch</CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : signals.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b">
                            <th className="py-2 text-left">Thời gian</th>
                            <th className="py-2 text-left">Loại</th>
                            <th className="py-2 text-right">Giá</th>
                            <th className="py-2 text-right">Độ mạnh</th>
                            <th className="py-2 text-left">Lý do</th>
                          </tr>
                        </thead>
                        <tbody>
                          {signals.map((signal, index) => (
                            <tr key={index} className="border-b">
                              <td className="py-2">
                                {new Date(signal.timestamp).toLocaleString()}
                              </td>
                              <td className="py-2">
                                <span
                                  className={`inline-block px-2 py-1 rounded text-xs ${
                                    signal.type === 'BUY' || signal.type === 'STRONG_BUY'
                                      ? 'bg-green-100 text-green-800'
                                      : 'bg-red-100 text-red-800'
                                  }`}
                                >
                                  {signal.type}
                                </span>
                              </td>
                              <td className="py-2 text-right">{signal.price.toFixed(2)}</td>
                              <td className="py-2 text-right">{(signal.strength * 100).toFixed(0)}%</td>
                              <td className="py-2 text-sm">{signal.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Chưa có tín hiệu nào. Vui lòng nhấn "Phân tích tín hiệu" để tạo tín hiệu.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backtest">
              <Card>
                <CardHeader>
                  <CardTitle>Kết quả Backtest</CardTitle>
                </CardHeader>
                <CardContent>
                  {isBacktesting ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"></div>
                    </div>
                  ) : backtestResult ? (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-100 rounded-md">
                          <div className="text-sm text-slate-500">Lợi nhuận</div>
                          <div className="text-2xl font-bold">{backtestResult.totalReturn.toFixed(2)}%</div>
                        </div>
                        <div className="p-4 bg-slate-100 rounded-md">
                          <div className="text-sm text-slate-500">Số giao dịch</div>
                          <div className="text-2xl font-bold">{backtestResult.totalTrades}</div>
                        </div>
                        <div className="p-4 bg-slate-100 rounded-md">
                          <div className="text-sm text-slate-500">Tỷ lệ thắng</div>
                          <div className="text-2xl font-bold">{backtestResult.winRate.toFixed(2)}%</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h3 className="font-medium mb-2">Thống kê chi tiết</h3>
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Vốn ban đầu</td>
                                <td className="py-1 text-right">${backtestResult.initialCapital.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Vốn cuối</td>
                                <td className="py-1 text-right">${backtestResult.finalCapital.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Lợi nhuận hàng năm</td>
                                <td className="py-1 text-right">{backtestResult.annualizedReturn.toFixed(2)}%</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Drawdown tối đa</td>
                                <td className="py-1 text-right">{backtestResult.maxDrawdown.toFixed(2)}%</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Sharpe Ratio</td>
                                <td className="py-1 text-right">{backtestResult.sharpeRatio.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Profit Factor</td>
                                <td className="py-1 text-right">{backtestResult.profitFactor.toFixed(2)}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div>
                          <h3 className="font-medium mb-2">Thống kê giao dịch</h3>
                          <table className="w-full">
                            <tbody>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Tổng số giao dịch</td>
                                <td className="py-1 text-right">{backtestResult.totalTrades}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Giao dịch thắng</td>
                                <td className="py-1 text-right">{backtestResult.winningTrades}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Giao dịch thua</td>
                                <td className="py-1 text-right">{backtestResult.losingTrades}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Lợi nhuận trung bình</td>
                                <td className="py-1 text-right">${backtestResult.averageTrade.toFixed(2)}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Thắng liên tiếp nhiều nhất</td>
                                <td className="py-1 text-right">{backtestResult.maxConsecutiveWins}</td>
                              </tr>
                              <tr>
                                <td className="py-1 text-sm text-slate-500">Thua liên tiếp nhiều nhất</td>
                                <td className="py-1 text-right">{backtestResult.maxConsecutiveLosses}</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      Chưa có kết quả backtest. Vui lòng nhấn "Chạy Backtest" để bắt đầu.
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
} 