import { OHLCV, BacktestConfig, Strategy, Signal, BacktestResult, Trade, EquityPoint } from './types';

export class BacktestEngine {
  private data: OHLCV[];
  private config: BacktestConfig;
  private strategy: Strategy;
  private position: number = 0;
  private trades: Trade[] = [];
  private equityCurve: EquityPoint[] = [];
  private currentEquity: number;

  constructor(data: OHLCV[], config: BacktestConfig, strategy: Strategy) {
    this.data = data;
    this.config = config;
    this.strategy = strategy;
    this.currentEquity = config.initialCapital;
  }

  private calculateSharpeRatio(returns: number[]): number {
    if (returns.length < 2) return 0;
    
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length;
    const stdDev = Math.sqrt(variance);
    
    // Assuming risk-free rate of 0 for simplicity
    return stdDev === 0 ? 0 : mean / stdDev;
  }

  private calculateMaxDrawdown(equity: number[]): number {
    let maxDrawdown = 0;
    let peak = equity[0];

    for (let i = 1; i < equity.length; i++) {
      if (equity[i] > peak) {
        peak = equity[i];
      }
      const drawdown = (peak - equity[i]) / peak;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  private calculateWinRate(trades: Trade[]): number {
    if (trades.length === 0) return 0;
    const winningTrades = trades.filter(trade => trade.pnl > 0).length;
    return winningTrades / trades.length;
  }

  public run(): BacktestResult {
    if (!this.data || this.data.length === 0) {
      throw new Error('No market data available for backtesting');
    }

    const signals = this.strategy.calculateSignals(this.data);
    let currentPosition = 0;
    let entryPrice = 0;
    let entryTime = 0;

    // Initialize equity curve
    this.equityCurve.push({
      timestamp: this.data[0].timestamp,
      equity: this.config.initialCapital
    });

    for (let i = 0; i < this.data.length; i++) {
      const candle = this.data[i];
      const signal = signals.find(s => s.timestamp === candle.timestamp);

      if (signal) {
        if (signal.type === 'BUY' && currentPosition <= 0) {
          // Close short position if exists
          if (currentPosition < 0) {
            this.closePosition(candle.timestamp, candle.close, currentPosition);
          }
          // Open long position - Mua khi có signal mua
          currentPosition = signal.quantity;
          entryPrice = candle.close;
          entryTime = candle.timestamp;
        } else if (signal.type === 'SELL' && currentPosition > 0) {
          // Close long position - Bán khi có signal bán
          this.closePosition(candle.timestamp, candle.close, currentPosition);
          currentPosition = 0;
        }
      }

      // Update equity curve
      this.updateEquity(candle.timestamp, currentPosition, candle.close);
    }

    // Close any open position at the end
    if (currentPosition !== 0) {
      this.closePosition(
        this.data[this.data.length - 1].timestamp,
        this.data[this.data.length - 1].close,
        currentPosition
      );
    }

    return this.calculateResults();
  }

  private closePosition(timestamp: number, price: number, position: number) {
    const trade: Trade = {
      entryTime: this.trades.length > 0 ? this.trades[this.trades.length - 1].entryTime : timestamp,
      exitTime: timestamp,
      entryPrice: this.trades.length > 0 ? this.trades[this.trades.length - 1].entryPrice : price,
      exitPrice: price,
      quantity: Math.abs(position),
      pnl: position * (price - this.trades[this.trades.length - 1]?.entryPrice || price),
      type: position > 0 ? 'LONG' : 'SHORT'
    };

    this.trades.push(trade);
    this.currentEquity += trade.pnl;
  }

  private updateEquity(timestamp: number, position: number, price: number) {
    const unrealizedPnL = position * (price - this.trades[this.trades.length - 1]?.entryPrice || price);
    this.equityCurve.push({
      timestamp,
      equity: this.currentEquity + unrealizedPnL
    });
  }

  private calculateResults(): BacktestResult {
    const finalEquity = this.equityCurve[this.equityCurve.length - 1].equity;
    const totalReturn = (finalEquity - this.config.initialCapital) / this.config.initialCapital;
    
    // Calculate daily returns for Sharpe ratio
    const dailyReturns = [];
    for (let i = 1; i < this.equityCurve.length; i++) {
      const dailyReturn = (this.equityCurve[i].equity - this.equityCurve[i-1].equity) / this.equityCurve[i-1].equity;
      dailyReturns.push(dailyReturn);
    }

    return {
      initialCapital: this.config.initialCapital,
      finalCapital: finalEquity,
      totalReturn,
      maxDrawdown: this.calculateMaxDrawdown(this.equityCurve.map(p => p.equity)),
      sharpeRatio: this.calculateSharpeRatio(dailyReturns),
      winRate: this.calculateWinRate(this.trades),
      trades: this.trades,
      equityCurve: this.equityCurve
    };
  }
} 