import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { BacktestingEngine, generateSampleMarketData } from '@/lib/research/backtesting-engine';

// Helper function to run backtest with engine
async function runBacktestWithEngine(strategyConfig: any, backtestConfig: any) {
  try {
    // Generate sample market data
    const marketData = generateSampleMarketData(365);
    
    // Create backtest config matching BacktestConfig interface
    const config = {
      modelId: 'demo-model',
      initialCapital: backtestConfig.initial_capital || 100000,
      period: {
        start: backtestConfig.start_date || '2023-01-01',
        end: backtestConfig.end_date || '2023-12-31'
      },
      commission: 0.001, // 0.1%
      slippage: 0.0005, // 0.05%
      strategy: {
        id: strategyConfig.type || 'momentum',
        parameters: {
          lookbackPeriod: strategyConfig.lookback_period || 20,
          threshold: strategyConfig.threshold || 0.02,
          ...strategyConfig
        }
      },
      riskManagement: {
        riskPerTrade: 2.0, // 2% per trade
        stopLoss: 3.0, // 3% stop loss
        takeProfit: 6.0, // 6% take profit
        maxPositions: 1
      }
    };

    // Create and run backtest
    const engine = new BacktestingEngine(marketData, config);
    const result = await engine.run();

    return {
      totalReturn: result.performance.totalReturn || 0,
      sharpeRatio: result.performance.sharpeRatio || 0,
      maxDrawdown: result.performance.maxDrawdown || 0,
      winRate: result.performance.winRate || 0,
      trades: result.trades,
      equityCurve: result.equity
    };
  } catch (error) {
    console.error('Backtest engine error:', error);
    throw error;
  }
}

export async function GET(request: NextRequest) {
  try {
    // Return sample backtests for demo
    const sampleBacktests = [
      {
        id: 'backtest-1',
        name: 'BTC Momentum Strategy Test',
        description: 'Testing momentum strategy on BTC 1-year data',
        strategy_config: {
          type: 'momentum',
          lookback_period: 20,
          threshold: 0.02
        },
        backtest_config: {
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          initial_capital: 100000
        },
        performance_metrics: {
          total_return: 0.234,
          sharpe_ratio: 1.45,
          max_drawdown: -0.156,
          win_rate: 0.62,
          total_trades: 45
        },
        status: 'completed',
        created_at: new Date('2024-01-15').toISOString()
      },
      {
        id: 'backtest-2',
        name: 'ETH Mean Reversion Test',
        description: 'Mean reversion strategy backtest',
        strategy_config: {
          type: 'mean_reversion',
          period: 14,
          threshold: 2.0
        },
        backtest_config: {
          start_date: '2023-06-01',
          end_date: '2023-12-31',
          initial_capital: 50000
        },
        performance_metrics: {
          total_return: 0.187,
          sharpe_ratio: 1.23,
          max_drawdown: -0.098,
          win_rate: 0.58,
          total_trades: 32
        },
        status: 'completed',
        created_at: new Date('2024-01-10').toISOString()
      },
      {
        id: 'backtest-3',
        name: 'Multi-timeframe Strategy',
        description: 'Combined momentum + mean reversion',
        strategy_config: {
          type: 'combined',
          short_period: 5,
          long_period: 20
        },
        backtest_config: {
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          initial_capital: 75000
        },
        performance_metrics: {
          total_return: 0.312,
          sharpe_ratio: 1.67,
          max_drawdown: -0.089,
          win_rate: 0.71,
          total_trades: 28
        },
        status: 'completed',
        created_at: new Date('2024-01-05').toISOString()
      }
    ];

    return NextResponse.json({ backtests: sampleBacktests });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      name, 
      description, 
      strategy_config, 
      backtest_config,
      run_immediately = false
    } = body;

    // Generate mock results if run_immediately is true
    const mockResults = run_immediately ? {
      total_return: Math.random() * 0.4 - 0.1, // -10% to +30%
      sharpe_ratio: Math.random() * 2 + 0.5, // 0.5 to 2.5
      max_drawdown: -(Math.random() * 0.2), // 0% to -20%
      win_rate: Math.random() * 0.4 + 0.4, // 40% to 80%
      total_trades: Math.floor(Math.random() * 50) + 10
    } : null;

    const newBacktest = {
      id: `backtest-${Date.now()}`,
      name: name || 'New Backtest',
      description: description || 'Backtest strategy performance',
      strategy_config,
      backtest_config,
      performance_metrics: mockResults,
      status: run_immediately ? 'completed' : 'pending',
      created_at: new Date().toISOString()
    };

    console.log('✅ Created backtest:', newBacktest.name, 'with results:', mockResults);

    return NextResponse.json({ 
      backtest: newBacktest,
      message: run_immediately ? 'Backtest completed successfully with mock engine' : 'Backtest created'
    }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 