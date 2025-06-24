import { NextResponse } from 'next/server';
import Binance from 'binance-api-node';

// POST /api/trading/binance/candles - Lấy dữ liệu nến
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol, interval, limit, apiKey, apiSecret } = body;

    if (!symbol || !interval || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = Binance({
      apiKey,
      apiSecret,
      test: true // Sử dụng testnet
    });

    const candles = await client.candles({
      symbol,
      interval,
      limit: limit || 100
    });

    return NextResponse.json(candles);
  } catch (error) {
    console.error('Error fetching candles:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/trading/binance/order - Tạo lệnh giao dịch
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { symbol, side, type, quantity, apiKey, apiSecret } = body;

    if (!symbol || !side || !type || !quantity || !apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const client = Binance({
      apiKey,
      apiSecret,
      test: true
    });

    const order = await client.order({
      symbol,
      side,
      type,
      quantity: quantity.toString()
    });

    return NextResponse.json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/trading/binance/account - Lấy thông tin tài khoản
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { apiKey, apiSecret } = body;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing API credentials' }, { status: 400 });
    }

    const client = Binance({
      apiKey,
      apiSecret,
      test: true
    });

    const accountInfo = await client.accountInfo();
    return NextResponse.json(accountInfo);
  } catch (error) {
    console.error('Error fetching account info:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 