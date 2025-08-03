// Backtesting Engine
// Implements basic strategy backtesting with real calculations

import { BacktestConfig, PerformanceMetrics, TradeResult, EquityPoint } from '@/types/research-models';

export interface MarketData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  quantity: number;
  entryTime: string;
  stopLoss?: number;
  takeProfit?: number;
}

export interface BacktestState {
  cash: number;
  positions: Position[];
  trades: TradeResult[];
  equity: EquityPoint[];
  currentBar: number;
}

export class BacktestingEngine {
  private data: MarketData[];
  private config: BacktestConfig;
  private state: BacktestState;

  constructor(data: MarketData[], config: BacktestConfig) {
    this.data = data;
    this.config = config;
    this.state = {
      cash: config.initialCapital,
      positions: [],
      trades: [],
      equity: [],
      currentBar: 0
    };
  }

  // Main backtest execution
  public async run(): Promise<{
    performance: PerformanceMetrics;
    trades: TradeResult[];
    equity: EquityPoint[];
  }> {
    console.log(`Starting backtest with ${this.data.length} data points...`);

    for (let i = 1; i < this.data.length; i++) {
      this.state.currentBar = i;
      const currentBar = this.data[i];
      const previousBar = this.data[i - 1];

      // Update existing positions and check exit conditions
      await this.updatePositions(currentBar);

      // Check for new entry signals
      await this.checkEntrySignals(currentBar, previousBar);

      // Record equity
      this.recordEquity(currentBar);
    }

    // Close any remaining positions
    this.closeAllPositions(this.data[this.data.length - 1]);

    // Calculate performance metrics
    const performance = this.calculatePerformance();

    return {
      performance,
      trades: this.state.trades,
      equity: this.state.equity
    };
  }

  // Update existing positions and check stop loss/take profit
  private async updatePositions(bar: MarketData) {
    const positionsToClose: number[] = [];

    this.state.positions.forEach((position, index) => {
      const currentPrice = bar.close;
      let shouldClose = false;
      let exitReason = '';

      // Check stop loss
      if (position.stopLoss) {
        if (position.side === 'long' && currentPrice <= position.stopLoss) {
          shouldClose = true;
          exitReason = 'Stop Loss';
        } else if (position.side === 'short' && currentPrice >= position.stopLoss) {
          shouldClose = true;
          exitReason = 'Stop Loss';
        }
      }

      // Check take profit
      if (position.takeProfit && !shouldClose) {
        if (position.side === 'long' && currentPrice >= position.takeProfit) {
          shouldClose = true;
          exitReason = 'Take Profit';
        } else if (position.side === 'short' && currentPrice <= position.takeProfit) {
          shouldClose = true;
          exitReason = 'Take Profit';
        }
      }

      if (shouldClose) {
        this.closePosition(position, currentPrice, bar.timestamp, exitReason);
        positionsToClose.push(index);
      }
    });

    // Remove closed positions
    positionsToClose.reverse().forEach(index => {
      this.state.positions.splice(index, 1);
    });
  }

  // Check for entry signals based on strategy
  private async checkEntrySignals(currentBar: MarketData, previousBar: MarketData) {
    const strategy = this.config.strategy;

    // Simple momentum strategy
    if (strategy.id === 'momentum') {
      const priceChange = (currentBar.close - previousBar.close) / previousBar.close;
      const volumeRatio = currentBar.volume / previousBar.volume;

      // Entry condition: price up > 2% with high volume - Mua khi có signal mua
      if (priceChange > 0.02 && volumeRatio > 1.5 && this.state.positions.length === 0) {
        this.openPosition('long', currentBar.close, currentBar.timestamp, 'Momentum Buy');
      }
      // Exit condition: price down > 1% - Bán khi có signal bán
      else if (priceChange < -0.01 && this.state.positions.length > 0) {
        this.state.positions.forEach(position => {
          this.closePosition(position, currentBar.close, currentBar.timestamp, 'Momentum Exit');
        });
        this.state.positions = [];
      }
    }

    // Simple mean reversion strategy
    else if (strategy.id === 'mean_reversion') {
      const sma20 = this.calculateSMA(20);
      if (!sma20) return;

      const priceDeviation = (currentBar.close - sma20) / sma20;

      // Entry condition: price below SMA by 3% - Mua khi có signal mua
      if (priceDeviation < -0.03 && this.state.positions.length === 0) {
        this.openPosition('long', currentBar.close, currentBar.timestamp, 'Mean Reversion Buy');
      }
      // Exit condition: price above SMA - Bán khi có signal bán
      else if (priceDeviation > 0 && this.state.positions.length > 0) {
        this.state.positions.forEach(position => {
          this.closePosition(position, currentBar.close, currentBar.timestamp, 'Mean Reversion Exit');
        });
        this.state.positions = [];
      }
    }
  }

  // Open a new position
  private openPosition(side: 'long' | 'short', price: number, timestamp: string, reason: string) {
    const riskConfig = this.config.riskManagement;
    const positionSize = this.state.cash * (riskConfig.riskPerTrade / 100);
    const quantity = positionSize / price;

    if (quantity * price > this.state.cash) return; // Insufficient funds

    const position: Position = {
      symbol: 'BTCUSDT', // hardcoded for demo
      side,
      entryPrice: price,
      quantity,
      entryTime: timestamp,
      stopLoss: side === 'long' 
        ? price * (1 - riskConfig.stopLoss / 100)
        : price * (1 + riskConfig.stopLoss / 100),
      takeProfit: side === 'long'
        ? price * (1 + riskConfig.takeProfit / 100)
        : price * (1 - riskConfig.takeProfit / 100)
    };

    this.state.positions.push(position);
    this.state.cash -= quantity * price * (1 + this.config.commission / 100);

    console.log(`Opened ${side} position: ${quantity.toFixed(4)} @ ${price} (${reason})`);
  }

  // Close a position
  private closePosition(position: Position, exitPrice: number, exitTime: string, exitReason: string) {
    const commission = position.quantity * exitPrice * (this.config.commission / 100);
    const grossPnl = position.side === 'long'
      ? (exitPrice - position.entryPrice) * position.quantity
      : (position.entryPrice - exitPrice) * position.quantity;
    
    const netPnl = grossPnl - commission;
    const pnlPercent = (netPnl / (position.entryPrice * position.quantity)) * 100;

    this.state.cash += position.quantity * exitPrice - commission;

    const trade: TradeResult = {
      id: `trade_${this.state.trades.length + 1}`,
      entryTime: position.entryTime,
      exitTime,
      symbol: position.symbol,
      side: position.side,
      entryPrice: position.entryPrice,
      exitPrice,
      quantity: position.quantity,
      pnl: netPnl,
      pnlPercent,
      commission,
      slippage: 0, // simplified
      holdingPeriod: this.calculateHoldingPeriod(position.entryTime, exitTime),
      entryReason: 'Strategy Signal',
      exitReason
    };

    this.state.trades.push(trade);
    console.log(`Closed ${position.side} position: PnL ${netPnl.toFixed(2)} (${pnlPercent.toFixed(2)}%)`);
  }

  // Close all positions (end of backtest)
  private closeAllPositions(finalBar: MarketData) {
    this.state.positions.forEach(position => {
      this.closePosition(position, finalBar.close, finalBar.timestamp, 'End of Backtest');
    });
    this.state.positions = [];
  }

  // Record equity point
  private recordEquity(bar: MarketData) {
    const positionValue = this.state.positions.reduce((sum, pos) => {
      return sum + pos.quantity * bar.close;
    }, 0);

    const totalEquity = this.state.cash + positionValue;
    const returns = this.state.equity.length > 0
      ? (totalEquity - this.state.equity[this.state.equity.length - 1].equity) / this.state.equity[this.state.equity.length - 1].equity
      : 0;

    const maxEquity = Math.max(...this.state.equity.map(e => e.equity), totalEquity);
    const drawdown = maxEquity > 0 ? (maxEquity - totalEquity) / maxEquity : 0;

    this.state.equity.push({
      timestamp: bar.timestamp,
      equity: totalEquity,
      returns,
      drawdown
    });
  }

  // Calculate Simple Moving Average
  private calculateSMA(period: number): number | null {
    if (this.state.currentBar < period) return null;

    const sum = this.data
      .slice(this.state.currentBar - period + 1, this.state.currentBar + 1)
      .reduce((acc, bar) => acc + bar.close, 0);

    return sum / period;
  }

  // Calculate holding period in hours
  private calculateHoldingPeriod(entryTime: string, exitTime: string): number {
    const entry = new Date(entryTime);
    const exit = new Date(exitTime);
    return (exit.getTime() - entry.getTime()) / (1000 * 60 * 60); // hours
  }

  // Calculate performance metrics
  private calculatePerformance(): PerformanceMetrics {
    if (this.state.trades.length === 0) {
      return this.getEmptyPerformanceMetrics();
    }

    const initialCapital = this.config.initialCapital;
    const finalEquity = this.state.equity[this.state.equity.length - 1]?.equity || initialCapital;
    const totalReturn = ((finalEquity - initialCapital) / initialCapital) * 100;

    // Calculate returns array
    const returns = this.state.equity.map(e => e.returns).filter(r => !isNaN(r));
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1)
    ) * Math.sqrt(252); // Annualized

    const annualizedReturn = totalReturn; // Simplified
    const riskFreeRate = 0.02; // 2% risk-free rate
    const sharpeRatio = volatility > 0 ? (annualizedReturn / 100 - riskFreeRate) / volatility : 0;

    // Downside returns for Sortino ratio
    const downReturns = returns.filter(r => r < 0);
    const downVolatility = downReturns.length > 0
      ? Math.sqrt(downReturns.reduce((sum, r) => sum + r * r, 0) / downReturns.length) * Math.sqrt(252)
      : 0;
    const sortinoRatio = downVolatility > 0 ? (annualizedReturn / 100 - riskFreeRate) / downVolatility : 0;

    const maxDrawdown = Math.max(...this.state.equity.map(e => e.drawdown)) * 100;
    const winningTrades = this.state.trades.filter(t => t.pnl > 0).length;
    const losingTrades = this.state.trades.filter(t => t.pnl < 0).length;
    const winRate = (winningTrades / this.state.trades.length) * 100;

    const grossWins = this.state.trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const grossLosses = Math.abs(this.state.trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = grossLosses > 0 ? grossWins / grossLosses : 0;

    const avgWin = winningTrades > 0 ? grossWins / winningTrades / initialCapital * 100 : 0;
    const avgLoss = losingTrades > 0 ? grossLosses / losingTrades / initialCapital * 100 : 0;

    // Tính toán tỷ lệ lãi/lỗ net (đã trừ chi phí)
    const winningTradesList = this.state.trades.filter(t => t.pnl > 0);
    const losingTradesList = this.state.trades.filter(t => t.pnl < 0);
    
    // Tính tỷ lệ lãi net trung bình: trung bình của (Lợi nhuận net)/(Giá vào*Khối lượng) cho các giao dịch thắng
    const avgWinNet = winningTradesList.length > 0 
      ? winningTradesList.reduce((sum, trade) => {
          const tradeValue = trade.entryPrice * trade.quantity;
          const netReturn = trade.pnl / tradeValue; // Lợi nhuận net / (Giá vào * Khối lượng)
          return sum + netReturn;
        }, 0) / winningTradesList.length * 100 // Chuyển thành phần trăm
      : 0;
    
    // Tính tỷ lệ lỗ net trung bình: trung bình của (Lợi nhuận net)/(Giá vào*Khối lượng) cho các giao dịch thua
    const avgLossNet = losingTradesList.length > 0 
      ? losingTradesList.reduce((sum, trade) => {
          const tradeValue = trade.entryPrice * trade.quantity;
          const netReturn = trade.pnl / tradeValue; // Lợi nhuận net / (Giá vào * Khối lượng)
          return sum + netReturn;
        }, 0) / losingTradesList.length * 100 // Chuyển thành phần trăm
      : 0;

    const calmarRatio = maxDrawdown > 0 ? annualizedReturn / maxDrawdown : 0;

    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      sortinoRatio,
      maxDrawdown,
      winRate,
      profitFactor,
      avgWin,
      avgLoss,
      avgWinNet,
      avgLossNet,
      totalTrades: this.state.trades.length,
      winningTrades,
      losingTrades,
      volatility,
      calmarRatio,
      beta: 1, // Simplified
      alpha: annualizedReturn - riskFreeRate * 100 // Simplified
    };
  }

  private getEmptyPerformanceMetrics(): PerformanceMetrics {
    return {
      totalReturn: 0,
      annualizedReturn: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      maxDrawdown: 0,
      winRate: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      avgWinNet: 0,
      avgLossNet: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      volatility: 0,
      calmarRatio: 0,
      beta: 0,
      alpha: 0
    };
  }
}

// Generate sample market data for backtesting
export function generateSampleMarketData(days: number = 365): MarketData[] {
  const data: MarketData[] = [];
  let price = 50000; // Starting price

  for (let i = 0; i < days; i++) {
    const timestamp = new Date(Date.now() - (days - i) * 24 * 60 * 60 * 1000).toISOString();
    
    // Random walk with slight upward bias
    const dailyReturn = (Math.random() - 0.48) * 0.05; // Slight positive bias
    const newPrice = price * (1 + dailyReturn);
    
    // Generate OHLC
    const high = newPrice * (1 + Math.random() * 0.02);
    const low = newPrice * (1 - Math.random() * 0.02);
    const open = price;
    const close = newPrice;
    const volume = 1000000 + Math.random() * 5000000;

    data.push({
      timestamp,
      open,
      high,
      low,
      close,
      volume
    });

    price = newPrice;
  }

  return data;
} 