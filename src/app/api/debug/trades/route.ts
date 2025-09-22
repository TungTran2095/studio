import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(request: Request) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    // Lấy tất cả trades
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .order('open_time', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: 'Error fetching trades', details: error }, { status: 500 });
    }

    return NextResponse.json({
      trades: trades || [],
      count: trades?.length || 0,
      sample: trades?.slice(0, 3) || []
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 });
  }
}

