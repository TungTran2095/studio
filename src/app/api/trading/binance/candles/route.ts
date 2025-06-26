import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    let { symbol, interval, limit, apiKey, apiSecret, testnet } = await req.json();
    if (!symbol) symbol = 'BTCUSDT';
    if (!interval) interval = '1m';
    if (!symbol || !interval) {
      return NextResponse.json({ error: 'Thiếu symbol hoặc interval' }, { status: 400 });
    }

    // Chọn endpoint phù hợp
    const baseUrl = testnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';

    // Gọi Binance API lấy dữ liệu nến
    const url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey || '', // Nếu cần
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      return NextResponse.json({ error: error.msg || 'Không lấy được dữ liệu nến' }, { status: 400 });
    }

    const data = await res.json();
    // Format lại dữ liệu nếu cần
    return NextResponse.json({ candles: data });
  } catch (err) {
    return NextResponse.json({ error: 'Lỗi server hoặc dữ liệu không hợp lệ' }, { status: 500 });
  }
} 