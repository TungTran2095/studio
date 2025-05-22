/**
 * Chiến lược theo xu hướng (Trend Following)
 */

import { v4 as uuidv4 } from 'uuid';
import { 
  TradingStrategy, 
  StrategyParams, 
  Signal, 
  SignalType, 
  Position, 
  PositionDirection, 
  PositionStatus, 
  BacktestResult,
  PositionSizingType,
  EquityPoint
} from '../strategy';
import { MoneyManagement } from '../money-management';

export interface TrendFollowingParams extends StrategyParams {
  // Các tham số cho đường trung bình động
  fastEMA: number;
  slowEMA: number;
  longSMA: number;
  
  // Các tham số cho RSI
  rsiPeriod: number;
  rsiOverbought: number;
  rsiOversold: number;
  
  // Các tham số lọc tín hiệu
  volumeThreshold: number; // Phần trăm so với trung bình
  minTrendStrength: number; // 0-1
  
  // Tham số quản lý vị thế
  stopLossPercentage: number;
  takeProfitPercentage: number;
  riskRewardRatio: number;
}

export class TrendFollowingStrategy implements TradingStrategy {
  name = 'Trend Following Strategy';
  description = 'Chiến lược giao dịch theo xu hướng sử dụng EMA nhanh, EMA chậm và SMA dài hạn';
  
  private params!: TrendFollowingParams;
  private positions: Position[] = [];
  private signals: Signal[] = [];
  
  constructor() {
    // Khởi tạo với tham số mặc định
    this.initialize({
      symbol: 'BTCUSDT',
      timeframe: '1h',
      capital: 10000,
      leverageMultiplier: 1,
      positionSizingType: PositionSizingType.PERCENTAGE,
      positionSize: 10, // 10% vốn
      riskPerTrade: 1, // 1% rủi ro mỗi giao dịch
      maxOpenPositions: 1,
      maxLoss: 30, // 30% lỗ tối đa
      trailingStopEnabled: true,
      trailingStopActivation: 2, // Kích hoạt khi lợi nhuận đạt 2%
      trailingStopDistance: 1, // Khoảng cách 1%
      
      // Tham số cho trend following
      fastEMA: 10,
      slowEMA: 21,
      longSMA: 50,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      volumeThreshold: 150, // 150% khối lượng trung bình
      minTrendStrength: 0.5, // Độ mạnh xu hướng tối thiểu
      stopLossPercentage: 2,
      takeProfitPercentage: 5,
      riskRewardRatio: 2.5
    });
  }
  
  initialize(params: StrategyParams): void {
    this.params = params as TrendFollowingParams;
    this.positions = [];
    this.signals = [];
  }
  
  updateParams(params: Partial<StrategyParams>): void {
    this.params = { ...this.params, ...params };
  }
  
  getParams(): StrategyParams {
    return this.params;
  }
  
  getLatestSignal(): Signal | null {
    if (this.signals.length === 0) return null;
    return this.signals[this.signals.length - 1];
  }
  
  /**
   * Tính toán các chỉ báo kỹ thuật
   */
  private calculateIndicators(candles: any[]): any {
    // Tính toán EMA nhanh
    const fastEMA = this.calculateEMA(candles, this.params.fastEMA);
    
    // Tính toán EMA chậm
    const slowEMA = this.calculateEMA(candles, this.params.slowEMA);
    
    // Tính toán SMA dài hạn
    const longSMA = this.calculateSMA(candles, this.params.longSMA);
    
    // Tính toán RSI
    const rsi = this.calculateRSI(candles, this.params.rsiPeriod);
    
    // Tính toán khối lượng trung bình
    const avgVolume = this.calculateAverageVolume(candles, 20);
    
    return {
      fastEMA,
      slowEMA,
      longSMA,
      rsi,
      avgVolume
    };
  }
  
  /**
   * Phân tích dữ liệu và tạo tín hiệu
   */
  analyze(candles: any[]): Signal[] {
    if (candles.length < Math.max(this.params.fastEMA, this.params.slowEMA, this.params.longSMA) + 10) {
      return [];
    }
    
    const indicators = this.calculateIndicators(candles);
    const signals: Signal[] = [];
    
    // Phân tích từng nến
    for (let i = Math.max(this.params.fastEMA, this.params.slowEMA, this.params.longSMA, this.params.rsiPeriod) + 10; i < candles.length; i++) {
      const candle = candles[i];
      const price = parseFloat(candle.close);
      const timestamp = candle.closeTime;
      const volume = parseFloat(candle.volume);
      
      // Kiểm tra các điều kiện
      const isFastAboveSlow = indicators.fastEMA[i] > indicators.slowEMA[i];
      const isSlowAboveLong = indicators.slowEMA[i] > indicators.longSMA[i];
      const isFastAboveLong = indicators.fastEMA[i] > indicators.longSMA[i];
      const isVolumeHigh = volume > (indicators.avgVolume[i] * this.params.volumeThreshold / 100);
      
      // Tính toán độ mạnh xu hướng (0-1)
      const trendStrength = this.calculateTrendStrength(
        indicators.fastEMA[i], 
        indicators.slowEMA[i], 
        indicators.longSMA[i],
        indicators.rsi[i],
        price
      );
      
      // Điều kiện mua
      const isBuySignal = 
        isFastAboveSlow && 
        isSlowAboveLong && 
        isFastAboveLong && 
        indicators.rsi[i] > 50 && 
        indicators.rsi[i] < this.params.rsiOverbought &&
        trendStrength >= this.params.minTrendStrength;
      
      // Điều kiện bán
      const isSellSignal = 
        !isFastAboveSlow && 
        !isSlowAboveLong && 
        !isFastAboveLong && 
        indicators.rsi[i] < 50 && 
        indicators.rsi[i] > this.params.rsiOversold &&
        trendStrength >= this.params.minTrendStrength;
      
      // Tạo tín hiệu
      if (isBuySignal && isVolumeHigh) {
        const signal: Signal = {
          type: SignalType.BUY,
          timestamp,
          symbol: this.params.symbol,
          price,
          strength: trendStrength,
          reason: 'Fast EMA cắt lên Slow EMA, cả hai đều trên Long SMA, RSI > 50, khối lượng cao',
          indicators: {
            fastEMA: indicators.fastEMA[i],
            slowEMA: indicators.slowEMA[i],
            longSMA: indicators.longSMA[i],
            rsi: indicators.rsi[i],
            volume,
            avgVolume: indicators.avgVolume[i]
          }
        };
        signals.push(signal);
      } else if (isSellSignal && isVolumeHigh) {
        const signal: Signal = {
          type: SignalType.SELL,
          timestamp,
          symbol: this.params.symbol,
          price,
          strength: trendStrength,
          reason: 'Fast EMA cắt xuống Slow EMA, cả hai đều dưới Long SMA, RSI < 50, khối lượng cao',
          indicators: {
            fastEMA: indicators.fastEMA[i],
            slowEMA: indicators.slowEMA[i],
            longSMA: indicators.longSMA[i],
            rsi: indicators.rsi[i],
            volume,
            avgVolume: indicators.avgVolume[i]
          }
        };
        signals.push(signal);
      }
    }
    
    // Lưu tín hiệu
    this.signals = signals;
    return signals;
  }
  
  /**
   * Chạy backtest với dữ liệu lịch sử
   */
  backtest(candles: any[]): BacktestResult {
    if (candles.length < Math.max(this.params.fastEMA, this.params.slowEMA, this.params.longSMA) + 10) {
      throw new Error('Không đủ dữ liệu để chạy backtest');
    }
    
    // Phân tích và tạo tín hiệu
    const signals = this.analyze(candles);
    
    // Khởi tạo kết quả backtest
    const result: BacktestResult = {
      strategyName: this.name,
      symbol: this.params.symbol,
      timeframe: this.params.timeframe,
      startTime: candles[0].openTime,
      endTime: candles[candles.length - 1].closeTime,
      initialCapital: this.params.capital,
      finalCapital: this.params.capital,
      totalReturn: 0,
      annualizedReturn: 0,
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      winRate: 0,
      averageTrade: 0,
      averageWin: 0,
      averageLoss: 0,
      profitFactor: 0,
      maxDrawdown: 0,
      maxDrawdownAmount: 0,
      maxConsecutiveWins: 0,
      maxConsecutiveLosses: 0,
      sharpeRatio: 0,
      sortinoRatio: 0,
      trades: [],
      equityCurve: [],
      monthlyReturns: {},
      bestTrade: 0,
      worstTrade: 0,
      averageHoldingTime: 0,
      maxHoldingTime: 0,
      minHoldingTime: 0,
      averageProfit: 0
    };
    
    // Thêm điểm đầu tiên vào đường cong vốn
    result.equityCurve.push({
      time: candles[0].openTime,
      equity: this.params.capital
    });
    
    // Theo dõi vị thế hiện tại
    let currentPosition: Position | null = null;
    let equity = this.params.capital;
    let maxEquity = equity;
    let totalPnl = 0;
    let consecutiveWins = 0;
    let consecutiveLosses = 0;
    let maxConsecutiveWins = 0;
    let maxConsecutiveLosses = 0;
    let totalHoldingTime = 0;
    let totalWinAmount = 0;
    let totalLossAmount = 0;
    
    // Mô phỏng giao dịch
    for (let i = 0; i < candles.length; i++) {
      const candle = candles[i];
      const timestamp = candle.closeTime;
      const openPrice = parseFloat(candle.open);
      const closePrice = parseFloat(candle.close);
      const highPrice = parseFloat(candle.high);
      const lowPrice = parseFloat(candle.low);
      
      // Cập nhật vị thế hiện tại
      if (currentPosition) {
        // Kiểm tra xem có cần đóng vị thế hay không
        const isLong = currentPosition.direction === PositionDirection.LONG;
        let shouldClose = false;
        let closeType = '';
        let closePrice = 0;
        
        // Kiểm tra stop loss
        if (
          (isLong && lowPrice <= currentPosition.stopLoss!) || 
          (!isLong && highPrice >= currentPosition.stopLoss!)
        ) {
          shouldClose = true;
          closeType = 'Stop Loss';
          closePrice = currentPosition.stopLoss!;
        } 
        // Kiểm tra take profit
        else if (
          (isLong && highPrice >= currentPosition.takeProfit!) || 
          (!isLong && lowPrice <= currentPosition.takeProfit!)
        ) {
          shouldClose = true;
          closeType = 'Take Profit';
          closePrice = currentPosition.takeProfit!;
        }
        // Kiểm tra tín hiệu đảo chiều
        else {
          const signal = signals.find(s => s.timestamp === timestamp);
          if (
            (isLong && signal?.type === SignalType.SELL) || 
            (!isLong && signal?.type === SignalType.BUY)
          ) {
            shouldClose = true;
            closeType = 'Tín hiệu đảo chiều';
            closePrice = closePrice;
          }
        }
        
        // Cập nhật trailing stop nếu được bật
        if (this.params.trailingStopEnabled && !shouldClose) {
          const trailingStopParams = {
            activationPercentage: this.params.trailingStopActivation,
            trailingDistance: this.params.trailingStopDistance,
            entryPrice: currentPosition.entryPrice,
            direction: isLong ? 'LONG' : 'SHORT',
            currentPrice: closePrice
          };
          
          const newTrailingStop = MoneyManagement.calculateTrailingStop(trailingStopParams);
          
          if (newTrailingStop !== null) {
            // Trailing stop đã được kích hoạt
            if (!currentPosition.trailingActivated) {
              currentPosition.trailingActivated = true;
            }
            
            // Cập nhật trailing stop nếu có lợi hơn
            if (isLong) {
              if (!currentPosition.trailingStop || newTrailingStop > currentPosition.trailingStop) {
                currentPosition.trailingStop = newTrailingStop;
              }
              
              // Kiểm tra xem giá có chạm trailing stop không
              if (lowPrice <= currentPosition.trailingStop) {
                shouldClose = true;
                closeType = 'Trailing Stop';
                closePrice = currentPosition.trailingStop;
              }
            } else {
              if (!currentPosition.trailingStop || newTrailingStop < currentPosition.trailingStop) {
                currentPosition.trailingStop = newTrailingStop;
              }
              
              // Kiểm tra xem giá có chạm trailing stop không
              if (highPrice >= currentPosition.trailingStop) {
                shouldClose = true;
                closeType = 'Trailing Stop';
                closePrice = currentPosition.trailingStop;
              }
            }
          }
        }
        
        // Đóng vị thế nếu cần
        if (shouldClose) {
          currentPosition.status = PositionStatus.CLOSED;
          currentPosition.exitPrice = closePrice;
          currentPosition.exitTime = timestamp;
          
          // Tính PnL
          const entryValue = currentPosition.entryPrice * currentPosition.size;
          const exitValue = closePrice * currentPosition.size;
          
          let pnl = 0;
          if (isLong) {
            pnl = exitValue - entryValue;
          } else {
            pnl = entryValue - exitValue;
          }
          
          // Tính phí giao dịch (0.1%)
          const fee = entryValue * 0.001 + exitValue * 0.001;
          pnl -= fee;
          
          currentPosition.pnl = pnl;
          currentPosition.pnlPercentage = (pnl / entryValue) * 100;
          currentPosition.fee = fee;
          
          // Cập nhật equity
          equity += pnl;
          totalPnl += pnl;
          
          // Cập nhật thống kê
          result.totalTrades++;
          
          // Thời gian nắm giữ
          const holdingTime = currentPosition.exitTime - currentPosition.entryTime;
          totalHoldingTime += holdingTime;
          
          if (result.maxHoldingTime === 0 || holdingTime > result.maxHoldingTime) {
            result.maxHoldingTime = holdingTime;
          }
          
          if (result.minHoldingTime === 0 || holdingTime < result.minHoldingTime) {
            result.minHoldingTime = holdingTime;
          }
          
          // Win/loss
          if (pnl > 0) {
            result.winningTrades++;
            totalWinAmount += pnl;
            
            if (pnl > result.bestTrade) {
              result.bestTrade = pnl;
            }
            
            consecutiveWins++;
            consecutiveLosses = 0;
            
            if (consecutiveWins > maxConsecutiveWins) {
              maxConsecutiveWins = consecutiveWins;
            }
          } else {
            result.losingTrades++;
            totalLossAmount += Math.abs(pnl);
            
            if (pnl < result.worstTrade) {
              result.worstTrade = pnl;
            }
            
            consecutiveLosses++;
            consecutiveWins = 0;
            
            if (consecutiveLosses > maxConsecutiveLosses) {
              maxConsecutiveLosses = consecutiveLosses;
            }
          }
          
          // Thêm vị thế vào danh sách
          result.trades.push(currentPosition);
          
          // Cập nhật equity curve
          result.equityCurve.push({
            time: timestamp,
            equity
          });
          
          // Tính drawdown
          if (equity > maxEquity) {
            maxEquity = equity;
          } else {
            const drawdown = (maxEquity - equity) / maxEquity * 100;
            if (drawdown > result.maxDrawdown) {
              result.maxDrawdown = drawdown;
              result.maxDrawdownAmount = maxEquity - equity;
            }
          }
          
          // Reset vị thế hiện tại
          currentPosition = null;
        }
      }
      
      // Kiểm tra tín hiệu mới
      const signal = signals.find(s => s.timestamp === timestamp);
      
      if (signal && !currentPosition) {
        // Mở vị thế mới
        const direction = signal.type === SignalType.BUY
          ? PositionDirection.LONG
          : PositionDirection.SHORT;
        
        // Tính stop loss và take profit
        const stopLossParams = {
          entryPrice: closePrice,
          direction: direction === PositionDirection.LONG ? 'LONG' : 'SHORT',
          riskPercentage: this.params.stopLossPercentage
        };
        
        const stopLossPrice = MoneyManagement.calculateStopLoss(stopLossParams);
        
        // Tính take profit
        const takeProfitParams = {
          entryPrice: closePrice,
          stopLossPrice,
          direction: direction === PositionDirection.LONG ? 'LONG' : 'SHORT',
          riskRewardRatio: this.params.riskRewardRatio
        };
        
        const takeProfitPrice = MoneyManagement.calculateTakeProfit(takeProfitParams);
        
        // Tính kích thước vị thế
        const positionSizeParams = {
          capital: equity,
          positionSizingType: this.params.positionSizingType,
          positionSize: this.params.positionSize,
          riskPerTrade: this.params.riskPerTrade,
          entryPrice: closePrice,
          stopLossPrice,
          leverageMultiplier: this.params.leverageMultiplier
        };
        
        const size = MoneyManagement.calculatePositionSize(positionSizeParams);
        
        // Tạo vị thế
        currentPosition = {
          id: uuidv4(),
          symbol: this.params.symbol,
          direction,
          entryPrice: closePrice,
          entryTime: timestamp,
          size,
          value: closePrice * size,
          stopLoss: stopLossPrice,
          takeProfit: takeProfitPrice,
          status: PositionStatus.OPEN
        };
      }
    }
    
    // Hoàn thành backtesting
    result.finalCapital = equity;
    result.totalReturn = ((equity - this.params.capital) / this.params.capital) * 100;
    
    // Tính tỷ suất lợi nhuận hàng năm
    const durationMs = result.endTime - result.startTime;
    const durationYears = durationMs / (365 * 24 * 60 * 60 * 1000);
    result.annualizedReturn = Math.pow(1 + result.totalReturn / 100, 1 / durationYears) - 1;
    result.annualizedReturn *= 100;
    
    // Tính thống kê
    if (result.totalTrades > 0) {
      result.winRate = (result.winningTrades / result.totalTrades) * 100;
      result.averageTrade = totalPnl / result.totalTrades;
      result.averageHoldingTime = totalHoldingTime / result.totalTrades;
      result.maxConsecutiveWins = maxConsecutiveWins;
      result.maxConsecutiveLosses = maxConsecutiveLosses;
    }
    
    if (result.winningTrades > 0) {
      result.averageWin = totalWinAmount / result.winningTrades;
    }
    
    if (result.losingTrades > 0) {
      result.averageLoss = totalLossAmount / result.losingTrades;
    }
    
    if (totalLossAmount > 0) {
      result.profitFactor = totalWinAmount / totalLossAmount;
    }
    
    // Tính lợi nhuận theo tháng
    const monthlyData: Record<string, { pnl: number, initialEquity: number }> = {};
    
    for (const trade of result.trades) {
      const date = new Date(trade.exitTime!);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyData[monthKey]) {
        // Tìm equity ban đầu của tháng
        const monthStart = new Date(date.getFullYear(), date.getMonth(), 1).getTime();
        let initialMonthEquity = this.params.capital;
        
        for (let i = 0; i < result.equityCurve.length; i++) {
          if (result.equityCurve[i].time >= monthStart) {
            if (i > 0) {
              initialMonthEquity = result.equityCurve[i - 1].equity;
            }
            break;
          }
        }
        
        monthlyData[monthKey] = {
          pnl: 0,
          initialEquity
        };
      }
      
      monthlyData[monthKey].pnl += trade.pnl!;
    }
    
    // Tính phần trăm lợi nhuận hàng tháng
    for (const [month, data] of Object.entries(monthlyData)) {
      result.monthlyReturns[month] = (data.pnl / data.initialEquity) * 100;
    }
    
    // Tính Sharpe ratio (đơn giản hóa)
    const dailyReturns: number[] = [];
    let prevEquity = this.params.capital;
    
    for (const point of result.equityCurve) {
      const dailyReturn = (point.equity - prevEquity) / prevEquity;
      dailyReturns.push(dailyReturn);
      prevEquity = point.equity;
    }
    
    const avgDailyReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0) / dailyReturns.length;
    const stdDeviation = Math.sqrt(
      dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length
    );
    
    result.sharpeRatio = stdDeviation !== 0 ? avgDailyReturn / stdDeviation * Math.sqrt(252) : 0;
    
    // Tính Sortino ratio (đơn giản hóa)
    const negativeReturns = dailyReturns.filter(ret => ret < 0);
    const avgNegativeReturn = negativeReturns.length > 0
      ? negativeReturns.reduce((sum, ret) => sum + Math.pow(ret, 2), 0) / negativeReturns.length
      : 0;
    const downwardDeviation = Math.sqrt(avgNegativeReturn);
    
    result.sortinoRatio = downwardDeviation !== 0 ? avgDailyReturn / downwardDeviation * Math.sqrt(252) : 0;
    
    // Lưu kết quả
    return result;
  }
  
  /**
   * Tối ưu hóa tham số
   */
  optimize(
    candles: any[],
    paramRanges: Record<string, [number, number, number]>,
    indicators?: any
  ): { optimizedParams: StrategyParams; backtestResult: BacktestResult } {
    // Tạo danh sách các tổ hợp tham số
    const paramCombinations: TrendFollowingParams[] = [];
    const baseParams = { ...this.params };
    
    // Tạo hàm đệ quy để tạo tất cả các tổ hợp
    const generateCombinations = (
      currentParams: Partial<TrendFollowingParams>,
      remainingParams: [string, [number, number, number]][],
      index: number
    ) => {
      if (index >= remainingParams.length) {
        paramCombinations.push({ ...baseParams, ...currentParams } as TrendFollowingParams);
        return;
      }
      
      const [paramName, [min, max, step]] = remainingParams[index];
      
      for (let value = min; value <= max; value += step) {
        generateCombinations(
          { ...currentParams, [paramName]: value },
          remainingParams,
          index + 1
        );
      }
    };
    
    generateCombinations({}, Object.entries(paramRanges), 0);
    
    // Chạy backtest cho từng tổ hợp
    let bestResult: BacktestResult | null = null;
    let bestParams: TrendFollowingParams | null = null;
    
    for (const params of paramCombinations) {
      this.updateParams(params);
      const result = this.backtest(candles);
      
      // So sánh kết quả
      if (!bestResult || this.compareResults(result, bestResult)) {
        bestResult = result;
        bestParams = { ...params };
      }
    }
    
    // Khôi phục tham số ban đầu
    this.updateParams(baseParams);
    
    return {
      optimizedParams: bestParams!,
      backtestResult: bestResult!
    };
  }
  
  /**
   * So sánh hai kết quả backtest
   * Trả về true nếu result1 tốt hơn result2
   */
  private compareResults(result1: BacktestResult, result2: BacktestResult): boolean {
    // Sử dụng nhiều tiêu chí để so sánh
    // 1. Lợi nhuận
    // 2. Sharpe ratio
    // 3. Drawdown
    // 4. Win rate
    
    // Tính điểm cho mỗi kết quả
    let score1 = 0;
    let score2 = 0;
    
    // Lợi nhuận (40%)
    if (result1.totalReturn > result2.totalReturn) {
      score1 += 40;
    } else {
      score2 += 40;
    }
    
    // Sharpe ratio (30%)
    if (result1.sharpeRatio > result2.sharpeRatio) {
      score1 += 30;
    } else {
      score2 += 30;
    }
    
    // Drawdown (15%) - thấp hơn tốt hơn
    if (result1.maxDrawdown < result2.maxDrawdown) {
      score1 += 15;
    } else {
      score2 += 15;
    }
    
    // Win rate (15%)
    if (result1.winRate > result2.winRate) {
      score1 += 15;
    } else {
      score2 += 15;
    }
    
    return score1 > score2;
  }
  
  /**
   * Tính toán EMA
   */
  private calculateEMA(candles: any[], period: number): number[] {
    const prices = candles.map(candle => parseFloat(candle.close));
    const ema: number[] = Array(prices.length).fill(0);
    
    // Tính SMA đầu tiên
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += prices[i];
    }
    ema[period - 1] = sum / period;
    
    // Tính EMA
    const multiplier = 2 / (period + 1);
    for (let i = period; i < prices.length; i++) {
      ema[i] = prices[i] * multiplier + ema[i - 1] * (1 - multiplier);
    }
    
    return ema;
  }
  
  /**
   * Tính toán SMA
   */
  private calculateSMA(candles: any[], period: number): number[] {
    const prices = candles.map(candle => parseFloat(candle.close));
    const sma: number[] = Array(prices.length).fill(0);
    
    for (let i = period - 1; i < prices.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += prices[i - j];
      }
      sma[i] = sum / period;
    }
    
    return sma;
  }
  
  /**
   * Tính toán RSI
   */
  private calculateRSI(candles: any[], period: number): number[] {
    const prices = candles.map(candle => parseFloat(candle.close));
    const rsi: number[] = Array(prices.length).fill(0);
    
    // Tính toán các thay đổi giá
    const changes: number[] = [];
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    // Tính toán RSI
    for (let i = period; i < prices.length; i++) {
      let gains = 0;
      let losses = 0;
      
      for (let j = i - period; j < i; j++) {
        if (changes[j - 1] >= 0) {
          gains += changes[j - 1];
        } else {
          losses -= changes[j - 1];
        }
      }
      
      const avgGain = gains / period;
      const avgLoss = losses / period;
      
      if (avgLoss === 0) {
        rsi[i] = 100;
      } else {
        const rs = avgGain / avgLoss;
        rsi[i] = 100 - (100 / (1 + rs));
      }
    }
    
    return rsi;
  }
  
  /**
   * Tính toán khối lượng trung bình
   */
  private calculateAverageVolume(candles: any[], period: number): number[] {
    const volumes = candles.map(candle => parseFloat(candle.volume));
    const avgVolume: number[] = Array(volumes.length).fill(0);
    
    for (let i = period - 1; i < volumes.length; i++) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += volumes[i - j];
      }
      avgVolume[i] = sum / period;
    }
    
    return avgVolume;
  }
  
  /**
   * Tính toán độ mạnh xu hướng
   */
  private calculateTrendStrength(
    fastEMA: number,
    slowEMA: number,
    longSMA: number,
    rsi: number,
    price: number
  ): number {
    // Đo lường khoảng cách giữa các đường trung bình động
    const emaRatio = fastEMA / slowEMA;
    const smaRatio = slowEMA / longSMA;
    
    // Chuẩn hóa các tỷ lệ
    const normalizedEmaRatio = Math.min(Math.abs(emaRatio - 1) * 5, 1);
    const normalizedSmaRatio = Math.min(Math.abs(smaRatio - 1) * 5, 1);
    
    // Chuẩn hóa RSI (0.5 là neutral)
    const normalizedRSI = Math.abs(rsi - 50) / 50;
    
    // Tính toán độ mạnh tổng thể (0-1)
    const strength = (normalizedEmaRatio * 0.4 + normalizedSmaRatio * 0.4 + normalizedRSI * 0.2);
    
    return Math.min(strength, 1);
  }
} 