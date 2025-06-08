import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateMA, calculateRSI, calculateMACD } from '@/lib/indicators';
import { calculateReturns, calculateSharpeRatio, calculateMaxDrawdown } from '@/lib/performance';

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { experimentId, config } = await req.json();
    
    // Lấy dữ liệu OHLCV từ Supabase
    const { data: ohlcvData, error: ohlcvError } = await supabase
      .from('ohlcv_btc_usdt_1m')
      .select('*')
      .gte('open_time', config.startDate)
      .lte('open_time', config.endDate)
      .order('open_time', { ascending: true });

    if (ohlcvError) throw ohlcvError;

    // Tính toán các chỉ báo kỹ thuật
    const prices = ohlcvData.map(d => d.close_price);
    const ma20 = calculateMA(prices, 20);
    const rsi = calculateRSI(prices, 14);
    const { macd, signal } = calculateMACD(prices);

    // Thực hiện backtest
    let position = 0;
    let capital = config.initialCapital;
    let trades = [];
    let equity = [capital];

    for (let i = 20; i < prices.length; i++) {
      const currentPrice = prices[i];
      const currentMA = ma20[i];
      const currentRSI = rsi[i];
      const currentMACD = macd[i];
      const currentSignal = signal[i];

      // Logic giao dịch dựa trên chiến lược
      if (config.strategy.type === 'moving_average') {
        if (currentPrice > currentMA && position <= 0) {
          // Tín hiệu mua
          const size = (capital * config.positionSize) / 100;
          position = size / currentPrice;
          trades.push({
            type: 'buy',
            price: currentPrice,
            size: position,
            timestamp: ohlcvData[i].open_time
          });
        } else if (currentPrice < currentMA && position >= 0) {
          // Tín hiệu bán
          trades.push({
            type: 'sell',
            price: currentPrice,
            size: position,
            timestamp: ohlcvData[i].open_time
          });
          capital += position * currentPrice;
          position = 0;
        }
      }

      // Cập nhật vốn
      equity.push(capital + (position * currentPrice));
    }

    // Tính toán các chỉ số hiệu suất
    const returns = calculateReturns(equity);
    const sharpeRatio = calculateSharpeRatio(returns);
    const maxDrawdown = calculateMaxDrawdown(equity);
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.type === 'sell' && t.price > trades[trades.indexOf(t)-1].price).length;
    const winRate = (winningTrades / totalTrades) * 100;

    // Cập nhật kết quả vào database
    const { error: updateError } = await supabase
      .from('research_experiments')
      .update({
        status: 'completed',
        results: {
          trades,
          equity,
          performance: {
            totalReturn: ((equity[equity.length - 1] - config.initialCapital) / config.initialCapital) * 100,
            sharpeRatio,
            maxDrawdown,
            totalTrades,
            winRate
          }
        },
        completed_at: new Date().toISOString()
      })
      .eq('id', experimentId);

    if (updateError) throw updateError;

    return NextResponse.json({
      success: true,
      message: 'Backtest completed successfully',
      results: {
        trades,
        equity,
        performance: {
          totalReturn: ((equity[equity.length - 1] - config.initialCapital) / config.initialCapital) * 100,
          sharpeRatio,
          maxDrawdown,
          totalTrades,
          winRate
        }
      }
    });

  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute backtest' },
      { status: 500 }
    );
  }
} 