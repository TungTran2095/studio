/**
 * Quản lý vốn và tính toán kích thước vị thế
 */

import { PositionSizingType } from './strategy';

export interface PositionSizeParams {
  capital: number;
  positionSizingType: PositionSizingType;
  positionSize: number; // Số tiền cố định hoặc phần trăm
  riskPerTrade: number; // % rủi ro mỗi giao dịch (cho RISK_BASED)
  entryPrice: number;
  stopLossPrice?: number;
  leverageMultiplier: number;
}

export interface StopLossParams {
  entryPrice: number;
  direction: 'LONG' | 'SHORT';
  riskPercentage: number;
  atr?: number; // Average True Range
}

export interface TakeProfitParams {
  entryPrice: number;
  stopLossPrice: number;
  direction: 'LONG' | 'SHORT';
  riskRewardRatio: number;
}

export interface TrailingStopParams {
  activationPercentage: number;
  trailingDistance: number;
  entryPrice: number;
  direction: 'LONG' | 'SHORT';
  currentPrice: number;
}

export class MoneyManagement {
  /**
   * Tính toán kích thước vị thế
   */
  static calculatePositionSize(params: PositionSizeParams): number {
    const { 
      capital, 
      positionSizingType, 
      positionSize, 
      riskPerTrade, 
      entryPrice, 
      stopLossPrice, 
      leverageMultiplier 
    } = params;
    
    switch (positionSizingType) {
      case PositionSizingType.FIXED:
        // Số tiền cố định
        return positionSize / entryPrice;
        
      case PositionSizingType.PERCENTAGE:
        // Phần trăm vốn
        return (capital * positionSize / 100) / entryPrice;
        
      case PositionSizingType.RISK_BASED:
        // Dựa trên rủi ro
        if (!stopLossPrice) {
          // Nếu không có stopLoss, sử dụng phần trăm vốn
          return (capital * riskPerTrade / 100) / entryPrice;
        }
        
        // Tính toán dựa trên stopLoss
        const riskAmount = capital * riskPerTrade / 100;
        const priceDifference = Math.abs(entryPrice - stopLossPrice);
        const riskPerUnit = priceDifference / entryPrice;
        
        // Tính toán kích thước vị thế
        return riskAmount / (entryPrice * riskPerUnit);
        
      default:
        return 0;
    }
  }
  
  /**
   * Tính giá stop loss dựa trên phần trăm rủi ro
   */
  static calculateStopLoss(params: StopLossParams): number {
    const { entryPrice, direction, riskPercentage, atr } = params;
    
    if (atr) {
      // Sử dụng ATR nếu có
      const atrMultiplier = 1.5; // Có thể điều chỉnh
      const stopDistance = atr * atrMultiplier;
      
      return direction === 'LONG'
        ? entryPrice - stopDistance
        : entryPrice + stopDistance;
    }
    
    // Sử dụng phần trăm rủi ro
    const stopDistance = entryPrice * (riskPercentage / 100);
    
    return direction === 'LONG'
      ? entryPrice - stopDistance
      : entryPrice + stopDistance;
  }
  
  /**
   * Tính giá take profit dựa trên tỷ lệ risk/reward
   */
  static calculateTakeProfit(params: TakeProfitParams): number {
    const { entryPrice, stopLossPrice, direction, riskRewardRatio } = params;
    
    const riskDistance = Math.abs(entryPrice - stopLossPrice);
    const rewardDistance = riskDistance * riskRewardRatio;
    
    return direction === 'LONG'
      ? entryPrice + rewardDistance
      : entryPrice - rewardDistance;
  }
  
  /**
   * Tính toán trailing stop
   * Trả về giá trailing stop mới hoặc null nếu chưa được kích hoạt
   */
  static calculateTrailingStop(params: TrailingStopParams): number | null {
    const { 
      activationPercentage, 
      trailingDistance, 
      entryPrice, 
      direction, 
      currentPrice 
    } = params;
    
    // Kiểm tra xem trailing stop đã được kích hoạt chưa
    const activationThreshold = direction === 'LONG'
      ? entryPrice * (1 + activationPercentage / 100)
      : entryPrice * (1 - activationPercentage / 100);
    
    const isActivated = direction === 'LONG'
      ? currentPrice >= activationThreshold
      : currentPrice <= activationThreshold;
    
    if (!isActivated) {
      return null;
    }
    
    // Tính toán trailing stop
    const trailingDistanceAmount = currentPrice * (trailingDistance / 100);
    
    return direction === 'LONG'
      ? currentPrice - trailingDistanceAmount
      : currentPrice + trailingDistanceAmount;
  }
} 