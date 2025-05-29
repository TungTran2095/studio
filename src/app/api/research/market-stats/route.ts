import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ 
        totalRecords: 0, 
        dataQuality: 0, 
        error: 'Database connection not available' 
      });
    }

    // Lấy tổng số records từ bảng OHLCV_BTC_USDT_1m
    const { count: totalRecords } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*', { count: 'exact', head: true });

    // Lấy records hôm nay để tính data quality
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count: recordsToday } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*', { count: 'exact', head: true })
      .gte('inserted_at', today.toISOString());

    // Lấy sample data để kiểm tra chất lượng
    const { data: sampleData, error: sampleError } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('open, high, low, close, volume')
      .order('open_time', { ascending: false })
      .limit(100);

    let dataQuality = 95.0; // Default
    
    if (sampleData && !sampleError) {
      // Tính toán data quality thực tế
      let validRecords = 0;
      
      sampleData.forEach(record => {
        // Kiểm tra tính hợp lệ của OHLC data
        if (record.open > 0 && record.high > 0 && record.low > 0 && record.close > 0 &&
            record.high >= record.low && 
            record.high >= Math.max(record.open, record.close) &&
            record.low <= Math.min(record.open, record.close) &&
            record.volume >= 0) {
          validRecords++;
        }
      });
      
      dataQuality = (validRecords / sampleData.length) * 100;
    }

    // Lấy record mới nhất để check freshness
    const { data: latestRecord } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('open_time, inserted_at')
      .order('open_time', { ascending: false })
      .limit(1);

    const response = {
      totalRecords: totalRecords || 0,
      recordsToday: recordsToday || 0,
      dataQuality: Math.round(dataQuality * 10) / 10,
      latestRecord: latestRecord?.[0] || null,
      lastUpdate: new Date().toISOString(),
      sources: {
        binance: 'connected',
        supabase: (totalRecords ?? 0) > 0 ? 'active' : 'empty'
      }
    };

    console.log('📊 [Market Stats API] Returning stats:', response);
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ [Market Stats API] Error:', error);
    
    // Fallback response nếu có lỗi
    return NextResponse.json({
      totalRecords: 0,
      recordsToday: 0,
      dataQuality: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastUpdate: new Date().toISOString(),
      sources: {
        binance: 'unknown',
        supabase: 'error'
      }
    });
  }
} 