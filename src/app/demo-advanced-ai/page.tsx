"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

export default function DemoAdvancedAI() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [tradingStyle, setTradingStyle] = useState('moderate');

  const testAdvancedSentiment = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/advanced-sentiment?symbol=${symbol}&action=analyze`);
      const data = await response.json();
      setResults({ type: 'sentiment', data });
    } catch (error) {
      console.error('Error:', error);
      setResults({ type: 'error', data: { error: 'Failed to fetch sentiment data' } });
    } finally {
      setLoading(false);
    }
  };

  const testAnomalyDetection = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/ai/smart-alerts?symbol=${symbol}&action=detect_anomalies&metrics=price,volume,sentiment`);
      const data = await response.json();
      setResults({ type: 'anomaly', data });
    } catch (error) {
      console.error('Error:', error);
      setResults({ type: 'error', data: { error: 'Failed to fetch anomaly data' } });
    } finally {
      setLoading(false);
    }
  };

  const testSmartAlerts = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/smart-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_thresholds',
          userId: 'demo',
          tradingStyle
        })
      });
      const data = await response.json();
      setResults({ type: 'alerts', data });
    } catch (error) {
      console.error('Error:', error);
      setResults({ type: 'error', data: { error: 'Failed to setup smart alerts' } });
    } finally {
      setLoading(false);
    }
  };

  const testBatchAnalysis = async () => {
    setLoading(true);
    try {
      const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
      const [sentimentResponse, anomalyResponse] = await Promise.all([
        fetch('/api/ai/advanced-sentiment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_analyze',
            symbols
          })
        }),
        fetch('/api/ai/smart-alerts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'batch_detect_anomalies',
            symbols,
            metrics: ['price', 'volume']
          })
        })
      ]);

      const sentimentData = await sentimentResponse.json();
      const anomalyData = await anomalyResponse.json();

      setResults({ 
        type: 'batch', 
        data: { 
          sentiment: sentimentData, 
          anomaly: anomalyData 
        } 
      });
    } catch (error) {
      console.error('Error:', error);
      setResults({ type: 'error', data: { error: 'Failed to perform batch analysis' } });
    } finally {
      setLoading(false);
    }
  };

  const createTestAlert = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/smart-alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_test_alert',
          symbol,
          anomalyType: 'price_spike',
          anomalyScore: 0.85
        })
      });
      const data = await response.json();
      setResults({ type: 'test_alert', data });
    } catch (error) {
      console.error('Error:', error);
      setResults({ type: 'error', data: { error: 'Failed to create test alert' } });
    } finally {
      setLoading(false);
    }
  };

  const renderResults = () => {
    if (!results) return null;

    if (results.type === 'error') {
      return (
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">❌ Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{results.data.error}</p>
          </CardContent>
        </Card>
      );
    }

    switch (results.type) {
      case 'sentiment':
        const sentiment = results.data.data;
        return (
          <Card>
            <CardHeader>
              <CardTitle>🧠 Advanced Sentiment Analysis</CardTitle>
              <CardDescription>Multi-modal sentiment analysis results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Overall Score</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant={sentiment.overallSentiment.score > 0.3 ? 'default' : sentiment.overallSentiment.score < -0.3 ? 'destructive' : 'secondary'}>
                      {sentiment.overallSentiment.score.toFixed(2)}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {sentiment.overallSentiment.trend}
                    </span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Confidence</Label>
                  <div className="text-lg font-semibold">
                    {(sentiment.overallSentiment.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Fear & Greed Index</Label>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{sentiment.fearGreedIndex.value}/100</Badge>
                    <span className="text-sm">{sentiment.fearGreedIndex.level.replace('_', ' ')}</span>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Technical Bias</Label>
                  <Badge variant={sentiment.priceActionSentiment.technicalBias === 'bullish' ? 'default' : sentiment.priceActionSentiment.technicalBias === 'bearish' ? 'destructive' : 'secondary'}>
                    {sentiment.priceActionSentiment.technicalBias}
                  </Badge>
                </div>
              </div>

              {sentiment.overallSentiment.signals.length > 0 && (
                <div>
                  <Label className="text-sm font-medium">Signals</Label>
                  <div className="space-y-1">
                    {sentiment.overallSentiment.signals.map((signal: string, index: number) => (
                      <div key={index} className="text-sm bg-muted p-2 rounded">
                        {signal}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'anomaly':
        const anomaly = results.data.data;
        return (
          <Card>
            <CardHeader>
              <CardTitle>🔍 Anomaly Detection</CardTitle>
              <CardDescription>AI-powered anomaly detection results</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant={anomaly.isAnomaly ? 'destructive' : 'default'}>
                  {anomaly.isAnomaly ? '🚨 ANOMALY DETECTED' : '✅ Normal'}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Score: {(anomaly.anomalyScore * 100).toFixed(0)}%
                </span>
              </div>

              <div>
                <Label className="text-sm font-medium">Description</Label>
                <p className="text-sm bg-muted p-2 rounded">{anomaly.description}</p>
              </div>

              {anomaly.isAnomaly && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Type</Label>
                    <Badge variant="outline">{anomaly.anomalyType.replace('_', ' ')}</Badge>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Confidence</Label>
                    <span className="text-lg font-semibold">{(anomaly.confidence * 100).toFixed(0)}%</span>
                  </div>
                </div>
              )}

              {anomaly.historicalContext && (
                <div>
                  <Label className="text-sm font-medium">Historical Context</Label>
                  <div className="text-sm space-y-1">
                    <div>Similar events: {anomaly.historicalContext.similarEvents}</div>
                    <div>Average impact: {anomaly.historicalContext.averageImpact.toFixed(1)}%</div>
                    <div>Recovery time: {anomaly.historicalContext.recoveryTime}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'alerts':
        const thresholds = results.data.data;
        return (
          <Card>
            <CardHeader>
              <CardTitle>🔔 Smart Alert Thresholds</CardTitle>
              <CardDescription>Optimized alert thresholds for {tradingStyle} trading style</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(thresholds).map(([symbol, threshold]: [string, any]) => (
                  <div key={symbol} className="border rounded p-3">
                    <div className="font-medium mb-2">{symbol}</div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <Label>Price Change</Label>
                        <div>±{threshold.priceChange}%</div>
                      </div>
                      <div>
                        <Label>Volume Change</Label>
                        <div>{threshold.volumeChange}x</div>
                      </div>
                      <div>
                        <Label>Sentiment Change</Label>
                        <div>±{threshold.sentimentChange}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );

      case 'batch':
        return (
          <Card>
            <CardHeader>
              <CardTitle>📊 Batch Analysis Results</CardTitle>
              <CardDescription>Analysis results for multiple symbols</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {results.data.sentiment.success && (
                <div>
                  <Label className="text-sm font-medium">Sentiment Analysis</Label>
                  <div className="space-y-2">
                    {results.data.sentiment.data.map((item: any) => (
                      <div key={item.symbol} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{item.symbol}</span>
                        {item.success ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={item.sentiment.overallSentiment.score > 0.3 ? 'default' : item.sentiment.overallSentiment.score < -0.3 ? 'destructive' : 'secondary'}>
                              {item.sentiment.overallSentiment.score.toFixed(2)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {item.sentiment.overallSentiment.trend}
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {results.data.anomaly.success && (
                <div>
                  <Label className="text-sm font-medium">Anomaly Detection</Label>
                  <div className="space-y-2">
                    {results.data.anomaly.data.map((item: any) => (
                      <div key={item.symbol} className="flex items-center justify-between p-2 border rounded">
                        <span className="font-medium">{item.symbol}</span>
                        {item.success ? (
                          <div className="flex items-center gap-2">
                            <Badge variant={item.anomaly.isAnomaly ? 'destructive' : 'default'}>
                              {item.anomaly.isAnomaly ? 'ANOMALY' : 'Normal'}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {(item.anomaly.anomalyScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <Badge variant="destructive">Error</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      case 'test_alert':
        const alert = results.data.data;
        return (
          <Card>
            <CardHeader>
              <CardTitle>🔔 Test Alert Created</CardTitle>
              <CardDescription>Sample alert for testing purposes</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Alert ID</Label>
                  <div className="text-sm font-mono">{alert.id}</div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Severity</Label>
                  <Badge variant={alert.severity === 'critical' ? 'destructive' : alert.severity === 'high' ? 'destructive' : 'default'}>
                    {alert.severity}
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Message</Label>
                <p className="text-sm bg-muted p-2 rounded">{alert.message}</p>
              </div>

              <div>
                <Label className="text-sm font-medium">Channels</Label>
                <div className="flex gap-2">
                  {alert.channels.map((channel: string) => (
                    <Badge key={channel} variant="outline">{channel}</Badge>
                  ))}
                </div>
              </div>

              {alert.metadata.actionSuggestions && (
                <div>
                  <Label className="text-sm font-medium">Action Suggestions</Label>
                  <div className="space-y-1">
                    {alert.metadata.actionSuggestions.map((suggestion: string, index: number) => (
                      <div key={index} className="text-sm bg-muted p-2 rounded">
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🤖 Advanced AI Features Demo</h1>
        <p className="text-muted-foreground">
          Test các tính năng AI mới: Advanced Sentiment Analysis, Anomaly Detection, và Smart Alerts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>🎛️ Controls</CardTitle>
              <CardDescription>Configure test parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  placeholder="BTCUSDT"
                />
              </div>

              <div>
                <Label htmlFor="tradingStyle">Trading Style</Label>
                <Select value={tradingStyle} onValueChange={setTradingStyle}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                    <SelectItem value="scalper">Scalper</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-2">
                <Button 
                  onClick={testAdvancedSentiment} 
                  disabled={loading}
                  className="w-full"
                >
                  🧠 Test Advanced Sentiment
                </Button>

                <Button 
                  onClick={testAnomalyDetection} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  🔍 Test Anomaly Detection
                </Button>

                <Button 
                  onClick={testSmartAlerts} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  🔔 Test Smart Alerts
                </Button>

                <Button 
                  onClick={testBatchAnalysis} 
                  disabled={loading}
                  className="w-full"
                  variant="outline"
                >
                  📊 Test Batch Analysis
                </Button>

                <Button 
                  onClick={createTestAlert} 
                  disabled={loading}
                  className="w-full"
                  variant="secondary"
                >
                  🚨 Create Test Alert
                </Button>
              </div>

              {loading && (
                <div className="text-center text-sm text-muted-foreground">
                  ⏳ Processing...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {results ? (
            renderResults()
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>📊 Results</CardTitle>
                <CardDescription>Test results will appear here</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center text-muted-foreground py-8">
                  Select a test to run from the controls panel
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🧠 Advanced Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Multi-modal sentiment analysis với text, price action, và fear & greed index
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔍 Anomaly Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              AI-powered detection của price spikes, volume surges, và sentiment shifts
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">🔔 Smart Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Personalized alert thresholds dựa trên trading style và user behavior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">📊 Batch Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Parallel analysis của multiple symbols với sentiment và anomaly detection
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 