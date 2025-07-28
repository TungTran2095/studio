import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/trading/bot-manager';
import { supabase } from '@/lib/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const { botId } = await req.json();

    if (!botId) {
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    // Đảm bảo BotManager đã được khởi tạo
    await botManager.initialize();

    // Lấy thông tin bot từ database
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Kiểm tra trạng thái bot
    if (bot.status !== 'running') {
      return NextResponse.json({ error: 'Bot is not running' }, { status: 400 });
    }

    // Sử dụng BotManager để stop bot
    const success = await botManager.stopBot(botId);

    if (!success) {
      return NextResponse.json({ error: 'Failed to stop bot' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bot stopped successfully',
      botId 
    });

  } catch (error: any) {
    console.error('Error stopping bot:', error);
    return NextResponse.json({ 
      error: 'Failed to stop bot',
      details: error.message 
    }, { status: 500 });
  }
} 