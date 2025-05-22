/**
 * Định nghĩa các interface và type cho chiến lược giao dịch
 */

// Loại tín hiệu giao dịch
export enum SignalType {
  BUY = 'BUY',
  SELL = 'SELL',
  STRONG_BUY = 'STRONG_BUY',
  STRONG_SELL = 'STRONG_SELL',
  HOLD = 'HOLD',
}

// Hướng vị thế
export enum PositionDirection {
  LONG = 'LONG',
  SHORT = 'SHORT',
}

// Trạng thái vị thế
export enum PositionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
}

// Kích thước vị thế
export enum PositionSizingType {
  FIXED = 'FIXED',         // Kích thước cố định
  PERCENTAGE = 'PERCENTAGE', // Phần trăm vốn
  RISK_BASED = 'RISK_BASED', // Dựa trên rủi ro
}

// Tín hiệu giao dịch
export interface Signal {
  type: SignalType;
  timestamp: number;
  symbol: string;
  price: number;
  strength: number; // 0-1
  reason: string;
  indicators: Record<string, number | string | boolean>;
}

// Vị thế giao dịch
export interface Position {
  id: string;
  symbol: string;
  direction: PositionDirection;
  entryPrice: number;
  exitPrice?: number;
  entryTime: number;
  exitTime?: number;
  size: number; // Kích thước vị thế (số lượng)
  value: number; // Giá trị vị thế (tiền)
  stopLoss?: number;
  takeProfit?: number;
  trailingStop?: number;
  trailingActivated?: boolean;
  status: PositionStatus;
  pnl?: number; // Lãi/lỗ
  pnlPercentage?: number; // Lãi/lỗ (%)
  fee?: number; // Phí giao dịch
  tags?: string[]; // Các tag cho vị thế
}

// Điểm trên đường cong vốn
export interface EquityPoint {
  time: number;
  equity: number;
}

// Kết quả backtesting
export interface BacktestResult {
  strategyName: string;
  symbol: string;
  timeframe: string;
  startTime: number;
  endTime: number;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number; // %
  annualizedReturn: number; // %
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number; // %
  averageTrade: number; // $ per trade
  averageWin: number; // $ per winning trade
  averageLoss: number; // $ per losing trade
  profitFactor: number; // Total win / Total loss
  maxDrawdown: number; // %
  maxDrawdownAmount: number; // $
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  sharpeRatio: number;
  sortinoRatio: number;
  trades: Position[];
  equityCurve: EquityPoint[];
  monthlyReturns: Record<string, number>; // YYYY-MM: return%
  bestTrade: number;
  worstTrade: number;
  averageHoldingTime: number; // ms
  maxHoldingTime: number; // ms
  minHoldingTime: number; // ms
  averageProfit: number;
}

// Tham số chung cho chiến lược
export interface StrategyParams {
  symbol: string;
  timeframe: string;
  capital: number;
  leverageMultiplier: number;
  positionSizingType: PositionSizingType;
  positionSize: number; // Số tiền cố định hoặc phần trăm
  riskPerTrade: number; // % rủi ro mỗi giao dịch (cho RISK_BASED)
  maxOpenPositions: number;
  maxLoss: number; // % lỗ tối đa
  trailingStopEnabled: boolean;
  trailingStopActivation: number; // % để kích hoạt trailing stop
  trailingStopDistance: number; // % khoảng cách trailing stop
  
  // Các tham số khác, sẽ được mở rộng bởi từng chiến lược
  [key: string]: any;
}

// Interface cho chiến lược giao dịch
export interface TradingStrategy {
  name: string;
  description: string;
  
  // Khởi tạo chiến lược với tham số
  initialize(params: StrategyParams): void;
  
  // Phân tích dữ liệu và tạo tín hiệu
  analyze(candles: any[], indicators?: any): Signal[];
  
  // Chạy backtesting với dữ liệu lịch sử
  backtest(candles: any[], indicators?: any): BacktestResult;
  
  // Tối ưu hóa tham số dựa trên dữ liệu lịch sử
  optimize(
    candles: any[],
    paramRanges: Record<string, [number, number, number]>, // [min, max, step]
    indicators?: any
  ): { optimizedParams: StrategyParams; backtestResult: BacktestResult };
  
  // Cập nhật tham số
  updateParams(params: Partial<StrategyParams>): void;
  
  // Lấy tham số hiện tại
  getParams(): StrategyParams;
  
  // Nhận tín hiệu mới nhất
  getLatestSignal(): Signal | null;
} 