import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { projectId } = await request.json();
    
    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required parameter: projectId' },
        { status: 400 }
      );
    }

    // Tạo backtest mẫu
    const sampleBacktest = {
      project_id: projectId,
      name: 'Backtest Chiến lược Momentum BTC/USDT',
      description: 'Backtest mẫu cho chiến lược momentum trading trên cặp BTC/USDT',
      type: 'backtest',
      status: 'completed',
      progress: 100,
      config: {
        strategy: {
          type: 'momentum',
          lookback_period: 20,
          threshold: 0.02
        },
        backtest: {
          start_date: '2023-01-01',
          end_date: '2023-12-31',
          initial_capital: 10000,
          symbol: 'BTCUSDT',
          timeframe: '1h'
        }
      },
      results: {
        total_return: 15.67,
        sharpe_ratio: 1.23,
        max_drawdown: -8.45,
        win_rate: 58.3,
        total_trades: 127,
        avg_win: 2.1,
        avg_loss: -1.8
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: new Date().toISOString()
    };

    const { data: backtest, error } = await supabase
      .from('research_experiments')
      .insert([sampleBacktest])
      .select()
      .single();

    if (error) {
      console.error('Error creating sample backtest:', error);
      return NextResponse.json(
        { error: 'Failed to create sample backtest' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Sample backtest created successfully',
      backtest
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}






