import { createClient } from '@supabase/supabase-js';
import type { OhlcvHistory } from '@/lib/supabase-client';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Interface cho dữ liệu OHLCV đã được xử lý
export interface ProcessedCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
}

// Interface cho kết quả backtest
export interface BacktestResult {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  volatility: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  trades: Trade[];
}

// Interface cho giao dịch
export interface Trade {
  entryTime: number;
  exitTime: number;
  entryPrice: number;
  exitPrice: number;
  position: 'LONG' | 'SHORT';
  pnl: number;
  pnlPercentage: number;
}

// Interface cho tham số chiến lược
export interface StrategyParams {
  fastPeriod: number;
  slowPeriod: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
}

// Interface cho kết quả Walk Forward
export interface WalkForwardPeriod {
  id: string;
  startDate: string;
  endDate: string;
  inSampleStart: string;
  inSampleEnd: string;
  outSampleStart: string;
  outSampleEnd: string;
  optimizedParams: StrategyParams;
  inSampleMetrics: BacktestResult;
  outSampleMetrics: BacktestResult;
  parameterDrift: number;
  stability: number;
  status: 'completed' | 'running' | 'pending' | 'failed';
}

export class WalkForwardService {
  /**
   * Lấy dữ liệu OHLCV từ Supabase
   */
  async fetchOHLCVData(startDate: string, endDate: string): Promise<ProcessedCandle[]> {
    try {
      const { data, error } = await supabase
        .from('OHLCV_BTC_USDT_1m')
        .select('*')
        .gte('open_time', startDate)
        .lte('open_time', endDate)
        .order('open_time', { ascending: true });

      if (error) {
        console.error('Error fetching OHLCV data:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error(`No data found between ${startDate} and ${endDate}`);
      }

      // Chuyển đổi dữ liệu sang format chuẩn
      return data.map((row: OhlcvHistory) => ({
        timestamp: new Date(row.open_time).getTime(),
        open: parseFloat(row.open.toString()),
        high: parseFloat(row.high.toString()),
        low: parseFloat(row.low.toString()),
        close: parseFloat(row.close.toString()),
        volume: parseFloat(row.volume.toString()),
        date: row.open_time
      }));
    } catch (error) {
      console.error('Error in fetchOHLCVData:', error);
      throw error;
    }
  }

  /**
   * Tính toán Moving Average
   */
  calculateMA(prices: number[], period: number): number[] {
    const ma = [];
    for (let i = 0; i < prices.length; i++) {
      if (i < period - 1) {
        ma.push(NaN);
      } else {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        ma.push(sum / period);
      }
    }
    return ma;
  }

  /**
   * Chiến lược Moving Average Crossover
   */
  runMACrossoverStrategy(candles: ProcessedCandle[], params: StrategyParams): BacktestResult {
    const { fastPeriod, slowPeriod, stopLoss, takeProfit, positionSize } = params;
    
    const closes = candles.map(c => c.close);
    const fastMA = this.calculateMA(closes, fastPeriod);
    const slowMA = this.calculateMA(closes, slowPeriod);
    
    let position: 'LONG' | 'SHORT' | null = null;
    let entryPrice = 0;
    let entryTime = 0;
    const trades: Trade[] = [];
    let capital = 10000; // Starting capital
    let maxCapital = capital;
    let maxDrawdown = 0;
    
    for (let i = slowPeriod; i < candles.length; i++) {
      const candle = candles[i];
      const currentPrice = candle.close;
      
      // Check for entry signals
      if (position === null) {
        if (fastMA[i] > slowMA[i] && fastMA[i-1] <= slowMA[i-1]) {
          // Golden cross - buy signal
          position = 'LONG';
          entryPrice = currentPrice;
          entryTime = candle.timestamp;
        } else if (fastMA[i] < slowMA[i] && fastMA[i-1] >= slowMA[i-1]) {
          // Death cross - sell signal
          position = 'SHORT';
          entryPrice = currentPrice;
          entryTime = candle.timestamp;
        }
      } else {
        // Check for exit signals
        let shouldExit = false;
        let exitPrice = currentPrice;
        let exitReason = '';
        
        if (position === 'LONG') {
          const pnl = (currentPrice - entryPrice) / entryPrice;
          if (fastMA[i] < slowMA[i] || pnl <= -stopLoss || pnl >= takeProfit) {
            shouldExit = true;
            exitReason = pnl <= -stopLoss ? 'stop_loss' : pnl >= takeProfit ? 'take_profit' : 'signal';
          }
        } else if (position === 'SHORT') {
          const pnl = (entryPrice - currentPrice) / entryPrice;
          if (fastMA[i] > slowMA[i] || pnl <= -stopLoss || pnl >= takeProfit) {
            shouldExit = true;
            exitReason = pnl <= -stopLoss ? 'stop_loss' : pnl >= takeProfit ? 'take_profit' : 'signal';
          }
        }
        
        if (shouldExit) {
          const pnl = position === 'LONG' 
            ? (currentPrice - entryPrice) / entryPrice
            : (entryPrice - currentPrice) / entryPrice;
          
          const tradeAmount = capital * positionSize * Math.abs(pnl);
          capital += position === 'LONG' ? tradeAmount : tradeAmount;
          
          trades.push({
            entryTime,
            exitTime: candle.timestamp,
            entryPrice,
            exitPrice,
            position,
            pnl: tradeAmount,
            pnlPercentage: pnl * 100
          });
          
          // Update max drawdown
          if (capital > maxCapital) {
            maxCapital = capital;
          }
          const drawdown = (maxCapital - capital) / maxCapital;
          if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
          }
          
          position = null;
        }
      }
    }
    
    // Calculate metrics
    const totalReturn = (capital - 10000) / 10000;
    const winningTrades = trades.filter(t => t.pnl > 0).length;
    const losingTrades = trades.filter(t => t.pnl < 0).length;
    const winRate = trades.length > 0 ? winningTrades / trades.length : 0;
    
    const totalWins = trades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0);
    const totalLosses = Math.abs(trades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0));
    const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;
    
    // Calculate volatility (simplified)
    const returns = trades.map(t => t.pnlPercentage / 100);
    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
    const volatility = Math.sqrt(variance);
    
    // Calculate Sharpe ratio (simplified, assuming risk-free rate = 0)
    const sharpeRatio = volatility > 0 ? avgReturn / volatility : 0;
    
    return {
      totalReturn: totalReturn * 100,
      sharpeRatio,
      maxDrawdown: maxDrawdown * 100,
      volatility: volatility * 100,
      winRate: winRate * 100,
      profitFactor,
      totalTrades: trades.length,
      winningTrades,
      losingTrades,
      trades
    };
  }

  /**
   * Tối ưu hóa tham số bằng Grid Search
   */
  optimizeParameters(
    candles: ProcessedCandle[],
    paramRanges: {
      fastPeriod: [number, number, number];
      slowPeriod: [number, number, number];
      stopLoss: [number, number, number];
      takeProfit: [number, number, number];
    }
  ): StrategyParams {
    const [fastMin, fastMax, fastStep] = paramRanges.fastPeriod;
    const [slowMin, slowMax, slowStep] = paramRanges.slowPeriod;
    const [stopMin, stopMax, stopStep] = paramRanges.stopLoss;
    const [takeMin, takeMax, takeStep] = paramRanges.takeProfit;
    
    let bestParams: StrategyParams = {
      fastPeriod: fastMin,
      slowPeriod: slowMin,
      stopLoss: stopMin,
      takeProfit: takeMin,
      positionSize: 0.1
    };
    
    let bestSharpe = -Infinity;
    
    // Grid search
    for (let fast = fastMin; fast <= fastMax; fast += fastStep) {
      for (let slow = slowMin; slow <= slowMax; slow += slowStep) {
        if (fast >= slow) continue; // Fast MA must be faster than slow MA
        
        for (let stop = stopMin; stop <= stopMax; stop += stopStep) {
          for (let take = takeMin; take <= takeMax; take += takeStep) {
            const params: StrategyParams = {
              fastPeriod: fast,
              slowPeriod: slow,
              stopLoss: stop,
              takeProfit: take,
              positionSize: 0.1
            };
            
            try {
              const result = this.runMACrossoverStrategy(candles, params);
              
              // Use Sharpe ratio as optimization objective
              if (result.sharpeRatio > bestSharpe && result.totalTrades > 10) {
                bestSharpe = result.sharpeRatio;
                bestParams = params;
              }
            } catch (error) {
              console.warn('Error in parameter combination:', error);
            }
          }
        }
      }
    }
    
    return bestParams;
  }

  /**
   * Tính toán parameter drift
   */
  calculateParameterDrift(currentParams: StrategyParams, previousParams: StrategyParams): number {
    if (!previousParams) return 0;
    
    const params = ['fastPeriod', 'slowPeriod', 'stopLoss', 'takeProfit'] as const;
    let totalDrift = 0;
    
    params.forEach(param => {
      const current = currentParams[param];
      const previous = previousParams[param];
      const drift = Math.abs(current - previous) / Math.abs(previous);
      totalDrift += drift;
    });
    
    return totalDrift / params.length;
  }

  /**
   * Tạo các periods cho Walk Forward Analysis
   */
  generateWalkForwardPeriods(
    totalPeriod: number,
    inSamplePeriod: number,
    outSamplePeriod: number,
    stepSize: number
  ): Array<{
    id: string;
    startDate: string;
    inSampleEndDate: string;
    endDate: string;
  }> {
    const periods = [];
    const startDate = new Date('2023-01-01');
    
    let currentStart = new Date(startDate);
    let periodId = 1;
    
    while (currentStart.getTime() < startDate.getTime() + (totalPeriod * 24 * 60 * 60 * 1000)) {
      const inSampleEnd = new Date(currentStart.getTime() + (inSamplePeriod * 24 * 60 * 60 * 1000));
      const outSampleEnd = new Date(inSampleEnd.getTime() + (outSamplePeriod * 24 * 60 * 60 * 1000));
      
      periods.push({
        id: `period-${periodId}`,
        startDate: currentStart.toISOString().split('T')[0],
        inSampleEndDate: inSampleEnd.toISOString().split('T')[0],
        endDate: outSampleEnd.toISOString().split('T')[0]
      });
      
      currentStart = new Date(currentStart.getTime() + (stepSize * 24 * 60 * 60 * 1000));
      periodId++;
    }
    
    return periods;
  }

  /**
   * Chạy Walk Forward Analysis hoàn chỉnh
   */
  async runWalkForwardAnalysis(config: {
    totalPeriod: number;
    inSamplePeriod: number;
    outSamplePeriod: number;
    stepSize: number;
    optimizationMethod: string;
    paramRanges: {
      fastPeriod: [number, number, number];
      slowPeriod: [number, number, number];
      stopLoss: [number, number, number];
      takeProfit: [number, number, number];
    };
  }): Promise<{
    periods: WalkForwardPeriod[];
    overallMetrics: {
      totalPeriods: number;
      completedPeriods: number;
      averageInSampleReturn: number;
      averageOutSampleReturn: number;
      averageStability: number;
      consistencyScore: number;
      overfittingRisk: number;
      recommendation: string;
    };
  }> {
    console.log('🔄 Starting real walk-forward analysis...');
    
    const periods = this.generateWalkForwardPeriods(
      config.totalPeriod,
      config.inSamplePeriod,
      config.outSamplePeriod,
      config.stepSize
    );
    
    const results: WalkForwardPeriod[] = [];
    let previousParams: StrategyParams | null = null;
    
    for (let i = 0; i < periods.length; i++) {
      const period = periods[i];
      console.log(`🔄 Processing period ${i + 1}/${periods.length}: ${period.startDate} - ${period.endDate}`);
      
      try {
        // Fetch in-sample data
        const inSampleData = await this.fetchOHLCVData(period.startDate, period.inSampleEndDate);
        
        // Fetch out-sample data
        const outSampleData = await this.fetchOHLCVData(period.inSampleEndDate, period.endDate);
        
        if (inSampleData.length > 0 && outSampleData.length > 0) {
          // Optimize parameters on in-sample data
          const optimizedParams = this.optimizeParameters(inSampleData, config.paramRanges);
          
          // Test on out-sample data
          const outSampleResults = this.runMACrossoverStrategy(outSampleData, optimizedParams);
          
          // Test on in-sample data for comparison
          const inSampleResults = this.runMACrossoverStrategy(inSampleData, optimizedParams);
          
          // Calculate parameter drift
          const parameterDrift = previousParams 
            ? this.calculateParameterDrift(optimizedParams, previousParams)
            : 0;
          
          // Calculate stability score
          const stability = Math.max(0, 1 - parameterDrift);
          
          results.push({
            id: period.id,
            startDate: period.startDate,
            endDate: period.endDate,
            inSampleStart: period.startDate,
            inSampleEnd: period.inSampleEndDate,
            outSampleStart: period.inSampleEndDate,
            outSampleEnd: period.endDate,
            optimizedParams,
            inSampleMetrics: inSampleResults,
            outSampleMetrics: outSampleResults,
            parameterDrift,
            stability,
            status: 'completed'
          });
          
          previousParams = optimizedParams;
        } else {
          results.push({
            id: period.id,
            startDate: period.startDate,
            endDate: period.endDate,
            inSampleStart: period.startDate,
            inSampleEnd: period.inSampleEndDate,
            outSampleStart: period.inSampleEndDate,
            outSampleEnd: period.endDate,
            optimizedParams: {} as StrategyParams,
            inSampleMetrics: {} as BacktestResult,
            outSampleMetrics: {} as BacktestResult,
            parameterDrift: 0,
            stability: 0,
            status: 'failed'
          });
        }
      } catch (error) {
        console.error(`Error processing period ${i + 1}:`, error);
        results.push({
          id: period.id,
          startDate: period.startDate,
          endDate: period.endDate,
          inSampleStart: period.startDate,
          inSampleEnd: period.inSampleEndDate,
          outSampleStart: period.inSampleEndDate,
          outSampleEnd: period.endDate,
          optimizedParams: {} as StrategyParams,
          inSampleMetrics: {} as BacktestResult,
          outSampleMetrics: {} as BacktestResult,
          parameterDrift: 0,
          stability: 0,
          status: 'failed'
        });
      }
    }
    
    // Calculate overall metrics
    const completedResults = results.filter(r => r.status === 'completed');
    
    const overallMetrics = {
      totalPeriods: results.length,
      completedPeriods: completedResults.length,
      averageInSampleReturn: completedResults.length > 0 
        ? completedResults.reduce((sum, r) => sum + r.inSampleMetrics.totalReturn, 0) / completedResults.length 
        : 0,
      averageOutSampleReturn: completedResults.length > 0 
        ? completedResults.reduce((sum, r) => sum + r.outSampleMetrics.totalReturn, 0) / completedResults.length 
        : 0,
      averageStability: completedResults.length > 0 
        ? completedResults.reduce((sum, r) => sum + r.stability, 0) / completedResults.length 
        : 0,
      consistencyScore: 0,
      overfittingRisk: 0,
      recommendation: 'no_data'
    };
    
    if (completedResults.length > 0) {
      const returnConsistency = Math.abs(
        overallMetrics.averageInSampleReturn - overallMetrics.averageOutSampleReturn
      ) / Math.abs(overallMetrics.averageInSampleReturn);
      
      overallMetrics.consistencyScore = Math.max(0, 1 - returnConsistency);
      overallMetrics.overfittingRisk = returnConsistency;
      
      // Generate recommendation
      if (overallMetrics.averageStability > 0.8 && overallMetrics.averageOutSampleReturn > 10 && overallMetrics.consistencyScore > 0.8) {
        overallMetrics.recommendation = 'excellent';
      } else if (overallMetrics.averageStability > 0.6 && overallMetrics.averageOutSampleReturn > 5 && overallMetrics.consistencyScore > 0.6) {
        overallMetrics.recommendation = 'good';
      } else if (overallMetrics.averageStability > 0.4 && overallMetrics.averageOutSampleReturn > 0 && overallMetrics.consistencyScore > 0.4) {
        overallMetrics.recommendation = 'fair';
      } else {
        overallMetrics.recommendation = 'poor';
      }
    }
    
    return {
      periods: results,
      overallMetrics
    };
  }
} 