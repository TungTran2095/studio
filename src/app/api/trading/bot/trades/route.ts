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

    // Lấy lịch sử giao dịch của bot
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', botId)
      .order('open_time', { ascending: true })
      .limit(100);

    if (error) {
      console.error('Error fetching trades:', error);
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      trades: trades || [],
      total: trades?.length || 0
    });

  } catch (error: any) {
    console.error('Error getting bot trades:', error);
    return NextResponse.json({ 
      error: 'Failed to get bot trades',
      details: error.message 
    }, { status: 500 });
  }
} 