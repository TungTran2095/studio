import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, isTestnet } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing API credentials' }, { status: 400 });
    }

    const client = Binance({
      apiKey,
      apiSecret,
      ...(isTestnet && { httpBase: 'https://testnet.binance.vision' })
    });

    // Lấy thông tin tài khoản
    const accountInfo = await client.accountInfo();
    
    // Tìm số dư USDT
    const usdtBalance = accountInfo.balances.find((balance: any) => balance.asset === 'USDT');
    const usdtAmount = usdtBalance ? parseFloat(usdtBalance.free) : 0;

    return NextResponse.json({
      USDT: usdtAmount,
      balances: accountInfo.balances
    });
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch balance',
      details: error.message 
    }, { status: 500 });
  }
} 