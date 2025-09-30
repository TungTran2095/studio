import { NextRequest, NextResponse } from 'next/server';
import { BinanceService } from '@/lib/trading/binance-service';

export async function POST(req: NextRequest) {
  try {
    let { symbol, interval, limit, apiKey, apiSecret, testnet } = await req.json();
    if (!symbol) symbol = 'BTCUSDT';
    if (!interval) interval = '1m';
    if (!symbol || !interval) {
      return NextResponse.json({ error: 'Thiếu symbol hoặc interval' }, { status: 400 });
    }

    // Sử dụng BinanceService với timestamp sync
    const binanceService = new BinanceService(apiKey, apiSecret, testnet);
    
    try {
      const candles = await binanceService.getCandles(symbol, interval, limit || 100);
      
      // Format lại dữ liệu để tương thích với bot executor
      const formattedCandles = candles.map(candle => [
        candle.openTime,
        candle.open,
        candle.high,
        candle.low,
        candle.close,
        candle.volume,
        candle.closeTime
      ]);
      
      return NextResponse.json({ candles: formattedCandles });
    } catch (binanceError: any) {
      console.error('BinanceService error:', binanceError);
      
      // Fallback: sử dụng fetch trực tiếp nếu BinanceService lỗi
      console.log('Falling back to direct fetch...');
      
      const baseUrl = testnet
        ? 'https://testnet.binance.vision'
        : 'https://api.binance.com';

      const url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=${limit || 100}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'X-MBX-APIKEY': apiKey || '',
        },
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        return NextResponse.json({ error: error.msg || 'Không lấy được dữ liệu nến' }, { status: 400 });
      }

      const data = await res.json();
      return NextResponse.json({ candles: data });
    }
    
  } catch (err) {
    console.error('Candles API error:', err);
    return NextResponse.json({ error: 'Lỗi server hoặc dữ liệu không hợp lệ' }, { status: 500 });
  }
} 