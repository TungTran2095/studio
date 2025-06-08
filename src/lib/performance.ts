// Tính lợi nhuận
export function calculateReturns(equity: number[]): number {
  if (equity.length < 2) return 0;
  return (equity[equity.length - 1] - equity[0]) / equity[0];
}

// Tính Sharpe Ratio
export function calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.02): number {
  if (returns.length < 2) return 0;
  
  const excessReturns = returns.map(r => r - riskFreeRate / 252); // Chuyển đổi lãi suất phi rủi ro thành daily
  const avgExcessReturn = excessReturns.reduce((a, b) => a + b, 0) / returns.length;
  const stdDev = Math.sqrt(
    excessReturns.reduce((a, b) => a + Math.pow(b - avgExcessReturn, 2), 0) / (returns.length - 1)
  );
  
  if (stdDev === 0) return 0;
  return (avgExcessReturn / stdDev) * Math.sqrt(252); // Annualize
}

// Tính Maximum Drawdown
export function calculateMaxDrawdown(equity: number[]): number {
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

// Tính Win Rate
export function calculateWinRate(trades: { entry: number, exit: number }[]): number {
  if (trades.length === 0) return 0;
  
  const winningTrades = trades.filter(trade => trade.exit > trade.entry).length;
  return winningTrades / trades.length;
}

// Tính Profit Factor
export function calculateProfitFactor(trades: { entry: number, exit: number }[]): number {
  if (trades.length === 0) return 0;
  
  const profits = trades
    .filter(trade => trade.exit > trade.entry)
    .reduce((sum, trade) => sum + (trade.exit - trade.entry), 0);
    
  const losses = trades
    .filter(trade => trade.exit <= trade.entry)
    .reduce((sum, trade) => sum + (trade.entry - trade.exit), 0);
    
  if (losses === 0) return profits > 0 ? Infinity : 0;
  return profits / losses;
}

// Tính Average Trade
export function calculateAverageTrade(trades: { entry: number, exit: number }[]): number {
  if (trades.length === 0) return 0;
  
  const totalPnL = trades.reduce((sum, trade) => sum + (trade.exit - trade.entry), 0);
  return totalPnL / trades.length;
}

// Tính Risk-Adjusted Return
export function calculateRiskAdjustedReturn(
  returns: number[],
  riskFreeRate: number = 0.02
): number {
  const sharpeRatio = calculateSharpeRatio(returns, riskFreeRate);
  const maxDrawdown = calculateMaxDrawdown(returns);
  
  if (maxDrawdown === 0) return 0;
  return sharpeRatio / maxDrawdown;
}

// Tính Compound Annual Growth Rate (CAGR)
export function calculateCAGR(
  initialCapital: number,
  finalCapital: number,
  years: number
): number {
  if (years <= 0 || initialCapital <= 0) return 0;
  return Math.pow(finalCapital / initialCapital, 1 / years) - 1;
}

// Tính Volatility
export function calculateVolatility(returns: number[]): number {
  if (returns.length < 2) return 0;
  
  const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
  const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / (returns.length - 1);
  return Math.sqrt(variance) * Math.sqrt(252); // Annualize
} 