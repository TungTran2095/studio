import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';
import { recordBinanceCall } from '@/lib/monitor/server-rate-tracker';

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
    const startTime = Date.now();
    const baseUrl = isTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com';
    const endpoint = `${baseUrl}/api/v3/account`;
    
    try {
      const accountInfo = await client.accountInfo();
      
      // Track this API call
      const duration = Date.now() - startTime;
      recordBinanceCall(endpoint, 'GET', {
        'x-mbx-used-weight-1m': '10',
        'response-time': String(duration)
      });
    
    // Tìm số dư USDT và BTC
    const usdtBalance = accountInfo.balances.find((balance: any) => balance.asset === 'USDT');
    const btcBalance = accountInfo.balances.find((balance: any) => balance.asset === 'BTC');
    
    const usdtAmount = usdtBalance ? parseFloat(usdtBalance.free) : 0;
    const btcAmount = btcBalance ? parseFloat(btcBalance.free) : 0;

    // Không log gì cả - âm thầm check balance
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
    } catch (accountError: any) {
      // Track failed API call
      const duration = Date.now() - startTime;
      recordBinanceCall(endpoint, 'GET', {
        'x-mbx-used-weight-1m': '10',
        'response-time': String(duration),
        'error': 'true'
      });
      throw accountError;
    }
  } catch (error: any) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch balance',
      details: error.message 
    }, { status: 500 });
  }
} 