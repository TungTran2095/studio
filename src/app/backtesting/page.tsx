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

// Helper functions để tạo text signal cho backtest
function getBacktestBuySignalText(config: any, trade: any): string {
  if (!config?.strategyType) {
    return (trade as any).entry_reason || (trade as any).buy_signal || (trade as any).signal || '-';
  }

  const strategyType = config.strategyType;

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm mua
      const buyRsiValue = (trade as any).entry_rsi || (trade as any).rsi_value || (trade as any).indicator_value;
      if (buyRsiValue !== undefined && buyRsiValue !== null) {
        return `RSI = ${buyRsiValue.toFixed(2)} (Quá bán)`;
      }
      return `RSI < ${config.oversold || 30} (Quá bán)`;
    case 'macd':
      return `MACD cắt lên Signal`;
    case 'ma_crossover':
      return `MA${config.fastPeriod || 10} cắt lên MA${config.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải dưới BB`;
    case 'moving_average':
      return `Giá > MA${config.period || 20}`;
    case 'momentum':
      return `Momentum tăng > 2%`;
    case 'mean_reversion':
      return `Giá < SMA${config.period || 20} - 3%`;
    default:
      return (trade as any).entry_reason || (trade as any).buy_signal || (trade as any).signal || '-';
  }
}

function getBacktestSellSignalText(config: any, trade: any): string {
  // Ưu tiên hiển thị exit_reason từ backend nếu có
  if ((trade as any).exit_reason) {
    switch ((trade as any).exit_reason) {
      case 'stoploss':
        return 'Stoploss';
      case 'take_profit':
        return 'Take Profit';
      case 'signal':
        // Nếu là signal, hiển thị theo strategy type
        break;
      default:
        return (trade as any).exit_reason;
    }
  }

  if (!config?.strategyType) {
    return (trade as any).sell_signal || '-';
  }

  const strategyType = config.strategyType;

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm bán
      const sellRsiValue = (trade as any).exit_rsi || (trade as any).rsi_value || (trade as any).indicator_value;
      if (sellRsiValue !== undefined && sellRsiValue !== null) {
        return `RSI = ${sellRsiValue.toFixed(2)} (Quá mua)`;
      }
      return `RSI > ${config.overbought || 70} (Quá mua)`;
    case 'macd':
      return `MACD cắt xuống Signal`;
    case 'ma_crossover':
      return `MA${config.fastPeriod || 10} cắt xuống MA${config.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải trên BB`;
    case 'moving_average':
      return `Giá < MA${config.period || 20}`;
    case 'momentum':
      return `Momentum giảm > 1%`;
    case 'mean_reversion':
      return `Giá > SMA${config.period || 20}`;
    default:
      return (trade as any).sell_signal || '-';
  }
}

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
    },
    {
      id: 'rsi_strategy',
      name: 'RSI Strategy',
      description: 'Chiến lược giao dịch dựa trên chỉ báo RSI (Relative Strength Index)',
      parameters: [
        { name: 'period', label: 'Chu kỳ RSI', type: 'number', default: 14 },
        { name: 'overbought', label: 'Ngưỡng quá mua', type: 'number', default: 70 },
        { name: 'oversold', label: 'Ngưỡng quá bán', type: 'number', default: 30 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'bollinger_bands',
      name: 'Bollinger Bands',
      description: 'Chiến lược giao dịch dựa trên dải Bollinger Bands',
      parameters: [
        { name: 'period', label: 'Chu kỳ', type: 'number', default: 20 },
        { name: 'stdDev', label: 'Độ lệch chuẩn', type: 'number', default: 2 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'macd_strategy',
      name: 'MACD Strategy',
      description: 'Chiến lược giao dịch dựa trên chỉ báo MACD (Moving Average Convergence Divergence)',
      parameters: [
        { name: 'fastEMA', label: 'EMA nhanh', type: 'number', default: 12 },
        { name: 'slowEMA', label: 'EMA chậm', type: 'number', default: 26 },
        { name: 'signalPeriod', label: 'Chu kỳ tín hiệu', type: 'number', default: 9 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'breakout_strategy',
      name: 'Breakout Strategy',
      description: 'Chiến lược giao dịch dựa trên đột phá kênh giá',
      parameters: [
        { name: 'period', label: 'Chu kỳ kênh giá', type: 'number', default: 20 },
        { name: 'multiplier', label: 'Hệ số nhân', type: 'number', default: 2 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'stochastic',
      name: 'Stochastic Oscillator',
      description: 'Chiến lược giao dịch dựa trên Stochastic Oscillator',
      parameters: [
        { name: 'k_period', label: 'Chu kỳ %K', type: 'number', default: 14 },
        { name: 'd_period', label: 'Chu kỳ %D', type: 'number', default: 3 },
        { name: 'overbought', label: 'Ngưỡng quá mua', type: 'number', default: 80 },
        { name: 'oversold', label: 'Ngưỡng quá bán', type: 'number', default: 20 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'williams_r',
      name: 'Williams %R Strategy',
      description: 'Chiến lược giao dịch dựa trên Williams %R',
      parameters: [
        { name: 'period', label: 'Chu kỳ', type: 'number', default: 14 },
        { name: 'overbought', label: 'Ngưỡng quá mua', type: 'number', default: -20 },
        { name: 'oversold', label: 'Ngưỡng quá bán', type: 'number', default: -80 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'adx',
      name: 'ADX Strategy',
      description: 'Chiến lược giao dịch dựa trên ADX (Average Directional Index)',
      parameters: [
        { name: 'adx_period', label: 'Chu kỳ ADX', type: 'number', default: 14 },
        { name: 'adx_threshold', label: 'Ngưỡng ADX', type: 'number', default: 25 },
        { name: 'trend_strength', label: 'Độ mạnh xu hướng', type: 'number', default: 30 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'ichimoku',
      name: 'Ichimoku Cloud Strategy',
      description: 'Chiến lược giao dịch dựa trên Ichimoku Cloud',
      parameters: [
        { name: 'tenkan_period', label: 'Chu kỳ Tenkan', type: 'number', default: 10 },
        { name: 'kijun_period', label: 'Chu kỳ Kijun', type: 'number', default: 26 },
        { name: 'senkou_span_b_period', label: 'Chu kỳ Senkou Span B', type: 'number', default: 52 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'parabolic_sar',
      name: 'Parabolic SAR Strategy',
      description: 'Chiến lược giao dịch dựa trên Parabolic SAR',
      parameters: [
        { name: 'acceleration', label: 'Gia tốc', type: 'number', default: 0.02 },
        { name: 'maximum', label: 'Tối đa', type: 'number', default: 0.2 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'keltner_channel',
      name: 'Keltner Channel Strategy',
      description: 'Chiến lược giao dịch dựa trên Keltner Channel',
      parameters: [
        { name: 'ema_period', label: 'Chu kỳ EMA', type: 'number', default: 20 },
        { name: 'atr_period', label: 'Chu kỳ ATR', type: 'number', default: 10 },
        { name: 'multiplier', label: 'Hệ số nhân', type: 'number', default: 2.0 },
        { name: 'quantity', label: 'Số lượng giao dịch', type: 'number', default: 1 }
      ]
    },
    {
      id: 'vwap',
      name: 'VWAP Strategy',
      description: 'Chiến lược giao dịch dựa trên VWAP (Volume Weighted Average Price)',
      parameters: [
        { name: 'vwap_period', label: 'Chu kỳ VWAP', type: 'number', default: 20 },
        { name: 'std_dev_multiplier', label: 'Hệ số độ lệch chuẩn', type: 'number', default: 2.0 },
        { name: 'volume_threshold', label: 'Ngưỡng khối lượng', type: 'number', default: 1.5 },
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
        addLog(`  Lãi/Lỗ: $${(trade.profitLoss || 0).toFixed(2)} (${(trade.profitLossPercentage || 0).toFixed(2)}%)`);
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
                        <th className="h-12 px-4 text-center align-middle font-medium">Signal mua</th>
                        <th className="h-12 px-4 text-center align-middle font-medium">Signal bán</th>
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
                            <td className="p-4 text-center text-xs">
                              {getBacktestBuySignalText(formData, trade)}
                            </td>
                            <td className="p-4 text-center text-xs">
                              {getBacktestSellSignalText(formData, trade)}
                            </td>
                            <td className="p-4">{trade.quantity || 0}</td>
                            <td className="p-4">${tradeValue.toFixed(2)}</td>
                            <td className="p-4">${currentEquity.toFixed(2)}</td>
                            <td className="p-4">
                              <span className={`${
                                (tradeProfitLoss || 0) >= 0 
                                  ? 'text-green-600' 
                                  : 'text-red-600'
                              }`}>
                                {trade.type === 'SELL' ? `$${(tradeProfitLoss || 0).toFixed(2)} (${(tradeProfitLossPercentage || 0).toFixed(2)}%)` : '-'}
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