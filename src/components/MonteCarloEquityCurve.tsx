"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, 
  TrendingDown, 
  Eye,
  EyeOff,
  Download,
  RefreshCw
} from 'lucide-react';

interface MonteCarloSimulation {
  finalEquity: number;
  totalReturn: number;
  totalProfit: number;
  maxDrawdown: number;
  finalWinRate: number;
  equityCurve: number[];
}

interface MonteCarloEquityCurveProps {
  simulationResults: MonteCarloSimulation[];
  initialCapital: number;
  className?: string;
  backtestEquityCurve?: number[];
}

export default function MonteCarloEquityCurve({ 
  simulationResults, 
  initialCapital,
  className = "",
  backtestEquityCurve
}: MonteCarloEquityCurveProps) {
  const [showAllPaths, setShowAllPaths] = useState(false);
  const [selectedPercentiles, setSelectedPercentiles] = useState<number[]>([10, 25, 50, 75, 90]);
  const [isCalculating, setIsCalculating] = useState(false);

  // Tính toán equity curves cho các percentile
  const calculatePercentileCurves = useCallback(() => {
    if (!simulationResults.length) return null;
    
    const numPoints = simulationResults[0].equityCurve.length;
    const percentileCurves: { [key: number]: number[] } = {};
    
    // Tính toán cho từng percentile
    selectedPercentiles.forEach(percentile => {
      const curve: number[] = [];
      
      for (let point = 0; point < numPoints; point++) {
        const values = simulationResults.map(sim => sim.equityCurve[point]).sort((a, b) => a - b);
        const index = Math.floor((percentile / 100) * values.length);
        curve.push(values[index]);
      }
      
      percentileCurves[percentile] = curve;
    });
    
    return percentileCurves;
  }, [simulationResults, selectedPercentiles]);

  // Tạo SVG chart
  const renderEquityCurve = () => {
    if (!simulationResults.length) return null;
    
    const percentileCurves = calculatePercentileCurves();
    if (!percentileCurves) return null;
    
    const width = 800;
    const height = 500;
    const margin = { top: 20, right: 20, bottom: 80, left: 80 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const numPoints = simulationResults[0].equityCurve.length;
    const allValues = simulationResults.flatMap(sim => sim.equityCurve);
    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);
    
    const xScale = (index: number) => {
      return margin.left + (index / (numPoints - 1)) * chartWidth;
    };
    
    const yScale = (value: number) => {
      return margin.top + chartHeight - ((value - minValue) / (maxValue - minValue)) * chartHeight;
    };

    const getPercentileColor = (percentile: number) => {
      if (percentile === 50) return '#3b82f6'; // Blue for median
      if (percentile <= 25) return '#ef4444'; // Red for lower percentiles
      if (percentile >= 75) return '#10b981'; // Green for upper percentiles
      return '#f59e0b'; // Orange for middle percentiles
    };

    return (
      <svg width={width} height={height} className="w-full">
        {/* Background */}
        <rect width={width} height={height} fill="#f8fafc" />
        
        {/* Grid lines */}
        {Array.from({ length: 6 }, (_, i) => {
          const y = margin.top + (i * chartHeight / 5);
          const value = minValue + (i * (maxValue - minValue) / 5);
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
                ${value.toFixed(0)}
              </text>
            </g>
          );
        })}
        
        {/* All simulation paths (if enabled) */}
        {showAllPaths && simulationResults.slice(0, 50).map((sim, simIndex) => (
          <g key={`sim-${simIndex}`}>
            <path
              d={sim.equityCurve.map((value, index) => {
                const x = xScale(index);
                const y = yScale(value);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke="#e5e7eb"
              strokeWidth={0.5}
              fill="none"
              opacity={0.3}
            />
          </g>
        ))}
        
        {/* Percentile curves */}
        {Object.entries(percentileCurves).map(([percentile, curve]) => (
          <g key={`percentile-${percentile}`}>
            <path
              d={curve.map((value, index) => {
                const x = xScale(index);
                const y = yScale(value);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke={getPercentileColor(Number(percentile))}
              strokeWidth={Number(percentile) === 50 ? 3 : 2}
              fill="none"
            />
          </g>
        ))}
        
        {/* Backtest equity curve if available */}
        {backtestEquityCurve && backtestEquityCurve.length > 0 && (
          <g>
            <path
              d={backtestEquityCurve.map((value, index) => {
                const x = xScale(index);
                const y = yScale(value);
                return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
              }).join(' ')}
              stroke="#dc2626"
              strokeWidth={3}
              strokeDasharray="5,5"
              fill="none"
            />
          </g>
        )}
        
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
          const x = xScale(i * (numPoints - 1) / 5);
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
              >
                Trade {i * Math.floor((numPoints - 1) / 5)}
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
          Equity Curve - Monte Carlo Simulation
        </text>
        
        {/* Legend */}
        <g transform={`translate(${width - 200}, ${margin.top + 20})`}>
          <rect width={180} height={120} fill="white" stroke="#d1d5db" strokeWidth={1} opacity={0.9} />
          
          {/* Percentile legend */}
          {selectedPercentiles.map((percentile, index) => (
            <g key={percentile} transform={`translate(10, ${index * 20 + 10})`}>
              <line
                x1={0}
                y1={8}
                x2={15}
                y2={8}
                stroke={getPercentileColor(percentile)}
                strokeWidth={percentile === 50 ? 3 : 2}
              />
              <text x={20} y={12} fontSize="12" fill="#374151">
                P{percentile} {percentile === 50 ? '(Median)' : ''}
              </text>
            </g>
          ))}
          
          {/* Backtest legend */}
          {backtestEquityCurve && (
            <g transform={`translate(0, ${selectedPercentiles.length * 20 + 20})`}>
              <line
                x1={0}
                y1={8}
                x2={15}
                y2={8}
                stroke="#dc2626"
                strokeWidth={3}
                strokeDasharray="5,5"
              />
              <text x={20} y={12} fontSize="12" fill="#374151">
                Backtest Result
              </text>
            </g>
          )}
        </g>
      </svg>
    );
  };

  // Export equity curve data
  const exportEquityCurveData = () => {
    if (!simulationResults.length) return;
    
    const percentileCurves = calculatePercentileCurves();
    if (!percentileCurves) return;
    
    const numPoints = simulationResults[0].equityCurve.length;
    const csvRows = ['Trade'];
    
    // Add headers
    selectedPercentiles.forEach(percentile => {
      csvRows[0] += `,P${percentile}`;
    });
    if (backtestEquityCurve) {
      csvRows[0] += ',Backtest';
    }
    
    // Add data rows
    for (let i = 0; i < numPoints; i++) {
      let row = `${i}`;
      selectedPercentiles.forEach(percentile => {
        row += `,${percentileCurves[percentile][i].toFixed(2)}`;
      });
      if (backtestEquityCurve && backtestEquityCurve[i] !== undefined) {
        row += `,${backtestEquityCurve[i].toFixed(2)}`;
      }
      csvRows.push(row);
    }
    
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monte_carlo_equity_curve_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (!simulationResults.length) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
            <p>Không có dữ liệu simulation để hiển thị equity curve</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve - Monte Carlo Simulation
          </CardTitle>
          <div className="flex gap-2">
            <Button
              variant={showAllPaths ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowAllPaths(!showAllPaths)}
            >
              {showAllPaths ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showAllPaths ? 'Ẩn tất cả' : 'Hiện tất cả'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportEquityCurveData}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Percentile selector */}
        <div className="flex flex-wrap gap-2">
          {[10, 25, 50, 75, 90].map(percentile => (
            <Button
              key={percentile}
              variant={selectedPercentiles.includes(percentile) ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                if (selectedPercentiles.includes(percentile)) {
                  setSelectedPercentiles(selectedPercentiles.filter(p => p !== percentile));
                } else {
                  setSelectedPercentiles([...selectedPercentiles, percentile].sort((a, b) => a - b));
                }
              }}
            >
              P{percentile}
            </Button>
          ))}
        </div>

        {/* Chart */}
        <div className="border rounded-lg p-4 bg-white overflow-x-auto">
          {renderEquityCurve()}
        </div>

        {/* Summary statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/50 p-3 rounded text-center">
            <div className="text-sm text-muted-foreground">Tổng Simulations</div>
            <div className="text-lg font-semibold">{simulationResults.length}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded text-center">
            <div className="text-sm text-muted-foreground">Số Trades</div>
            <div className="text-lg font-semibold">{simulationResults[0].equityCurve.length - 1}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded text-center">
            <div className="text-sm text-muted-foreground">Vốn ban đầu</div>
            <div className="text-lg font-semibold">${initialCapital.toLocaleString()}</div>
          </div>
          <div className="bg-muted/50 p-3 rounded text-center">
            <div className="text-sm text-muted-foreground">Vốn cuối TB</div>
            <div className="text-lg font-semibold">
              ${(simulationResults.reduce((sum, sim) => sum + sim.finalEquity, 0) / simulationResults.length).toFixed(0)}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 