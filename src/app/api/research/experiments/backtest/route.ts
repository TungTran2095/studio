import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateMA, calculateRSI, calculateMACD } from '@/lib/indicators';
import { calculateReturns, calculateSharpeRatio, calculateMaxDrawdown } from '@/lib/performance';

// Khởi tạo Supabase client
// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(req: Request) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

    
  try {
    const { experimentId, config } = await req.json();
    
    // Lấy dữ liệu OHLCV từ Supabase
    const { data: ohlcvData, error: ohlcvError } = await supabase
      .from('OHLCV_BTC_USDT_1m')
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

      // Logic giao dịch dựa trên chiến lược - Mua khi có signal mua, bán khi có signal bán
      if (config.strategy.type === 'moving_average') {
        // Tín hiệu mua: giá hiện tại > MA và chưa có vị thế
        if (currentPrice > currentMA && position <= 0) {
          // Tín hiệu mua
          const positionSizePercent = config.positionSize || 1;
          const size = (capital * positionSizePercent) / 100;
          position = size / currentPrice;
          trades.push({
            type: 'buy',
            price: currentPrice,
            size: position,
            timestamp: ohlcvData[i].open_time
          });
        } 
        // Tín hiệu bán: giá hiện tại < MA và đang có vị thế mua
        else if (currentPrice < currentMA && position > 0) {
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
    const totalReturn = calculateReturns(equity);
    const returns = equity.slice(1).map((value, index) => (value - equity[index]) / equity[index]);
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
            totalReturn: totalReturn * 100,
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
          totalReturn: totalReturn * 100,
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