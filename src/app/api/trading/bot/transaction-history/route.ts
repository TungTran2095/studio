import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 [Transaction History API] Starting request');
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      console.error('❌ [Transaction History API] Bot ID is required');
      return NextResponse.json({ error: 'Bot ID is required' }, { status: 400 });
    }

    console.log('🔍 [Transaction History API] Fetching bot with ID:', botId);
    
    // Lấy thông tin bot từ database
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      console.error('❌ [Transaction History API] Bot not found:', botError);
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    console.log('🔍 [Transaction History API] Bot found:', bot.name);

    // Lấy thông tin API từ bot config
    const config = bot.config || {};
    const account = config.account || {};
    const apiKey = account.apiKey;
    const apiSecret = account.apiSecret;
    const testnet = account.testnet || false;

    console.log('🔍 [Transaction History API] Config:', { 
      hasApiKey: !!apiKey, 
      hasApiSecret: !!apiSecret, 
      testnet 
    });

    if (!apiKey || !apiSecret) {
      console.error('❌ [Transaction History API] API credentials not found');
      return NextResponse.json({ error: 'API credentials not found' }, { status: 400 });
    }

    // Tạo base URL cho Binance API
    const baseUrl = testnet 
      ? 'https://testnet.binance.vision/api/v3'
      : 'https://api.binance.com/api/v3';

    // Lấy lịch sử giao dịch từ Binance
    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}`;
    
    // Tạo signature
    const signature = crypto
      .createHmac('sha256', apiSecret)
      .update(queryString)
      .digest('hex');

    const url = `${baseUrl}/myTrades?${queryString}&signature=${signature}`;
    
    console.log('🔍 [Transaction History API] Calling Binance API:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey,
        'Content-Type': 'application/json',
      },
    });

    console.log('🔍 [Transaction History API] Binance response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Transaction History API] Binance API error:', response.status, errorText);
      return NextResponse.json({ 
        error: 'Failed to fetch transaction history from Binance',
        details: errorText,
        status: response.status
      }, { status: response.status });
    }

    const transactions = await response.json();
    console.log('🔍 [Transaction History API] Raw transactions count:', transactions.length);

    // Lọc và format dữ liệu
    const formattedTransactions = transactions
      .filter((tx: any) => tx.symbol && tx.symbol.includes('USDT')) // Chỉ lấy giao dịch USDT
      .map((tx: any) => ({
        id: tx.id,
        symbol: tx.symbol,
        orderId: tx.orderId,
        side: tx.isBuyer ? 'BUY' : 'SELL',
        type: 'SPOT',
        quantity: tx.qty,
        origQty: tx.qty,
        price: tx.price,
        cummulativeQuoteQty: tx.quoteQty,
        commission: tx.commission,
        commissionAsset: tx.commissionAsset,
        status: 'FILLED',
        time: tx.time,
        timestamp: tx.time,
        isBuyer: tx.isBuyer,
        isMaker: tx.isMaker,
        isBestMatch: tx.isBestMatch
      }))
      .sort((a: any, b: any) => b.time - a.time) // Sắp xếp theo thời gian mới nhất
      .slice(0, 100); // Giới hạn 100 giao dịch gần nhất

    console.log('🔍 [Transaction History API] Formatted transactions count:', formattedTransactions.length);

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      total: formattedTransactions.length
    });

  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
