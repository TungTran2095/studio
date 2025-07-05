import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { botName } = req.query;
  console.log('🔍 API bot debug called with botName:', botName);
  
  if (!botName) return res.status(400).json({ error: 'Missing botName' });

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }

  try {
    // 1. Tìm bot theo tên
    console.log('📋 Finding bot with name:', botName);
    const { data: bots, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .ilike('name', `%${botName}%`);
    
    if (botError) {
      console.error('❌ Error finding bot:', botError);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!bots || bots.length === 0) {
      console.log('❌ No bot found with name:', botName);
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    const bot = bots[0];
    console.log('✅ Found bot:', {
      id: bot.id,
      name: bot.name,
      status: bot.status,
      total_trades: bot.total_trades,
      total_profit: bot.total_profit,
      win_rate: bot.win_rate,
      last_error: bot.last_error,
      last_run_at: bot.last_run_at
    });

    // 2. Kiểm tra logs indicator
    let indicatorLogs: any[] = [];
    try {
      const { data: logsData, error: logsError } = await supabase
        .from('bot_indicator_logs')
        .select('*')
        .eq('bot_id', bot.id)
        .order('time', { ascending: false })
        .limit(10);
      
      if (!logsError && logsData) {
        indicatorLogs = logsData;
        console.log('✅ Found', indicatorLogs.length, 'indicator logs');
      } else {
        console.log('⚠️ No indicator logs found');
      }
    } catch (err) {
      console.log('⚠️ bot_indicator_logs table does not exist yet');
    }

    // 3. Kiểm tra trades
    const { data: tradesData, error: tradesError } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', bot.id)
      .order('open_time', { ascending: false })
      .limit(10);
    
    if (tradesError) {
      console.error('❌ Error fetching trades:', tradesError);
    } else {
      console.log('✅ Found', tradesData?.length || 0, 'trades');
    }

    // 4. Phân tích vấn đề
    let analysis = {
      status: 'unknown' as string,
      issues: [] as string[],
      recommendations: [] as string[]
    };

    if (bot.status === 'error') {
      analysis.status = 'error';
      analysis.issues.push('Bot đang ở trạng thái ERROR');
      analysis.recommendations.push('Kiểm tra lỗi cuối cùng và khởi động lại bot');
    } else if (bot.status === 'idle') {
      analysis.status = 'idle';
      analysis.issues.push('Bot đang ở trạng thái IDLE - không chạy');
      analysis.recommendations.push('Cần khởi động bot');
    } else if (bot.status === 'running') {
      analysis.status = 'running';
      
      if (bot.total_trades === 0) {
        analysis.issues.push('Bot đang chạy nhưng chưa có giao dịch nào');
        analysis.recommendations.push('Kiểm tra tín hiệu giao dịch');
        analysis.recommendations.push('Kiểm tra API key và số dư');
        analysis.recommendations.push('Kiểm tra tham số chiến lược');
      } else {
        analysis.recommendations.push('Bot đang hoạt động bình thường');
      }
    }

    // 5. Kiểm tra API key
    let apiKeyInfo = null;
    if (bot.config?.account) {
      const account = bot.config.account;
      apiKeyInfo = {
        hasApiKey: !!account.apiKey,
        hasApiSecret: !!account.apiSecret,
        isTestnet: account.testnet,
        issues: [] as string[]
      };
      
      if (!account.apiKey || !account.apiSecret) {
        apiKeyInfo.issues.push('Thiếu thông tin API credentials');
      }
    }

    // 6. Kiểm tra strategy
    let strategyInfo = null;
    if (bot.config?.config?.strategy) {
      const strategy = bot.config.config.strategy;
      strategyInfo = {
        type: strategy.type,
        parameters: strategy.parameters
      };
    }

    res.status(200).json({
      bot: {
        id: bot.id,
        name: bot.name,
        status: bot.status,
        total_trades: bot.total_trades,
        total_profit: bot.total_profit,
        win_rate: bot.win_rate,
        last_error: bot.last_error,
        last_run_at: bot.last_run_at,
        created_at: bot.created_at,
        updated_at: bot.updated_at
      },
      config: bot.config,
      indicator_logs: indicatorLogs,
      trades: tradesData || [],
      analysis,
      apiKeyInfo,
      strategyInfo,
      summary: {
        has_indicator_logs: indicatorLogs.length > 0,
        has_trades: (tradesData?.length || 0) > 0,
        last_indicator_log: indicatorLogs.length > 0 ? indicatorLogs[0] : null,
        last_trade: tradesData && tradesData.length > 0 ? tradesData[0] : null
      }
    });
    
  } catch (err) {
    console.error('❌ Unexpected error in bot debug API:', err);
    res.status(500).json({ error: (err as Error).message });
  }
} 