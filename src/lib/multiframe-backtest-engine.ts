// Multiframe Analysis Backtest Engine cho Ichimoku Strategy
export class MultiframeBacktestEngine {
  private config: any;
  private results: any[] = [];

  constructor(config: any) {
    this.config = config;
  }

  // Tính toán Ichimoku Cloud components
  calculateIchimoku(data: any[], tenkanPeriod: number = 9, kijunPeriod: number = 26, senkouSpanBPeriod: number = 52, displacement: number = 26) {
    const result = data.map((candle, index) => {
      if (index < Math.max(tenkanPeriod, kijunPeriod, senkouSpanBPeriod)) {
        return {
          ...candle,
          tenkan: null,
          kijun: null,
          senkouSpanA: null,
          senkouSpanB: null,
          chikou: null
        };
      }

      // Tenkan-sen (Conversion Line)
      const tenkanHigh = Math.max(...data.slice(index - tenkanPeriod + 1, index + 1).map(d => d.high));
      const tenkanLow = Math.min(...data.slice(index - tenkanPeriod + 1, index + 1).map(d => d.low));
      const tenkan = (tenkanHigh + tenkanLow) / 2;

      // Kijun-sen (Base Line)
      const kijunHigh = Math.max(...data.slice(index - kijunPeriod + 1, index + 1).map(d => d.high));
      const kijunLow = Math.min(...data.slice(index - kijunPeriod + 1, index + 1).map(d => d.low));
      const kijun = (kijunHigh + kijunLow) / 2;

      // Senkou Span A (Leading Span A)
      const senkouSpanA = index >= displacement ? (tenkan + kijun) / 2 : null;

      // Senkou Span B (Leading Span B)
      const senkouSpanBHigh = Math.max(...data.slice(index - senkouSpanBPeriod + 1, index + 1).map(d => d.high));
      const senkouSpanBLow = Math.min(...data.slice(index - senkouSpanBPeriod + 1, index + 1).map(d => d.low));
      const senkouSpanB = index >= displacement ? (senkouSpanBHigh + senkouSpanBLow) / 2 : null;

      // Chikou Span (Lagging Span)
      const chikou = index + displacement < data.length ? data[index + displacement].close : null;

      return {
        ...candle,
        tenkan,
        kijun,
        senkouSpanA,
        senkouSpanB,
        chikou
      };
    });

    return result;
  }

  // Tạo tín hiệu giao dịch dựa trên Ichimoku
  generateSignals(data: any[]) {
    const signals = data.map((candle, index) => {
      if (index === 0 || !candle.tenkan || !candle.kijun || !candle.senkouSpanA || !candle.senkouSpanB) {
        return { ...candle, signal: 0 };
      }

      const prevCandle = data[index - 1];
      let signal = 0;

      // Điều kiện MUA
      const priceAboveCloud = candle.close > candle.senkouSpanA && candle.close > candle.senkouSpanB;
      const tenkanAboveKijun = candle.tenkan > candle.kijun;
      const tenkanCrossAbove = prevCandle.tenkan <= prevCandle.kijun && candle.tenkan > candle.kijun;
      // Chikou so sánh với giá 26 kỳ trước (displacement = 26)
      const price26PeriodsAgo = data[index - 26]?.close || candle.close;
      const chikouConfirmsBullish = candle.chikou && candle.chikou > price26PeriodsAgo;

      if (priceAboveCloud && tenkanAboveKijun && tenkanCrossAbove && chikouConfirmsBullish) {
        signal = 1; // BUY
      }

      // Điều kiện BÁN
      const priceBelowCloud = candle.close < candle.senkouSpanA && candle.close < candle.senkouSpanB;
      const tenkanBelowKijun = candle.tenkan < candle.kijun;
      const tenkanCrossBelow = prevCandle.tenkan >= prevCandle.kijun && candle.tenkan < candle.kijun;
      // Chikou so sánh với giá 26 kỳ trước (displacement = 26)
      const chikouConfirmsBearish = candle.chikou && candle.chikou < price26PeriodsAgo;

      if (priceBelowCloud && tenkanBelowKijun && tenkanCrossBelow && chikouConfirmsBearish) {
        signal = -1; // SELL
      }

      return { ...candle, signal };
    });

    return signals;
  }

  // Chạy backtest cho một timeframe và symbol
  async runBacktest(symbol: string, timeframe: string, data: any[]) {
    const ichimokuData = this.calculateIchimoku(data);
    const signals = this.generateSignals(ichimokuData);

    let position = 0;
    let entryPrice = 0;
    let trades: any[] = [];
    let equity = this.config.initialCapital;
    let maxEquity = equity;
    let maxDrawdown = 0;

    for (let i = 0; i < signals.length; i++) {
      const candle = signals[i];
      
      if (candle.signal === 1 && position === 0) {
        // Mở position LONG
        position = this.config.positionSize;
        entryPrice = candle.close;
      } else if (candle.signal === -1 && position > 0) {
        // Đóng position LONG
        const exitPrice = candle.close;
        const pnl = (exitPrice - entryPrice) / entryPrice * position;
        const tradeValue = entryPrice * position;
        
        trades.push({
          entryTime: candle.timestamp,
          exitTime: candle.timestamp,
          entryPrice,
          exitPrice,
          side: 'LONG',
          size: position,
          pnl,
          pnlPercentage: pnl * 100,
          tradeValue
        });

        equity += tradeValue * pnl;
        position = 0;
      }

      // Cập nhật max drawdown
      if (equity > maxEquity) {
        maxEquity = equity;
      }
      const currentDrawdown = (maxEquity - equity) / maxEquity * 100;
      if (currentDrawdown > maxDrawdown) {
        maxDrawdown = currentDrawdown;
      }
    }

    // Tính toán metrics
    const totalTrades = trades.length;
    const winningTrades = trades.filter(t => t.pnl > 0);
    const losingTrades = trades.filter(t => t.pnl < 0);
    const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0;
    
    const totalReturn = ((equity - this.config.initialCapital) / this.config.initialCapital) * 100;
    
    const grossProfit = winningTrades.reduce((sum, t) => sum + t.pnl, 0);
    const grossLoss = Math.abs(losingTrades.reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : 0;
    
    const avgWin = winningTrades.length > 0 ? winningTrades.reduce((sum, t) => sum + t.pnlPercentage, 0) / winningTrades.length : 0;
    const avgLoss = losingTrades.length > 0 ? losingTrades.reduce((sum, t) => sum + t.pnlPercentage, 0) / losingTrades.length : 0;
    
    // Tính Sharpe Ratio đơn giản
    const returns = trades.map(t => t.pnlPercentage);
    const avgReturn = returns.length > 0 ? returns.reduce((sum, r) => sum + r, 0) / returns.length : 0;
    const variance = returns.length > 0 ? returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length : 0;
    const sharpeRatio = variance > 0 ? avgReturn / Math.sqrt(variance) : 0;

    return {
      symbol,
      timeframe,
      totalTrades,
      winRate,
      totalReturn,
      sharpeRatio,
      maxDrawdown,
      profitFactor,
      avgWin,
      avgLoss,
      trades,
      finalEquity: equity
    };
  }

  // Chạy multiframe analysis
  async runMultiframeAnalysis(config: any) {
    const results = [];
    
    for (const symbol of config.symbols) {
      for (const timeframe of config.timeframes) {
        try {
          // Mock data generation cho demo
          const mockData = this.generateMockData(symbol, timeframe, config.lookbackPeriod);
          
          const result = await this.runBacktest(symbol, timeframe, mockData);
          results.push(result);
        } catch (error) {
          console.error(`Error running backtest for ${symbol} ${timeframe}:`, error);
        }
      }
    }
    
    return results;
  }

  // Tạo mock data cho demo
  generateMockData(symbol: string, timeframe: string, days: number) {
    const data = [];
    const basePrice = symbol === 'BTCUSDT' ? 50000 : 3000;
    let currentPrice = basePrice;
    const startTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const timeframeMinutes = {
      '5m': 5,
      '15m': 15,
      '1h': 60,
      '4h': 240,
      '1d': 1440
    };
    
    const intervalMs = (timeframeMinutes[timeframe as keyof typeof timeframeMinutes] || 60) * 60 * 1000;
    const totalCandles = Math.floor((days * 24 * 60 * 60 * 1000) / intervalMs);
    
    for (let i = 0; i < totalCandles; i++) {
      const timestamp = startTime + (i * intervalMs);
      
      // Tạo giá ngẫu nhiên với xu hướng
      const volatility = 0.02; // 2% volatility
      const trend = Math.sin(i / 100) * 0.001; // Xu hướng nhẹ
      const randomChange = (Math.random() - 0.5) * volatility;
      const priceChange = trend + randomChange;
      
      currentPrice *= (1 + priceChange);
      
      const high = currentPrice * (1 + Math.random() * 0.01);
      const low = currentPrice * (1 - Math.random() * 0.01);
      const open = i === 0 ? currentPrice : data[i - 1].close;
      const close = currentPrice;
      
      data.push({
        timestamp,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000
      });
    }
    
    return data;
  }
}
