import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

interface MarketData {
  symbol: string;
  open_time: string;
  close_price: number;
  volume: number;
  high_price: number;
  low_price: number;
}

// Real statistical calculations
function calculateCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n !== y.length || n === 0) return 0;
  
  const meanX = x.reduce((a, b) => a + b) / n;
  const meanY = y.reduce((a, b) => a + b) / n;
  
  let numerator = 0;
  let sumXSq = 0;
  let sumYSq = 0;
  
  for (let i = 0; i < n; i++) {
    const diffX = x[i] - meanX;
    const diffY = y[i] - meanY;
    numerator += diffX * diffY;
    sumXSq += diffX * diffX;
    sumYSq += diffY * diffY;
  }
  
  const denominator = Math.sqrt(sumXSq * sumYSq);
  return denominator === 0 ? 0 : numerator / denominator;
}

function calculateReturns(prices: number[]): number[] {
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i-1]) / prices[i-1]);
  }
  return returns;
}

function calculateSharpeRatio(returns: number[]): number {
  const avgReturn = returns.reduce((a, b) => a + b) / returns.length;
  const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length;
  const volatility = Math.sqrt(variance * 365); // Annualized
  return volatility === 0 ? 0 : (avgReturn * 365) / volatility;
}

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const analysis = searchParams.get('type') || 'correlation';

    console.log('🔍 Running REAL analysis with market data:', analysis);

    // First, let's check what tables exist and their structure
    try {
      // Use the actual table name from market-stats API
      console.log('🔍 Trying actual table: OHLCV_BTC_USDT_1m');
      
      const { data: marketData, error } = await supabase
        .from('OHLCV_BTC_USDT_1m')
        .select('open_time, open, high, low, close, volume')
        .order('open_time', { ascending: false })
        .limit(500);

      if (error) {
        console.error('❌ Table OHLCV_BTC_USDT_1m error:', error);
        return NextResponse.json({ 
          error: 'Could not fetch market data', 
          details: error,
          table_attempted: 'OHLCV_BTC_USDT_1m'
        }, { status: 500 });
      }

      if (!marketData || marketData.length === 0) {
        return NextResponse.json({ 
          error: 'No market data found in OHLCV_BTC_USDT_1m table',
          message: 'Table exists but contains no data'
        }, { status: 404 });
      }

      console.log(`✅ Using table: OHLCV_BTC_USDT_1m with ${marketData.length} records`);
      console.log('📊 Sample record:', marketData[0]);

      // Extract prices for general use
      const prices = marketData.map(d => parseFloat(d.close.toString()));

      // Since this is BTC-only data, we'll do different analyses
      if (analysis === 'correlation') {
        // PRICE vs VOLUME CORRELATION ANALYSIS
        const volumes = marketData.map(d => parseFloat(d.volume.toString()));
        
        const priceVolumeCorr = calculateCorrelation(prices, volumes);
        
        // High vs Low correlation (volatility analysis) 
        const highs = marketData.map(d => parseFloat(d.high.toString()));
        const lows = marketData.map(d => parseFloat(d.low.toString()));
        const volatility = highs.map((h, i) => h - lows[i]);
        
        const priceVolatilityCorr = calculateCorrelation(prices, volatility);

        return NextResponse.json({
          status: 'SUCCESS',
          analysis_type: 'Real BTC Price-Volume & Volatility Analysis',
          data_points: marketData.length,
          results: {
            price_volume_correlation: priceVolumeCorr,
            price_volatility_correlation: priceVolatilityCorr,
            interpretation: {
              price_volume: Math.abs(priceVolumeCorr) > 0.3 ? 
                `${priceVolumeCorr > 0 ? 'Positive' : 'Negative'} correlation between price and volume` :
                'Weak price-volume relationship',
              price_volatility: Math.abs(priceVolatilityCorr) > 0.3 ?
                `${priceVolatilityCorr > 0 ? 'Higher prices correlate with higher volatility' : 'Higher prices correlate with lower volatility'}` :
                'Price and volatility show weak correlation'
            },
            sample_data: marketData.slice(0, 10).map(d => ({
              time: d.open_time,
              price: parseFloat(d.close.toString()),
              volume: parseFloat(d.volume.toString()),
              volatility: parseFloat(d.high.toString()) - parseFloat(d.low.toString())
            }))
          },
          metadata: {
            total_records: marketData.length,
            latest_price: parseFloat(marketData[0].close.toString()),
            price_range: {
              min: Math.min(...prices),
              max: Math.max(...prices)
            },
            date_range: {
              start: marketData[marketData.length - 1]?.open_time,
              end: marketData[0]?.open_time
            }
          }
        });
      }

      if (analysis === 'strategy') {
        // REAL MOMENTUM STRATEGY BACKTEST with BTC data
        const prices = marketData.reverse().map(d => parseFloat(d.close.toString())); // Chronological order
        
        // Simple momentum strategy: buy if price > 20-period MA
        const trades = [];
        let position = 0;
        let capital = 100000;
        let equity = [];
        
        for (let i = 20; i < prices.length; i++) {
          const recentPrices = prices.slice(i-20, i);
          const ma20 = recentPrices.reduce((a, b) => a + b) / 20;
          const currentPrice = prices[i];
          
          // Strategy logic
          if (currentPrice > ma20 && position === 0) {
            // Buy signal
            position = capital / currentPrice;
            capital = 0;
            trades.push({
              type: 'BUY',
              price: currentPrice,
              time: marketData[i].open_time,
              position: position
            });
          } else if (currentPrice < ma20 && position > 0) {
            // Sell signal
            capital = position * currentPrice;
            trades.push({
              type: 'SELL',
              price: currentPrice,
              time: marketData[i].open_time,
              pnl: capital - 100000
            });
            position = 0;
          }
          
          // Calculate current equity
          const currentEquity = position > 0 ? position * currentPrice : capital;
          equity.push({ time: marketData[i].open_time, equity: currentEquity });
        }

        // Calculate performance metrics
        const finalEquity = equity[equity.length - 1]?.equity || 100000;
        const totalReturn = (finalEquity - 100000) / 100000;
        const equityReturns = calculateReturns(equity.map(e => e.equity));
        const sharpeRatio = calculateSharpeRatio(equityReturns);
        const maxDrawdown = calculateMaxDrawdown(equity.map(e => e.equity));

        return NextResponse.json({
          status: 'SUCCESS',
          analysis_type: 'Real BTC Momentum Strategy Backtest',
          data_points: prices.length,
          results: {
            total_return: totalReturn,
            total_return_pct: `${(totalReturn * 100).toFixed(2)}%`,
            sharpe_ratio: sharpeRatio,
            max_drawdown: maxDrawdown,
            max_drawdown_pct: `${(maxDrawdown * 100).toFixed(2)}%`,
            total_trades: trades.length,
            win_rate: calculateWinRate(trades),
            final_capital: finalEquity,
            interpretation: totalReturn > 0 ? 'Profitable strategy' : 'Losing strategy'
          },
          trades: trades.slice(-5), // Last 5 trades
          equity_curve: equity.slice(-50), // Last 50 equity points
          metadata: {
            strategy: 'BTC Momentum (20-period MA)',
            period: `${marketData[marketData.length - 1]?.open_time} to ${marketData[0]?.open_time}`,
            initial_capital: 100000
          }
        });
      }

      // Default: Market overview  
      return NextResponse.json({
        status: 'SUCCESS - Real BTC market data found!',
        analysis_type: 'Real BTC Market Data Overview',
        data_summary: {
          total_records: marketData.length,
          latest_price: parseFloat(marketData[0].close.toString()),
          price_change_24h: prices.length > 1440 ? // 24h = 1440 minutes
            ((prices[0] - prices[1440]) / prices[1440] * 100).toFixed(2) + '%' : 'N/A',
          volume_24h: marketData.slice(0, 1440).reduce((sum, d) => 
            sum + parseFloat(d.volume.toString()), 0),
          date_range: {
            start: marketData[marketData.length - 1]?.open_time,
            end: marketData[0]?.open_time
          }
        },
        available_analyses: [
          'correlation - Real BTC price-volume & volatility correlation analysis',
          'strategy - Real BTC momentum strategy backtest'
        ]
      });

    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json({ 
        error: 'Database query failed', 
        details: dbError 
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Quick analysis error:', error);
    return NextResponse.json({ 
      error: 'Analysis failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function calculateMaxDrawdown(equity: number[]): number {
  let maxDrawdown = 0;
  let peak = equity[0];
  
  for (const value of equity) {
    if (value > peak) peak = value;
    const drawdown = (peak - value) / peak;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;
  }
  
  return maxDrawdown;
}

function calculateWinRate(trades: any[]): string {
  const sellTrades = trades.filter(t => t.type === 'SELL');
  const winningTrades = sellTrades.filter(t => t.pnl > 0);
  return sellTrades.length > 0 ? `${((winningTrades.length / sellTrades.length) * 100).toFixed(1)}%` : '0%';
} 