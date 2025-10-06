import { NextApiRequest, NextApiResponse } from 'next';
import { binanceAPIUsageManager } from '@/lib/monitor/binance-api-usage-manager';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const usageStats = binanceAPIUsageManager.getUsageStats();
    
    res.status(200).json({
      success: true,
      data: usageStats,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching API usage stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch API usage statistics' 
    });
  }
}
