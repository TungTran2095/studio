import { NextResponse } from 'next/server';
import { TimeSync } from '@/lib/time-sync';
import { botManager } from '@/lib/trading/bot-manager';

/**
 * API endpoint để force sync timestamp và restart tất cả bots
 * POST /api/timestamp-monitor/force-sync
 */

export async function POST() {
  try {
    console.log('[Force Sync] Bắt đầu force sync timestamp...');
    
    // Force sync timestamp với Binance
    await TimeSync.syncWithServer();
    
    // Lấy thông tin sau khi sync
    const localTime = Date.now();
    const newOffset = TimeSync.getOffset();
    const isSynchronized = TimeSync.isSynchronized;
    
    let serverTime: number | null = null;
    try {
      serverTime = await TimeSync.getActualServerTime();
    } catch (error) {
      console.error('[Force Sync] Error getting server time after sync:', error);
    }
    
    console.log('[Force Sync] ✅ Timestamp sync completed');
    console.log(`[Force Sync] New offset: ${newOffset}ms`);
    console.log(`[Force Sync] Is synchronized: ${isSynchronized}`);
    
    // Restart tất cả bots đang chạy
    console.log('[Force Sync] Đang restart tất cả bots...');
    
    // Lấy danh sách bots đang chạy
    const runningBots = botManager.getRunningBots();
    console.log(`[Force Sync] Found ${runningBots.length} running bots`);
    
    const restartResults = [];
    
    for (const botId of runningBots) {
      try {
        console.log(`[Force Sync] Restarting bot ${botId}...`);
        
        // Stop bot trước
        await botManager.stopBot(botId);
        
        // Đợi một chút
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Lấy thông tin bot và restart
        const { supabase } = await import('@/lib/supabase-client');
        const { data: bot } = await supabase
          .from('trading_bots')
          .select('*')
          .eq('id', botId)
          .single();
        
        if (bot) {
          const success = await botManager.startBot(bot);
          restartResults.push({
            botId,
            success,
            message: success ? 'Restarted successfully' : 'Failed to restart'
          });
          
          if (success) {
            console.log(`[Force Sync] ✅ Bot ${botId} restarted successfully`);
          } else {
            console.log(`[Force Sync] ❌ Bot ${botId} failed to restart`);
          }
        } else {
          restartResults.push({
            botId,
            success: false,
            message: 'Bot not found in database'
          });
        }
        
        // Đợi giữa các bot để tránh overload
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.error(`[Force Sync] Error restarting bot ${botId}:`, error);
        restartResults.push({
          botId,
          success: false,
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Force sync và restart bots completed',
      timestamp: localTime,
      newOffset,
      isSynchronized,
      serverTime,
      serverTimeFormatted: serverTime ? new Date(serverTime).toISOString() : null,
      restartResults,
      summary: {
        totalBots: runningBots.length,
        successfulRestarts: restartResults.filter(r => r.success).length,
        failedRestarts: restartResults.filter(r => !r.success).length
      }
    });
    
  } catch (error) {
    console.error('[Force Sync] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

