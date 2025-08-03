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
  RefreshCw
} from 'lucide-react';

interface BacktestMetrics {
  totalTrades: number;
  winRate: number;
  avgWinNet: number;  // Tỷ lệ lãi net trung bình (%)
  avgLossNet: number; // Tỷ lệ lỗ net trung bình (%)
}

interface MonteCarloSimulation {
  finalEquity: number;
  totalReturn: number;
  maxDrawdown: number;
  finalWinRate: number;
}

interface HistogramData {
  bins: number[];
  frequencies: number[];
  binEdges: number[];
}

interface MonteCarloHistogramProps {
  backtestMetrics: BacktestMetrics;
  initialCapital?: number;
  simulations?: number;
  className?: string;
  backtestResult?: {
    totalReturn?: number;
    maxDrawdown?: number;
  };
}

export default function MonteCarloHistogram({ 
  backtestMetrics, 
  initialCapital = 10000, 
  simulations = 1000,
  className = "",
  backtestResult
}: MonteCarloHistogramProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<MonteCarloSimulation[]>([]);
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [statistics, setStatistics] = useState<any>(null);

  // Tạo Monte Carlo simulation cho tổng lợi nhuận
  const generateMonteCarloSimulation = useCallback((metrics: BacktestMetrics, simCount: number): MonteCarloSimulation[] => {
    const results: MonteCarloSimulation[] = [];
    
    for (let sim = 0; sim < simCount; sim++) {
      let equity = initialCapital;
      let maxEquity = equity;
      let maxDrawdown = 0;
      let wins = 0;
      let totalTrades = metrics.totalTrades;
      
      // Mô phỏng từng trade
      for (let trade = 0; trade < totalTrades; trade++) {
        // Xác định trade này là win hay loss dựa trên win rate
        const isWin = Math.random() < metrics.winRate / 100;
        
        if (isWin) {
          wins++;
          // Lãi dựa trên avg win net + một chút randomness
          const winAmount = metrics.avgWinNet + (Math.random() - 0.5) * 0.5; // ±0.25% randomness
          equity *= (1 + winAmount / 100);
        } else {
          // Lỗ dựa trên avg loss net + một chút randomness
          const lossAmount = metrics.avgLossNet + (Math.random() - 0.5) * 0.5; // ±0.25% randomness
          equity *= (1 + lossAmount / 100);
        }
        
        // Tính max drawdown
        if (equity > maxEquity) {
          maxEquity = equity;
        }
        const drawdown = (maxEquity - equity) / maxEquity;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
        }
      }
      
      const totalReturn = (equity - initialCapital) / initialCapital * 100;
      const finalWinRate = (wins / totalTrades) * 100;
      
      results.push({
        finalEquity: equity,
        totalReturn: totalReturn,
        maxDrawdown: maxDrawdown * 100,
        finalWinRate: finalWinRate
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

  // Chạy Monte Carlo simulation
  const runMonteCarloSimulation = useCallback(async () => {
    setIsCalculating(true);
    
    // Simulate delay để hiển thị loading
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const results = generateMonteCarloSimulation(backtestMetrics, simulations);
    setSimulationResults(results);
    
    // Tạo histogram cho total return
    const totalReturnData = results.map(r => r.totalReturn);
    const histogram = createHistogram(totalReturnData);
    setHistogramData(histogram);
    
    // Tính statistics
    const sortedData = [...totalReturnData].sort((a, b) => a - b);
    const mean = sortedData.reduce((a, b) => a + b, 0) / sortedData.length;
    const median = sortedData[Math.floor(sortedData.length / 2)];
    const std = Math.sqrt(sortedData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sortedData.length);
    
    const percentiles = {
      p5: sortedData[Math.floor(0.05 * sortedData.length)],
      p25: sortedData[Math.floor(0.25 * sortedData.length)],
      p75: sortedData[Math.floor(0.75 * sortedData.length)],
      p95: sortedData[Math.floor(0.95 * sortedData.length)]
    };
    
    setStatistics({
      mean,
      median,
      std,
      percentiles,
      min: sortedData[0],
      max: sortedData[sortedData.length - 1]
    });
    
    setIsCalculating(false);
  }, [backtestMetrics, simulations, generateMonteCarloSimulation, createHistogram]);

  // Auto-run khi tham số thay đổi
  useEffect(() => {
    if (backtestMetrics.totalTrades > 0) {
      runMonteCarloSimulation();
    }
  }, [backtestMetrics, simulations, runMonteCarloSimulation]);

  // Tạo SVG histogram
  const renderHistogram = () => {
    if (!histogramData) return null;
    
    const maxFreq = Math.max(...histogramData.frequencies);
    const width = 600;
    const height = 350;
    const margin = { top: 20, right: 20, bottom: 80, left: 60 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const xScale = (value: number) => {
      const min = Math.min(...histogramData.bins);
      const max = Math.max(...histogramData.bins);
      return margin.left + ((value - min) / (max - min)) * chartWidth;
    };
    
    const yScale = (value: number) => {
      return margin.top + chartHeight - (value / maxFreq) * chartHeight;
    };
    
    const barWidth = chartWidth / histogramData.bins.length * 0.8;
    
    // Tìm vị trí của backtest result
    const backtestValue = backtestResult?.totalReturn || 0;
    const backtestX = backtestValue !== 0 ? xScale(backtestValue) : null;
    
    return (
      <svg width={width} height={height} className="w-full">
        {/* Bars */}
        {histogramData.bins.map((bin, i) => (
          <g key={i}>
            <rect
              x={xScale(bin) - barWidth / 2}
              y={yScale(histogramData.frequencies[i])}
              width={barWidth}
              height={chartHeight - yScale(histogramData.frequencies[i])}
              fill="#10b981"
              opacity={0.7}
              className="hover:opacity-100 transition-opacity"
            />
            
            {/* Data label cho tần suất */}
            <text
              x={xScale(bin)}
              y={yScale(histogramData.frequencies[i]) - 5}
              textAnchor="middle"
              className="text-xs fill-gray-700 font-medium"
            >
              {histogramData.frequencies[i]}
            </text>
          </g>
        ))}
        
        {/* X-axis */}
        <line
          x1={margin.left}
          y1={height - margin.bottom}
          x2={width - margin.right}
          y2={height - margin.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
        
        {/* Y-axis */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={height - margin.bottom}
          stroke="#374151"
          strokeWidth={2}
        />
        
        {/* X-axis labels */}
        {histogramData.bins.map((bin, i) => {
          if (i % Math.ceil(histogramData.bins.length / 8) === 0) {
            return (
              <text
                key={`label-${i}`}
                x={xScale(bin)}
                y={height - margin.bottom + 15}
                textAnchor="middle"
                className="text-xs fill-gray-600"
              >
                {bin.toFixed(1)}%
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
              strokeDasharray="5,5"
            />
            
            <polygon
              points={`${backtestX - 6},${height - margin.bottom + 6} ${backtestX + 6},${height - margin.bottom + 6} ${backtestX},${height - margin.bottom + 12}`}
              fill="#dc2626"
            />
            
            <text
              x={backtestX}
              y={height - margin.bottom + 30}
              textAnchor="middle"
              className="text-xs fill-red-600 font-bold"
            >
              Backtest: {backtestValue.toFixed(2)}%
            </text>
          </g>
        )}
        
        {/* Main labels */}
        <text
          x={width / 2}
          y={height - 20}
          textAnchor="middle"
          className="text-sm fill-gray-600 font-medium"
        >
          Tổng lợi nhuận (%)
        </text>
        
        <text
          x={10}
          y={height / 2}
          textAnchor="middle"
          transform={`rotate(-90, 10, ${height / 2})`}
          className="text-sm fill-gray-600"
        >
          Tần suất
        </text>
      </svg>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monte Carlo Simulation - Tổng Lợi Nhuận
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Backtest Metrics Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold text-blue-600">{backtestMetrics.totalTrades}</div>
              <div className="text-sm text-gray-500">Số lượng Trade</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold text-green-600">{backtestMetrics.winRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-500">Win Rate</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold text-emerald-600">+{backtestMetrics.avgWinNet.toFixed(2)}%</div>
              <div className="text-sm text-gray-500">Avg Win Net</div>
            </div>
            <div className="text-center p-3 border rounded-lg">
              <div className="text-lg font-bold text-red-600">{backtestMetrics.avgLossNet.toFixed(2)}%</div>
              <div className="text-sm text-gray-500">Avg Loss Net</div>
            </div>
          </div>

          {/* Simulation Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                Simulations: {simulations.toLocaleString()}
              </Badge>
              <Badge variant="outline">
                Initial Capital: ${initialCapital.toLocaleString()}
              </Badge>
            </div>
            
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

          {/* Histogram */}
          {histogramData && (
            <div className="border rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium">📊 Phân Bổ Tổng Lợi Nhuận</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const dataStr = JSON.stringify({
                      backtestMetrics,
                      simulationResults,
                      histogramData,
                      statistics
                    }, null, 2);
                    const dataBlob = new Blob([dataStr], { type: 'application/json' });
                    const url = URL.createObjectURL(dataBlob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `monte-carlo-total-return-${Date.now()}.json`;
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Xuất dữ liệu
                </Button>
              </div>
              
              <div className="flex justify-center">
                {renderHistogram()}
              </div>
            </div>
          )}

          {/* Statistics */}
          {statistics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {statistics.mean.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Trung bình</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {statistics.median.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Trung vị</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-orange-600">
                  {statistics.std.toFixed(2)}%
                </div>
                <div className="text-sm text-gray-500">Độ lệch chuẩn</div>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-2xl font-bold text-purple-600">
                  {(statistics.mean / statistics.std).toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">Risk-Adjusted Return</div>
              </div>
            </div>
          )}

          {/* Percentiles */}
          {statistics && (
            <div className="border rounded-lg p-6">
              <h4 className="font-medium mb-4">📈 Phân Vị Thống Kê</h4>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-red-600">
                    {statistics.percentiles.p5.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">5% (Worst)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-orange-600">
                    {statistics.percentiles.p25.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">25%</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">
                    {statistics.median.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">50% (Median)</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {statistics.percentiles.p75.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">75%</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-emerald-600">
                    {statistics.percentiles.p95.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">95% (Best)</div>
                </div>
              </div>
            </div>
          )}

          {/* Risk Assessment */}
          {statistics && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium">Kỳ vọng lợi nhuận</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.mean > 0 ? '+' : ''}{statistics.mean.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Trung bình {simulations.toLocaleString()} simulations
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span className="font-medium">Rủi ro</span>
                  </div>
                  <div className="text-2xl font-bold text-orange-600">
                    {statistics.std.toFixed(2)}%
                  </div>
                  <div className="text-sm text-gray-500">
                    Độ biến động
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Hiệu quả</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {(statistics.mean / statistics.std).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Risk-adjusted return
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 