export type ExperimentType = 'backtest' | 'hypothesis';

export type ExperimentStatus = 'draft' | 'running' | 'completed' | 'failed';

export interface ExperimentConfig {
  id: string;
  name: string;
  description?: string;
  type: ExperimentType;
  status: ExperimentStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  
  // Cấu hình chung
  startDate: Date;
  endDate: Date;
  symbols: string[];
  timeframe: string;
  
  // Cấu hình backtest
  initialCapital?: number;
  positionSize?: number;
  stopLoss?: number;
  takeProfit?: number;
  maxPositions?: number;
  
  // Cấu hình hypothesis test
  hypothesis?: string;
  significanceLevel?: number;
  testType?: 't-test' | 'z-test' | 'chi-square' | 'anova';
  variables?: {
    independent: string[];
    dependent: string[];
  };
  
  // Kết quả
  results?: ExperimentResults;
}

export interface ExperimentResults {
  metrics: {
    totalTrades?: number;
    winRate?: number;
    profitFactor?: number;
    sharpeRatio?: number;
    maxDrawdown?: number;
    pValue?: number;
    confidenceInterval?: [number, number];
  };
  trades?: TradeResult[];
  analysis?: {
    charts: string[];
    tables: string[];
    insights: string[];
  };
}

export interface TradeResult {
  id: string;
  symbol: string;
  entryTime: Date;
  exitTime: Date;
  entryPrice: number;
  exitPrice: number;
  position: 'long' | 'short';
  size: number;
  pnl: number;
  pnlPercentage: number;
  stopLoss?: number;
  takeProfit?: number;
}

export interface ExperimentTemplate {
  id: string;
  name: string;
  description: string;
  type: ExperimentType;
  config: Partial<ExperimentConfig>;
} 