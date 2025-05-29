"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Zap, TrendingUp, Brain, BarChart3 } from 'lucide-react';

export function QuickResearchTool() {
  const [query, setQuery] = useState('');
  const [timeframe, setTimeframe] = useState('1d');
  const [algorithm, setAlgorithm] = useState('LSTM');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);

  const runQuickAnalysis = async () => {
    setLoading(true);
    try {
      // Simulate quick analysis
      await new Promise(resolve => setTimeout(resolve, 2000));
      setResults({
        prediction: 'Bullish trend expected',
        confidence: 0.78,
        signals: ['RSI oversold', 'Volume spike', 'MA crossover']
      });
    } catch (error) {
      console.error('Quick analysis error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Quick Research Tool
          </CardTitle>
          <CardDescription>
            Phân tích nhanh với AI để có insights tức thì
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Cryptocurrency</label>
              <Input
                placeholder="VD: BTC, ETH, URUS..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Timeframe</label>
              <Select value={timeframe} onValueChange={setTimeframe}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5m">5 phút</SelectItem>
                  <SelectItem value="1h">1 giờ</SelectItem>
                  <SelectItem value="1d">1 ngày</SelectItem>
                  <SelectItem value="1w">1 tuần</SelectItem>
                  <SelectItem value="1M">1 tháng</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Algorithm</label>
              <Select value={algorithm} onValueChange={setAlgorithm}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LSTM">LSTM Neural Network</SelectItem>
                  <SelectItem value="ARIMA">ARIMA</SelectItem>
                  <SelectItem value="RandomForest">Random Forest</SelectItem>
                  <SelectItem value="SVM">Support Vector Machine</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button 
            onClick={runQuickAnalysis} 
            disabled={!query || loading}
            className="w-full"
          >
            {loading ? 'Đang phân tích...' : 'Chạy phân tích nhanh'}
          </Button>

          {results && (
            <Alert>
              <TrendingUp className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Dự đoán:</span>
                    <Badge variant="default">{results.prediction}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Độ tin cậy:</span>
                    <Badge variant="outline">{(results.confidence * 100).toFixed(1)}%</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Tín hiệu:</span>
                    <div className="flex gap-1 mt-1">
                      {results.signals.map((signal: string, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {signal}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-blue-500" />
              AI Models
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-sm text-muted-foreground">Available models</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-green-500" />
              Accuracy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87.3%</div>
            <p className="text-sm text-muted-foreground">Average accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              Predictions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-sm text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 