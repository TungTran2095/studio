// Tính Moving Average
export function calculateMA(data: number[], period: number): (number | null)[] {
  const ma = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      ma.push(null);
      continue;
    }
    const sum = data.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    ma.push(sum / period);
  }
  return ma;
}

// Tính Relative Strength Index (RSI)
export function calculateRSI(data: number[], period: number = 14): (number | null)[] {
  const rsi = [];
  const gains = [];
  const losses = [];

  // Tính thay đổi giá
  for (let i = 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? -change : 0);
  }

  // Tính RSI
  for (let i = 0; i < data.length; i++) {
    if (i < period) {
      rsi.push(null);
      continue;
    }

    const avgGain = gains.slice(i - period, i).reduce((a, b) => a + b, 0) / period;
    const avgLoss = losses.slice(i - period, i).reduce((a, b) => a + b, 0) / period;

    if (avgLoss === 0) {
      rsi.push(100);
    } else {
      const rs = avgGain / avgLoss;
      rsi.push(100 - (100 / (1 + rs)));
    }
  }

  return rsi;
}

// Tính Moving Average Convergence Divergence (MACD)
export function calculateMACD(
  data: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: (number | null)[], signal: (number | null)[], histogram: (number | null)[] } {
  const fastMA = calculateMA(data, fastPeriod);
  const slowMA = calculateMA(data, slowPeriod);
  
  const macd = fastMA.map((fast, i) => {
    if (fast === null || slowMA[i] === null) return null;
    return fast - slowMA[i];
  });

  const signal = calculateMA(macd.filter(x => x !== null), signalPeriod);
  
  const histogram = macd.map((value, i) => {
    if (value === null || signal[i] === null) return null;
    return value - signal[i];
  });

  return { macd, signal, histogram };
}

// Tính Bollinger Bands
export function calculateBollingerBands(
  data: number[],
  period: number = 20,
  stdDev: number = 2
): { upper: (number | null)[], middle: (number | null)[], lower: (number | null)[] } {
  const middle = calculateMA(data, period);
  
  const upper = [];
  const lower = [];
  
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) {
      upper.push(null);
      lower.push(null);
      continue;
    }
    
    const slice = data.slice(i - period + 1, i + 1);
    const avg = middle[i];
    if (avg !== null) {
      const squaredDiffs = slice.map(x => Math.pow(x - avg, 2));
      const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(avg + (standardDeviation * stdDev));
      lower.push(avg - (standardDeviation * stdDev));
    } else {
      upper.push(null);
      lower.push(null);
    }
  }
  
  return { upper, middle, lower };
}

// Tính Average True Range (ATR)
export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number = 14
): (number | null)[] {
  const tr = [];
  const atr = [];
  
  // Tính True Range
  for (let i = 1; i < high.length; i++) {
    const tr1 = high[i] - low[i];
    const tr2 = Math.abs(high[i] - close[i - 1]);
    const tr3 = Math.abs(low[i] - close[i - 1]);
    tr.push(Math.max(tr1, tr2, tr3));
  }
  
  // Tính ATR
  for (let i = 0; i < high.length; i++) {
    if (i < period) {
      atr.push(null);
      continue;
    }
    
    const sum = tr.slice(i - period, i).reduce((a, b) => a + b, 0);
    atr.push(sum / period);
  }
  
  return atr;
} 