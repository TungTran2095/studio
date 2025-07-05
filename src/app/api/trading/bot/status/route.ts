import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Lấy thông tin bot từ database
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('id, name, status, total_trades, total_profit, win_rate, last_run_at, updated_at')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      botId,
      status: bot.status,
      name: bot.name,
      totalTrades: bot.total_trades || 0,
      totalProfit: bot.total_profit || 0,
      winRate: bot.win_rate || 0,
      lastRunAt: bot.last_run_at,
      updatedAt: bot.updated_at
    });

  } catch (error: any) {
    console.error('Error getting bot status:', error);
    return NextResponse.json({ 
      error: 'Failed to get bot status',
      details: error.message 
    }, { status: 500 });
  }
} 