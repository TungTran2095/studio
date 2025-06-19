import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

function aggregateOHLCV(data: any[], timeframe: string) {
  if (!data || data.length === 0) return [];
  
  // Convert timeframe to minutes
  const timeframeMap: { [key: string]: number } = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '30m': 30,
    '1h': 60,
    '2h': 120,
    '4h': 240,
    '6h': 360,
    '8h': 480,
    '12h': 720,
    '1d': 1440
  };

  const minutes = timeframeMap[timeframe] || 1;
  
  // Group data by timeframe
  const groupedData = new Map();
  
  data.forEach((candle) => {
    const timestamp = new Date(candle.open_time);
    let groupTimestamp = new Date(timestamp);
    
    // Round down to nearest timeframe
    if (minutes >= 60) {
      // For hourly timeframes
      const hours = Math.floor(minutes / 60);
      groupTimestamp.setMinutes(0, 0, 0);
      groupTimestamp.setHours(Math.floor(groupTimestamp.getHours() / hours) * hours);
    } else {
      // For minute timeframes
      groupTimestamp.setSeconds(0, 0);
      groupTimestamp.setMinutes(Math.floor(groupTimestamp.getMinutes() / minutes) * minutes);
    }
    
    const key = groupTimestamp.getTime();
    
    if (!groupedData.has(key)) {
      groupedData.set(key, {
        open_time: groupTimestamp.toISOString(),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume
      });
    } else {
      const existing = groupedData.get(key);
      existing.high = Math.max(existing.high, candle.high);
      existing.low = Math.min(existing.low, candle.low);
      existing.close = candle.close;
      existing.volume += candle.volume;
    }
  });

  return Array.from(groupedData.values());
}

export async function POST(request: Request) {
  try {
    if (!supabase) {
      console.error('Supabase client not initialized');
      return NextResponse.json(
        { error: 'Database client not initialized' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { symbol, timeframe, startTime, endTime } = body;

    console.log('Received request:', { symbol, timeframe, startTime, endTime });

    // Validate input
    if (!symbol || !timeframe || !startTime || !endTime) {
      console.error('Missing required parameters:', { symbol, timeframe, startTime, endTime });
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    // Map symbol to table name
    const tableMap: { [key: string]: string } = {
      'BTCUSDT': 'OHLCV_BTC_USDT_1m',
      'ETHUSDT': 'OHLCV_ETH_USDT_1m',
      'BNBUSDT': 'OHLCV_BNB_USDT_1m'
    };

    const tableName = tableMap[symbol];
    if (!tableName) {
      console.error('Invalid symbol:', symbol);
      return NextResponse.json(
        { error: 'Invalid symbol' },
        { status: 400 }
      );
    }

    console.log('Querying table:', tableName);

    // Convert timestamps to ISO strings
    const startDate = new Date(startTime).toISOString();
    const endDate = new Date(endTime).toISOString();

    console.log('Query time range:', { startDate, endDate });

    // Query data from database
    const { data, error } = await supabase
      .from(tableName)
      .select('open_time, open, high, low, close, volume')
      .gte('open_time', startDate)
      .lte('open_time', endDate)
      .order('open_time', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch OHLCV data', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.log('No data found for the given time range');
      return NextResponse.json({
        success: true,
        ohlcv: [],
        count: 0,
        timeframe,
        symbol,
        startTime,
        endTime
      });
    }

    console.log('Found data points:', data.length);

    // Aggregate data based on timeframe if not 1m
    const aggregatedData = timeframe === '1m' ? data : aggregateOHLCV(data, timeframe);

    // Format data for response
    const ohlcv = aggregatedData.map(row => ({
      timestamp: new Date(row.open_time).getTime(),
      open: parseFloat(row.open),
      high: parseFloat(row.high),
      low: parseFloat(row.low),
      close: parseFloat(row.close),
      volume: parseFloat(row.volume)
    }));

    return NextResponse.json({
      success: true,
      ohlcv,
      count: ohlcv.length,
      timeframe,
      symbol,
      startTime,
      endTime
    });

  } catch (error) {
    console.error('Error in OHLCV API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 