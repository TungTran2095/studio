import { NextRequest, NextResponse } from 'next/server';
import { enhancedRealDataService } from '@/lib/market-data/enhanced-real-data-service';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    switch (action) {
      case 'realtime_data':
        console.log('🚀 [API] Getting enhanced real-time data...');
        const realTimeData = await enhancedRealDataService.getEnhancedRealTimeData();
        return NextResponse.json({
          success: true,
          data: realTimeData,
          timestamp: new Date().toISOString(),
          source: 'enhanced_service'
        });

      case 'collection_stats':
        console.log('📊 [API] Getting enhanced collection stats...');
        const stats = await enhancedRealDataService.getEnhancedCollectionStats();
        return NextResponse.json({
          success: true,
          data: stats,
          timestamp: new Date().toISOString()
        });

      case 'connections_check':
        console.log('🔍 [API] Checking enhanced connections...');
        const connections = await enhancedRealDataService.checkEnhancedConnections();
        return NextResponse.json({
          success: true,
          data: connections,
          timestamp: new Date().toISOString()
        });

      case 'specific_crypto':
        const symbol = searchParams.get('symbol');
        if (!symbol) {
          return NextResponse.json({
            success: false,
            error: 'Symbol parameter is required'
          }, { status: 400 });
        }

        console.log(`🎯 [API] Getting specific crypto data for ${symbol}...`);
        const cryptoData = await enhancedRealDataService.getSpecificCryptoData(symbol);
        return NextResponse.json({
          success: true,
          data: cryptoData,
          timestamp: new Date().toISOString()
        });

      case 'cache_status':
        const cacheStatus = enhancedRealDataService.getCacheStatus();
        return NextResponse.json({
          success: true,
          data: cacheStatus,
          timestamp: new Date().toISOString()
        });

      case 'clear_cache':
        enhancedRealDataService.clearCache();
        return NextResponse.json({
          success: true,
          message: 'Cache cleared successfully',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action. Available actions: realtime_data, collection_stats, connections_check, specific_crypto, cache_status, clear_cache'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [API] Enhanced market data error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, symbol } = body;

    switch (action) {
      case 'refresh_data':
        console.log('🔄 [API] Refreshing enhanced data...');
        // Clear cache trước khi lấy dữ liệu mới
        enhancedRealDataService.clearCache();
        const freshData = await enhancedRealDataService.getEnhancedRealTimeData();
        return NextResponse.json({
          success: true,
          data: freshData,
          message: 'Data refreshed successfully',
          timestamp: new Date().toISOString()
        });

      case 'force_binance':
        console.log('🎯 [API] Forcing Binance data fetch...');
        // Lấy dữ liệu trực tiếp từ Binance cho symbol cụ thể
        if (!symbol) {
          return NextResponse.json({
            success: false,
            error: 'Symbol is required for force_binance action'
          }, { status: 400 });
        }

        const binanceData = await enhancedRealDataService.getSpecificCryptoData(symbol);
        return NextResponse.json({
          success: true,
          data: binanceData,
          source: 'forced_binance',
          timestamp: new Date().toISOString()
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid POST action. Available actions: refresh_data, force_binance'
        }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ [API] Enhanced market data POST error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 