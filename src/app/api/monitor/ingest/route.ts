import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items = Array.isArray(body) ? body : [body];
    if (!supabase) return NextResponse.json({ error: 'DB not ready' }, { status: 503 });
    const payload = items.map((i: any) => ({
      timestamp: new Date(i.timestamp || Date.now()).toISOString(),
      method: i.method,
      url: i.url,
      normalized_url: i.normalizedUrl || i.normalized_url,
      pathname: i.pathname,
      status: i.status,
      duration_ms: i.durationMs || i.duration_ms,
      response_size: i.responseSize || i.response_size,
      category: i.category,
      service: i.service,
      endpoint_name: i.endpointName || i.endpoint_name,
      used_weight_1m: i.usedWeight1m || i.used_weight_1m,
      order_count_10s: i.orderCount10s || i.order_count_10s,
      order_count_1m: i.orderCount1m || i.order_count_1m,
      source: i.source || 'server'
    }));
    const { error } = await supabase.from('api_calls').insert(payload);
    if (error) throw error;
    return NextResponse.json({ success: true, inserted: payload.length });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


