import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';

export async function PATCH(req: NextRequest) {
  try {
    const { apiKey, apiSecret, testnet, isTestnet } = await req.json();
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Thiếu API Key hoặc Secret' }, { status: 400 });
    }

    // Sử dụng cả testnet và isTestnet để tương thích
    const useTestnet = testnet || isTestnet || false;

    // Tạo client Binance
    const client = Binance({
      apiKey,
      apiSecret,
      httpBase: useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com'
    });

    // Lấy thông tin tài khoản từ Binance
    const accountInfo = await client.accountInfo();
    
    // Trả về thông tin tài khoản đầy đủ
    return NextResponse.json(accountInfo);
  } catch (err) {
    console.error('Error fetching account info:', err);
    return NextResponse.json({ 
      error: 'Lỗi khi lấy thông tin tài khoản từ Binance',
      details: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
} 