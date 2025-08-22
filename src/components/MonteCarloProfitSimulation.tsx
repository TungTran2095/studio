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
  DollarSign,
  Percent
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
  totalProfit: number;
  maxDrawdown: number;
  finalWinRate: number;
  equityCurve: number[];
}

interface HistogramData {
  bins: number[];
  frequencies: number[];
  binEdges: number[];
}

interface MonteCarloProfitSimulationProps {
  backtestMetrics: BacktestMetrics;
  initialCapital?: number;
  simulations?: number;
  className?: string;
  backtestResult?: {
    totalReturn?: number;
    maxDrawdown?: number;
    totalProfit?: number;
    positionSize?: number; // Thêm position size từ backtest config
  };
  onSimulationComplete?: (results: MonteCarloSimulation[]) => void;
  experimentId?: string; // Thêm experiment ID để track
}

export default function MonteCarloProfitSimulation({ 
  backtestMetrics, 
  initialCapital = 10000, 
  simulations = 1000,
  className = "",
  backtestResult,
  onSimulationComplete,
  experimentId
}: MonteCarloProfitSimulationProps) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [simulationResults, setSimulationResults] = useState<MonteCarloSimulation[]>([]);
  const [histogramData, setHistogramData] = useState<HistogramData | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [selectedMetric, setSelectedMetric] = useState<'totalReturn' | 'totalProfit' | 'maxDrawdown'>('totalReturn');
  const [hasRunSimulation, setHasRunSimulation] = useState(false);

  // Tạo Monte Carlo simulation cho tổng lợi nhuận
  const generateMonteCarloSimulation = useCallback((metrics: BacktestMetrics, simCount: number): MonteCarloSimulation[] => {
    const results: MonteCarloSimulation[] = [];
    
    for (let sim = 0; sim < simCount; sim++) {
      let equity = initialCapital;
      let maxEquity = equity;
      let maxDrawdown = 0;
      let wins = 0;
      let totalTrades = metrics.totalTrades;
      const equityCurve: number[] = [equity];
      
      // Mô phỏng từng trade
      for (let trade = 0; trade < totalTrades; trade++) {
        // Xác định trade này là win hay loss dựa trên win rate
        const isWin = Math.random() < metrics.winRate / 100;
        
        if (isWin) {
          wins++;
          // Lãi dựa trên avg win net + một chút randomness để mô phỏng thực tế
          // avgWinNet là tỷ lệ lãi trên giá trị giao dịch, cần chuyển thành tỷ lệ tăng vốn
          // Sử dụng position size từ backtest config hoặc mặc định 10%
          const positionSize = backtestResult?.positionSize || 0.1;
          const winAmount = (metrics.avgWinNet / 100) * positionSize + (Math.random() - 0.5) * 0.001; // ±0.1% randomness
          equity *= (1 + winAmount);
        } else {
          // Lỗ dựa trên avg loss net + một chút randomness
          // avgLossNet là tỷ lệ lỗ trên giá trị giao dịch, cần chuyển thành tỷ lệ giảm vốn
          // Sử dụng position size từ backtest config hoặc mặc định 10%
          const positionSize = backtestResult?.positionSize || 0.1;
          const lossAmount = (Math.abs(metrics.avgLossNet) / 100) * positionSize + (Math.random() - 0.5) * 0.001; // ±0.1% randomness
          equity *= (1 - lossAmount);
        }
        
        // Lưu equity curve
        equityCurve.push(equity);
        
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
      const totalProfit = equity - initialCapital;
      const finalWinRate = (wins / totalTrades) * 100;
      
      results.push({
        finalEquity: equity,
        totalReturn: totalReturn,
        totalProfit: totalProfit,
        maxDrawdown: maxDrawdown * 100,
        finalWinRate: finalWinRate,
        equityCurve: equityCurve
      });
    }
    
    return results;
  }, [initialCapital]);

  // Tạo histogram data
  const createHistogram = useCallback((data: number[], bins: number = 30): HistogramData => {
    // Filter out invalid values
    const validData = data.filter(d => !isNaN(d) && isFinite(d));
    if (validData.length === 0) {
      return { bins: [], frequencies: [], binEdges: [] };
    }
    
    const min = Math.min(...validData);
    const max = Math.max(...validData);
    
    // Handle case where min === max
    if (min === max) {
      return {
        bins: [min],
        frequencies: [validData.length],
        binEdges: [min, min + 1]
      };
    }
    
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
    // Kiểm tra dữ liệu trước khi chạy
    if (backtestMetrics.totalTrades === 0) {
      console.warn('Không có trades để chạy Monte Carlo simulation');
      return;
    }
    
    if (backtestMetrics.avgWinNet === 0 && backtestMetrics.avgLossNet === 0) {
      console.warn('Không có dữ liệu lãi/lỗ để chạy Monte Carlo simulation');
      return;
    }
    
    setIsCalculating(true);
    
    // Simulate delay để hiển thị loading
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const results = generateMonteCarloSimulation(backtestMetrics, simulations);
    setSimulationResults(results);
    
    // Callback để chia sẻ kết quả với component cha
    if (onSimulationComplete) {
      onSimulationComplete(results);
    }
    
    setIsCalculating(false);
  }, [backtestMetrics, simulations, generateMonteCarloSimulation, onSimulationComplete]);

  // Auto-run chỉ một lần khi component mount hoặc khi backtestMetrics thay đổi đáng kể
  useEffect(() => {
    // Chỉ auto-run khi có đủ dữ liệu
    if (backtestMetrics.totalTrades > 0 && 
        (backtestMetrics.avgWinNet !== 0 || backtestMetrics.avgLossNet !== 0) &&
        !hasRunSimulation) {
      runMonteCarloSimulation();
      setHasRunSimulation(true);
    }
  }, [backtestMetrics, runMonteCarloSimulation, hasRunSimulation]);

  // Kiểm tra xem có thể chạy simulation không
  const canRunSimulation = backtestMetrics.totalTrades > 0 && 
                          (backtestMetrics.avgWinNet !== 0 || backtestMetrics.avgLossNet !== 0);

  if (!canRunSimulation) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monte Carlo Profit Simulation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <p className="font-medium mb-2">Không thể chạy Monte Carlo Simulation</p>
            <p className="text-sm">
              {backtestMetrics.totalTrades === 0 
                ? 'Không có trades nào được thực hiện'
                : 'Thiếu dữ liệu lãi/lỗ từ backtest'
              }
            </p>
            <p className="text-xs mt-2">
              Cần có ít nhất 1 trade với thông tin lãi/lỗ để chạy simulation
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Reset simulation khi experiment thay đổi
  useEffect(() => {
    if (experimentId && hasRunSimulation) {
      resetSimulation();
    }
  }, [experimentId]);

  // Khởi tạo histogram khi simulation results có sẵn
  useEffect(() => {
    if (simulationResults.length > 0) {
      const metricData = simulationResults.map(r => r[selectedMetric]);
      const histogram = createHistogram(metricData);
      setHistogramData(histogram);
      
      // Tính statistics
      const sortedData = [...metricData].sort((a, b) => a - b);
      const mean = sortedData.reduce((a, b) => a + b, 0) / sortedData.length;
      const median = sortedData[Math.floor(sortedData.length / 2)];
      const std = Math.sqrt(sortedData.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / sortedData.length);
      
      const percentiles = {
        p1: sortedData[Math.floor(0.01 * sortedData.length)],
        p5: sortedData[Math.floor(0.05 * sortedData.length)],
        p10: sortedData[Math.floor(0.10 * sortedData.length)],
        p25: sortedData[Math.floor(0.25 * sortedData.length)],
        p50: sortedData[Math.floor(0.50 * sortedData.length)],
        p75: sortedData[Math.floor(0.75 * sortedData.length)],
        p90: sortedData[Math.floor(0.90 * sortedData.length)],
        p95: sortedData[Math.floor(0.95 * sortedData.length)],
        p99: sortedData[Math.floor(0.99 * sortedData.length)]
      };
      
      setStatistics({
        mean,
        median,
        std,
        percentiles,
        min: sortedData[0],
        max: sortedData[sortedData.length - 1]
      });
    }
  }, [simulationResults, selectedMetric, createHistogram]);

  // Tạo SVG histogram
  const renderHistogram = () => {
    if (!histogramData || histogramData.bins.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Không có dữ liệu để hiển thị histogram
        </div>
      );
    }
    
    const maxFreq = Math.max(...histogramData.frequencies);
    if (maxFreq === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          Không có dữ liệu để hiển thị histogram
        </div>
      );
    }
    
    const width = 700;
    const height = 400;
    const margin = { top: 20, right: 20, bottom: 80, left: 80 };
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

    const getMetricLabel = () => {
      switch (selectedMetric) {
        case 'totalReturn': return 'Tổng lợi nhuận (%)';
        case 'totalProfit': return 'Tổng lợi nhuận ($)';
        case 'maxDrawdown': return 'Max Drawdown (%)';
        default: return 'Tổng lợi nhuận (%)';
      }
    };

    const getMetricUnit = () => {
      switch (selectedMetric) {
        case 'totalReturn': return '%';
        case 'totalProfit': return '$';
        case 'maxDrawdown': return '%';
        default: return '%';
      }
    };

    return (
      <svg width={width} height={height} className="w-full">
        {/* Background */}
        <rect width={width} height={height} fill="#f8fafc" />
        
        {/* Grid lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = margin.top + (i * chartHeight / 5);
          return (
            <g key={i}>
              <line
                x1={margin.left}
                y1={y}
                x2={width - margin.right}
                y2={y}
                stroke="#e2e8f0"
                strokeWidth={1}
              />
              <text
                x={margin.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#64748b"
              >
                {Math.round((maxFreq * (5 - i)) / 5)}
              </text>
            </g>
          );
        })}
        
        {/* Bars */}
        {histogramData.bins.map((bin, i) => {
          const x = xScale(bin);
          const barWidth = chartWidth / histogramData.bins.length * 0.8;
          const barHeight = (histogramData.frequencies[i] / maxFreq) * chartHeight;
          const y = margin.top + chartHeight - barHeight;
          
          // Màu sắc dựa trên giá trị
          let fillColor = '#3b82f6';
          if (selectedMetric === 'totalReturn' || selectedMetric === 'totalProfit') {
            fillColor = bin >= 0 ? '#10b981' : '#ef4444';
          } else if (selectedMetric === 'maxDrawdown') {
            fillColor = bin <= -20 ? '#ef4444' : bin <= -10 ? '#f59e0b' : '#10b981';
          }
          
          return (
            <g key={i}>
              <rect
                x={x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={fillColor}
                opacity={0.8}
                stroke="#1e40af"
                strokeWidth={1}
              />
              {/* Tooltip */}
              <title>
                {`${bin.toFixed(2)}${getMetricUnit()}: ${histogramData.frequencies[i]} simulations`}
              </title>
            </g>
          );
        })}
        
        {/* X-axis */}
        <line
          x1={margin.left}
          y1={margin.top + chartHeight}
          x2={width - margin.right}
          y2={margin.top + chartHeight}
          stroke="#374151"
          strokeWidth={2}
        />
        
        {/* X-axis labels */}
        {Array.from({ length: 6 }, (_, i) => {
          const min = Math.min(...histogramData.bins);
          const max = Math.max(...histogramData.bins);
          const value = min + (i * (max - min) / 5);
          const x = xScale(value);
          return (
            <g key={i}>
              <line
                x1={x}
                y1={margin.top + chartHeight}
                x2={x}
                y2={margin.top + chartHeight + 5}
                stroke="#374151"
                strokeWidth={1}
              />
              <text
                x={x}
                y={margin.top + chartHeight + 20}
                textAnchor="middle"
                fontSize="12"
                fill="#374151"
                transform={`rotate(-45 ${x} ${margin.top + chartHeight + 20})`}
              >
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        
        {/* Y-axis */}
        <line
          x1={margin.left}
          y1={margin.top}
          x2={margin.left}
          y2={margin.top + chartHeight}
          stroke="#374151"
          strokeWidth={2}
        />
        
        {/* Title */}
        <text
          x={width / 2}
          y={margin.top - 5}
          textAnchor="middle"
          fontSize="16"
          fontWeight="bold"
          fill="#1f2937"
        >
          Phân phối {getMetricLabel()} - {simulations} Simulations
        </text>
        
        {/* Backtest result line if available */}
        {backtestResult && backtestResult[selectedMetric] !== undefined && (
          <g>
            <line
              x1={xScale(backtestResult[selectedMetric]!)}
              y1={margin.top}
              x2={xScale(backtestResult[selectedMetric]!)}
              y2={margin.top + chartHeight}
              stroke="#dc2626"
              strokeWidth={3}
              strokeDasharray="5,5"
            />
            <text
              x={xScale(backtestResult[selectedMetric]!) + 10}
              y={margin.top + 20}
              fontSize="12"
              fill="#dc2626"
              fontWeight="bold"
            >
              Backtest: {backtestResult[selectedMetric]!.toFixed(2)}{getMetricUnit()}
            </text>
          </g>
        )}
      </svg>
    );
  };

  // Reset simulation
  const resetSimulation = () => {
    setSimulationResults([]);
    setHistogramData(null);
    setStatistics(null);
    setHasRunSimulation(false);
  };

  // Export data
  const exportData = () => {
    if (!simulationResults.length) return;
    
    const csvContent = [
      ['Simulation', 'Final Equity', 'Total Return (%)', 'Total Profit ($)', 'Max Drawdown (%)', 'Final Win Rate (%)'],
      ...simulationResults.map((result, i) => [
        i + 1,
        result.finalEquity.toFixed(2),
        result.totalReturn.toFixed(2),
        result.totalProfit.toFixed(2),
        result.maxDrawdown.toFixed(2),
        result.finalWinRate.toFixed(2)
      ])
    ].map(row => row.join(',')).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte_carlo_simulation_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Monte Carlo Simulation - Tổng Lợi Nhuận
          </CardTitle>
          <div className="flex gap-2">
                         <Button
               variant="outline"
               size="sm"
               onClick={resetSimulation}
               disabled={isCalculating}
             >
               <RefreshCw className="h-4 w-4 mr-2" />
               Chạy lại
             </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              disabled={!simulationResults.length}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Thông tin backtest */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{backtestMetrics.totalTrades}</div>
            <div className="text-sm text-muted-foreground">Tổng Trades</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{backtestMetrics.winRate.toFixed(1)}%</div>
            <div className="text-sm text-muted-foreground">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">+{backtestMetrics.avgWinNet.toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground">Avg Win Net</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{backtestMetrics.avgLossNet.toFixed(2)}%</div>
            <div className="text-sm text-muted-foreground">Avg Loss Net</div>
          </div>
        </div>

        {/* Metric selector */}
        <div className="flex gap-2">
          <Button
            variant={selectedMetric === 'totalReturn' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('totalReturn')}
          >
            <Percent className="h-4 w-4 mr-2" />
            Tổng Lợi Nhuận (%)
          </Button>
          <Button
            variant={selectedMetric === 'totalProfit' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('totalProfit')}
          >
            <DollarSign className="h-4 w-4 mr-2" />
            Tổng Lợi Nhuận ($)
          </Button>
          <Button
            variant={selectedMetric === 'maxDrawdown' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedMetric('maxDrawdown')}
          >
            <TrendingDown className="h-4 w-4 mr-2" />
            Max Drawdown (%)
          </Button>
        </div>

        {/* Histogram */}
        <div className="border rounded-lg p-4 bg-white">
          {isCalculating ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              <span className="ml-2">Đang tính toán Monte Carlo simulation...</span>
            </div>
          ) : simulationResults.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-muted-foreground">
              <div className="text-center">
                <p>Chưa có dữ liệu simulation</p>
                <p className="text-sm">Backtest metrics: {JSON.stringify(backtestMetrics)}</p>
              </div>
            </div>
          ) : (
            renderHistogram()
          )}
        </div>

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Thống kê cơ bản</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-sm text-muted-foreground">Trung bình</div>
                  <div className="text-lg font-semibold">{statistics.mean.toFixed(2)}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-sm text-muted-foreground">Trung vị</div>
                  <div className="text-lg font-semibold">{statistics.median.toFixed(2)}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-sm text-muted-foreground">Độ lệch chuẩn</div>
                  <div className="text-lg font-semibold">{statistics.std.toFixed(2)}</div>
                </div>
                <div className="bg-muted/50 p-3 rounded">
                  <div className="text-sm text-muted-foreground">Min</div>
                  <div className="text-lg font-semibold">{statistics.min.toFixed(2)}</div>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h4 className="font-semibold text-lg">Phân vị</h4>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div className="bg-red-50 p-2 rounded border">
                  <div className="text-red-600 font-medium">P1</div>
                  <div>{statistics.percentiles.p1.toFixed(2)}</div>
                </div>
                <div className="bg-orange-50 p-2 rounded border">
                  <div className="text-orange-600 font-medium">P5</div>
                  <div>{statistics.percentiles.p5.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded border">
                  <div className="text-yellow-600 font-medium">P10</div>
                  <div>{statistics.percentiles.p10.toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 p-2 rounded border">
                  <div className="text-blue-600 font-medium">P25</div>
                  <div>{statistics.percentiles.p25.toFixed(2)}</div>
                </div>
                <div className="bg-green-50 p-2 rounded border">
                  <div className="text-green-600 font-medium">P50</div>
                  <div>{statistics.percentiles.p50.toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 p-2 rounded border">
                  <div className="text-blue-600 font-medium">P75</div>
                  <div>{statistics.percentiles.p75.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 p-2 rounded border">
                  <div className="text-yellow-600 font-medium">P90</div>
                  <div>{statistics.percentiles.p90.toFixed(2)}</div>
                </div>
                <div className="bg-orange-50 p-2 rounded border">
                  <div className="text-orange-600 font-medium">P95</div>
                  <div>{statistics.percentiles.p95.toFixed(2)}</div>
                </div>
                <div className="bg-red-50 p-2 rounded border">
                  <div className="text-red-600 font-medium">P99</div>
                  <div>{statistics.percentiles.p99.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk analysis */}
        {statistics && (
          <div className="space-y-4">
            <h4 className="font-semibold text-lg">Phân tích rủi ro</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-semibold text-red-800">Rủi ro cao</span>
                </div>
                <div className="text-sm text-red-700">
                  <div>Xác suất lỗ: {((simulationResults.filter(r => r[selectedMetric] < 0).length / simulations) * 100).toFixed(1)}%</div>
                  <div>Kịch bản xấu nhất: {statistics.min.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="h-5 w-5 text-yellow-600" />
                  <span className="font-semibold text-yellow-800">Kỳ vọng</span>
                </div>
                <div className="text-sm text-yellow-700">
                  <div>Giá trị kỳ vọng: {statistics.mean.toFixed(2)}</div>
                  <div>Độ biến động: {statistics.std.toFixed(2)}</div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <span className="font-semibold text-green-800">Tiềm năng</span>
                </div>
                <div className="text-sm text-green-700">
                  <div>Xác suất lãi: {((simulationResults.filter(r => r[selectedMetric] > 0).length / simulations) * 100).toFixed(1)}%</div>
                  <div>Kịch bản tốt nhất: {statistics.max.toFixed(2)}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 