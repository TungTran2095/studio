import { NextRequest, NextResponse } from 'next/server';
import { BotExecutor } from '@/lib/trading/bot-executor';
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

    // Tạo bot executor
    const executor = new BotExecutor(bot);
    await executor.initialize();

    // Start bot
    await executor.start();

    // Cập nhật trạng thái bot trong database
    const { error: updateError } = await supabase
      .from('trading_bots')
      .update({ 
        status: 'running',
        updated_at: new Date().toISOString(),
        last_run_at: new Date().toISOString()
      })
      .eq('id', botId);

    if (updateError) {
      console.error('Error updating bot status:', updateError);
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