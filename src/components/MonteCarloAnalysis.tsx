"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, AlertTriangle } from 'lucide-react';
import MonteCarloProfitSimulation from './MonteCarloProfitSimulation';

interface StrategyMetrics {
  totalTrades: number;
  winRate: number;
  avgProfit: number;
  avgLoss: number;
  profitFactor: number;
}

interface MonteCarloResult {
  simulations: number;
  results: {
    finalEquity: number;
    maxDrawdown: number;
    sharpeRatio: number;
    totalReturn: number;
  }[];
  distribution: {
    percentiles: number[];
    mean: number;
    std: number;
  };
}

export default function MonteCarloAnalysis() {
  const [metrics, setMetrics] = useState<StrategyMetrics>({
    totalTrades: 100,
    winRate: 60,
    avgProfit: 2.5,
    avgLoss: -1.5,
    profitFactor: 2.0
  });

  const [monteCarloResults, setMonteCarloResults] = useState<any[]>([]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Strategy Metrics Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Chiến lược giao dịch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Điều chỉnh các tham số và xem kết quả Monte Carlo cập nhật real-time</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Số lượng trade: {metrics.totalTrades}
                </label>
                <input 
                  type="range" 
                  min="10" 
                  max="500" 
                  step="10" 
                  value={metrics.totalTrades}
                  onChange={(e) => setMetrics({...metrics, totalTrades: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Win Rate: {metrics.winRate}%
                </label>
                <input 
                  type="range" 
                  min="30" 
                  max="90" 
                  step="1" 
                  value={metrics.winRate}
                  onChange={(e) => setMetrics({...metrics, winRate: parseInt(e.target.value)})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tỷ lệ lãi trung bình: {metrics.avgProfit}%
                </label>
                <input 
                  type="range" 
                  min="0.5" 
                  max="10" 
                  step="0.1" 
                  value={metrics.avgProfit}
                  onChange={(e) => setMetrics({...metrics, avgProfit: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tỷ lệ lỗ trung bình: {metrics.avgLoss}%
                </label>
                <input 
                  type="range" 
                  min="-5" 
                  max="-0.5" 
                  step="0.1" 
                  value={metrics.avgLoss}
                  onChange={(e) => setMetrics({...metrics, avgLoss: parseFloat(e.target.value)})}
                  className="w-full"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monte Carlo Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Cấu hình Monte Carlo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Thiết lập mô phỏng Monte Carlo</p>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📈 Thông tin chiến lược</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>Win Rate: <span className="font-medium">{metrics.winRate}%</span></div>
                  <div>Total Trades: <span className="font-medium">{metrics.totalTrades}</span></div>
                  <div>Avg Profit: <span className="font-medium text-green-600">{metrics.avgProfit}%</span></div>
                  <div>Avg Loss: <span className="font-medium text-red-600">{metrics.avgLoss}%</span></div>
                  <div>Expected Return: <span className="font-medium">{((metrics.winRate * metrics.avgProfit + (100 - metrics.winRate) * metrics.avgLoss) / 100).toFixed(2)}%</span></div>
                </div>
              </div>

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">💰 Thông tin đầu tư</h4>
                <div className="text-sm">
                  <div>Initial Investment: <span className="font-medium">$10,000 USD</span></div>
                  <div>Simulations: <span className="font-medium">1,000</span></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Monte Carlo Simulation */}
      <MonteCarloProfitSimulation 
        backtestMetrics={{
          totalTrades: metrics.totalTrades,
          winRate: metrics.winRate,
          avgWinNet: metrics.avgProfit,
          avgLossNet: metrics.avgLoss
        }}
        initialCapital={10000}
        simulations={1000}
        onSimulationComplete={setMonteCarloResults}
        experimentId="monte-carlo-analysis"
      />

      {/* Information about Monte Carlo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Về Monte Carlo Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">🎯 Mục đích</h4>
              <p className="text-sm text-gray-600">
                Monte Carlo Analysis giúp đánh giá rủi ro và tiềm năng của chiến lược giao dịch 
                bằng cách mô phỏng hàng nghìn kịch bản khác nhau.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">📈 Các chỉ số quan trọng</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Phân vị (Percentiles):</strong> P1, P5, P25, P50, P75, P95, P99</li>
                <li>• <strong>Xác suất lãi/lỗ:</strong> % simulations có lợi nhuận dương/âm</li>
                <li>• <strong>Kịch bản tốt nhất/xấu nhất:</strong> Giá trị cao nhất/thấp nhất</li>
                <li>• <strong>Độ biến động:</strong> Độ lệch chuẩn của phân phối lợi nhuận</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">⚠️ Lưu ý quan trọng</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Kết quả dựa trên giả định các trade độc lập</li>
                <li>• Không đảm bảo kết quả thực tế trong tương lai</li>
                <li>• Nên sử dụng kết hợp với các công cụ phân tích rủi ro khác</li>
              </ul>
            </div>
          </div>
               </CardContent>
     </Card>
   </div>
 );
}











 