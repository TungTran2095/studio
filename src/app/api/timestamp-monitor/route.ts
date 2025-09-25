import { NextResponse } from 'next/server';
import { TimeSync } from '@/lib/time-sync';

/**
 * API endpoint để monitor và debug timestamp synchronization với Binance
 * GET /api/timestamp-monitor - Lấy thông tin timestamp hiện tại
 * POST /api/timestamp-monitor - Force sync timestamp với Binance server
 */

export async function GET() {
  try {
    // Lấy thông tin timestamp hiện tại
    const localTime = Date.now();
    const currentOffset = TimeSync.getOffset();
    const isSynchronized = TimeSync.isSynchronized;
    
    // Thử lấy thời gian server để so sánh
    let serverTime: number | null = null;
    let serverTimeError: string | null = null;
    
    try {
      serverTime = await TimeSync.getActualServerTime();
    } catch (error) {
      serverTimeError = error instanceof Error ? error.message : 'Unknown error';
    }
    
    // Tính toán các timestamp khác nhau
    const adjustedTimestamp = localTime + currentOffset;
    const safeTimestamp = TimeSync.getSafeTimestamp();
    const tradingTimestamp = TimeSync.getSafeTimestampForTrading();
    
    // Lấy thống kê sync
    const syncStats = TimeSync.getSyncStats();
    const syncHistory = TimeSync.getSyncHistory();

    const timestampInfo = {
      local: {
        timestamp: localTime,
        formatted: new Date(localTime).toISOString(),
        description: 'Thời gian local của hệ thống'
      },
      server: {
        timestamp: serverTime,
        formatted: serverTime ? new Date(serverTime).toISOString() : null,
        error: serverTimeError,
        description: 'Thời gian server Binance'
      },
      offset: {
        value: currentOffset,
        description: 'Hiệu số thời gian (server - local - margin)'
      },
      adjusted: {
        timestamp: adjustedTimestamp,
        formatted: new Date(adjustedTimestamp).toISOString(),
        description: 'Thời gian đã điều chỉnh theo offset'
      },
      safe: {
        timestamp: safeTimestamp,
        formatted: new Date(safeTimestamp).toISOString(),
        description: 'Timestamp an toàn cho API calls thông thường'
      },
      trading: {
        timestamp: tradingTimestamp,
        formatted: new Date(tradingTimestamp).toISOString(),
        description: 'Timestamp cực kỳ an toàn cho trading'
      },
      sync: {
        isSynchronized,
        description: 'Trạng thái đồng bộ với server'
      },
      differences: serverTime ? {
        localVsServer: localTime - serverTime,
        adjustedVsServer: adjustedTimestamp - serverTime,
        safeVsServer: safeTimestamp - serverTime,
        tradingVsServer: tradingTimestamp - serverTime,
        description: 'Chênh lệch thời gian so với server (ms)'
      } : null,
      statistics: syncStats,
      history: syncHistory.slice(0, 5) // Chỉ hiển thị 5 lần sync gần nhất
    };
    
    return NextResponse.json({
      success: true,
      timestamp: localTime,
      info: timestampInfo,
      recommendations: generateRecommendations(timestampInfo)
    });
    
  } catch (error) {
    console.error('[Timestamp Monitor] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action } = body;
    
    switch (action) {
      case 'sync':
        // Force sync với Binance server
        console.log('[Timestamp Monitor] Force syncing with Binance server...');
        await TimeSync.syncWithServer();
        
        // Lấy thông tin sau khi sync
        const localTime = Date.now();
        const newOffset = TimeSync.getOffset();
        const isSynchronized = TimeSync.isSynchronized;
        
        let serverTime: number | null = null;
        try {
          serverTime = await TimeSync.getActualServerTime();
        } catch (error) {
          console.error('[Timestamp Monitor] Error getting server time after sync:', error);
        }
        
        return NextResponse.json({
          success: true,
          action: 'sync',
          message: 'Đã force sync với Binance server',
          timestamp: localTime,
          newOffset,
          isSynchronized,
          serverTime,
          serverTimeFormatted: serverTime ? new Date(serverTime).toISOString() : null
        });
        
      case 'reset':
        // Reset offset về giá trị mặc định
        console.log('[Timestamp Monitor] Resetting timestamp offset...');
        TimeSync.setOffset(-20000); // Reset về giá trị mặc định
        
        return NextResponse.json({
          success: true,
          action: 'reset',
          message: 'Đã reset timestamp offset về giá trị mặc định',
          newOffset: -20000
        });
        
      case 'adjust':
        // Điều chỉnh offset thủ công
        const { adjustment } = body;
        if (typeof adjustment !== 'number') {
          return NextResponse.json({
            success: false,
            error: 'adjustment phải là một số'
          }, { status: 400 });
        }
        
        const oldOffset = TimeSync.getOffset();
        TimeSync.adjustOffset(adjustment);
        const newOffset = TimeSync.getOffset();
        
        return NextResponse.json({
          success: true,
          action: 'adjust',
          message: `Đã điều chỉnh offset từ ${oldOffset}ms thành ${newOffset}ms`,
          oldOffset,
          newOffset,
          adjustment
        });
        
      default:
        return NextResponse.json({
          success: false,
          error: 'Action không hợp lệ. Các action hỗ trợ: sync, reset, adjust'
        }, { status: 400 });
    }
    
  } catch (error) {
    console.error('[Timestamp Monitor] Error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function generateRecommendations(timestampInfo: any): string[] {
  const recommendations: string[] = [];
  
  if (!timestampInfo.server.timestamp) {
    recommendations.push('⚠️ Không thể kết nối với Binance server. Kiểm tra kết nối mạng.');
    return recommendations;
  }
  
  const localVsServer = timestampInfo.differences?.localVsServer || 0;
  const adjustedVsServer = timestampInfo.differences?.adjustedVsServer || 0;
  
  // Kiểm tra chênh lệch thời gian
  if (Math.abs(localVsServer) > 5000) {
    recommendations.push(`⚠️ Chênh lệch thời gian lớn: ${localVsServer}ms. Hệ thống ${localVsServer > 0 ? 'nhanh hơn' : 'chậm hơn'} server.`);
  }
  
  if (adjustedVsServer < -10000) {
    recommendations.push(`✅ Offset hiện tại an toàn: ${adjustedVsServer}ms (nhỏ hơn server)`);
  } else if (adjustedVsServer > 0) {
    recommendations.push(`❌ Offset nguy hiểm: ${adjustedVsServer}ms (lớn hơn server). Có thể gây lỗi timestamp.`);
  }
  
  if (!timestampInfo.sync.isSynchronized) {
    recommendations.push('⚠️ Chưa đồng bộ với server. Sử dụng POST /api/timestamp-monitor với action="sync" để đồng bộ.');
  }
  
  // Kiểm tra timestamp cho trading
  const tradingVsServer = timestampInfo.differences?.tradingVsServer || 0;
  if (tradingVsServer > -300000) {
    recommendations.push('⚠️ Trading timestamp có thể không đủ an toàn. Cần điều chỉnh offset.');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Timestamp synchronization đang hoạt động tốt.');
  }
  
  return recommendations;
}
