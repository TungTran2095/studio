import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('📊 [OHLCV API] Fetching data from OHLCV_BTC_USDT_1m...');
    
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '1000');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const order = searchParams.get('order') || 'open_time.desc';

    let query = supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*')
      .order('open_time', { ascending: order.includes('asc') })
      .limit(limit);

    if (startDate) {
      query = query.gte('open_time', startDate);
    }
    
    if (endDate) {
      query = query.lte('open_time', endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ [OHLCV API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch OHLCV data', details: error.message },
        { status: 500 }
      );
    }

    // Normalize column names to ensure consistency with frontend
    const normalizedData = data?.map(row => ({
      ...row,
      // Ensure _price suffix columns exist
      open_price: row.open_price || row.open,
      high_price: row.high_price || row.high,
      low_price: row.low_price || row.low,
      close_price: row.close_price || row.close,
      // Keep original columns as well for backward compatibility
      open: row.open || row.open_price,
      high: row.high || row.high_price,
      low: row.low || row.low_price,
      close: row.close || row.close_price
    })) || [];

    // Get data stats
    const stats = {
      total_records: normalizedData.length,
      date_range: {
        start: normalizedData.length > 0 ? normalizedData[normalizedData.length - 1]?.open_time : null,
        end: normalizedData.length > 0 ? normalizedData[0]?.open_time : null
      },
      columns: ['open_time', 'open_price', 'high_price', 'low_price', 'close_price', 'volume']
    };

    console.log(`✅ [OHLCV API] Retrieved ${normalizedData.length} OHLCV records`);
    return NextResponse.json({ 
      data: normalizedData,
      stats,
      count: count || normalizedData.length
    });

  } catch (error) {
    console.error('❌ [OHLCV API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 