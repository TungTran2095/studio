import { ExperimentResults, TradeResult } from '@/types/experiment';

export function calculateMetrics(results: ExperimentResults) {
  const metrics = {
    totalTrades: 0,
    winRate: 0,
    profitFactor: 0,
    sharpeRatio: 0,
    maxDrawdown: 0,
  };

  if (!results.trades?.length) {
    return metrics;
  }

  // Calculate basic metrics
  metrics.totalTrades = results.trades.length;
  
  // Calculate win rate
  const winningTrades = results.trades.filter(trade => trade.pnl > 0);
  metrics.winRate = winningTrades.length / metrics.totalTrades;
  
  // Calculate profit factor
  const grossProfit = results.trades
    .filter(trade => trade.pnl > 0)
    .reduce((sum, trade) => sum + trade.pnl, 0);
  const grossLoss = Math.abs(results.trades
    .filter(trade => trade.pnl < 0)
    .reduce((sum, trade) => sum + trade.pnl, 0));
  metrics.profitFactor = grossLoss === 0 ? grossProfit : grossProfit / grossLoss;
  
  // Calculate Sharpe Ratio
  const returns = results.trades.map(trade => trade.pnlPercentage);
  const avgReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const stdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / returns.length
  );
  metrics.sharpeRatio = stdDev === 0 ? 0 : avgReturn / stdDev;
  
  // Calculate Maximum Drawdown
  let peak = 0;
  let maxDrawdown = 0;
  let currentValue = 0;
  
  results.trades.forEach(trade => {
    currentValue += trade.pnl;
    if (currentValue > peak) {
      peak = currentValue;
    }
    const drawdown = (peak - currentValue) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });
  
  metrics.maxDrawdown = maxDrawdown;
  
  return metrics;
}

export function calculateHypothesisMetrics(results: ExperimentResults) {
  // TODO: Implement hypothesis test metrics
  return {
    pValue: 0,
    confidenceInterval: [0, 0] as [number, number],
  };
} 