import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

// Không đồng bộ signals chéo bot nữa; mỗi bot tự quản signals của mình

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { botId } = req.query as { botId?: string } as any;

  if (!botId) {
    return res.status(400).json({ error: 'Missing botId parameter' });
  }

  if (!supabase) {
    return res.status(500).json({ error: 'Database not initialized' });
  }

  try {
    // Không còn đồng bộ signals từ bot khác

    // Always return signals for requested botId
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

    // Trả về tối đa 200 signals mới nhất
    const allSignals = Array.isArray(bot.signals) ? bot.signals : [];
    const limitedSignals = allSignals.slice(0, 200);

    return res.status(200).json({
      success: true,
      signals: limitedSignals,
      count: limitedSignals.length,
      total: allSignals.length
    });
  } catch (error) {
    console.error('Error in signals API:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
