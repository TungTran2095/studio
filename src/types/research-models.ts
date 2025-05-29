// Types cho module Research & Model Development

export interface ModelType {
  id: string;
  name: string;
  category: 'statistical' | 'machine_learning' | 'financial_math';
  description: string;
  complexityLevel: 'beginner' | 'intermediate' | 'advanced';
  requiredData: string[];
  estimatedTrainingTime: string;
}

export interface StatisticalModel extends ModelType {
  category: 'statistical';
  algorithmType: 'linear_regression' | 'arima' | 'garch' | 'var' | 'cointegration';
  parameters: {
    [key: string]: any;
  };
}

export interface MachineLearningModel extends ModelType {
  category: 'machine_learning';
  algorithmType: 'random_forest' | 'gradient_boosting' | 'neural_network' | 'svm' | 'xgboost' | 'lstm';
  hyperparameters: {
    [key: string]: any;
  };
  featureEngineering: FeatureConfig[];
}

export interface FinancialModel extends ModelType {
  category: 'financial_math';
  algorithmType: 'black_scholes' | 'capm' | 'var_model' | 'monte_carlo' | 'binomial_tree';
  marketParams: {
    riskFreeRate?: number;
    volatility?: number;
    dividend?: number;
    [key: string]: any;
  };
}

export interface FeatureConfig {
  id: string;
  name: string;
  type: 'technical_indicator' | 'price_feature' | 'volume_feature' | 'sentiment' | 'macro_economic';
  source: string;
  parameters: {
    [key: string]: any;
  };
  enabled: boolean;
}

export interface ModelTrainingConfig {
  modelId: string;
  dataSource: {
    symbol: string;
    timeframe: string;
    startDate: string;
    endDate: string;
  };
  features: FeatureConfig[];
  splitRatio: {
    train: number;
    validation: number;
    test: number;
  };
  optimizationMethod: 'grid_search' | 'random_search' | 'bayesian_optimization';
  crossValidation: {
    folds: number;
    method: 'time_series' | 'stratified';
  };
}

export interface BacktestConfig {
  modelId: string;
  strategy: TradingStrategy;
  period: {
    start: string;
    end: string;
  };
  initialCapital: number;
  commission: number;
  slippage: number;
  riskManagement: RiskManagementRules;
}

export interface TradingStrategy {
  id: string;
  name: string;
  entryRules: TradingRule[];
  exitRules: TradingRule[];
  positionSizing: PositionSizingRule;
  signals: SignalConfig[];
}

export interface TradingRule {
  id: string;
  condition: string;
  operator: 'greater_than' | 'less_than' | 'crosses_above' | 'crosses_below' | 'between';
  value: number | string;
  enabled: boolean;
}

export interface PositionSizingRule {
  method: 'fixed_amount' | 'fixed_percentage' | 'kelly_criterion' | 'volatility_based';
  parameters: {
    [key: string]: any;
  };
}

export interface SignalConfig {
  id: string;
  name: string;
  type: 'buy' | 'sell' | 'hold';
  strength: number; // 0-1
  confidence: number; // 0-1
}

export interface RiskManagementRules {
  maxPositionSize: number; // percentage of portfolio
  stopLoss: number; // percentage
  takeProfit: number; // percentage
  maxDrawdown: number; // percentage
  maxConcurrentPositions: number;
  riskPerTrade: number; // percentage
}

export interface BacktestResult {
  id: string;
  modelId: string;
  config: BacktestConfig;
  performance: PerformanceMetrics;
  trades: TradeResult[];
  equity: EquityPoint[];
  createdAt: string;
  status: 'running' | 'completed' | 'failed';
}

export interface PerformanceMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  sortinoRatio: number;
  maxDrawdown: number;
  winRate: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  volatility: number;
  calmarRatio: number;
  beta: number;
  alpha: number;
}

export interface TradeResult {
  id: string;
  entryTime: string;
  exitTime: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnl: number;
  pnlPercent: number;
  commission: number;
  slippage: number;
  holdingPeriod: number; // in hours
  entryReason: string;
  exitReason: string;
}

export interface EquityPoint {
  timestamp: string;
  equity: number;
  returns: number;
  drawdown: number;
}

export interface ModelTrainingResult {
  id: string;
  modelId: string;
  config: ModelTrainingConfig;
  performance: ModelPerformanceMetrics;
  parameters: {
    [key: string]: any;
  };
  features: FeatureImportance[];
  validationResults: ValidationResult[];
  status: 'training' | 'completed' | 'failed';
  createdAt: string;
  trainingTime: number; // in seconds
}

export interface ModelPerformanceMetrics {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  mse?: number;
  rmse?: number;
  mae?: number;
  r2?: number;
  auc?: number;
  logLoss?: number;
  directionalAccuracy?: number; // for price direction prediction
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  rank: number;
}

export interface ValidationResult {
  fold: number;
  trainScore: number;
  validationScore: number;
  testScore: number;
  metrics: ModelPerformanceMetrics;
}

export interface HypothesisTest {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  nullHypothesis: string;
  alternativeHypothesis: string;
  testType: 'correlation' | 't_test' | 'anova' | 'chi_square' | 'granger_causality';
  variables: TestVariable[];
  results: HypothesisTestResult;
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
}

export interface TestVariable {
  name: string;
  type: 'independent' | 'dependent';
  dataSource: string;
  transformation?: string;
}

export interface HypothesisTestResult {
  testStatistic: number;
  pValue: number;
  criticalValue: number;
  confidenceLevel: number;
  isSignificant: boolean;
  effect_size?: number;
  interpretation: string;
  visualizations: TestVisualization[];
}

export interface TestVisualization {
  type: 'scatter' | 'histogram' | 'box_plot' | 'correlation_matrix';
  data: any;
  config: any;
}

export interface ResearchProject {
  id: string;
  name: string;
  description: string;
  objective: string;
  models: string[]; // model IDs
  hypotheses: string[]; // hypothesis test IDs
  backtests: string[]; // backtest IDs
  status: 'active' | 'completed' | 'archived';
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface ModelOptimizationJob {
  id: string;
  modelId: string;
  method: 'grid_search' | 'random_search' | 'bayesian_optimization' | 'genetic_algorithm';
  parameterSpace: {
    [parameter: string]: {
      type: 'continuous' | 'discrete' | 'categorical';
      range?: [number, number];
      values?: any[];
    };
  };
  objective: 'maximize_sharpe' | 'minimize_drawdown' | 'maximize_return' | 'minimize_volatility';
  iterations: number;
  currentIteration: number;
  bestParams: {
    [key: string]: any;
  };
  bestScore: number;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  estimatedTimeRemaining: number; // in minutes
  results: OptimizationResult[];
  createdAt: string;
}

export interface OptimizationResult {
  iteration: number;
  parameters: {
    [key: string]: any;
  };
  score: number;
  metrics: PerformanceMetrics;
  timestamp: string;
} 