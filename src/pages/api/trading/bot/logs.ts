import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { botId } = req.query;
  console.log('🔍 API bot logs called with botId:', botId);
  
  if (!botId) return res.status(400).json({ error: 'Missing botId' });

  try {
    // 1. Lấy thông tin bot
    console.log('📋 Fetching bot info for botId:', botId);
    const { data: botData, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();
    
    if (botError || !botData) {
      console.error('❌ Error fetching bot info:', botError);
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    console.log('✅ Bot info found:', {
      name: botData.name,
      status: botData.status,
      total_trades: botData.total_trades,
      total_profit: botData.total_profit,
      win_rate: botData.win_rate,
      last_error: botData.last_error
    });

    // 2. Lấy logs indicator (nếu bảng tồn tại)
    let indicatorLogs = [];
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('bot_indicator_logs')
        .select('*')
        .eq('bot_id', botId)
        .order('time', { ascending: false })
        .limit(50);
      
      if (!logsError && logsData) {
        indicatorLogs = logsData;
        console.log('✅ Found', indicatorLogs.length, 'indicator logs');
      } else {
        console.log('⚠️ No indicator logs table or no logs found');
      }
    } catch (err) {
      console.log('⚠️ bot_indicator_logs table does not exist yet');
    }

    // 3. Lấy lịch sử giao dịch
    const { data: tradesData, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', botId)
      .order('open_time', { ascending: false })
      .limit(20);
    
    if (tradesError) {
      console.error('❌ Error fetching trades:', tradesError);
    } else {
      console.log('✅ Found', tradesData?.length || 0, 'trades');
    }

    res.status(200).json({
      bot: {
        id: botData.id,
        name: botData.name,
        status: botData.status,
        total_trades: botData.total_trades,
        total_profit: botData.total_profit,
        win_rate: botData.win_rate,
        last_error: botData.last_error,
        last_run_at: botData.last_run_at,
        created_at: botData.created_at,
        updated_at: botData.updated_at
      },
      indicator_logs: indicatorLogs,
      trades: tradesData || [],
      summary: {
        has_indicator_logs: indicatorLogs.length > 0,
        has_trades: (tradesData?.length || 0) > 0,
        last_indicator_log: indicatorLogs.length > 0 ? indicatorLogs[0] : null,
        last_trade: tradesData && tradesData.length > 0 ? tradesData[0] : null
      }
    });
    
  } catch (err) {
    console.error('❌ Unexpected error in bot logs API:', err);
    res.status(500).json({ error: (err as Error).message });
  }
} 