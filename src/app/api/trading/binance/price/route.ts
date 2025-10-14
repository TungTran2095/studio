import { NextRequest, NextResponse } from 'next/server';
import { priceApiThrottle } from '@/lib/simple-api-throttle';

// Simple in-memory cache to reduce duplicate upstream calls
const priceCache = new Map<string, { value: any; ts: number }>();
const PRICE_TTL_MS = 2000; // 2s to smooth bursts

export async function POST(req: NextRequest) {
  try {
    const { symbol, apiKey, apiSecret, isTestnet } = await req.json();

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 });
    }

    // Apply simple throttling to prevent spam
    await priceApiThrottle.throttle();

    // Cache first
    const cacheKey = `${symbol}:${isTestnet ? 'test' : 'real'}`;
    const now = Date.now();
    const cached = priceCache.get(cacheKey);
    if (cached && now - cached.ts < PRICE_TTL_MS) {
      return NextResponse.json({ 
        price: cached.value.price,
        symbol: cached.value.symbol,
        timestamp: cached.value.timestamp,
        fromCache: true
      });
    }

    // Chọn endpoint phù hợp
    const baseUrl = isTestnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';

    // Gọi Binance API lấy giá hiện tại
    const url = `${baseUrl}/api/v3/ticker/price?symbol=${symbol}`;
    console.log(`[Price API] Fetching price for ${symbol} from: ${url}`);
    
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey || '', // Nếu cần
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      console.error(`[Price API] Error fetching price for ${symbol}:`, error);
      return NextResponse.json({ 
        error: error.msg || 'Không thể lấy giá hiện tại',
        details: error
      }, { status: 400 });
    }

    const data = await res.json();
    // Save cache
    priceCache.set(cacheKey, { value: { price: data.price, symbol: data.symbol, timestamp: Date.now() }, ts: Date.now() });
    console.log(`[Price API] Successfully fetched price for ${symbol}:`, data.price);
    
    return NextResponse.json({ 
      price: data.price,
      symbol: data.symbol,
      timestamp: Date.now(),
      fromCache: false
    });
  } catch (err) {
    console.error(`[Price API] Unexpected error:`, err);
    return NextResponse.json({ 
      error: 'Lỗi server hoặc dữ liệu không hợp lệ',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 