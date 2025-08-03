"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, AlertTriangle, Play, Database } from 'lucide-react';
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

interface RealMonteCarloConfig {
  n_simulations: number;
  confidence_level: number;
  time_horizon_days: number;
  symbols: string[];
  start_date?: string;
  end_date?: string;
  initial_capital: number;
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
  const [isRunningRealAnalysis, setIsRunningRealAnalysis] = useState(false);
  const [realAnalysisResults, setRealAnalysisResults] = useState<any>(null);
  const [analysisConfig, setAnalysisConfig] = useState<RealMonteCarloConfig>({
    n_simulations: 1000,
    confidence_level: 0.95,
    time_horizon_days: 252,
    symbols: ['BTC', 'ETH'],
    initial_capital: 10000
  });

  // Chạy Monte Carlo analysis thực tế với dữ liệu từ database
  const runRealMonteCarloAnalysis = async () => {
    setIsRunningRealAnalysis(true);
    
    try {
      const response = await fetch('/api/research/monte-carlo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experiment_id: `monte-carlo-${Date.now()}`,
          config: analysisConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to run Monte Carlo analysis');
      }

      const result = await response.json();
      setRealAnalysisResults(result.results);
      console.log('✅ Real Monte Carlo analysis completed:', result);
      
    } catch (error) {
      console.error('❌ Error running real Monte Carlo analysis:', error);
      alert('Có lỗi khi chạy Monte Carlo analysis. Vui lòng thử lại.');
    } finally {
      setIsRunningRealAnalysis(false);
    }
  };

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

        {/* Real Monte Carlo Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Monte Carlo với dữ liệu thực tế
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">Sử dụng dữ liệu thị trường thực tế từ database</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Số simulations: {analysisConfig.n_simulations}
                </label>
                <input 
                  type="range" 
                  min="100" 
                  max="10000" 
                  step="100" 
                  value={analysisConfig.n_simulations}
                  onChange={(e) => setAnalysisConfig({
                    ...analysisConfig, 
                    n_simulations: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2">
                  Time horizon (ngày): {analysisConfig.time_horizon_days}
                </label>
                <input 
                  type="range" 
                  min="30" 
                  max="365" 
                  step="30" 
                  value={analysisConfig.time_horizon_days}
                  onChange={(e) => setAnalysisConfig({
                    ...analysisConfig, 
                    time_horizon_days: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Initial Capital: ${analysisConfig.initial_capital.toLocaleString()}
                </label>
                <input 
                  type="range" 
                  min="1000" 
                  max="100000" 
                  step="1000" 
                  value={analysisConfig.initial_capital}
                  onChange={(e) => setAnalysisConfig({
                    ...analysisConfig, 
                    initial_capital: parseInt(e.target.value)
                  })}
                  className="w-full"
                />
              </div>

              <Button 
                onClick={runRealMonteCarloAnalysis}
                disabled={isRunningRealAnalysis}
                className="w-full"
              >
                {isRunningRealAnalysis ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang chạy analysis...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Chạy Monte Carlo với dữ liệu thực tế
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Real Analysis Results */}
      {realAnalysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Kết quả Monte Carlo thực tế
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📈 Xác suất lãi</h4>
                <div className="text-2xl font-bold text-green-600">
                  {realAnalysisResults.probability_of_profit}%
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">⚠️ Value at Risk (95%)</h4>
                <div className="text-2xl font-bold text-red-600">
                  {realAnalysisResults.value_at_risk}%
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📊 Expected Sharpe Ratio</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {realAnalysisResults.expected_sharpe_ratio}
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📉 Expected Shortfall</h4>
                <div className="text-2xl font-bold text-orange-600">
                  {realAnalysisResults.tail_risk_metrics?.expected_shortfall}%
                </div>
              </div>
            </div>

            {realAnalysisResults.market_statistics && (
              <div className="mt-6">
                <h4 className="font-medium mb-3">📊 Thống kê thị trường</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(realAnalysisResults.market_statistics).map(([symbol, stats]: [string, any]) => (
                    <div key={symbol} className="bg-gray-50 p-3 rounded-lg">
                      <h5 className="font-medium text-sm mb-2">{symbol}</h5>
                      <div className="text-sm space-y-1">
                        <div>Mean Return: <span className="font-medium">{stats.mean_return.toFixed(2)}%</span></div>
                        <div>Volatility: <span className="font-medium">{stats.volatility.toFixed(2)}%</span></div>
                        <div>Data Points: <span className="font-medium">{stats.total_returns}</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                <li>• <strong>Dữ liệu thực tế:</strong> Sử dụng dữ liệu thị trường thực từ database</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}











 