import { NextRequest, NextResponse } from 'next/server';
import Binance from 'binance-api-node';
import { TimeSync } from '@/lib/time-sync';

export async function PATCH(req: NextRequest) {
  try {
    const { apiKey, apiSecret, testnet, isTestnet } = await req.json();
    
    if (!apiKey || !apiSecret) {
      return NextResponse.json({ error: 'Thiếu API Key hoặc Secret' }, { status: 400 });
    }

    // Sử dụng cả testnet và isTestnet để tương thích
    const useTestnet = testnet || isTestnet || false;

    // Đồng bộ timestamp trước khi khởi tạo client
    await TimeSync.syncWithServer();

    // Tạo client Binance với timestamp sync
    const client = Binance({
      apiKey,
      apiSecret,
      httpBase: useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
      recvWindow: 120000, // Tăng lên 120 giây
      timeout: 30000,
      // Sử dụng custom getTime function để đảm bảo timestamp chính xác
      getTime: () => {
        const now = Date.now();
        const safeTime = now - 1000; // Trừ 1 giây để đảm bảo an toàn
        console.log(`[Account API] Generating timestamp: ${safeTime} (${new Date(safeTime).toISOString()})`);
        return safeTime;
      }
    });

    // Lấy thông tin tài khoản từ Binance với retry logic
    let accountInfo;
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        accountInfo = await client.accountInfo();
        break;
      } catch (error: any) {
        attempts++;
        
        if ((error.message && (
          error.message.includes('Timestamp for this request') ||
          error.message.includes('recvWindow') ||
          error.message.includes('outside of the recvWindow')
        ) || error.code === -1021) && attempts < maxAttempts) {
          console.log(`[Account API] Lỗi timestamp (attempt ${attempts}/${maxAttempts}), đang sync lại...`);
          await TimeSync.syncWithServer();
          
          // Tạo lại client với cấu hình mới
          const newClient = Binance({
            apiKey,
            apiSecret,
            httpBase: useTestnet ? 'https://testnet.binance.vision' : 'https://api.binance.com',
            recvWindow: 120000,
            timeout: 30000,
            // Sử dụng custom getTime function để đảm bảo timestamp chính xác
            getTime: () => {
              const now = Date.now();
              const safeTime = now - 1000; // Trừ 1 giây để đảm bảo an toàn
              console.log(`[Account API] Regenerating timestamp: ${safeTime} (${new Date(safeTime).toISOString()})`);
              return safeTime;
            }
          });
          
          // Thay thế client cũ
          Object.assign(client, newClient);
          
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        
        throw error;
      }
    }
    
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