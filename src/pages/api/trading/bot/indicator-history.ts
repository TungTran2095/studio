import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabase-client';

// Hàm tính toán SMA (Simple Moving Average)
function calculateSMA(data: number[], period: number): number[] {
  const sma = [];
  for (let i = period - 1; i < data.length; i++) {
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    sma.push(sum / period);
  }
  return sma;
}

// Hàm tính toán RSI
function calculateRSI(data: number[], period: number): number[] {
  const rsi = [];
  let gains = 0;
  let losses = 0;

  // Tính toán giá trị đầu tiên
  for (let i = 1; i < period; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period; i < data.length; i++) {
    const diff = data[i] - data[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }

    const rs = avgGain / avgLoss;
    rsi.push(100 - (100 / (1 + rs)));
  }

  return rsi;
}

// Hàm tính toán Standard Deviation
function calculateStdDev(data: number[]): number {
  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const squaredDiffs = data.map(x => Math.pow(x - mean, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / data.length;
  return Math.sqrt(variance);
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { botId } = req.query;
  console.log('🔍 API indicator-history called with botId:', botId);
  
  if (!botId) return res.status(400).json({ error: 'Missing botId' });

  try {
    // 1. Lấy config bot
    console.log('📋 Fetching bot config for botId:', botId);
    const { data: botData, error: botError } = await supabase
      .from('trading_bots')
      .select('config')
      .eq('id', botId)
      .single();
    
    if (botError || !botData) {
      console.error('❌ Error fetching bot config:', botError);
      return res.status(404).json({ error: 'Bot not found' });
    }
    
    console.log('✅ Bot config found');

    // 2. Lấy dữ liệu giá từ Binance
    const symbol = botData.config?.config?.trading?.symbol || 'BTCUSDT';
    const apiKey = botData.config?.account?.apiKey;
    const apiSecret = botData.config?.account?.apiSecret;
    const isTestnet = botData.config?.account?.testnet || false;
    
    // Lấy timeframe từ config bot
    let interval = botData.config?.config?.trading?.timeframe || '1m';
    // Chuyển đổi một số giá trị phổ biến nếu cần (ví dụ: 1h, 1d, 15m đều hợp lệ với Binance)
    // Nếu cần mapping thêm thì bổ sung ở đây
    // interval = interval.replace('H', 'h').replace('D', 'd').replace('M', 'm');
    
    console.log('📊 Fetching candles for symbol:', symbol, 'interval:', interval);
    
    const baseUrl = isTestnet
      ? 'https://testnet.binance.vision'
      : 'https://api.binance.com';

    const url = `${baseUrl}/api/v3/klines?symbol=${symbol}&interval=${interval}&limit=200`;
    const candlesRes = await fetch(url, {
      method: 'GET',
      headers: {
        'X-MBX-APIKEY': apiKey || '',
      },
    });

    if (!candlesRes.ok) {
      console.error('❌ Error fetching candles from Binance');
      return res.status(500).json({ error: 'Failed to fetch market data from Binance' });
    }

    const candlesData = await candlesRes.json();
    const candles = candlesData || [];
    
    if (candles.length === 0) {
      console.error('❌ No candles data received from Binance');
      return res.status(500).json({ error: 'No market data available from Binance' });
    }

    console.log('✅ Fetched', candles.length, 'candles from Binance');

    // Format dữ liệu candles từ Binance API
    const formattedCandles = candles.map((candle: any) => ({
      openTime: candle[0],
      open: candle[1],
      high: candle[2],
      low: candle[3],
      close: candle[4],
      volume: candle[5],
      closeTime: candle[6],
      quoteAssetVolume: candle[7],
      numberOfTrades: candle[8],
      takerBuyBaseAssetVolume: candle[9],
      takerBuyQuoteAssetVolume: candle[10]
    }));

    // 3. Tính toán indicator theo rule của bot
    const strategy = botData.config?.config?.strategy;
    console.log('📊 Strategy config:', strategy);
    
    const closes = formattedCandles.map((c: any) => parseFloat(c.close));
    let indicatorData: any[] = [];
    let indicatorName = 'RSI';
    let triggerValue = 70;

    if (strategy?.type === 'rsi') {
      const period = strategy.parameters?.period || 14;
      const rsi = calculateRSI(closes, period);
      indicatorData = rsi.map((value, index) => ({
        time: formattedCandles[index + period].closeTime,
        value: parseFloat(value.toFixed(2))
      }));
      indicatorName = 'RSI';
      triggerValue = strategy.parameters?.overbought || 70;
      
    } else if (strategy?.type === 'ma_crossover') {
      const fastPeriod = strategy.parameters?.fastPeriod || 10;
      const slowPeriod = strategy.parameters?.slowPeriod || 20;
      const fastMA = calculateSMA(closes, fastPeriod);
      const slowMA = calculateSMA(closes, slowPeriod);
      
      // Lấy MA chậm hơn làm indicator chính
      indicatorData = slowMA.map((value, index) => ({
        time: formattedCandles[index + slowPeriod - 1].closeTime,
        value: parseFloat(value.toFixed(2))
      }));
      indicatorName = 'MA';
      triggerValue = null; // MA crossover không có trigger cố định
      
    } else if (strategy?.type === 'bollinger_bands') {
      const period = strategy.parameters?.period || 20;
      const stdDev = strategy.parameters?.stdDev || 2;
      const sma = calculateSMA(closes, period);
      
      indicatorData = sma.map((middle, index) => {
        const startIdx = Math.max(0, index + period - 1 - period + 1);
        const endIdx = index + period - 1 + 1;
        const sliceData = closes.slice(startIdx, endIdx);
        const std = calculateStdDev(sliceData);
        const upper = middle + (std * stdDev);
        const lower = middle - (std * stdDev);
        
        return {
          time: formattedCandles[index + period - 1].closeTime,
          value: parseFloat(middle.toFixed(2)),
          upper: parseFloat(upper.toFixed(2)),
          lower: parseFloat(lower.toFixed(2))
        };
      });
      indicatorName = 'Bollinger Bands';
      triggerValue = null;
    }

    console.log('🎯 Calculated', indicatorData.length, 'indicator points for', indicatorName);

    res.status(200).json({
      indicatorName,
      triggerValue,
      oversold: strategy?.type === 'rsi' ? strategy.parameters?.oversold : undefined,
      history: indicatorData
    });
    
  } catch (err) {
    console.error('❌ Unexpected error in indicator-history API:', err);
    res.status(500).json({ error: (err as Error).message });
  }
} 