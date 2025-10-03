import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

interface EmergencyModeStatus {
  enabled: boolean;
  timestamp: string;
  reason: string;
  autoResetTime: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    // Check emergency mode status
    try {
      const emergencyPath = path.join(process.cwd(), 'emergency-mode.json');
      
      if (!fs.existsSync(emergencyPath)) {
        return res.status(200).json({
          success: true,
          data: {
            enabled: false,
            timestamp: new Date().toISOString(),
            reason: 'No emergency mode active',
            autoResetTime: new Date().toISOString()
          }
        });
      }

      const emergencyData = JSON.parse(fs.readFileSync(emergencyPath, 'utf8'));
      
      // Check if emergency mode should auto-reset
      const now = new Date();
      const resetTime = new Date(emergencyData.autoResetTime);
      
      if (now >= resetTime && emergencyData.enabled) {
        // Auto-reset emergency mode
        emergencyData.enabled = false;
        emergencyData.timestamp = now.toISOString();
        emergencyData.reason = 'Auto-reset after timeout';
        
        fs.writeFileSync(emergencyPath, JSON.stringify(emergencyData, null, 2));
        
        console.log('[EmergencyMode] 🔄 Auto-reset emergency mode');
      }

      return res.status(200).json({
        success: true,
        data: emergencyData
      });
    } catch (error) {
      console.error('[EmergencyMode] Error checking status:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to check emergency mode status'
      });
    }
  }

  if (req.method === 'POST') {
    // Reset emergency mode
    try {
      const emergencyPath = path.join(process.cwd(), 'emergency-mode.json');
      
      const resetData: EmergencyModeStatus = {
        enabled: false,
        timestamp: new Date().toISOString(),
        reason: 'Manually reset',
        autoResetTime: new Date().toISOString()
      };

      fs.writeFileSync(emergencyPath, JSON.stringify(resetData, null, 2));
      
      console.log('[EmergencyMode] 🔄 Emergency mode manually reset');
      
      return res.status(200).json({
        success: true,
        message: 'Emergency mode reset successfully',
        data: resetData
      });
    } catch (error) {
      console.error('[EmergencyMode] Error resetting:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to reset emergency mode'
      });
    }
  }

  return res.status(405).json({
    success: false,
    error: 'Method not allowed'
  });
}
