import { NextRequest, NextResponse } from 'next/server';
import { TrendFollowingStrategy } from '@/lib/trading/strategies/trend-following';
import { BacktestResult, Signal, StrategyParams } from '@/lib/trading/strategy';

// Mock data cho candles - trong thực tế sẽ lấy từ database hoặc API Binance
const mockCandles = Array.from({ length: 500 }, (_, i) => ({
  openTime: Date.now() - (500 - i) * 3600000,
  closeTime: Date.now() - (499 - i) * 3600000,
  open: (40000 + Math.sin(i / 10) * 2000).toString(),
  high: (40000 + Math.sin(i / 10) * 2000 + 100 + Math.random() * 200).toString(),
  low: (40000 + Math.sin(i / 10) * 2000 - 100 - Math.random() * 200).toString(),
  close: (40000 + Math.sin(i / 10) * 2000 + (Math.random() * 200 - 100)).toString(),
  volume: (1000 + Math.random() * 500).toString(),
}));

// Khai báo các chiến lược có sẵn
const strategies = {
  'trend-following': new TrendFollowingStrategy(),
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, strategyType, params, paramRanges } = body;
    
    // Kiểm tra chiến lược
    if (!strategyType || !strategies[strategyType as keyof typeof strategies]) {
      return NextResponse.json(
        { error: 'Chiến lược không hợp lệ' },
        { status: 400 }
      );
    }
    
    const strategy = strategies[strategyType as keyof typeof strategies];
    
    // Xử lý các hành động
    switch (action) {
      case 'analyze': {
        // Cập nhật tham số nếu có
        if (params) {
          strategy.updateParams(params);
        }
        
        // Phân tích dữ liệu và tạo tín hiệu
        const signals = strategy.analyze(mockCandles);
        const latestSignal = strategy.getLatestSignal();
        
        return NextResponse.json({
          signals,
          latestSignal,
          currentParams: strategy.getParams()
        });
      }
      
      case 'backtest': {
        // Cập nhật tham số nếu có
        if (params) {
          strategy.updateParams(params);
        }
        
        // Chạy backtest
        const result = strategy.backtest(mockCandles);
        
        return NextResponse.json({
          result,
          currentParams: strategy.getParams()
        });
      }
      
      case 'optimize': {
        // Kiểm tra phạm vi tham số
        if (!paramRanges) {
          return NextResponse.json(
            { error: 'Phạm vi tham số không hợp lệ' },
            { status: 400 }
          );
        }
        
        // Cập nhật tham số cơ bản nếu có
        if (params) {
          strategy.updateParams(params);
        }
        
        // Chạy tối ưu hóa
        const { optimizedParams, backtestResult } = strategy.optimize(
          mockCandles,
          paramRanges
        );
        
        return NextResponse.json({
          optimizedParams,
          backtestResult,
          currentParams: strategy.getParams()
        });
      }
      
      default:
        return NextResponse.json(
          { error: 'Hành động không hợp lệ' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Lỗi xử lý chiến lược:', error);
    return NextResponse.json(
      { error: 'Lỗi máy chủ nội bộ' },
      { status: 500 }
    );
  }
} 