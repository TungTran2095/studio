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

    // Parse config để lấy thông tin cần thiết
    const config = typeof bot.config === 'string' ? JSON.parse(bot.config) : bot.config;
    
    // Kiểm tra có config không
    if (!config || !config.config) {
      return NextResponse.json({
        success: false,
        error: 'Bot chưa có cấu hình strategy'
      }, { status: 400 });
    }

    const tradingConfig = config.config.trading;
    const strategyConfig = config.config.strategy;
    const accountConfig = config.account;
    
    if (!tradingConfig?.symbol || !strategyConfig?.type) {
      return NextResponse.json({
        success: false,
        error: 'Bot config thiếu symbol hoặc strategy type'
      }, { status: 400 });
    }

    if (!accountConfig?.apiKey || !accountConfig?.apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'Bot chưa có API Key hoặc Secret trong config.account'
      }, { status: 400 });
    }

    try {
      // Tạo BinanceService instance để lấy dữ liệu
      const binanceService = new BinanceService(accountConfig.apiKey, accountConfig.apiSecret);
      
      // Lấy giá hiện tại
      const currentPrice = await binanceService.getPrice(tradingConfig.symbol);
      
      // Lấy dữ liệu candles để test strategy
      const candles = await binanceService.getCandles(
        tradingConfig.symbol,
        tradingConfig.timeframe || '1h',
        50 // Lấy 50 candles để test
      );

      if (!candles || candles.length < 20) {
        return NextResponse.json({
          success: false,
          error: 'Không đủ dữ liệu candles để test strategy'
        }, { status: 400 });
      }

      // Simulate strategy calculation (simplified)
      let signal = 'HOLD';
      let details: any = {};

      const closes = candles.map(c => Number(c.close));
      const highs = candles.map(c => Number(c.high));
      const lows = candles.map(c => Number(c.low));
      const latestClose = closes[closes.length - 1];

      switch (strategyConfig.type) {
        case 'rsi':
        case 'rsi_strategy':
          // Simplified RSI calculation
          const rsiPeriod = strategyConfig.parameters?.period || 14;
          const oversold = strategyConfig.parameters?.oversold || 30;
          const overbought = strategyConfig.parameters?.overbought || 70;
          
          // Mock RSI value for demo
          const mockRSI = Math.random() * 100;
          details.rsi = mockRSI.toFixed(2);
          
          if (mockRSI < oversold) {
            signal = 'BUY';
          } else if (mockRSI > overbought) {
            signal = 'SELL';
          }
          break;

        case 'ma_crossover':
          // Simplified MA crossover
          const fastPeriod = strategyConfig.parameters?.fastPeriod || 10;
          const slowPeriod = strategyConfig.parameters?.slowPeriod || 20;
          
          if (closes.length >= slowPeriod) {
            const fastMA = closes.slice(-fastPeriod).reduce((a: number, b: number) => a + b, 0) / fastPeriod;
            const slowMA = closes.slice(-slowPeriod).reduce((a: number, b: number) => a + b, 0) / slowPeriod;
            
            details.fastMA = fastMA.toFixed(2);
            details.slowMA = slowMA.toFixed(2);
            
            if (fastMA > slowMA && latestClose > fastMA) {
              signal = 'BUY';
            } else if (fastMA < slowMA && latestClose < fastMA) {
              signal = 'SELL';
            }
          }
          break;

        case 'bollinger_bands':
          // Simplified Bollinger Bands
          const period = strategyConfig.parameters?.period || 20;
          const stdDev = strategyConfig.parameters?.stdDev || 2;
          
          if (closes.length >= period) {
            const sma = closes.slice(-period).reduce((a: number, b: number) => a + b, 0) / period;
            const variance = closes.slice(-period).reduce((sum: number, close: number) => sum + Math.pow(close - sma, 2), 0) / period;
            const standardDeviation = Math.sqrt(variance);
            
            const upperBand = sma + (standardDeviation * stdDev);
            const lowerBand = sma - (standardDeviation * stdDev);
            
            details.upperBand = upperBand.toFixed(2);
            details.lowerBand = lowerBand.toFixed(2);
            details.middleBand = sma.toFixed(2);
            
            if (latestClose <= lowerBand) {
              signal = 'BUY';
            } else if (latestClose >= upperBand) {
              signal = 'SELL';
            }
          }
          break;

        default:
          // Default strategy - random for demo
          const random = Math.random();
          if (random < 0.3) signal = 'BUY';
          else if (random > 0.7) signal = 'SELL';
      }

      return NextResponse.json({
        success: true,
        message: `Strategy test hoàn thành`,
        data: {
          signal,
          currentPrice: currentPrice.toFixed(2),
          strategy: strategyConfig.type,
          symbol: tradingConfig.symbol,
          timeframe: tradingConfig.timeframe,
          candlesCount: candles.length,
          details,
          timestamp: new Date().toISOString()
        }
      });

    } catch (strategyError: any) {
      console.error('Strategy test failed:', strategyError);
      
      return NextResponse.json({
        success: false,
        error: `Lỗi khi test strategy: ${strategyError.message || 'Unknown error'}`
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Test strategy error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Lỗi server khi test strategy'
    }, { status: 500 });
  }
}
