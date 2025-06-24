import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { TradingBot } from '@/lib/trading/trading-bot';
import { BotExecutor } from '@/lib/trading/bot-executor';

// GET /api/trading/bot - Lấy danh sách bot
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    const { data: bots, error } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json(bots);
  } catch (error) {
    console.error('Error fetching bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/trading/bot - Tạo bot mới
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectId, experimentId, name, description, config } = body;

    if (!projectId || !experimentId || !name || !config) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Kiểm tra experiment có tồn tại không
    const { data: experiment } = await supabase
      .from('experiments')
      .select('*')
      .eq('id', experimentId)
      .single();

    if (!experiment) {
      return NextResponse.json({ error: 'Experiment not found' }, { status: 404 });
    }

    // Tạo bot mới
    const { data: bot, error } = await supabase
      .from('trading_bots')
      .insert({
        project_id: projectId,
        experiment_id: experimentId,
        name,
        description,
        config,
        status: 'idle',
        total_trades: 0,
        total_profit: 0,
        win_rate: 0
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(bot);
  } catch (error) {
    console.error('Error creating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/trading/bot/:id - Cập nhật trạng thái bot
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { botId, action } = body;

    if (!botId || !action) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Lấy thông tin bot
    const { data: bot } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (!bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    const executor = new BotExecutor(bot as TradingBot);

    switch (action) {
      case 'start':
        await executor.start();
        break;
      case 'stop':
        await executor.stop();
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Lấy thông tin bot sau khi cập nhật
    const { data: updatedBot } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();

    return NextResponse.json(updatedBot);
  } catch (error) {
    console.error('Error updating bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/trading/bot/:id - Xóa bot
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({ error: 'Missing botId' }, { status: 400 });
    }

    const { error } = await supabase
      .from('trading_bots')
      .delete()
      .eq('id', botId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 