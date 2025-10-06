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
    
    // Tìm số dư USDT và BTC
    const usdtBalance = accountInfo.balances.find((balance: any) => balance.asset === 'USDT');
    const btcBalance = accountInfo.balances.find((balance: any) => balance.asset === 'BTC');
    
    const usdtAmount = usdtBalance ? parseFloat(usdtBalance.free) : 0;
    const btcAmount = btcBalance ? parseFloat(btcBalance.free) : 0;

    // Lấy các balance khác 0
    const nonZeroBalances = accountInfo.balances
      .filter((balance: any) => parseFloat(balance.free) > 0)
      .map((balance: any) => ({
        asset: balance.asset,
        free: parseFloat(balance.free),
        locked: parseFloat(balance.locked)
      }));

    return NextResponse.json({
      USDT: usdtAmount,
      BTC: btcAmount,
      balances: accountInfo.balances,
      nonZeroBalances: nonZeroBalances
    });
    
  } catch (error: any) {
    console.error('[Binance Balance API] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch balance' 
    }, { status: 500 });
  }
}