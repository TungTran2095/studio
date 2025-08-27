import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { TradingBot } from '@/lib/trading/trading-bot';
import { botManager } from '@/lib/trading/bot-manager';
import { initializeBotManager } from '@/lib/trading/init-bot-manager';

// Khởi tạo BotManager khi module được load
if (typeof window === 'undefined') {
  // Chỉ chạy trên server side
  initializeBotManager().catch(console.error);
}

// Tạo Supabase client với service role key để bypass RLS
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // Service role key để bypass RLS
);

// GET /api/trading/bot - Lấy danh sách bot
export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

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
    if (!supabase) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
    }

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

    // Đảm bảo BotManager và supabase đã được khởi tạo
    await botManager.initialize();
    if (!supabase) {
      return NextResponse.json({ error: 'Database not initialized' }, { status: 500 });
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

    // Sử dụng BotManager thay vì tạo BotExecutor mới
    let success = false;
    
    switch (action) {
      case 'start':
        success = await botManager.startBot(bot as TradingBot);
        break;
      case 'stop':
        success = await botManager.stopBot(botId);
        break;
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    if (!success) {
      return NextResponse.json({ error: `Failed to ${action} bot` }, { status: 500 });
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

    // Kiểm tra xem bot có đang chạy không
    const { data: bot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('status')
      .eq('id', botId)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Nếu bot đang chạy, dừng nó trước
    if (bot.status === 'running') {
      console.log(`[API] Bot ${botId} đang chạy, dừng trước khi xóa...`);
      
      try {
        // Dừng bot qua BotManager
        await botManager.initialize();
        await botManager.stopBot(botId);
      } catch (stopError) {
        console.log(`[API] Không thể dừng bot ${botId}:`, stopError);
        // Vẫn tiếp tục xóa bot
      }
    }

    // Xóa bot khỏi database sử dụng admin client để bypass RLS
    console.log(`[API] Đang xóa bot ${botId} khỏi database (bypass RLS)...`);
    
    const { error: deleteError } = await supabaseAdmin
      .from('trading_bots')
      .delete()
      .eq('id', botId);

    if (deleteError) {
      console.error('Error deleting bot:', deleteError);
      console.error('Delete error code:', deleteError.code);
      console.error('Delete error details:', deleteError.details);
      return NextResponse.json({ error: 'Failed to delete bot' }, { status: 500 });
    }

    console.log(`[API] Supabase delete response OK, kiểm tra xem bot đã thực sự bị xóa chưa...`);
    
    // Kiểm tra xem bot đã thực sự bị xóa chưa
    const { data: checkBot, error: checkError } = await supabaseAdmin
      .from('trading_bots')
      .select('id')
      .eq('id', botId)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      console.log(`[API] ✅ Bot ${botId} đã thực sự bị xóa khỏi database`);
      return NextResponse.json({ 
        success: true, 
        message: 'Bot deleted successfully' 
      });
    } else if (checkBot) {
      console.error(`[API] ❌ Bot ${botId} vẫn còn trong database sau khi xóa!`);
      console.error('Đây là vấn đề nghiêm trọng - bot không thể xóa được');
      return NextResponse.json({ 
        error: 'Bot could not be deleted from database',
        details: 'Bot still exists after delete operation'
      }, { status: 500 });
    } else {
      console.log(`[API] ✅ Bot ${botId} đã được xóa thành công`);
      return NextResponse.json({ 
        success: true, 
        message: 'Bot deleted successfully' 
      });
    }
  } catch (error) {
    console.error('Error deleting bot:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 