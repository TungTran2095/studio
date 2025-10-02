import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { BinanceService } from '@/lib/trading/binance-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const botId = searchParams.get('botId');

    if (!botId) {
      return NextResponse.json({
        success: false,
        error: 'Bot ID is required'
      }, { status: 400 });
    }

    // Lấy thông tin bot từ database
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .select('*')
      .eq('id', botId)
      .single();

    if (botError || !bot) {
      return NextResponse.json({
        success: false,
        error: 'Bot not found'
      }, { status: 404 });
    }

    // Parse config để lấy API key và secret
    const config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
    const apiKey = config?.account?.apiKey;
    const apiSecret = config?.account?.apiSecret;
    
    // Kiểm tra có API key và secret không
    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Bot chưa có API Key hoặc Secret trong config.account'
      }, { status: 400 });
    }

    try {
      // Tạo BinanceService instance để test
      const binanceService = new BinanceService(apiKey, apiSecret);
      
      // Test kết nối bằng cách lấy thông tin tài khoản
      const accountInfo = await binanceService.getAccountInfo();
      
      // Tính tổng balance
      const totalBalance = accountInfo.balances
        .filter(balance => parseFloat(balance.free) > 0 || parseFloat(balance.locked) > 0)
        .reduce((total, balance) => {
          return total + parseFloat(balance.free) + parseFloat(balance.locked);
        }, 0);

      return NextResponse.json({
        success: true,
        message: 'Kết nối Binance thành công',
        data: {
          canTrade: accountInfo.canTrade,
          canWithdraw: accountInfo.canWithdraw,
          canDeposit: accountInfo.canDeposit,
          balanceCount: accountInfo.balances.length,
          totalWalletBalance: totalBalance.toFixed(2),
          accountType: accountInfo.accountType,
          permissions: accountInfo.permissions
        }
      });

    } catch (binanceError: any) {
      console.error('Binance connection test failed:', binanceError);
      
      return NextResponse.json({
        success: false,
        error: `Lỗi kết nối Binance: ${binanceError.message || 'Unknown error'}`,
        details: binanceError.code || 'NO_CODE'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Test Binance connection error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Lỗi server khi test kết nối Binance'
    }, { status: 500 });
  }
}
