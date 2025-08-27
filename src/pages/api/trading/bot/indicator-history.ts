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

// Hàm tính toán Ichimoku Cloud
function calculateIchimoku(data: number[], params: any) {
  const tenkanPeriod = params.tenkanPeriod || 9;
  const kijunPeriod = params.kijunPeriod || 26;
  const senkouSpanBPeriod = params.senkouSpanBPeriod || 52;
  
  if (data.length < senkouSpanBPeriod) {
    return { tenkan: [], kijun: [], senkouA: [], senkouB: [] };
  }

  // Tenkan-sen (Conversion Line)
  const tenkan = calculateSMA(data, tenkanPeriod);
  
  // Kijun-sen (Base Line)  
  const kijun = calculateSMA(data, kijunPeriod);
  
  // Senkou Span A (Leading Span A)
  const senkouA = [];
  for (let i = 0; i < Math.min(tenkan.length, kijun.length); i++) {
    senkouA.push((tenkan[i] + kijun[i]) / 2);
  }
  
  // Senkou Span B (Leading Span B)
  const senkouB = calculateSMA(data, senkouSpanBPeriod);
  
  return { tenkan, kijun, senkouA, senkouB };
}

// Hàm tính toán MACD
function calculateMACD(data: number[], params: any) {
  const fastPeriod = params.fastPeriod || 12;
  const slowPeriod = params.slowPeriod || 26;
  const signalPeriod = params.signalPeriod || 9;
  
  const fastEMA = calculateEMA(data, fastPeriod);
  const slowEMA = calculateEMA(data, slowPeriod);
  
  const macdLine = fastEMA.map((fast, i) => fast - slowEMA[i]);
  const signalLine = calculateEMA(macdLine, signalPeriod);
  const histogram = macdLine.map((macd, i) => macd - signalLine[i]);
  
  return { macdLine, signalLine, histogram };
}

// Hàm tính toán EMA (Exponential Moving Average)
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Giá trị đầu tiên là SMA
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += data[i];
  }
  ema.push(sum / period);
  
  // Tính EMA cho các điểm còn lại
  for (let i = period; i < data.length; i++) {
    const newEMA: number = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(newEMA);
  }
  
  return ema;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { botId } = req.query;
  console.log('🔍 API indicator-history called with botId:', botId);
  
  if (!botId) return res.status(400).json({ error: 'Missing botId' });

  try {
    // 1. Lấy config bot
    console.log('📋 Fetching bot config for botId:', botId);
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase client not initialized' });
    }
    
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
    const highs = formattedCandles.map((c: any) => parseFloat(c.high));
    const lows = formattedCandles.map((c: any) => parseFloat(c.low));
    
    let indicatorData: any[] = [];
    let indicatorName = 'Unknown';
    let triggerValue: number | null = null;
    let oversold: number | null = null;
    let additionalData: any = {};

    if (strategy?.type === 'rsi') {
      const period = strategy.parameters?.period || 14;
      const rsi = calculateRSI(closes, period);
      indicatorData = rsi.map((value, index) => ({
        time: formattedCandles[index + period].closeTime,
        value: parseFloat(value.toFixed(2))
      }));
      indicatorName = 'RSI';
      triggerValue = strategy.parameters?.overbought || 70;
      oversold = strategy.parameters?.oversold || 30;
      
    } else if (strategy?.type === 'ichimoku') {
      const ichimoku = calculateIchimoku(closes, strategy.parameters);
      
      // Tạo data cho chart với tất cả các đường Ichimoku
      const maxLength = Math.max(
        ichimoku.tenkan.length,
        ichimoku.kijun.length,
        ichimoku.senkouA.length,
        ichimoku.senkouB.length
      );
      
      indicatorData = [];
      for (let i = 0; i < maxLength; i++) {
        const timeIndex = Math.min(i + (strategy.parameters?.senkouSpanBPeriod || 52), formattedCandles.length - 1);
        const dataPoint = {
          time: formattedCandles[timeIndex].closeTime,
          value: closes[timeIndex], // Giá hiện tại
          tenkan: ichimoku.tenkan[i] || null,
          kijun: ichimoku.kijun[i] || null,
          senkouA: ichimoku.senkouA[i] || null,
          senkouB: ichimoku.senkouB[i] || null
        };
        
        // Chỉ thêm data point nếu có ít nhất 2 đường có dữ liệu
        const validLines = [dataPoint.tenkan, dataPoint.kijun, dataPoint.senkouA, dataPoint.senkouB].filter(v => v !== null).length;
        if (validLines >= 2) {
          indicatorData.push(dataPoint);
        }
      }
      
      indicatorName = 'Ichimoku Cloud';
      triggerValue = null; // Ichimoku không có trigger cố định
      additionalData = {
        strategy: 'ichimoku',
        parameters: strategy.parameters,
        currentPrice: closes[closes.length - 1],
        currentTenkan: ichimoku.tenkan[ichimoku.tenkan.length - 1],
        currentKijun: ichimoku.kijun[ichimoku.kijun.length - 1],
        currentSenkouA: ichimoku.senkouA[ichimoku.senkouA.length - 1],
        currentSenkouB: ichimoku.senkouB[ichimoku.senkouB.length - 1]
      };
      
    } else if (strategy?.type === 'macd') {
      const macd = calculateMACD(closes, strategy.parameters);
      
      indicatorData = macd.macdLine.map((value: number, index: number) => ({
        time: formattedCandles[index + (strategy.parameters?.slowPeriod || 26)].closeTime,
        value: parseFloat(value.toFixed(4)),
        signal: macd.signalLine[index] || null,
        histogram: macd.histogram[index] || null
      }));
      
      indicatorName = 'MACD';
      triggerValue = 0; // MACD có đường zero
      
    } else if (strategy?.type === 'ma_crossover') {
      const fastPeriod = strategy.parameters?.fastPeriod || 10;
      const slowPeriod = strategy.parameters?.slowPeriod || 20;
      const fastMA = calculateSMA(closes, fastPeriod);
      const slowMA = calculateSMA(closes, slowPeriod);
      
      indicatorData = slowMA.map((value, index) => ({
        time: formattedCandles[index + slowPeriod - 1].closeTime,
        value: parseFloat(value.toFixed(2)),
        fastMA: fastMA[index] || null
      }));
      indicatorName = 'MA Crossover';
      triggerValue = null;
      
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
      
    } else if (strategy?.type === 'stochastic') {
      const kPeriod = strategy.parameters?.kPeriod || 14;
      const dPeriod = strategy.parameters?.dPeriod || 3;
      
      const stochK: number[] = [];
      const stochD: number[] = [];
      
      for (let i = kPeriod - 1; i < closes.length; i++) {
        const slice = lows.slice(i - kPeriod + 1, i + 1);
        const lowest = Math.min(...slice);
        const highest = Math.max(...highs.slice(i - kPeriod + 1, i + 1));
        const k = ((closes[i] - lowest) / (highest - lowest)) * 100;
        stochK.push(k);
      }
      
      // Tính %D (SMA của %K)
      for (let i = dPeriod - 1; i < stochK.length; i++) {
        const d = stochK.slice(i - dPeriod + 1, i + 1).reduce((a, b) => a + b, 0) / dPeriod;
        stochD.push(d);
      }
      
      indicatorData = stochK.map((k, index) => ({
        time: formattedCandles[index + kPeriod - 1].closeTime,
        value: parseFloat(k.toFixed(2)),
        d: stochD[index] || null
      }));
      
      indicatorName = 'Stochastic';
      triggerValue = 80; // Overbought level
      oversold = 20; // Oversold level
      
    } else {
      // Strategy không được hỗ trợ, hiển thị giá đơn giản
      indicatorData = closes.map((close: number, index: number) => ({
        time: formattedCandles[index].closeTime,
        value: parseFloat(close.toFixed(2))
      }));
      indicatorName = 'Price';
      triggerValue = null;
    }

    console.log('🎯 Calculated', indicatorData.length, 'indicator points for', indicatorName);

    res.status(200).json({
      indicatorName,
      triggerValue,
      oversold,
      strategy: strategy?.type,
      timeframe: interval,
      symbol,
      history: indicatorData,
      additionalData
    });
    
  } catch (err) {
    console.error('❌ Unexpected error in indicator-history API:', err);
    res.status(500).json({ error: (err as Error).message });
  }
} 