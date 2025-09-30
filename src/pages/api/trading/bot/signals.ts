import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botId } = req.query;

  if (!botId) {
    return res.status(400).json({ error: 'Missing botId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // Lấy signals từ cột signals (JSONB) của trading_bots
    const { data: bot, error } = await supabase
      .from('trading_bots')
      .select('signals')
      .eq('id', botId)
      .single();

    if (error) {
      console.error('Error fetching bot signals:', error);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!bot) {
      return res.status(404).json({ error: 'Bot not found' });
    }

    // Trả về signals array (có thể là null nếu chưa có signal nào)
    const signals = bot.signals || [];

    return res.status(200).json({
      success: true,
      signals: signals,
      count: signals.length
    });

  } catch (error) {
    console.error('Error in signals API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
