import { NextRequest, NextResponse } from 'next/server';
import { TimeSync } from '@/lib/time-sync';
import { botManager } from '@/lib/trading/bot-manager';
import { supabase } from '@/lib/supabase-client';

/**
 * API endpoint để restart bot cụ thể với timestamp sync mới
 * POST /api/timestamp-monitor/restart-bot
 */

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, botName } = body;
    
    if (!botId && !botName) {
      return NextResponse.json({
        success: false,
        error: 'Cần cung cấp botId hoặc botName'
      }, { status: 400 });
    }
    
    console.log(`[Restart Bot] Bắt đầu restart bot: ${botName || botId}...`);
    
    // Force sync timestamp trước
    console.log('[Restart Bot] Force syncing timestamp...');
    await TimeSync.syncWithServer();
    
    // Lấy thông tin timestamp sau sync
    const localTime = Date.now();
    const newOffset = TimeSync.getOffset();
    const isSynchronized = TimeSync.isSynchronized;
    
    let serverTime: number | null = null;
    try {
      serverTime = await TimeSync.getActualServerTime();
    } catch (error) {
      console.error('[Restart Bot] Error getting server time:', error);
    }
    
    console.log(`[Restart Bot] ✅ Timestamp sync completed`);
    console.log(`[Restart Bot] New offset: ${newOffset}ms`);
    console.log(`[Restart Bot] Is synchronized: ${isSynchronized}`);
    
    // Tìm bot theo ID hoặc tên
    let targetBotId = botId;
    
    if (!targetBotId && botName) {
      console.log(`[Restart Bot] Tìm bot theo tên: ${botName}`);
      const { data: bots, error: searchError } = await supabase
        .from('trading_bots')
        .select('id, name')
        .ilike('name', `%${botName}%`);
      
      if (searchError) {
        throw new Error(`Lỗi tìm bot: ${searchError.message}`);
      }
      
      if (!bots || bots.length === 0) {
        return NextResponse.json({
          success: false,
          error: `Không tìm thấy bot với tên: ${botName}`
        }, { status: 404 });
      }
      
      if (bots.length > 1) {
        return NextResponse.json({
          success: false,
          error: `Tìm thấy ${bots.length} bots với tên tương tự: ${bots.map((b: any) => b.name).join(', ')}`,
          suggestions: bots.map((b: any) => ({ id: b.id, name: b.name }))
        }, { status: 400 });
      }
      
      targetBotId = bots[0].id;
      console.log(`[Restart Bot] Tìm thấy bot: ${bots[0].name} (${targetBotId})`);
    }
    
    // Lấy thông tin bot đầy đủ
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', targetBotId)
      .single();
    
    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: `Không tìm thấy bot với ID: ${targetBotId}`
      }, { status: 404 });
    }
    
    console.log(`[Restart Bot] Bot info: ${bot.name} (${bot.id})`);
    console.log(`[Restart Bot] Current status: ${bot.status}`);
    
    // Stop bot nếu đang chạy
    if (bot.status === 'running') {
      console.log(`[Restart Bot] Stopping bot ${bot.name}...`);
      const stopSuccess = await botManager.stopBot(targetBotId);
      
      if (!stopSuccess) {
        console.log(`[Restart Bot] ⚠️ Không thể stop bot ${bot.name}, nhưng vẫn tiếp tục restart`);
      } else {
        console.log(`[Restart Bot] ✅ Bot ${bot.name} đã được stop`);
      }
      
      // Đợi một chút để đảm bảo bot đã stop hoàn toàn
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Start bot với cấu hình mới
    console.log(`[Restart Bot] Starting bot ${bot.name} với timestamp sync mới...`);
    const startSuccess = await botManager.startBot(bot);
    
    if (!startSuccess) {
      return NextResponse.json({
        success: false,
        error: `Không thể start bot ${bot.name}`,
        timestamp: localTime,
        newOffset,
        isSynchronized,
        serverTime,
        serverTimeFormatted: serverTime ? new Date(serverTime).toISOString() : null
      }, { status: 500 });
    }
    
    console.log(`[Restart Bot] ✅ Bot ${bot.name} đã được restart thành công`);
    
    return NextResponse.json({
      success: true,
      message: `Bot ${bot.name} đã được restart thành công với timestamp sync mới`,
      bot: {
        id: bot.id,
        name: bot.name,
        status: 'running'
      },
      timestamp: localTime,
      newOffset,
      isSynchronized,
      serverTime,
      serverTimeFormatted: serverTime ? new Date(serverTime).toISOString() : null
    });
    
  } catch (error) {
    console.error('[Restart Bot] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

