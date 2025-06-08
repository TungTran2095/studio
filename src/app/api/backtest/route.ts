import { NextResponse } from 'next/server';
import { BacktestEngine } from '@/modules/backtesting/BacktestEngine';
import { MACrossover } from '@/modules/backtesting/strategies/MACrossover';
import { BacktestConfig, OHLCV } from '@/modules/backtesting/types';
import { BinanceService } from '@/lib/services/binance';

export async function POST(request: Request) {
  try {
    console.log('Starting backtest request...');
    const body = await request.json();
    const { 
      config,
      apiKey,
      apiSecret,
      isTestnet = true,
      symbol = 'BTCUSDT',
      interval = '1h'
    } = body;

    console.log('Request parameters:', {
      symbol,
      interval,
      startDate: config.startDate,
      endDate: config.endDate,
      isTestnet
    });

    // Validate input
    if (!config || !apiKey || !apiSecret) {
      console.error('Missing required parameters');
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Validate config
    if (!config.startDate || !config.endDate || !config.initialCapital) {
      console.error('Invalid config parameters');
      return NextResponse.json(
        { error: 'Invalid config parameters' },
        { status: 400 }
      );
    }

    // Initialize Binance service
    console.log('Initializing Binance service...');
    const binance = new BinanceService(apiKey, apiSecret, isTestnet);

    // Convert dates to timestamps
    const startTime = new Date(config.startDate).getTime();
    const endTime = new Date(config.endDate).getTime();

    if (isNaN(startTime) || isNaN(endTime)) {
      console.error('Invalid date format');
      return NextResponse.json(
        { error: 'Invalid date format' },
        { status: 400 }
      );
    }

    // Validate time range
    const maxDays = {
      '1m': 7,
      '5m': 30,
      '15m': 60,
      '1h': 180,
      '4h': 365,
      '1d': 365 * 2
    };

    const daysDiff = Math.ceil((endTime - startTime) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays[interval as keyof typeof maxDays]) {
      return NextResponse.json(
        { error: `Time range too long for ${interval} timeframe. Maximum ${maxDays[interval as keyof typeof maxDays]} days allowed.` },
        { status: 400 }
      );
    }

    console.log('Fetching market data...', {
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString()
    });

    // Fetch market data from Binance
    let marketData: OHLCV[] = [];
    let currentStartTime = startTime;
    const maxCandles = 1000; // Binance limit per request

    while (currentStartTime < endTime) {
      try {
        console.log('Fetching candles batch...', {
          currentStartTime: new Date(currentStartTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          symbol,
          interval
        });

        const candles = await binance.getKlines(
          symbol,
          interval,
          currentStartTime,
          endTime,
          maxCandles
        );

        console.log('Raw candles response:', candles);

        if (!candles || candles.length === 0) {
          console.log('No more candles available');
          break;
        }

        console.log(`Fetched ${candles.length} candles. First candle:`, candles[0]);
        console.log(`Last candle:`, candles[candles.length - 1]);
        
        marketData = [...marketData, ...candles];
        
        // Update start time for next request
        const lastCandle = candles[candles.length - 1];
        currentStartTime = lastCandle.timestamp + 1;

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Error fetching candles:', error);
        console.error('Error details:', {
          symbol,
          interval,
          startTime: new Date(currentStartTime).toISOString(),
          endTime: new Date(endTime).toISOString()
        });
        if (error instanceof Error) {
          if (error.message.includes('Invalid symbol')) {
            return NextResponse.json(
              { error: `Invalid symbol: ${symbol}. Please check if the symbol exists on Binance.` },
              { status: 400 }
            );
          }
          if (error.message.includes('Invalid interval')) {
            return NextResponse.json(
              { error: `Invalid interval: ${interval}. Please use a valid timeframe.` },
              { status: 400 }
            );
          }
        }
        return NextResponse.json(
          { error: 'Failed to fetch market data', details: error instanceof Error ? error.message : 'Unknown error' },
          { status: 500 }
        );
      }
    }

    if (marketData.length === 0) {
      console.error('No market data available. Request details:', {
        symbol,
        interval,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString()
      });
      return NextResponse.json(
        { error: `No market data available for ${symbol} in the specified period. Please check if the symbol exists and the time range is valid.` },
        { status: 400 }
      );
    }

    console.log(`Total candles fetched: ${marketData.length}`);
    console.log('First candle:', marketData[0]);
    console.log('Last candle:', marketData[marketData.length - 1]);

    // Sort data by timestamp
    marketData.sort((a, b) => a.timestamp - b.timestamp);

    // Create strategy instance
    console.log('Creating strategy instance...');
    const strategy = new MACrossover(
      config.parameters?.fastPeriod || 10,
      config.parameters?.slowPeriod || 20,
      config.parameters?.quantity || 1
    );

    // Run backtest
    console.log('Running backtest...');
    const engine = new BacktestEngine(marketData, config, strategy);
    const results = engine.run();

    if (!results) {
      console.error('Backtest failed to produce results');
      return NextResponse.json(
        { error: 'Backtest failed to produce results' },
        { status: 500 }
      );
    }

    console.log('Backtest completed successfully');
    const response = {
      ...results,
      metadata: {
        symbol,
        interval,
        startDate: config.startDate,
        endDate: config.endDate,
        dataPoints: marketData.length,
        firstCandle: marketData[0],
        lastCandle: marketData[marketData.length - 1],
        marketData: marketData
      }
    };

    console.log('Response data:', response);
    return NextResponse.json(response);
  } catch (error) {
    console.error('Backtest error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    );
  }
} 