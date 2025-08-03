"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target, 
  AlertTriangle,
  Download,
  RefreshCw,
  Compare,
  Settings
} from 'lucide-react';

interface StrategyParameters {
  name: string;
  color: string;
  // RSI Parameters
  rsiPeriod?: number;
  overbought?: number;
  oversold?: number;
  
  // MACD Parameters
  fastEMA?: number;
  slowEMA?: number;
  signalPeriod?: number;
  
  // Bollinger Bands Parameters
  bbPeriod?: number;
  bbStdDev?: number;
  
  // Moving Average Parameters
  maPeriod?: number;
  maType?: string;
  
  // General Parameters
  period?: number;
  stdDev?: number;
  multiplier?: number;
  
  // Risk Management
  stopLoss?: number;
  takeProfit?: number;
  positionSize?: number;
}

interface MonteCarloSimulation {
  finalEquity: number;
  maxDrawdown: number;
  sharpeRatio: number;
  totalReturn: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
}

interface HistogramData {
  bins: number[];
  frequencies: number[];
  binEdges: number[];
}

interface MonteCarloComparisonProps {
  strategies: StrategyParameters[];
  initialCapital?: number;
  simulations?: number;
  className?: string;
  backtestResults?: {
    [strategyName: string]: {
      totalReturn?: number;
      maxDrawdown?: number;
      sharpeRatio?: number;
      winRate?: number;
    };
  };
}

export default function MonteCarloComparison({ 
  strategies, 
  initialCapital = 10000, 
  simulations = 1000,
  className = "",
  backtestResults
}: MonteCarloComparisonProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<{[key: string]: MonteCarloSimulation[]}>({});
  const [histogramData, setHistogramData] = useState<{[key: string]: HistogramData}>({});
  const [selectedMetric, setSelectedMetric] = useState<'totalReturn' | 'maxDrawdown' | 'sharpeRatio' | 'winRate'>('totalReturn');
  const [statistics, setStatistics] = useState<{[key: string]: any}>({});
  const [showComparison, setShowComparison] = useState(true);

  // Tạo dữ liệu mô phỏng cho một chiến lược
  const generateSimulationData = useCallback((params: StrategyParameters, simCount: number): MonteCarloSimulation[] => {
    const results: MonteCarloSimulation[] = [];
    
    // Tính toán các tham số cơ bản từ strategy parameters
    const baseWinRate = params.rsiPeriod ? 65 : (params.fastEMA ? 60 : 55);
    const baseProfitFactor = params.bbStdDev ? 2.2 : (params.signalPeriod ? 1.8 : 1.5);
    const volatility = params.stdDev ? params.stdDev / 10 : 1.5;
    
    for (let i = 0; i < simCount; i++) {
      let equity = initialCapital;
      let maxEquity = equity;
      let maxDrawdown = 0;
      let wins = 0;
      let totalProfit = 0;
      let totalLoss = 0;
      let trades = 0;
      
      const totalTrades = Math.floor(1000 / (params.period || 20));
      
      for (let trade = 0; trade < totalTrades; trade++) {
        let currentWinRate = baseWinRate;
        if (params.overbought && params.oversold) {
          const range = params.overbought - params.oversold;
          currentWinRate += (range - 40) / 2;
        }
        
        const isWin = Math.random() < currentWinRate / 100;
        trades++;
        
        if (isWin) {
          wins++;
          const profit = (params.takeProfit || 2) + (Math.random() - 0.5) * volatility;
          totalProfit += profit;
          equity *= (1 + profit / 100);
        } else {
          const loss = (params.stopLoss || -1.5) + (Math.random() - 0.5) * volatility;
          totalLoss += Math.abs(loss);
          equity *= (1 + loss / 100);
        }
        
        if (equity > maxEquity) maxEquity = equity;
        const drawdown = (maxEquity - equity) / maxEquity;
        if (drawdown > maxDrawdown) maxDrawdown = drawdown;
      }
      
      const totalReturn = (equity - initialCapital) / initialCapital * 100;
      const winRate = (wins / trades) * 100;
      const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit;
      const avgReturn = totalReturn / trades;
      const sharpeRatio = avgReturn / volatility;
      
      results.push({
        finalEquity: equity,
        maxDrawdown: maxDrawdown * 100,
        sharpeRatio: sharpeRatio,
        totalReturn: totalReturn,
        winRate: winRate,
        profitFactor: profitFactor,
        totalTrades: trades
      });
    }
    
    return results;
  }, [initialCapital]);

  // Tạo histogram data
  const createHistogram = useCallback((data: number[], bins: number = 20): HistogramData => {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;
    
    const binEdges: number[] = [];
    const frequencies: number[] = [];
    
    for (let i = 0; i <= bins; i++) {
      binEdges.push(min + i * binWidth);
    }
    
    for (let i = 0; i < bins; i++) {
      const count = data.filter(value => 
        value >= binEdges[i] && value < binEdges[i + 1]
      ).length;
      frequencies.push(count);
    }
    
    const binCenters = binEdges.slice(0, -1).map((edge, i) => edge + binWidth / 2);
    
    return {
      bins: binCenters,
      frequencies: frequencies,
      binEdges: binEdges
    };
  }, []);

  // Chạy Monte Carlo simulation cho tất cả chiến lược
  const runMonteCarloSimulation = useCallback(async () => {
    setIsCalculating(true);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results: {[key: string]: MonteCarloSimulation[]} = {};
    const histograms: {[key: string]: HistogramData} = {};
    const stats: {[key: string]: any} = {};
    
    for (const strategy of strategies) {
      const strategyResults = generateSimulationData(strategy, simulations);
      results[strategy.name] = strategyResults;
      
      const metricData = strategyResults.map(r => r[selectedMetric]);
      const histogram = createHistogram(metricData);
      histograms[strategy.name] = histogram;
      
      const sortedData = [...metricData].sort((a, b) => a - b);
      const mean = sortedData.reduce((a, b) => a + b, 0) / sortedData.length;
      const median = sortedData[Math.floor(sortedData.length / 2)];
      const std = Math.sqrt(sortedData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sortedData.length);
      
      const percentiles = {
        p5: sortedData[Math.floor(0.05 * sortedData.length)],
        p25: sortedData[Math.floor(0.25 * sortedData.length)],
        p75: sortedData[Math.floor(0.75 * sortedData.length)],
        p95: sortedData[Math.floor(0.95 * sortedData.length)]
      };
      
      stats[strategy.name] = {
        mean,
        median,
        std,
        percentiles,
        min: sortedData[0],
        max: sortedData[sortedData.length - 1]
      };
    }
    
    setSimulationResults(results);
    setHistogramData(histograms);
    setStatistics(stats);
    setIsCalculating(false);
  }, [strategies, simulations, selectedMetric, generateSimulationData, createHistogram]);

  // Auto-run khi tham số thay đổi
  useEffect(() => {
    if (strategies.length > 0) {
      runMonteCarloSimulation();
    }
  }, [strategies, simulations, selectedMetric, runMonteCarloSimulation]);

  // Tạo SVG histogram cho một chiến lược
  const renderHistogram = (strategyName: string, color: string) => {
    const histogram = histogramData[strategyName];
    if (!histogram) return null;
    
    const maxFreq = Math.max(...histogram.frequencies);
    const width = 400;
    const height = 250; // Tăng chiều cao
    const margin = { top: 20, right: 20, bottom: 60, left: 40 }; // Tăng bottom margin
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const xScale = (value: number) => {
      const min = Math.min(...histogram.bins);
      const max = Math.max(...histogram.bins);
      return margin.left + ((value - min) / (max - min)) * chartWidth;
    };
    
    const yScale = (value: number) => {
      return margin.top + chartHeight - (value / maxFreq) * chartHeight;
    };
    
    const barWidth = chartWidth / histogram.bins.length * 0.8;
    
    // Tìm vị trí của backtest result
    const backtestResult = backtestResults?.[strategyName];
    const backtestValue = backtestResult?.[selectedMetric];
    const backtestX = backtestValue !== null && backtestValue !== undefined ? xScale(backtestValue) : null;
    
    return (
      <svg width={width} height={height} className="w-full">
        {histogram.bins.map((bin, i) => (
          <g key={i}>
            <rect
              x={xScale(bin) - barWidth / 2}
              y={yScale(histogram.frequencies[i])}
              width={barWidth}
              height={chartHeight - yScale(histogram.frequencies[i])}
              fill={color}
              opacity={0.7}
              className="hover:opacity-100 transition-opacity"
            />
            
            {/* Data label cho tần suất */}
            <text
              x={xScale(bin)}
              y={yScale(histogram.frequencies[i]) - 3}
              textAnchor="middle"
              className="text-xs fill-gray-700 font-medium"
            >
              {histogram.frequencies[i]}
            </text>
          </g>
        ))}
        
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="#374151"
          strokeWidth={1}
        />
        
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="#374151"
          strokeWidth={1}
        />
        
        {/* X-axis labels */}
        {histogram.bins.map((bin, i) => {
          if (i % Math.ceil(histogram.bins.length / 6) === 0) {
            return (
              <text
                key={`label-${i}`}
                x={xScale(bin)}
                y={height - margin.bottom + 12}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {bin.toFixed(1)}
              </text>
            );
          }
          return null;
        })}
        
        {/* Backtest result arrow */}
        {backtestX !== null && backtestValue !== null && (
          <g>
            <line
              x1={backtestX}
              y1={margin.top}
              x2={backtestX}
              y2={height - margin.bottom}
              stroke="#dc2626"
              strokeWidth={2}
              strokeDasharray="3,3"
            />
            
            <polygon
              points={`${backtestX - 4},${height - margin.bottom + 4} ${backtestX + 4},${height - margin.bottom + 4} ${backtestX},${height - margin.bottom + 8}`}
              fill="#dc2626"
            />
            
            <text
              x={backtestX}
              y={height - margin.bottom + 20}
              textAnchor="middle"
              className="text-xs fill-red-600 font-bold"
            >
              {backtestValue.toFixed(1)}
            </text>
          </g>
        )}
      </svg>
    );
  };

  const getMetricLabel = (metric: string) => {
    switch (metric) {
      case 'totalReturn': return 'Tổng lợi nhuận';
      case 'maxDrawdown': return 'Drawdown tối đa';
      case 'sharpeRatio': return 'Sharpe Ratio';
      case 'winRate': return 'Win Rate';
      default: return metric;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Compare className="h-5 w-5" />
            So Sánh Monte Carlo Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Strategies: {strategies.length}
              </Badge>
              <Badge variant="outline">
                Simulations: {simulations.toLocaleString()}
              </Badge>
              <Badge variant="outline">
                Initial Capital: ${initialCapital.toLocaleString()}
              </Badge>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant={showComparison ? "default" : "outline"}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                <Compare className="h-4 w-4 mr-2" />
                {showComparison ? 'So sánh' : 'Chi tiết'}
              </Button>
              
              <Button
                onClick={runMonteCarloSimulation}
                disabled={isCalculating}
                size="sm"
              >
                {isCalculating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Đang tính...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Chạy lại
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Metric Selection */}
          <div className="flex flex-wrap gap-2">
            {(['totalReturn', 'maxDrawdown', 'sharpeRatio', 'winRate'] as const).map((metric) => (
              <Button
                key={metric}
                variant={selectedMetric === metric ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedMetric(metric)}
              >
                {getMetricLabel(metric)}
              </Button>
            ))}
          </div>

          {/* Comparison View */}
          {showComparison && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {strategies.map((strategy) => (
                <Card key={strategy.name} className="border-l-4" style={{ borderLeftColor: strategy.color }}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: strategy.color }}></div>
                      {strategy.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Histogram */}
                    {renderHistogram(strategy.name, strategy.color)}
                    
                    {/* Statistics */}
                    {statistics[strategy.name] && (
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <div className="font-medium text-green-600">
                            {statistics[strategy.name].mean.toFixed(2)}
                          </div>
                          <div className="text-gray-500">Trung bình</div>
                        </div>
                        <div>
                          <div className="font-medium text-blue-600">
                            {statistics[strategy.name].median.toFixed(2)}
                          </div>
                          <div className="text-gray-500">Trung vị</div>
                        </div>
                        <div>
                          <div className="font-medium text-orange-600">
                            {statistics[strategy.name].std.toFixed(2)}
                          </div>
                          <div className="text-gray-500">Độ lệch</div>
                        </div>
                        <div>
                          <div className="font-medium text-purple-600">
                            {(statistics[strategy.name].mean / statistics[strategy.name].std).toFixed(2)}
                          </div>
                          <div className="text-gray-500">CV</div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Summary Table */}
          {Object.keys(statistics).length > 0 && (
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4">📊 Bảng So Sánh Chiến Lược</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Chiến lược</th>
                      <th className="text-right p-2">Trung bình</th>
                      <th className="text-right p-2">Trung vị</th>
                      <th className="text-right p-2">Độ lệch</th>
                      <th className="text-right p-2">CV</th>
                      <th className="text-right p-2">5%</th>
                      <th className="text-right p-2">95%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {strategies.map((strategy) => {
                      const stats = statistics[strategy.name];
                      if (!stats) return null;
                      
                      return (
                        <tr key={strategy.name} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium" style={{ color: strategy.color }}>
                            {strategy.name}
                          </td>
                          <td className="p-2 text-right">{stats.mean.toFixed(2)}</td>
                          <td className="p-2 text-right">{stats.median.toFixed(2)}</td>
                          <td className="p-2 text-right">{stats.std.toFixed(2)}</td>
                          <td className="p-2 text-right">{(stats.mean / stats.std).toFixed(2)}</td>
                          <td className="p-2 text-right">{stats.percentiles.p5.toFixed(2)}</td>
                          <td className="p-2 text-right">{stats.percentiles.p95.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Export Button */}
          <div className="flex justify-center">
            <Button
              variant="outline"
              onClick={() => {
                const dataStr = JSON.stringify({
                  strategies,
                  simulationResults,
                  histogramData,
                  statistics,
                  selectedMetric
                }, null, 2);
                const dataBlob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(dataBlob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `monte-carlo-comparison-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
              }}
            >
              <Download className="h-4 w-4 mr-2" />
              Xuất dữ liệu so sánh
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 