import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

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
