"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { runBacktest } from '@/actions/market-data';
import { BacktestResult } from '@/types/indicators';
import { Loader2, BarChart4 } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function BacktestingPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [formData, setFormData] = useState({
    symbol: 'BTC',
    timeframe: '1h',
    startDate: format(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    strategy: 'sma_crossover',
    initialCapital: 10000,
    apiKey: '',
    apiSecret: '',
    isTestnet: true
  });

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await runBacktest(
        formData.symbol,
        formData.timeframe as string,
        new Date(formData.startDate).toISOString(),
        new Date(formData.endDate).toISOString(),
        formData.strategy as any,
        Number(formData.initialCapital),
        formData.apiKey,
        formData.apiSecret,
        formData.isTestnet
      );

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Không thể thực hiện backtesting');
      }
    } catch (err: any) {
      setError(err.message || 'Đã xảy ra lỗi khi thực hiện backtesting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-6">
      <h1 className="text-2xl font-bold mb-6">Backtesting Engine</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Tham số backtesting</CardTitle>
              <CardDescription>Nhập các thông số để kiểm thử chiến lược</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="symbol">Mã tiền</Label>
                  <Input
                    id="symbol"
                    name="symbol"
                    value={formData.symbol}
                    onChange={handleChange}
                    placeholder="BTC, ETH, BNB,..."
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
                      <SelectItem value="30m">30 phút</SelectItem>
                      <SelectItem value="1h">1 giờ</SelectItem>
                      <SelectItem value="4h">4 giờ</SelectItem>
                      <SelectItem value="1d">1 ngày</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Ngày bắt đầu</Label>
                    <Input
                      id="startDate"
                      name="startDate"
                      type="date"
                      value={formData.startDate}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endDate">Ngày kết thúc</Label>
                    <Input
                      id="endDate"
                      name="endDate"
                      type="date"
                      value={formData.endDate}
                      onChange={handleChange}
                    />
                  </div>
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
                      <SelectItem value="sma_crossover">SMA Crossover</SelectItem>
                      <SelectItem value="macd">MACD</SelectItem>
                      <SelectItem value="bollinger_bands">Bollinger Bands</SelectItem>
                      <SelectItem value="rsi">RSI</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="initialCapital">Vốn ban đầu (USDT)</Label>
                  <Input
                    id="initialCapital"
                    name="initialCapital"
                    type="number"
                    value={formData.initialCapital}
                    onChange={handleChange}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiKey">API Key</Label>
                  <Input
                    id="apiKey"
                    name="apiKey"
                    value={formData.apiKey}
                    onChange={handleChange}
                    placeholder="Nhập Binance API Key"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apiSecret">API Secret</Label>
                  <Input
                    id="apiSecret"
                    name="apiSecret"
                    type="password"
                    value={formData.apiSecret}
                    onChange={handleChange}
                    placeholder="Nhập Binance API Secret"
                  />
                </div>
                
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    id="isTestnet"
                    name="isTestnet"
                    type="checkbox"
                    checked={formData.isTestnet}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="isTestnet" className="text-sm font-normal">Sử dụng Testnet</Label>
                </div>
                
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <BarChart4 className="mr-2 h-4 w-4" />
                      Chạy Backtesting
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
        
        <div className="lg:col-span-2">
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {result && (
            <Card>
              <CardHeader>
                <CardTitle>Kết quả Backtest {result.symbol} ({result.timeframe})</CardTitle>
                <CardDescription>
                  Từ {new Date(result.startDate).toLocaleDateString()} đến {new Date(result.endDate).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="overview">
                  <TabsList className="mb-4">
                    <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                    <TabsTrigger value="trades">Giao dịch</TabsTrigger>
                    <TabsTrigger value="chart">Biểu đồ</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Vốn ban đầu</div>
                        <div className="text-lg font-medium">${result.initialCapital.toLocaleString()}</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Vốn cuối kỳ</div>
                        <div className="text-lg font-medium">${result.finalCapital.toLocaleString()}</div>
                      </div>
                      <div className={`p-3 rounded-lg ${result.profitLoss >= 0 ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                        <div className="text-sm text-muted-foreground">Lợi nhuận</div>
                        <div className="text-lg font-medium">
                          ${result.profitLoss.toLocaleString()} ({result.profitLossPercentage.toFixed(2)}%)
                        </div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Tổng giao dịch</div>
                        <div className="text-lg font-medium">{result.totalTrades}</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Tỷ lệ thắng</div>
                        <div className="text-lg font-medium">{(result.winRate * 100).toFixed(2)}%</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Drawdown tối đa</div>
                        <div className="text-lg font-medium">{result.maxDrawdownPercentage.toFixed(2)}%</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Sharpe Ratio</div>
                        <div className="text-lg font-medium">{result.sharpeRatio.toFixed(2)}</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Lợi nhuận TB/giao dịch</div>
                        <div className="text-lg font-medium">${(result.profitLoss / result.totalTrades).toFixed(2)}</div>
                      </div>
                      <div className="bg-muted p-3 rounded-lg">
                        <div className="text-sm text-muted-foreground">Win/Loss Ratio</div>
                        <div className="text-lg font-medium">
                          {result.losingTrades > 0 
                            ? (result.winningTrades / result.losingTrades).toFixed(2) 
                            : result.winningTrades > 0 ? '∞' : '0'}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="trades">
                    <div className="rounded-md border">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b bg-muted">
                              <th className="p-2 text-left">Loại</th>
                              <th className="p-2 text-left">Ngày mua</th>
                              <th className="p-2 text-left">Giá mua</th>
                              <th className="p-2 text-left">Ngày bán</th>
                              <th className="p-2 text-left">Giá bán</th>
                              <th className="p-2 text-left">Lợi nhuận</th>
                              <th className="p-2 text-left">%</th>
                            </tr>
                          </thead>
                          <tbody>
                            {result.trades.map((trade, index) => (
                              <tr key={index} className="border-b">
                                <td className="p-2">{trade.type === 'buy' ? 'Mua' : 'Bán'}</td>
                                <td className="p-2">{new Date(trade.entryDate).toLocaleString()}</td>
                                <td className="p-2">${trade.entryPrice.toFixed(2)}</td>
                                <td className="p-2">{new Date(trade.exitDate).toLocaleString()}</td>
                                <td className="p-2">${trade.exitPrice.toFixed(2)}</td>
                                <td className={`p-2 ${trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  ${trade.profitLoss.toFixed(2)}
                                </td>
                                <td className={`p-2 ${trade.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {trade.profitLossPercentage.toFixed(2)}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="chart">
                    <div className="space-y-4">
                      <div className="h-[300px]">
                        <h3 className="text-lg font-medium mb-2">Biểu đồ vốn</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.chart.equityCurve}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={false}
                              label={{ value: 'Thời gian', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value: number) => [`$${value.toFixed(2)}`, 'Vốn']}
                              labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" name="Vốn" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="h-[300px]">
                        <h3 className="text-lg font-medium mb-2">Biểu đồ Drawdown</h3>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={result.chart.drawdownCurve}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="date" 
                              tick={false}
                              label={{ value: 'Thời gian', position: 'insideBottom', offset: -5 }}
                            />
                            <YAxis tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                            <Tooltip 
                              formatter={(value: number) => [`${(value * 100).toFixed(2)}%`, 'Drawdown']}
                              labelFormatter={(date) => new Date(date).toLocaleDateString()}
                            />
                            <Legend />
                            <Line type="monotone" dataKey="value" stroke="#ff0000" name="Drawdown" dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
} 