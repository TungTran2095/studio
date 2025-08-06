import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { calculateMA, calculateRSI, calculateMACD } from '@/lib/indicators';
import { calculateReturns, calculateSharpeRatio, calculateMaxDrawdown } from '@/lib/performance';

// Khởi tạo Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PatchBacktestConfig {
  experimentId: string;
  config: {
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    symbol: string;
    timeframe: string;
    initialCapital: number;
    positionSize: number;
    stopLoss: number;
    takeProfit: number;
    strategyType: string;
    // Strategy parameters
    fastPeriod?: number;
    slowPeriod?: number;
    rsiPeriod?: number;
    overbought?: number;
    oversold?: number;
    fastEMA?: number;
    slowEMA?: number;
    signalPeriod?: number;
    period?: number;
    stdDev?: number;
    bbPeriod?: number;
    bbStdDev?: number;
    multiplier?: number;
    channelPeriod?: number;
    maker_fee?: number;
    taker_fee?: number;
  };
}

interface PatchResult {
  patchId: number;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  trades: any[];
  metrics: {
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

export async function POST(req: Request) {
  try {
    const { experimentId, config }: PatchBacktestConfig = await req.json();
    
    console.log('🚀 Starting patch-based backtest:', {
      experimentId,
      symbol: config.symbol,
      startDate: config.startDate,
      endDate: config.endDate,
      strategyType: config.strategyType
    });

    // Tạo patches 30 ngày
    const patches = generatePatches(config.startDate, config.endDate, 30);
    console.log(`📅 Generated ${patches.length} patches of 30 days each`);

    const allResults: PatchResult[] = [];
    let currentCapital = config.initialCapital;
    let allTrades: any[] = [];
    let patchId = 1;

    // Chạy backtest cho từng patch
    for (const patch of patches) {
      console.log(`🔄 Running patch ${patchId}/${patches.length}:`, {
        startDate: patch.startDate,
        endDate: patch.endDate,
        currentCapital
      });

      try {
        // Lấy dữ liệu cho patch này
        const { data: ohlcvData, error: ohlcvError } = await supabase
          .from('OHLCV_BTC_USDT_1m')
          .select('*')
          .gte('open_time', patch.startDate)
          .lte('open_time', patch.endDate)
          .order('open_time', { ascending: true });

        if (ohlcvError) {
          console.error(`❌ Error loading data for patch ${patchId}:`, ohlcvError);
          continue;
        }

        if (!ohlcvData || ohlcvData.length === 0) {
          console.log(`⚠️ No data found for patch ${patchId}`);
          continue;
        }

        console.log(`📊 Loaded ${ohlcvData.length} data points for patch ${patchId}`);

        // Chạy backtest cho patch này
        const patchResult = await runPatchBacktest(
          ohlcvData,
          config,
          currentCapital,
          patchId
        );

        allResults.push(patchResult);
        allTrades = [...allTrades, ...patchResult.trades];
        
        // Rebalance: cập nhật capital cho patch tiếp theo
        currentCapital = patchResult.finalCapital;
        
        console.log(`✅ Patch ${patchId} completed:`, {
          initialCapital: patchResult.initialCapital,
          finalCapital: patchResult.finalCapital,
          totalReturn: patchResult.totalReturn,
          trades: patchResult.trades.length
        });

      } catch (error) {
        console.error(`❌ Error in patch ${patchId}:`, error);
      }

      patchId++;
    }

    // Tính toán tổng kết
    const totalResults = aggregatePatchResults(allResults, config.initialCapital);
    
    console.log('🎯 Patch-based backtest completed:', {
      totalPatches: patches.length,
      successfulPatches: allResults.length,
      finalCapital: totalResults.finalCapital,
      totalReturn: totalResults.totalReturn,
      totalTrades: allTrades.length
    });

    // Lưu kết quả vào database
    await savePatchBacktestResults(experimentId, totalResults, allResults);

    return NextResponse.json({
      success: true,
      results: totalResults,
      patches: allResults,
      message: `Patch-based backtest completed with ${allResults.length}/${patches.length} successful patches`
    });

  } catch (error) {
    console.error('❌ Patch backtest error:', error);
    return NextResponse.json(
      { error: 'Failed to run patch-based backtest', details: error.message },
      { status: 500 }
    );
  }
}

function generatePatches(startDate: string, endDate: string, daysPerPatch: number): Array<{startDate: string, endDate: string}> {
  const patches = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  let currentStart = new Date(start);
  
  while (currentStart < end) {
    const currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + daysPerPatch);
    
    // Đảm bảo không vượt quá end date
    if (currentEnd > end) {
      currentEnd.setTime(end.getTime());
    }
    
    patches.push({
      startDate: currentStart.toISOString(),
      endDate: currentEnd.toISOString()
    });
    
    currentStart = new Date(currentEnd);
  }
  
  return patches;
}

async function runPatchBacktest(
  ohlcvData: any[],
  config: any,
  initialCapital: number,
  patchId: number
): Promise<PatchResult> {
  // Tính toán các chỉ báo kỹ thuật
  const prices = ohlcvData.map(d => parseFloat(d.close));
  const timestamps = ohlcvData.map(d => new Date(d.open_time).getTime());
  
  let signals: number[] = [];
  
  // Tính toán signals dựa trên strategy type
  switch (config.strategyType) {
    case 'rsi':
      const rsi = calculateRSI(prices, config.rsiPeriod || 14);
      signals = rsi.map(r => {
        if (r < (config.oversold || 30)) return 1; // Buy signal
        if (r > (config.overbought || 70)) return -1; // Sell signal
        return 0; // Hold
      });
      break;
      
    case 'ma_crossover':
      const fastMA = calculateMA(prices, config.fastPeriod || 10);
      const slowMA = calculateMA(prices, config.slowPeriod || 20);
      signals = prices.map((_, i) => {
        if (i < config.slowPeriod || 20) return 0;
        if (fastMA[i] > slowMA[i] && fastMA[i-1] <= slowMA[i-1]) return 1; // Golden cross
        if (fastMA[i] < slowMA[i] && fastMA[i-1] >= slowMA[i-1]) return -1; // Death cross
        return 0;
      });
      break;
      
    case 'macd':
      const { macd, signal } = calculateMACD(prices, config.fastEMA || 12, config.slowEMA || 26, config.signalPeriod || 9);
      signals = prices.map((_, i) => {
        if (i < config.slowEMA || 26) return 0;
        if (macd[i] > signal[i] && macd[i-1] <= signal[i-1]) return 1; // MACD crosses above signal
        if (macd[i] < signal[i] && macd[i-1] >= signal[i-1]) return -1; // MACD crosses below signal
        return 0;
      });
      break;
      
    default:
      signals = new Array(prices.length).fill(0);
  }

  // Thực hiện backtest
  let position = 0;
  let capital = initialCapital;
  let trades: any[] = [];
  let equity = [capital];
  let maxCapital = capital;
  let maxDrawdown = 0;

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];
    const signal = signals[i];
    const timestamp = timestamps[i];

    // Xử lý tín hiệu mua/bán
    if (signal === 1 && position === 0) {
      // Mua
      const shares = Math.floor((capital * config.positionSize) / price);
      if (shares > 0) {
        position = shares;
        capital -= shares * price;
        
        trades.push({
          type: 'buy',
          timestamp,
          price,
          shares,
          capital: capital + position * price
        });
      }
    } else if (signal === -1 && position > 0) {
      // Bán
      const sellValue = position * price;
      capital += sellValue;
      
      trades.push({
        type: 'sell',
        timestamp,
        price,
        shares: position,
        capital
      });
      
      position = 0;
    }

    // Tính equity hiện tại
    const currentEquity = capital + position * price;
    equity.push(currentEquity);
    
    // Cập nhật max drawdown
    if (currentEquity > maxCapital) {
      maxCapital = currentEquity;
    }
    const drawdown = (maxCapital - currentEquity) / maxCapital;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  // Đóng position cuối cùng nếu còn
  if (position > 0) {
    const finalPrice = prices[prices.length - 1];
    const sellValue = position * finalPrice;
    capital += sellValue;
    
    trades.push({
      type: 'sell',
      timestamp: timestamps[timestamps.length - 1],
      price: finalPrice,
      shares: position,
      capital
    });
  }

  const finalCapital = capital;
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;

  // Tính toán metrics
  const winningTrades = trades.filter(t => t.type === 'sell' && t.capital > trades.find(prev => prev.type === 'buy' && prev.timestamp < t.timestamp)?.capital);
  const losingTrades = trades.filter(t => t.type === 'sell' && t.capital <= trades.find(prev => prev.type === 'buy' && prev.timestamp < t.timestamp)?.capital);

  const winRate = trades.filter(t => t.type === 'sell').length > 0 
    ? (winningTrades.length / trades.filter(t => t.type === 'sell').length) * 100 
    : 0;

  const avgWin = winningTrades.length > 0 
    ? winningTrades.reduce((sum, t) => sum + (t.capital - trades.find(prev => prev.type === 'buy' && prev.timestamp < t.timestamp)?.capital), 0) / winningTrades.length 
    : 0;

  const avgLoss = losingTrades.length > 0 
    ? losingTrades.reduce((sum, t) => sum + (trades.find(prev => prev.type === 'buy' && prev.timestamp < t.timestamp)?.capital - t.capital), 0) / losingTrades.length 
    : 0;

  const sharpeRatio = calculateSharpeRatio(equity);

  return {
    patchId,
    startDate: new Date(timestamps[0]).toISOString(),
    endDate: new Date(timestamps[timestamps.length - 1]).toISOString(),
    initialCapital,
    finalCapital,
    totalReturn,
    trades,
    metrics: {
      winRate,
      totalTrades: trades.filter(t => t.type === 'sell').length,
      avgWin,
      avgLoss,
      maxDrawdown: maxDrawdown * 100,
      sharpeRatio
    }
  };
}

function aggregatePatchResults(patches: PatchResult[], initialCapital: number) {
  const totalTrades = patches.reduce((sum, patch) => sum + patch.trades.length, 0);
  const totalWinningTrades = patches.reduce((sum, patch) => sum + patch.metrics.winRate * patch.metrics.totalTrades / 100, 0);
  const totalReturn = patches.reduce((sum, patch) => sum + patch.totalReturn, 0);
  const avgWin = patches.reduce((sum, patch) => sum + patch.metrics.avgWin, 0) / patches.length;
  const avgLoss = patches.reduce((sum, patch) => sum + patch.metrics.avgLoss, 0) / patches.length;
  const maxDrawdown = Math.max(...patches.map(p => p.metrics.maxDrawdown));
  const sharpeRatio = patches.reduce((sum, patch) => sum + patch.metrics.sharpeRatio, 0) / patches.length;

  const finalCapital = patches.length > 0 ? patches[patches.length - 1].finalCapital : initialCapital;

  return {
    totalPatches: patches.length,
    finalCapital,
    totalReturn,
    totalTrades,
    winRate: totalTrades > 0 ? (totalWinningTrades / totalTrades) * 100 : 0,
    avgWin,
    avgLoss,
    maxDrawdown,
    sharpeRatio,
    patches
  };
}

async function savePatchBacktestResults(experimentId: string, totalResults: any, patches: PatchResult[]) {
  try {
    // Cập nhật experiment với kết quả patch-based backtest
    const { error } = await supabase
      .from('experiments')
      .update({
        status: 'completed',
        results: {
          ...totalResults,
          patch_based: true,
          patch_count: patches.length,
          final_capital: totalResults.finalCapital,
          total_return: totalResults.totalReturn,
          win_rate: totalResults.winRate,
          total_trades: totalResults.totalTrades,
          avg_win: totalResults.avgWin,
          avg_loss: totalResults.avgLoss,
          max_drawdown: totalResults.maxDrawdown,
          sharpe_ratio: totalResults.sharpeRatio,
          completed_at: new Date().toISOString()
        }
      })
      .eq('id', experimentId);

    if (error) {
      console.error('Error saving patch backtest results:', error);
    } else {
      console.log('✅ Patch backtest results saved to database');
    }
  } catch (error) {
    console.error('Error saving results:', error);
  }
} 