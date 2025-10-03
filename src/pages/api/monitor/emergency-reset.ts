import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed'
    });
  }

  try {
    // Call the emergency-status endpoint to reset
    const response = await fetch(`${req.headers.host?.includes('localhost') ? 'http' : 'https'}://${req.headers.host}/api/monitor/emergency-status`, {
      method: 'POST'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    return res.status(200).json({
      success: true,
      message: 'Emergency mode reset successfully',
      data: result.data
    });
  } catch (error) {
    console.error('[EmergencyMode] Error resetting:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to reset emergency mode'
    });
  }
}
