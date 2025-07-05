import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Supabase client not initialized' });
  }

  try {
    const { botId, indicator, value, time } = req.body;
    
    console.log('🧪 Testing indicator log insertion:', { botId, indicator, value, time });

    if (!botId || !indicator || value === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 1. Kiểm tra xem bảng có tồn tại không
    console.log('📋 Checking if bot_indicator_logs table exists...');
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('bot_indicator_logs')
        .select('id')
        .limit(1);
      
      if (tableError) {
        console.error('❌ Table check error:', tableError);
        return res.status(500).json({ 
          error: 'bot_indicator_logs table does not exist or access denied',
          details: tableError.message 
        });
      }
      
      console.log('✅ bot_indicator_logs table exists');
    } catch (err) {
      console.error('❌ Table check failed:', err);
      return res.status(500).json({ 
        error: 'bot_indicator_logs table does not exist',
        details: (err as Error).message 
      });
    }

    // 2. Kiểm tra bot có tồn tại không
    console.log('🤖 Checking if bot exists...');
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('id, name')
      .eq('id', botId)
      .single();
    
    if (botError || !bot) {
      console.error('❌ Bot not found:', botError);
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    console.log('✅ Bot found:', bot.name);

    // 3. Thử ghi log
    console.log('📝 Attempting to insert log...');
    const logData = {
      bot_id: botId,
      indicator,
      value: parseFloat(value),
      time: time || new Date().toISOString()
    };

    const { data: insertedLog, error: insertError } = await supabase
      .from('bot_indicator_logs')
      .insert([logData])
      .select()
      .single();

    if (insertError) {
      console.error('❌ Insert error:', insertError);
      return res.status(500).json({ 
        error: 'Failed to insert indicator log',
        details: insertError.message 
      });
    }

    console.log('✅ Log inserted successfully:', insertedLog);

    // 4. Kiểm tra lại logs
    const { data: logs, error: logsError } = await supabase
      .from('bot_indicator_logs')
      .select('*')
      .eq('bot_id', botId)
      .order('time', { ascending: false })
      .limit(5);

    if (logsError) {
      console.error('❌ Error fetching logs:', logsError);
    } else {
      console.log('📊 Current logs count:', logs?.length || 0);
    }

    res.status(200).json({
      success: true,
      message: 'Indicator log inserted successfully',
      log: insertedLog,
      totalLogs: logs?.length || 0,
      recentLogs: logs || []
    });

  } catch (err) {
    console.error('❌ Unexpected error:', err);
    res.status(500).json({ 
      error: 'Internal server error',
      details: (err as Error).message 
    });
  }
} 