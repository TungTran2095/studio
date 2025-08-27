/**
 * Utility functions để parse và format dữ liệu từ experiment results
 */

export interface TradingMetrics {
  totalTrades: number;
  winRate: number;
  totalReturn: number;
  avgWinNet: number;
  avgLossNet: number;
  maxDrawdown: number;
  sharpeRatio: number;
  profitFactor?: number;
  finalCapital?: number;
  initialCapital?: number;
}

export interface ExperimentCardData {
  id: string;
  name: string;
  type: string;
  status: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
  tradingMetrics?: TradingMetrics;
}

/**
 * Parse trading metrics từ experiment results
 */
export function parseTradingMetrics(results: any): TradingMetrics | null {
  if (!results || typeof results !== 'object') {
    return null;
  }

  // Các key có thể có trong results
  const metrics = {
    totalTrades: results.total_trades || results.totalTrades || 0,
    winRate: results.win_rate || results.winRate || 0,
    totalReturn: results.total_return || results.totalReturn || 0,
    avgWinNet: results.avg_win_net || results.avgWin || 0,
    avgLossNet: results.avg_loss_net || results.avgLoss || 0,
    maxDrawdown: results.max_drawdown || results.maxDrawdown || 0,
    sharpeRatio: results.sharpe_ratio || results.sharpeRatio || 0,
    profitFactor: results.profit_factor || results.profitFactor,
    finalCapital: results.final_capital || results.finalCapital,
    initialCapital: results.initial_capital || results.initialCapital
  };

  // Kiểm tra xem có đủ dữ liệu cơ bản không
  if (metrics.totalTrades === 0 && metrics.totalReturn === 0) {
    return null;
  }

  return metrics;
}

/**
 * Format trading metrics để hiển thị trên UI
 */
export function formatTradingMetrics(metrics: TradingMetrics) {
  return {
    totalTrades: metrics.totalTrades,
    winRate: `${metrics.winRate.toFixed(2)}%`,
    totalReturn: `${metrics.totalReturn.toFixed(2)}%`,
    avgWinNet: metrics.avgWinNet > 0 ? `+${metrics.avgWinNet.toFixed(2)}%` : `${metrics.avgWinNet.toFixed(2)}%`,
    avgLossNet: metrics.avgLossNet < 0 ? `${metrics.avgLossNet.toFixed(2)}%` : `-${metrics.avgLossNet.toFixed(2)}%`,
    maxDrawdown: `${metrics.maxDrawdown.toFixed(2)}%`,
    sharpeRatio: metrics.sharpeRatio.toFixed(2),
    profitFactor: metrics.profitFactor ? metrics.profitFactor.toFixed(2) : 'N/A',
    finalCapital: metrics.finalCapital,
    initialCapital: metrics.initialCapital
  };
}

/**
 * Parse experiment data để hiển thị trên card
 */
export function parseExperimentForCard(experiment: any): ExperimentCardData {
  const tradingMetrics = parseTradingMetrics(experiment.results);
  
  return {
    id: experiment.id,
    name: experiment.name,
    type: experiment.type,
    status: experiment.status,
    progress: experiment.progress || 0,
    createdAt: experiment.created_at,
    updatedAt: experiment.updated_at,
    tradingMetrics: tradingMetrics || undefined
  };
}

/**
 * Kiểm tra xem experiment có trading metrics không
 */
export function hasTradingMetrics(experiment: any): boolean {
  return experiment.results && 
         typeof experiment.results === 'object' && 
         (experiment.results.total_trades || experiment.results.totalTrades);
}

/**
 * Lấy trading metrics summary cho experiment
 */
export function getTradingMetricsSummary(experiment: any): string {
  if (!hasTradingMetrics(experiment)) {
    return 'Chưa có dữ liệu trading';
  }

  const metrics = parseTradingMetrics(experiment.results);
  if (!metrics) {
    return 'Dữ liệu trading không hợp lệ';
  }

  return `${metrics.totalTrades} trades | ${metrics.winRate.toFixed(1)}% win rate | ${metrics.totalReturn.toFixed(1)}% return`;
}
