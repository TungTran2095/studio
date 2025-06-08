import { ExperimentConfig, ExperimentResults, TradeResult } from '@/types/experiment';
import { MarketData } from '@/types/market-data';

interface BacktestState {
  capital: number;
  positions: Map<string, TradeResult>;
  trades: TradeResult[];
}

export async function runBacktest(
  config: ExperimentConfig,
  marketData: MarketData
): Promise<ExperimentResults> {
  const state: BacktestState = {
    capital: config.initialCapital!,
    positions: new Map(),
    trades: [],
  };

  // Process each candle
  for (const candle of marketData.candles) {
    // Check for exit conditions
    await checkExitConditions(state, candle, config);
    
    // Check for entry conditions
    if (state.positions.size < (config.maxPositions || 1)) {
      await checkEntryConditions(state, candle, config);
    }
  }

  // Close any remaining positions
  for (const [symbol, position] of state.positions) {
    const lastCandle = marketData.candles[marketData.candles.length - 1];
    await closePosition(state, position, lastCandle);
  }

  return {
    trades: state.trades,
    metrics: {},
    analysis: {
      charts: [],
      tables: [],
      insights: [],
    },
  };
}

async function checkExitConditions(
  state: BacktestState,
  candle: any,
  config: ExperimentConfig
) {
  for (const [symbol, position] of state.positions) {
    if (symbol !== candle.symbol) continue;

    const shouldExit = 
      // Stop loss hit
      (position.position === 'long' && candle.low <= position.stopLoss!) ||
      (position.position === 'short' && candle.high >= position.stopLoss!) ||
      // Take profit hit
      (position.position === 'long' && candle.high >= position.takeProfit!) ||
      (position.position === 'short' && candle.low <= position.takeProfit!);

    if (shouldExit) {
      await closePosition(state, position, candle);
    }
  }
}

async function checkEntryConditions(
  state: BacktestState,
  candle: any,
  config: ExperimentConfig
) {
  // TODO: Implement entry strategy
  // This is where you would implement your trading strategy
  // For now, we'll use a simple example
  
  const positionSize = (state.capital * config.positionSize!) / candle.close;
  
  // Example: Enter long if price is above 20-period SMA
  const sma20 = calculateSMA(marketData.candles, 20);
  if (candle.close > sma20) {
    const trade: TradeResult = {
      id: crypto.randomUUID(),
      symbol: candle.symbol,
      entryTime: new Date(candle.timestamp),
      exitTime: new Date(candle.timestamp), // Will be updated when closed
      entryPrice: candle.close,
      exitPrice: candle.close, // Will be updated when closed
      position: 'long',
      size: positionSize,
      pnl: 0,
      pnlPercentage: 0,
      stopLoss: candle.close * (1 - config.stopLoss!),
      takeProfit: candle.close * (1 + config.takeProfit!),
    };
    
    state.positions.set(candle.symbol, trade);
  }
}

async function closePosition(
  state: BacktestState,
  position: TradeResult,
  candle: any
) {
  position.exitTime = new Date(candle.timestamp);
  position.exitPrice = candle.close;
  
  // Calculate PnL
  if (position.position === 'long') {
    position.pnl = (position.exitPrice - position.entryPrice) * position.size;
  } else {
    position.pnl = (position.entryPrice - position.exitPrice) * position.size;
  }
  
  position.pnlPercentage = position.pnl / (position.entryPrice * position.size);
  
  // Update capital
  state.capital += position.pnl;
  
  // Add to trades list
  state.trades.push(position);
  
  // Remove from active positions
  state.positions.delete(position.symbol);
}

function calculateSMA(candles: any[], period: number): number {
  if (candles.length < period) return 0;
  
  const sum = candles
    .slice(-period)
    .reduce((acc, candle) => acc + candle.close, 0);
    
  return sum / period;
} 