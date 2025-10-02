import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET(req: NextRequest) {
  try {
    if (!supabase) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '200');
    const since = searchParams.get('since');
    let query = supabase
      .from('api_calls')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (since) {
      query = query.gte('timestamp', since);
    }
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ success: true, items: data || [] });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


