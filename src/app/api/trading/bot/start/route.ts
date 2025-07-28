import { NextRequest, NextResponse } from 'next/server';
import { botManager } from '@/lib/trading/bot-manager';
import { supabase } from '@/lib/supabase-client';
import { TradingBot } from '@/lib/trading/trading-bot';

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
    if (bot.status === 'running') {
      return NextResponse.json({ error: 'Bot is already running' }, { status: 400 });
    }

    // Sử dụng BotManager để start bot
    const success = await botManager.startBot(bot as TradingBot);

    if (!success) {
      return NextResponse.json({ error: 'Failed to start bot' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bot started successfully',
      botId 
    });

  } catch (error: any) {
    console.error('Error starting bot:', error);
    return NextResponse.json({ 
      error: 'Failed to start bot',
      details: error.message 
    }, { status: 500 });
  }
} 