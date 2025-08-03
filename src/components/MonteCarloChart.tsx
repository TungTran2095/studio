"use client";

import { useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart4 } from 'lucide-react';

interface MonteCarloChartProps {
  results: {
    probability_of_profit: number;
    value_at_risk: number;
    expected_sharpe_ratio: number;
    confidence_intervals: {
      ci_90: [number, number];
      ci_95: [number, number];
      ci_99: [number, number];
    };
    tail_risk_metrics: {
      expected_shortfall: number;
      tail_dependence: number;
      maximum_drawdown: number;
    };
  };
}

export default function MonteCarloChart({ results }: MonteCarloChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !results) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Set canvas size
    canvas.width = canvas.offsetWidth;
    canvas.height = 300;

    // Chart dimensions
    const margin = { top: 20, right: 20, bottom: 40, left: 60 };
    const width = canvas.width - margin.left - margin.right;
    const height = canvas.height - margin.top - margin.bottom;

    // Data ranges
    const minReturn = Math.min(results.confidence_intervals.ci_99[0], results.value_at_risk) - 5;
    const maxReturn = Math.max(results.confidence_intervals.ci_99[1], 20) + 5;

    // Scales
    const xScale = (x: number) => margin.left + ((x - minReturn) / (maxReturn - minReturn)) * width;
    const yScale = (y: number) => margin.top + height - (y / 100) * height;

    // Draw axes
    ctx.strokeStyle = '#e5e7eb';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top + height);
    ctx.lineTo(margin.left + width, margin.top + height);
    ctx.stroke();

    // Y-axis
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + height);
    ctx.stroke();

    // Draw grid lines
    ctx.strokeStyle = '#f3f4f6';
    ctx.lineWidth = 0.5;

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = margin.left + (i / 10) * width;
      ctx.beginPath();
      ctx.moveTo(x, margin.top);
      ctx.lineTo(x, margin.top + height);
      ctx.stroke();
    }

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = margin.top + (i / 5) * height;
      ctx.beginPath();
      ctx.moveTo(margin.left, y);
      ctx.lineTo(margin.left + width, y);
      ctx.stroke();
    }

    // Draw confidence intervals
    const drawConfidenceInterval = (lower: number, upper: number, color: string, label: string) => {
      const x1 = xScale(lower);
      const x2 = xScale(upper);
      const y = margin.top + height / 2;

      // Draw interval line
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x1, y);
      ctx.lineTo(x2, y);
      ctx.stroke();

      // Draw endpoints
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x1, y, 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(x2, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // Draw label
      ctx.fillStyle = '#374151';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(label, (x1 + x2) / 2, y - 10);
    };

    // Draw confidence intervals
    drawConfidenceInterval(
      results.confidence_intervals.ci_90[0],
      results.confidence_intervals.ci_90[1],
      '#10b981',
      '90% CI'
    );

    drawConfidenceInterval(
      results.confidence_intervals.ci_95[0],
      results.confidence_intervals.ci_95[1],
      '#3b82f6',
      '95% CI'
    );

    drawConfidenceInterval(
      results.confidence_intervals.ci_99[0],
      results.confidence_intervals.ci_99[1],
      '#8b5cf6',
      '99% CI'
    );

    // Draw VaR line
    const varX = xScale(results.value_at_risk);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(varX, margin.top);
    ctx.lineTo(varX, margin.top + height);
    ctx.stroke();
    ctx.setLineDash([]);

    // VaR label
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`VaR: ${results.value_at_risk}%`, varX, margin.top + height + 20);

    // Draw axis labels
    ctx.fillStyle = '#374151';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Return (%)', margin.left + width / 2, margin.top + height + 35);

    // Draw tick marks and labels
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    for (let i = 0; i <= 10; i++) {
      const x = margin.left + (i / 10) * width;
      const value = minReturn + (i / 10) * (maxReturn - minReturn);
      
      // Tick mark
      ctx.strokeStyle = '#e5e7eb';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, margin.top + height);
      ctx.lineTo(x, margin.top + height + 5);
      ctx.stroke();

      // Label
      ctx.fillStyle = '#6b7280';
      ctx.fillText(`${value.toFixed(1)}%`, x - 5, margin.top + height + 18);
    }

    // Draw legend
    const legendItems = [
      { color: '#10b981', label: '90% Confidence Interval' },
      { color: '#3b82f6', label: '95% Confidence Interval' },
      { color: '#8b5cf6', label: '99% Confidence Interval' },
      { color: '#ef4444', label: 'Value at Risk (VaR)' }
    ];

    ctx.font = '12px Arial';
    ctx.textAlign = 'left';
    legendItems.forEach((item, index) => {
      const y = margin.top + 20 + index * 20;
      
      // Color box
      ctx.fillStyle = item.color;
      ctx.fillRect(margin.left + width + 10, y - 8, 12, 12);
      
      // Label
      ctx.fillStyle = '#374151';
      ctx.fillText(item.label, margin.left + width + 25, y);
    });

  }, [results]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart4 className="h-5 w-5" />
          Risk-Return Distribution
        </CardTitle>
        <CardDescription>
          Phân phối lợi nhuận và các khoảng tin cậy
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <canvas
            ref={canvasRef}
            className="w-full border rounded-lg"
            style={{ height: '300px' }}
          />
        </div>
      </CardContent>
    </Card>
  );
} 