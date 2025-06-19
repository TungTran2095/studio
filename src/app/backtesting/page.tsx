"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Line as RechartsLine } from 'recharts';
import { runBacktestStrategy, type BacktestResult } from '@/ai/tools/market-intelligence';
import { Loader2, BarChart4 } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BacktestConfig, OHLCV } from '@/modules/backtesting/types';
import { Line as ChartLine } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip as ChartTooltip,
  Legend as ChartLegend
} from 'chart.js';
import { BinanceService } from '@/services/binance';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  ChartTooltip,
  ChartLegend
);

export default function BacktestingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [formData, setFormData] = useState({
    symbol: 'BTCUSDT',
    timeframe: '1h',
    startDate: format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    strategy: 'ma_crossover',
    initialCapital: 10000,
    apiKey: '',
    apiSecret: '',
    isTestnet: false
  });

  const [config, setConfig] = useState<BacktestConfig>({
    startDate: '2023-01-01',
    endDate: '2023-12-31',
    initialCapital: 10000,
    commission: 0.001,
    slippage: 0.001,
    leverage: 1,
    parameters: {
      fastPeriod: 10,
      slowPeriod: 20,
      quantity: 1
    }
  });

  const [rawData, setRawData] = useState<OHLCV[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const strategies = [
    {
      id: 'ma_crossover',
      name: 'Moving Average Crossover',
      description: 'Chiến lược giao dịch dựa trên giao cắt của hai đường trung bình động',
      parameters: [
        { name: 'fastPeriod', label: 'Chu kỳ MA nhanh', type: 'number', default: 10 },
        { name: 'slowPeriod', label: 'Chu kỳ MA chậm', type: 'number', default: 20 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    }
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleRunBacktest = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await runBacktestStrategy(
        formData.apiKey,
        formData.apiSecret,
        formData.symbol,
        formData.timeframe,
        formData.strategy as 'sma_crossover' | 'ma_crossover' | 'macd' | 'bollinger_bands' | 'rsi',
        formData.startDate,
        formData.endDate,
        Number(formData.initialCapital),
        formData.isTestnet
      );

      setResult(response);
      setRawData(response.equityChart.map(point => ({
        timestamp: point.timestamp,
        open: point.value,
        high: point.value,
        low: point.value,
        close: point.value,
        volume: 0
      })));

      // Thêm logs chi tiết về các giao dịch
      addLog('=== BẮT ĐẦU BACKTEST ===');
      addLog(`Cặp giao dịch: ${formData.symbol}`);
      addLog(`Khung thời gian: ${formData.timeframe}`);
      addLog(`Chiến lược: ${formData.strategy}`);
      addLog(`Thời gian: ${formData.startDate} đến ${formData.endDate}`);
      addLog(`Vốn ban đầu: $${formData.initialCapital}`);
      addLog('');

      // Log tổng quan
      addLog('=== KẾT QUẢ TỔNG QUAN ===');
      addLog(`Tổng số giao dịch: ${response.summary.totalTrades}`);
      addLog(`Số giao dịch thắng: ${response.summary.winningTrades}`);
      addLog(`Số giao dịch thua: ${response.summary.losingTrades}`);
      addLog(`Tỷ lệ thắng: ${(response.summary.winRate * 100).toFixed(2)}%`);
      addLog(`Lợi nhuận trung bình: $${response.summary.averageWin.toFixed(2)}`);
      addLog(`Thua lỗ trung bình: $${response.summary.averageLoss.toFixed(2)}`);
      addLog(`Tổng lợi nhuận: ${response.summary.profitLossPercentage.toFixed(2)}%`);
      addLog(`Drawdown tối đa: ${response.summary.maxDrawdownPercentage.toFixed(2)}%`);
      addLog(`Sharpe Ratio: ${response.summary.sharpeRatio.toFixed(2)}`);
      addLog('');

      // Log chi tiết từng giao dịch
      addLog('=== CHI TIẾT GIAO DỊCH ===');
      response.trades.forEach((trade, index) => {
        addLog(`Giao dịch #${index + 1}:`);
        addLog(`  Thời gian: ${format(new Date(trade.timestamp), 'dd/MM/yyyy HH:mm')}`);
        addLog(`  Loại: ${trade.type}`);
        addLog(`  Giá: $${trade.price.toFixed(2)}`);
        addLog(`  Số lượng: ${trade.quantity}`);
        addLog(`  Giá trị: $${Math.abs(trade.value).toFixed(2)}`);
        addLog(`  Lãi/Lỗ: $${trade.profitLoss.toFixed(2)} (${trade.profitLossPercentage.toFixed(2)}%)`);
        addLog(`  Lý do: ${trade.reason}`);
        addLog('');
      });

      addLog('=== KẾT THÚC BACKTEST ===');
    } catch (error: any) {
      setError(error.message || 'Có lỗi xảy ra khi chạy backtest');
      addLog(`Lỗi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadData = async () => {
    try {
      setIsLoadingData(true);
      addLog('Đang tải dữ liệu...');

      const response = await fetch('/api/research/ohlcv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: formData.symbol,
          timeframe: formData.timeframe,
          startTime: formData.startDate,
          endTime: formData.endDate
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Lỗi khi tải dữ liệu');
      }

      const data = await response.json();
      setRawData(data.ohlcv);
      addLog(`Đã tải ${data.count} điểm dữ liệu`);
    } catch (error: any) {
      setError(error.message);
      addLog(`Lỗi: ${error.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  const addLog = (message: string) => {
    console.log(message);
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Backtesting</h1>
          <p className="text-muted-foreground">
            Kiểm tra hiệu suất chiến lược giao dịch với dữ liệu lịch sử
          </p>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Cấu hình Backtest</CardTitle>
            <CardDescription>
              Thiết lập các thông số cho chiến lược backtesting
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleRunBacktest();
            }} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Cặp giao dịch</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="BTCUSDT"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeframe">Khung thời gian</Label>
                  <Select
                    value={formData.timeframe}
                    onValueChange={(value) => handleSelectChange('timeframe', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn khung thời gian" />
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

                <div className="space-y-2">
                  <Label htmlFor="startDate">Ngày bắt đầu</Label>
                  <Input
                    id="startDate"
                    type="date"
                    name="startDate"
                    value={formData.startDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endDate">Ngày kết thúc</Label>
                  <Input
                    id="endDate"
                    type="date"
                    name="endDate"
                    value={formData.endDate}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Chiến lược</Label>
                  <Select
                    value={formData.strategy}
                    onValueChange={(value) => handleSelectChange('strategy', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chiến lược" />
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

                <div className="space-y-2">
                  <Label htmlFor="initialCapital">Vốn ban đầu ($)</Label>
                  <Input
                    id="initialCapital"
                    type="number"
                    name="initialCapital"
                    value={formData.initialCapital}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="isTestnet"
                    name="isTestnet"
                    checked={formData.isTestnet}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isTestnet">Sử dụng Testnet</Label>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          apiKey: 'UrsDp0aGxKhpBaR8ELTWyJaAMLMUlDXHk038kx2XeqVQYm7DBQh4zJHxR6Veuryw',
                          apiSecret: 'IqoUeRkJiUMkb4ly9VLXfzYsxaNOgvkV9CoxGJbByoyhehwKJ1CsI5EgA7ues937',
                          isTestnet: true
                        });
                      }}
                    >
                      Default
                    </Button>
                  </div>
                  <Input
                    id="apiKey"
                    type="password"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleChange}
                    placeholder="Nhập Binance API key"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    type="password"
                    name="apiSecret"
                    value={formData.apiSecret}
                    onChange={handleChange}
                    placeholder="Nhập Binance API secret"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  className="mr-2"
                  onClick={handleLoadData}
                  disabled={isLoadingData}
                >
                  {isLoadingData ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang tải...
                    </>
                  ) : (
                    <>
                      <BarChart4 className="mr-2 h-4 w-4" />
                      Tải dữ liệu
                    </>
                  )}
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang chạy...
                    </>
                  ) : (
                    <>
                      <BarChart4 className="mr-2 h-4 w-4" />
                      Chạy Backtest
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Kết quả Backtest</CardTitle>
              <CardDescription>
                Phân tích hiệu suất của chiến lược
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Tổng lợi nhuận</div>
                    <div className="text-2xl font-bold text-green-600">
                      {(result?.summary?.profitLossPercentage || 0).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Sharpe Ratio</div>
                    <div className="text-2xl font-bold text-blue-600">
                      {(result?.summary?.sharpeRatio || 0).toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Drawdown tối đa</div>
                    <div className="text-2xl font-bold text-red-600">
                      {(result?.summary?.maxDrawdownPercentage || 0).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm font-medium text-muted-foreground">Tỷ lệ thắng</div>
                    <div className="text-2xl font-bold text-purple-600">
                      {((result?.summary?.winRate || 0) * 100).toFixed(2)}%
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Biểu đồ tổng tài sản</CardTitle>
              <CardDescription>
                Diễn biến tổng tài sản theo thời gian
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.trades.map((trade, i) => {
                    let currentEquity = formData.initialCapital;
                    for (let j = 0; j < i; j++) {
                      const prevTrade = result.trades[j];
                      if (prevTrade && prevTrade.type === 'SELL') {
                        const buyTrade = result.trades
                          .slice(0, j)
                          .reverse()
                          .find(t => t.type === 'BUY');
                        
                        if (buyTrade) {
                          const profitLoss = (prevTrade.price - buyTrade.price) * prevTrade.quantity;
                          currentEquity += profitLoss;
                        }
                      }
                    }
                    return {
                      timestamp: trade.timestamp,
                      value: currentEquity
                    };
                  })}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM/yyyy')}
                    />
                    <YAxis domain={['auto', 'auto']} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'dd/MM/yyyy HH:mm')}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, 'Tổng tài sản']}
                    />
                    <Legend />
                    <RechartsLine
                      type="monotone"
                      dataKey="value"
                      stroke="#2563eb"
                      name="Tổng tài sản"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card>
            <CardHeader>
              <CardTitle>Chi tiết giao dịch</CardTitle>
              <CardDescription>
                Danh sách các giao dịch được thực hiện trong quá trình backtest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="overflow-x-auto max-h-[400px]">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="h-12 px-4 text-left align-middle font-medium">Thời gian</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Loại</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Giá</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Số lượng</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Giá trị</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Tổng tài sản</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Lãi/Lỗ</th>
                        <th className="h-12 px-4 text-left align-middle font-medium">Lý do</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.trades.map((trade, i) => {
                        // Tính tổng tài sản tại thời điểm giao dịch
                        let currentEquity = formData.initialCapital;
                        let tradeProfitLoss = 0;
                        let tradeProfitLossPercentage = 0;

                        // Nếu là giao dịch SELL, tìm giao dịch BUY gần nhất để tính lãi/lỗ
                        if (trade.type === 'SELL') {
                          // Tìm giao dịch BUY gần nhất trước đó
                          const buyTrade = result.trades
                            .slice(0, i)
                            .reverse()
                            .find(t => t.type === 'BUY');

                          if (buyTrade) {
                            // Tính lãi/lỗ = (Giá bán - Giá mua) * Số lượng
                            tradeProfitLoss = (trade.price - buyTrade.price) * trade.quantity;
                            // Tính phần trăm lãi/lỗ dựa trên giá trị giao dịch
                            const tradeValue = buyTrade.price * buyTrade.quantity;
                            tradeProfitLossPercentage = (tradeProfitLoss / tradeValue) * 100;
                          }
                        }

                        // Tính tổng tài sản dựa trên các giao dịch đã hoàn thành (có lãi/lỗ)
                        for (let j = 0; j < i; j++) {
                          const prevTrade = result.trades[j];
                          if (prevTrade && prevTrade.type === 'SELL') {
                            const buyTrade = result.trades
                              .slice(0, j)
                              .reverse()
                              .find(t => t.type === 'BUY');
                            
                            if (buyTrade) {
                              const profitLoss = (prevTrade.price - buyTrade.price) * prevTrade.quantity;
                              currentEquity += profitLoss;
                            }
                          }
                        }

                        // Tính giá trị giao dịch
                        const tradeValue = Math.abs((trade.price || 0) * (trade.quantity || 0));

                        return (
                          <tr key={i} className="border-b">
                            <td className="p-4">{format(new Date(trade.timestamp), 'dd/MM/yyyy HH:mm')}</td>
                            <td className="p-4">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                trade.type === 'BUY' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {trade.type}
                              </span>
                            </td>
                            <td className="p-4">${(trade.price || 0).toFixed(2)}</td>
                            <td className="p-4">{trade.quantity || 0}</td>
                            <td className="p-4">${tradeValue.toFixed(2)}</td>
                            <td className="p-4">${currentEquity.toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`${
                                tradeProfitLoss >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {trade.type === 'SELL' ? `$${tradeProfitLoss.toFixed(2)} (${tradeProfitLossPercentage.toFixed(2)}%)` : '-'}
                              </span>
                            </td>
                            <td className="p-4">{trade.reason || 'Không có lý do'}</td>
                          </tr>
                        );
                      })}
                      <tr className="border-t-2 border-t-gray-200 bg-muted/30">
                        <td colSpan={6} className="p-4 text-right font-medium">Tổng lãi/lỗ:</td>
                        <td className="p-4">
                          <span className={`font-medium ${
                            (result.summary.profitLoss || 0) >= 0 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            ${(result.summary.profitLoss || 0).toFixed(2)} 
                            ({(result.summary.profitLossPercentage || 0).toFixed(2)}%)
                          </span>
                        </td>
                        <td></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs</CardTitle>
              <CardDescription>
                Chi tiết quá trình thực thi backtest
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 