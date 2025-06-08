export interface OHLCV {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface BacktestConfig {
  startDate: string;
  endDate: string;
  initialCapital: number;
  commission: number;
  slippage: number;
  leverage: number;
  parameters?: {
    fastPeriod?: number;
    slowPeriod?: number;
    quantity?: number;
  };
}

export interface Strategy {
  name: string;
  parameters: Record<string, any>;
  calculateSignals: (data: OHLCV[]) => Signal[];
}

export interface Signal {
  timestamp: number;
  type: 'BUY' | 'SELL';
  price: number;
  quantity: number;
}

export interface BacktestResult {
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  trades: Trade[];
  equityCurve: EquityPoint[];
  metadata?: {
    symbol: string;
    interval: string;
    startDate: string;
    endDate: string;
    dataPoints: number;
  };
}

export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  type: 'LONG' | 'SHORT';
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
}

export interface OptimizationResult {
  parameters: Record<string, any>;
  metrics: {
    totalReturn: number;
    sharpeRatio: number;
    maxDrawdown: number;
  };
} 