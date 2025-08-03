"use client";

import MonteCarloHistogram from '@/components/MonteCarloHistogram';

export default function MonteCarloDemoPage() {
  // Dữ liệu demo từ backtest thực tế
  const demoBacktestMetrics = {
    totalTrades: 127,
    winRate: 58.3,
    avgWinNet: 1.87,  // +1.87%
    avgLossNet: -1.23 // -1.23%
  };

  const demoBacktestResult = {
    totalReturn: 15.2,
    maxDrawdown: 8.5
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold mb-2">🎲 Monte Carlo Analysis Demo</h1>
        <p className="text-lg text-gray-600">
          Phân tích phân bổ Monte Carlo dựa trên các tham số chiến lược giao dịch
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Demo với dữ liệu thực tế */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📊 Dữ liệu Backtest Thực tế</h2>
          <MonteCarloHistogram 
            backtestMetrics={demoBacktestMetrics}
            initialCapital={10000}
            simulations={1000}
            backtestResult={demoBacktestResult}
          />
        </div>

        {/* Demo với dữ liệu khác */}
        <div>
          <h2 className="text-xl font-semibold mb-4">📈 Chiến lược Khác</h2>
          <MonteCarloHistogram 
            backtestMetrics={{
              totalTrades: 89,
              winRate: 45.2,
              avgWinNet: 2.5,
              avgLossNet: -1.8
            }}
            initialCapital={10000}
            simulations={1000}
            backtestResult={{
              totalReturn: 8.7,
              maxDrawdown: 12.3
            }}
          />
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-3">ℹ️ Giải thích</h3>
        <div className="space-y-2 text-sm text-gray-700">
          <div>• <strong>Total Trades:</strong> Số lượng giao dịch trong backtest</div>
          <div>• <strong>Win Rate:</strong> Tỷ lệ giao dịch có lãi (%)</div>
          <div>• <strong>Avg Win Net:</strong> Lợi nhuận trung bình của các giao dịch có lãi (%)</div>
          <div>• <strong>Avg Loss Net:</strong> Lỗ trung bình của các giao dịch thua lỗ (%)</div>
          <div>• <strong>Histogram:</strong> Phân bổ tổng lợi nhuận từ 1000 simulations</div>
          <div>• <strong>Backtest Result:</strong> Kết quả thực tế được đánh dấu trên histogram</div>
        </div>
      </div>
    </div>
  );
} 