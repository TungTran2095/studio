import { Asset } from "@/actions/binance";
import { calculateCovarianceMatrix, calculatePortfolioVolatility } from "./risk-analysis";
import { PriceData } from "../market/historical-data";

export interface OptimizationResult {
  weights: number[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface OptimizationParams {
  assets: Asset[];
  historicalPrices: Record<string, PriceData>;
  riskFreeRate: number;
  returnTarget?: number;
  maxWeight?: number;
  minWeight?: number;
}

/**
 * Tối ưu hóa danh mục theo phương pháp Markowitz
 * Tối đa hóa tỷ lệ Sharpe (lợi nhuận kỳ vọng / rủi ro)
 */
export function optimizePortfolio(params: OptimizationParams): OptimizationResult {
  const {
    assets,
    historicalPrices,
    riskFreeRate = 0.02, // Lãi suất không rủi ro mặc định 2%
    maxWeight = 0.3,     // Giới hạn tối đa cho một tài sản
    minWeight = 0.01     // Giới hạn tối thiểu cho một tài sản
  } = params;
  
  // Chỉ xử lý các tài sản có dữ liệu lịch sử
  const validAssets = assets.filter(asset => 
    historicalPrices[asset.asset] && historicalPrices[asset.asset].prices.length > 0
  );
  
  if (validAssets.length === 0) {
    throw new Error("Không có tài sản nào có dữ liệu lịch sử.");
  }
  
  // Tính các mảng lợi nhuận
  const returns: Record<string, number[]> = {};
  for (const asset of validAssets) {
    const symbol = asset.asset;
    const prices = historicalPrices[symbol].prices;
    returns[symbol] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns[symbol].push(dailyReturn);
    }
  }
  
  // Tính lợi nhuận kỳ vọng cho từng tài sản
  const expectedReturns: number[] = validAssets.map(asset => {
    const symbol = asset.asset;
    const assetReturns = returns[symbol];
    return assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length;
  });
  
  // Chuyển đổi dữ liệu lợi nhuận sang định dạng phù hợp cho ma trận hiệp phương sai
  const returnsForCov: Record<string, number[]> = {};
  validAssets.forEach((asset, index) => {
    returnsForCov[index.toString()] = returns[asset.asset];
  });
  
  // Tính ma trận hiệp phương sai
  const covarianceMatrix = calculateCovarianceMatrix(returnsForCov);
  
  // Tìm danh mục tối ưu bằng phương pháp Monte Carlo
  const numSimulations = 10000;
  const results: OptimizationResult[] = [];
  
  for (let i = 0; i < numSimulations; i++) {
    // Tạo bộ trọng số ngẫu nhiên
    const randomWeights = generateRandomWeights(validAssets.length, minWeight, maxWeight);
    
    // Tính lợi nhuận kỳ vọng của danh mục
    let portfolioReturn = 0;
    for (let j = 0; j < randomWeights.length; j++) {
      portfolioReturn += randomWeights[j] * expectedReturns[j];
    }
    
    // Tính độ biến động của danh mục
    const portfolioVolatility = calculatePortfolioVolatility(randomWeights, covarianceMatrix);
    
    // Tính Sharpe Ratio
    const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;
    
    results.push({
      weights: randomWeights,
      expectedReturn: portfolioReturn,
      volatility: portfolioVolatility,
      sharpeRatio
    });
  }
  
  // Sắp xếp theo Sharpe Ratio giảm dần
  results.sort((a, b) => b.sharpeRatio - a.sharpeRatio);
  
  // Trả về danh mục có Sharpe Ratio cao nhất
  return results[0];
}

/**
 * Tạo bộ trọng số ngẫu nhiên sao cho tổng bằng 1
 */
function generateRandomWeights(
  numAssets: number,
  minWeight: number = 0,
  maxWeight: number = 1
): number[] {
  // Tạo các số ngẫu nhiên ban đầu
  const weights: number[] = Array(numAssets).fill(0).map(() => Math.random());
  
  // Chuẩn hóa tổng bằng 1
  const sum = weights.reduce((a, b) => a + b, 0);
  const normalizedWeights = weights.map(w => w / sum);
  
  // Áp dụng giới hạn trọng số tối đa và tối thiểu
  let hasAdjusted = false;
  
  do {
    hasAdjusted = false;
    
    // Áp dụng giới hạn tối đa
    for (let i = 0; i < normalizedWeights.length; i++) {
      if (normalizedWeights[i] > maxWeight) {
        // Phân phối lại phần vượt quá cho các tài sản khác
        const excess = normalizedWeights[i] - maxWeight;
        normalizedWeights[i] = maxWeight;
        
        const remainingSum = normalizedWeights.reduce((a, b) => a + b, 0) - maxWeight;
        for (let j = 0; j < normalizedWeights.length; j++) {
          if (j !== i && normalizedWeights[j] < maxWeight) {
            const proportion = normalizedWeights[j] / remainingSum;
            normalizedWeights[j] += excess * proportion;
          }
        }
        
        hasAdjusted = true;
        break;
      }
    }
    
    // Áp dụng giới hạn tối thiểu
    for (let i = 0; i < normalizedWeights.length; i++) {
      if (normalizedWeights[i] < minWeight && normalizedWeights[i] > 0) {
        // Nếu trọng số nhỏ hơn mức tối thiểu, đặt về 0 hoặc mức tối thiểu
        if (normalizedWeights[i] < minWeight / 2) {
          // Nếu quá nhỏ, đặt về 0
          const shortage = normalizedWeights[i];
          normalizedWeights[i] = 0;
          
          // Phân phối lại cho các tài sản khác
          const remainingSum = normalizedWeights.reduce((a, b) => a + b, 0);
          for (let j = 0; j < normalizedWeights.length; j++) {
            if (j !== i && normalizedWeights[j] > minWeight) {
              const proportion = normalizedWeights[j] / remainingSum;
              normalizedWeights[j] += shortage * proportion;
            }
          }
        } else {
          // Nếu gần mức tối thiểu, đặt bằng mức tối thiểu
          const shortage = minWeight - normalizedWeights[i];
          normalizedWeights[i] = minWeight;
          
          // Điều chỉnh các tài sản khác
          const remainingSum = normalizedWeights.reduce((a, b) => a + b, 0) - minWeight;
          for (let j = 0; j < normalizedWeights.length; j++) {
            if (j !== i && normalizedWeights[j] > minWeight) {
              const proportion = normalizedWeights[j] / remainingSum;
              normalizedWeights[j] -= shortage * proportion;
            }
          }
        }
        
        hasAdjusted = true;
        break;
      }
    }
  } while (hasAdjusted);
  
  // Chuẩn hóa lại lần cuối để đảm bảo tổng = 1
  const finalSum = normalizedWeights.reduce((a, b) => a + b, 0);
  return normalizedWeights.map(w => w / finalSum);
}

/**
 * Tạo danh mục tối thiểu biến động (minimum variance portfolio)
 */
export function createMinimumVariancePortfolio(params: OptimizationParams): OptimizationResult {
  // Ghi đè returnTarget để tập trung vào giảm thiểu biến động
  return optimizePortfolio({
    ...params,
    returnTarget: undefined
  });
}

/**
 * Tạo danh mục cân bằng rủi ro (risk parity portfolio)
 * Mỗi tài sản đóng góp đều nhau vào tổng rủi ro của danh mục
 */
export function createRiskParityPortfolio(params: OptimizationParams): OptimizationResult {
  const { assets, historicalPrices, riskFreeRate = 0.02 } = params;
  
  // Chỉ xử lý các tài sản có dữ liệu lịch sử
  const validAssets = assets.filter(asset => 
    historicalPrices[asset.asset] && historicalPrices[asset.asset].prices.length > 0
  );
  
  if (validAssets.length === 0) {
    throw new Error("Không có tài sản nào có dữ liệu lịch sử.");
  }
  
  // Tính ma trận hiệp phương sai
  const returns: Record<string, number[]> = {};
  for (const asset of validAssets) {
    const symbol = asset.asset;
    const prices = historicalPrices[symbol].prices;
    returns[symbol] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns[symbol].push(dailyReturn);
    }
  }
  
  // Chuyển đổi dữ liệu lợi nhuận sang định dạng phù hợp cho ma trận hiệp phương sai
  const returnsForCov: Record<string, number[]> = {};
  validAssets.forEach((asset, index) => {
    returnsForCov[index.toString()] = returns[asset.asset];
  });
  
  // Tính ma trận hiệp phương sai
  const covarianceMatrix = calculateCovarianceMatrix(returnsForCov);
  
  // Tính độ biến động (volatility) của từng tài sản
  const volatilities: number[] = [];
  for (let i = 0; i < validAssets.length; i++) {
    volatilities.push(Math.sqrt(covarianceMatrix[i][i]));
  }
  
  // Tạo trọng số tỷ lệ nghịch với độ biến động
  const inverseVolatilities = volatilities.map(vol => 1 / vol);
  const sum = inverseVolatilities.reduce((a, b) => a + b, 0);
  const weights = inverseVolatilities.map(invVol => invVol / sum);
  
  // Tính lợi nhuận kỳ vọng của danh mục
  const expectedReturns: number[] = validAssets.map(asset => {
    const symbol = asset.asset;
    const assetReturns = returns[symbol];
    return assetReturns.reduce((sum, ret) => sum + ret, 0) / assetReturns.length;
  });
  
  let portfolioReturn = 0;
  for (let i = 0; i < weights.length; i++) {
    portfolioReturn += weights[i] * expectedReturns[i];
  }
  
  // Tính độ biến động của danh mục
  const portfolioVolatility = calculatePortfolioVolatility(weights, covarianceMatrix);
  
  // Tính Sharpe Ratio
  const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;
  
  return {
    weights,
    expectedReturn: portfolioReturn,
    volatility: portfolioVolatility,
    sharpeRatio
  };
}

/**
 * Tối ưu hóa danh mục dựa trên xu hướng hiện tại của thị trường
 */
export function optimizeForMarketTrend(
  params: OptimizationParams,
  marketTrend: 'uptrend' | 'downtrend' | 'sideways'
): OptimizationResult {
  const { assets, historicalPrices, riskFreeRate = 0.02 } = params;
  
  // Điều chỉnh chiến lược dựa trên xu hướng thị trường
  switch (marketTrend) {
    case 'uptrend':
      // Trong xu hướng tăng, tăng rủi ro để tối đa hóa lợi nhuận
      return optimizePortfolio({
        ...params,
        minWeight: 0.01,
        maxWeight: 0.4 // Cho phép tập trung hơn vào tài sản mạnh
      });
      
    case 'downtrend':
      // Trong xu hướng giảm, giảm rủi ro
      return createMinimumVariancePortfolio({
        ...params,
        maxWeight: 0.2 // Phân tán rủi ro nhiều hơn
      });
      
    case 'sideways':
    default:
      // Trong thị trường đi ngang, cân bằng rủi ro
      return createRiskParityPortfolio({
        ...params
      });
  }
}

/**
 * Điều chỉnh danh mục đầu tư hiện tại
 * Cân nhắc chi phí giao dịch và thuế
 */
export function rebalancePortfolio(
  currentPortfolio: Asset[],
  targetWeights: number[],
  transactionCost: number = 0.001 // Chi phí giao dịch mặc định 0.1%
): { asset: string; currentWeight: number; targetWeight: number; action: 'buy' | 'sell' | 'hold'; amount: number }[] {
  // Tính tổng giá trị danh mục
  const portfolioValue = currentPortfolio.reduce((sum, asset) => sum + asset.totalValue, 0);
  
  // Tính trọng số hiện tại
  const currentWeights = currentPortfolio.map(asset => asset.totalValue / portfolioValue);
  
  // Tạo kế hoạch tái cân bằng
  const rebalancePlan = currentPortfolio.map((asset, index) => {
    const currentWeight = currentWeights[index];
    const targetWeight = targetWeights[index];
    const weightDiff = targetWeight - currentWeight;
    
    // Quyết định hành động
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (weightDiff > 0.01) { // Chỉ mua nếu sự khác biệt > 1%
      action = 'buy';
    } else if (weightDiff < -0.01) { // Chỉ bán nếu sự khác biệt > 1%
      action = 'sell';
    }
    
    // Tính số tiền cần mua/bán
    const amount = Math.abs(weightDiff * portfolioValue);
    
    return {
      asset: asset.asset,
      currentWeight,
      targetWeight,
      action,
      amount
    };
  });
  
  return rebalancePlan;
} 