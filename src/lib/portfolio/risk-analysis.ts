import { Asset } from "@/actions/binance";

export interface RiskMetrics {
  volatility: number;
  valueAtRisk: number;
  maxDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  downsideDeviation: number;
  betaToMarket: number;
}

export interface AssetRiskContribution {
  symbol: string;
  volatilityContribution: number;
  percentOfRisk: number;
}

/**
 * Tính toán các chỉ số rủi ro cho danh mục đầu tư
 */
export async function calculatePortfolioRisk(
  assets: Asset[],
  historicalPrices: Record<string, number[]>,
  marketData: number[] // Dữ liệu thị trường BTC hoặc tổng vốn hóa thị trường
): Promise<RiskMetrics> {
  // Tính toán lợi nhuận hàng ngày
  const returns = calculateDailyReturns(historicalPrices);
  
  // Tính tổng giá trị danh mục
  const portfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
  
  // Tính trọng số từng tài sản
  const weights = assets.map(asset => asset.totalValue / portfolioValue);
  
  // Tính ma trận hiệp phương sai
  const covarianceMatrix = calculateCovarianceMatrix(returns);
  
  // Tính độ biến động của danh mục
  const portfolioVolatility = calculatePortfolioVolatility(weights, covarianceMatrix);
  
  // Tính Value at Risk (VaR) ở mức tin cậy 95%
  const valueAtRisk = calculateValueAtRisk(returns, weights, 0.95);
  
  // Tính drawdown tối đa
  const maxDrawdown = calculateMaxDrawdown(returns, weights);
  
  // Tính Sharpe Ratio với lãi suất không rủi ro 2%
  const riskFreeRate = 0.02 / 365; // Chuyển đổi sang lãi suất hàng ngày
  const expectedReturn = calculateExpectedReturn(returns, weights);
  const sharpeRatio = (expectedReturn - riskFreeRate) / portfolioVolatility;
  
  // Tính Sortino Ratio
  const downsideDeviation = calculateDownsideDeviation(returns, weights, riskFreeRate);
  const sortinoRatio = (expectedReturn - riskFreeRate) / downsideDeviation;
  
  // Tính Beta so với thị trường
  const betaToMarket = calculateBetaToMarket(returns, weights, marketData);
  
  return {
    volatility: portfolioVolatility,
    valueAtRisk,
    maxDrawdown,
    sharpeRatio,
    sortinoRatio,
    downsideDeviation,
    betaToMarket,
  };
}

/**
 * Tính toán lợi nhuận hàng ngày từ dữ liệu giá lịch sử
 */
function calculateDailyReturns(historicalPrices: Record<string, number[]>): Record<string, number[]> {
  const returns: Record<string, number[]> = {};
  
  for (const symbol in historicalPrices) {
    const prices = historicalPrices[symbol];
    returns[symbol] = [];
    
    for (let i = 1; i < prices.length; i++) {
      const dailyReturn = (prices[i] - prices[i - 1]) / prices[i - 1];
      returns[symbol].push(dailyReturn);
    }
  }
  
  return returns;
}

/**
 * Tính ma trận hiệp phương sai từ dữ liệu lợi nhuận
 */
export function calculateCovarianceMatrix(returns: Record<string, number[]>): number[][] {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const matrix: number[][] = Array(n).fill(0).map(() => Array(n).fill(0));
  
  // Đảm bảo tất cả mảng lợi nhuận có cùng độ dài
  const length = Math.min(...Object.values(returns).map(arr => arr.length));
  
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];
      const returns1 = returns[symbol1].slice(0, length);
      const returns2 = returns[symbol2].slice(0, length);
      
      // Tính hiệp phương sai
      let covariance = 0;
      const mean1 = returns1.reduce((a, b) => a + b, 0) / length;
      const mean2 = returns2.reduce((a, b) => a + b, 0) / length;
      
      for (let k = 0; k < length; k++) {
        covariance += (returns1[k] - mean1) * (returns2[k] - mean2);
      }
      
      covariance /= (length - 1);
      matrix[i][j] = covariance;
      matrix[j][i] = covariance; // Ma trận hiệp phương sai là đối xứng
    }
  }
  
  return matrix;
}

/**
 * Tính độ biến động của danh mục từ trọng số và ma trận hiệp phương sai
 */
export function calculatePortfolioVolatility(weights: number[], covarianceMatrix: number[][]): number {
  let variance = 0;
  const n = weights.length;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      variance += weights[i] * weights[j] * covarianceMatrix[i][j];
    }
  }
  
  return Math.sqrt(variance);
}

/**
 * Tính Value at Risk (VaR) ở mức tin cậy cho trước
 */
function calculateValueAtRisk(
  returns: Record<string, number[]>,
  weights: number[],
  confidenceLevel: number
): number {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const length = Math.min(...Object.values(returns).map(arr => arr.length));
  
  // Tính lợi nhuận danh mục hàng ngày
  const portfolioReturns: number[] = Array(length).fill(0);
  
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < n; j++) {
      const symbol = symbols[j];
      portfolioReturns[i] += returns[symbol][i] * weights[j];
    }
  }
  
  // Sắp xếp lợi nhuận tăng dần
  portfolioReturns.sort((a, b) => a - b);
  
  // Tính VaR ở mức tin cậy cho trước
  const index = Math.floor(length * (1 - confidenceLevel));
  return -portfolioReturns[index];
}

/**
 * Tính drawdown tối đa
 */
function calculateMaxDrawdown(returns: Record<string, number[]>, weights: number[]): number {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const length = Math.min(...Object.values(returns).map(arr => arr.length));
  
  // Tính lợi nhuận danh mục hàng ngày
  const portfolioReturns: number[] = Array(length).fill(0);
  
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < n; j++) {
      const symbol = symbols[j];
      portfolioReturns[i] += returns[symbol][i] * weights[j];
    }
  }
  
  // Tính giá trị tích lũy
  const cumulativeReturns: number[] = [1];
  for (let i = 0; i < portfolioReturns.length; i++) {
    cumulativeReturns.push(cumulativeReturns[cumulativeReturns.length - 1] * (1 + portfolioReturns[i]));
  }
  
  // Tính drawdown tối đa
  let maxDrawdown = 0;
  let peak = cumulativeReturns[0];
  
  for (let i = 1; i < cumulativeReturns.length; i++) {
    if (cumulativeReturns[i] > peak) {
      peak = cumulativeReturns[i];
    }
    
    const drawdown = (peak - cumulativeReturns[i]) / peak;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }
  
  return maxDrawdown;
}

/**
 * Tính lợi nhuận kỳ vọng của danh mục
 */
function calculateExpectedReturn(returns: Record<string, number[]>, weights: number[]): number {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  let expectedReturn = 0;
  
  for (let i = 0; i < n; i++) {
    const symbol = symbols[i];
    const meanReturn = returns[symbol].reduce((a, b) => a + b, 0) / returns[symbol].length;
    expectedReturn += meanReturn * weights[i];
  }
  
  return expectedReturn;
}

/**
 * Tính độ biến động phía giảm
 */
function calculateDownsideDeviation(
  returns: Record<string, number[]>,
  weights: number[],
  threshold: number
): number {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const length = Math.min(...Object.values(returns).map(arr => arr.length));
  
  // Tính lợi nhuận danh mục hàng ngày
  const portfolioReturns: number[] = Array(length).fill(0);
  
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < n; j++) {
      const symbol = symbols[j];
      portfolioReturns[i] += returns[symbol][i] * weights[j];
    }
  }
  
  // Tính độ biến động phía giảm
  let sumSquaredDownside = 0;
  let count = 0;
  
  for (let i = 0; i < portfolioReturns.length; i++) {
    if (portfolioReturns[i] < threshold) {
      sumSquaredDownside += Math.pow(threshold - portfolioReturns[i], 2);
      count++;
    }
  }
  
  return Math.sqrt(sumSquaredDownside / count);
}

/**
 * Tính Beta so với thị trường
 */
function calculateBetaToMarket(
  returns: Record<string, number[]>,
  weights: number[],
  marketReturns: number[]
): number {
  const symbols = Object.keys(returns);
  const n = symbols.length;
  const length = Math.min(...Object.values(returns).map(arr => arr.length), marketReturns.length);
  
  // Tính lợi nhuận danh mục hàng ngày
  const portfolioReturns: number[] = Array(length).fill(0);
  
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < n; j++) {
      const symbol = symbols[j];
      if (i < returns[symbol].length) {
        portfolioReturns[i] += returns[symbol][i] * weights[j];
      }
    }
  }
  
  // Tính Beta
  const marketData = marketReturns.slice(0, length);
  const covarianceWithMarket = calculateCovariance(portfolioReturns, marketData);
  const marketVariance = calculateVariance(marketData);
  
  return covarianceWithMarket / marketVariance;
}

/**
 * Tính hiệp phương sai giữa hai dãy số
 */
function calculateCovariance(a: number[], b: number[]): number {
  const length = Math.min(a.length, b.length);
  const meanA = a.reduce((sum, val) => sum + val, 0) / length;
  const meanB = b.reduce((sum, val) => sum + val, 0) / length;
  
  let covariance = 0;
  for (let i = 0; i < length; i++) {
    covariance += (a[i] - meanA) * (b[i] - meanB);
  }
  
  return covariance / (length - 1);
}

/**
 * Tính phương sai của một dãy số
 */
function calculateVariance(a: number[]): number {
  const mean = a.reduce((sum, val) => sum + val, 0) / a.length;
  
  let variance = 0;
  for (let i = 0; i < a.length; i++) {
    variance += Math.pow(a[i] - mean, 2);
  }
  
  return variance / (a.length - 1);
}

/**
 * Phân tích đóng góp rủi ro của từng tài sản trong danh mục
 */
export function analyzeRiskContribution(
  assets: Asset[],
  covarianceMatrix: number[][]
): AssetRiskContribution[] {
  const portfolioValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
  const weights = assets.map(asset => asset.totalValue / portfolioValue);
  
  const portfolioVolatility = calculatePortfolioVolatility(weights, covarianceMatrix);
  const riskContributions: AssetRiskContribution[] = [];
  
  for (let i = 0; i < assets.length; i++) {
    let marginalContribution = 0;
    
    for (let j = 0; j < assets.length; j++) {
      marginalContribution += weights[j] * covarianceMatrix[i][j];
    }
    
    const volatilityContribution = weights[i] * marginalContribution / portfolioVolatility;
    const percentOfRisk = volatilityContribution / portfolioVolatility * 100;
    
    riskContributions.push({
      symbol: assets[i].asset,
      volatilityContribution,
      percentOfRisk
    });
  }
  
  // Sắp xếp theo đóng góp rủi ro giảm dần
  return riskContributions.sort((a, b) => b.percentOfRisk - a.percentOfRisk);
} 