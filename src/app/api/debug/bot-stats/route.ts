import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { calculateBotStats } from '@/lib/trading/bot-stats-calculator';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    // Lấy danh sách tất cả bots
    const { data: bots, error: botsError } = await supabase
      .from('trading_bots')
      .select('id, name, total_trades, total_profit, win_rate')
      .limit(5);

    if (botsError) {
      return NextResponse.json({ error: 'Error fetching bots', details: botsError }, { status: 500 });
    }

    // Lấy danh sách tất cả trades
    const { data: trades, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .limit(10);

    if (tradesError) {
      return NextResponse.json({ error: 'Error fetching trades', details: tradesError }, { status: 500 });
    }

    // Tính stats cho bot đầu tiên nếu có
    let botStats = null;
    if (bots && bots.length > 0) {
      const firstBot = bots[0];
      botStats = await calculateBotStats(firstBot.id);
    }

    return NextResponse.json({
      bots: bots || [],
      trades: trades || [],
      botStats: botStats,
      summary: {
        totalBots: bots?.length || 0,
        totalTrades: trades?.length || 0,
        botsWithTrades: trades ? new Set(trades.map((t: { bot_id: string }) => t.bot_id)).size : 0
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}

