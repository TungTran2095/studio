import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';
import { accountApiThrottle } from '@/lib/simple-api-throttle';
import { TimeSync } from '@/lib/time-sync';

export async function POST(req: NextRequest) {
  try {
    const { apiKey, apiSecret, isTestnet } = await req.json();

    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Missing API credentials' }, { status: 400 });
    }

    // Apply simple throttling to prevent spam
    await accountApiThrottle.throttle();

    // Sync server time to avoid -1021 timestamp errors
    try {
      await TimeSync.syncWithServer();
    } catch (e) {
      console.warn('[Binance Balance API] Time sync failed, continue with local time');
    }

    const client = Binance({
      apiKey,
      apiSecret,
      ...(isTestnet && { httpBase: 'https://testnet.binance.vision' }),
      // Provide getTime to ensure timestamp within recvWindow
      getTime: () => {
        const now = Date.now();
        // subtract 1000ms as safety margin
        return now - 1000;
      }
    });

    // Lấy thông tin tài khoản với retry (đã đồng bộ thời gian qua TimeSync và getTime)
    let lastError: any;
    let accountInfo: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        accountInfo = await client.accountInfo();
        break;
      } catch (err: any) {
        lastError = err;
        const msg = err?.message || '';
        const code = err?.code;
        const isTimeError = code === -1021 || msg.includes('Timestamp for this request') || msg.includes('recvWindow') || msg.includes('outside of the recvWindow');
        console.warn(`[Binance Balance API] accountInfo failed (attempt ${attempt}/3):`, { code, msg });
        if (isTimeError && attempt < 3) {
          try { await TimeSync.syncWithServer(); } catch {}
          await new Promise(r => setTimeout(r, 500 * attempt));
          continue;
        }
        // For auth errors like -2015, surface details
        throw err;
      }
    }
    if (!accountInfo) {
      // enrich error logging
      console.error('[Binance Balance API] Unable to fetch accountInfo after retries', {
        error: lastError?.message,
        code: lastError?.code,
      });
      return NextResponse.json({ error: 'Failed to fetch account info', code: lastError?.code, details: lastError?.message }, { status: 502 });
    }
    
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
    // Try to extract body if available
    const details = error?.response?.data || error?.body || error?.message;
    const status = error?.statusCode || error?.status || 500;
    console.error('[Binance Balance API] Error:', { status, details });
    return NextResponse.json({ 
      error: 'Failed to fetch balance',
      details,
      code: error?.code
    }, { status });
  }
}