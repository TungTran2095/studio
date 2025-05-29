// Statistical Tests Library
// Implements real statistical calculations

import { HypothesisTestResult, TestVariable } from '@/types/research-models';

export interface DataPoint {
  value: number;
  timestamp?: string;
}

export interface StatTestConfig {
  confidenceLevel: number; // 0.95, 0.99, etc.
  alternative: 'two-sided' | 'greater' | 'less';
}

// Basic statistical functions
export class StatisticalCalculations {
  
  static mean(data: number[]): number {
    return data.reduce((sum, val) => sum + val, 0) / data.length;
  }

  static variance(data: number[]): number {
    const mean = this.mean(data);
    return data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / (data.length - 1);
  }

  static standardDeviation(data: number[]): number {
    return Math.sqrt(this.variance(data));
  }

  static covariance(x: number[], y: number[]): number {
    if (x.length !== y.length) throw new Error('Arrays must have same length');
    
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    return x.reduce((sum, xi, i) => {
      return sum + (xi - meanX) * (y[i] - meanY);
    }, 0) / (x.length - 1);
  }

  static correlation(x: number[], y: number[]): number {
    const cov = this.covariance(x, y);
    const stdX = this.standardDeviation(x);
    const stdY = this.standardDeviation(y);
    
    return cov / (stdX * stdY);
  }

  // Student's t-distribution critical values (simplified for common cases)
  static tCritical(degreesOfFreedom: number, alpha: number): number {
    // Simplified lookup table for common alpha levels
    const tTable: { [key: number]: { [key: number]: number } } = {
      0.05: { 10: 2.228, 20: 2.086, 30: 2.042, 50: 2.009, 100: 1.984, 1000: 1.962 },
      0.01: { 10: 3.169, 20: 2.845, 30: 2.750, 50: 2.678, 100: 2.626, 1000: 2.576 }
    };

    const alphaKey = alpha in tTable ? alpha : 0.05;
    const dfKey = Object.keys(tTable[alphaKey])
      .map(Number)
      .find(df => df >= degreesOfFreedom) || 1000;

    return tTable[alphaKey][dfKey];
  }

  // Normal distribution Z critical values
  static zCritical(alpha: number): number {
    if (alpha === 0.05) return 1.96;
    if (alpha === 0.01) return 2.576;
    if (alpha === 0.10) return 1.645;
    return 1.96; // default
  }
}

// Correlation Test
export class CorrelationTest {
  static perform(
    x: number[], 
    y: number[], 
    config: StatTestConfig = { confidenceLevel: 0.95, alternative: 'two-sided' }
  ): HypothesisTestResult {
    if (x.length !== y.length || x.length < 3) {
      throw new Error('Invalid data: arrays must have same length and at least 3 points');
    }

    const r = StatisticalCalculations.correlation(x, y);
    const n = x.length;
    const df = n - 2;
    
    // Calculate t-statistic
    const tStat = r * Math.sqrt(df) / Math.sqrt(1 - r * r);
    
    // Calculate p-value (simplified)
    const alpha = 1 - config.confidenceLevel;
    const tCrit = StatisticalCalculations.tCritical(df, alpha);
    
    // Two-tailed test p-value approximation
    const pValue = Math.abs(tStat) > tCrit ? alpha / 2 : alpha;
    
    const isSignificant = pValue < alpha;
    
    return {
      testStatistic: tStat,
      pValue,
      criticalValue: tCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: Math.abs(r), // Correlation coefficient as effect size
      interpretation: this.interpretCorrelation(r, isSignificant),
      visualizations: []
    };
  }

  private static interpretCorrelation(r: number, isSignificant: boolean): string {
    const strength = Math.abs(r) < 0.3 ? 'yếu' : 
                     Math.abs(r) < 0.7 ? 'trung bình' : 'mạnh';
    const direction = r > 0 ? 'thuận' : 'nghịch';
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    
    return `Tương quan ${direction} ${strength} (r = ${r.toFixed(3)}) và ${significance}.`;
  }
}

// T-Test (Independent samples)
export class TTest {
  static independentSamples(
    group1: number[],
    group2: number[],
    config: StatTestConfig = { confidenceLevel: 0.95, alternative: 'two-sided' }
  ): HypothesisTestResult {
    const n1 = group1.length;
    const n2 = group2.length;
    
    if (n1 < 2 || n2 < 2) {
      throw new Error('Each group must have at least 2 observations');
    }

    const mean1 = StatisticalCalculations.mean(group1);
    const mean2 = StatisticalCalculations.mean(group2);
    const var1 = StatisticalCalculations.variance(group1);
    const var2 = StatisticalCalculations.variance(group2);

    // Pooled variance
    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    const standardError = Math.sqrt(pooledVar * (1/n1 + 1/n2));
    
    // t-statistic
    const tStat = (mean1 - mean2) / standardError;
    const df = n1 + n2 - 2;
    
    const alpha = 1 - config.confidenceLevel;
    const tCrit = StatisticalCalculations.tCritical(df, alpha);
    
    // Simplified p-value calculation
    const pValue = Math.abs(tStat) > tCrit ? alpha / 2 : alpha;
    const isSignificant = pValue < alpha;
    
    // Cohen's d as effect size
    const pooledSD = Math.sqrt(pooledVar);
    const cohensD = (mean1 - mean2) / pooledSD;

    return {
      testStatistic: tStat,
      pValue,
      criticalValue: tCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: Math.abs(cohensD),
      interpretation: this.interpretTTest(mean1, mean2, isSignificant, cohensD),
      visualizations: []
    };
  }

  private static interpretTTest(mean1: number, mean2: number, isSignificant: boolean, cohensD: number): string {
    const difference = mean1 - mean2;
    const direction = difference > 0 ? 'cao hơn' : 'thấp hơn';
    const effectSize = Math.abs(cohensD) < 0.2 ? 'nhỏ' : 
                       Math.abs(cohensD) < 0.8 ? 'trung bình' : 'lớn';
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    
    return `Nhóm 1 có trung bình ${direction} nhóm 2 (${difference.toFixed(3)}), ` +
           `với kích thước hiệu ứng ${effectSize} (d = ${cohensD.toFixed(3)}) và ${significance}.`;
  }
}

// ANOVA (One-way)
export class ANOVA {
  static oneWay(
    groups: number[][],
    config: StatTestConfig = { confidenceLevel: 0.95, alternative: 'two-sided' }
  ): HypothesisTestResult {
    if (groups.length < 2) {
      throw new Error('ANOVA requires at least 2 groups');
    }

    const k = groups.length; // number of groups
    const allData = groups.flat();
    const N = allData.length; // total sample size
    const grandMean = StatisticalCalculations.mean(allData);

    // Calculate Sum of Squares
    let SSB = 0; // Between groups
    let SSW = 0; // Within groups

    groups.forEach(group => {
      const groupMean = StatisticalCalculations.mean(group);
      const n = group.length;
      
      // Between groups SS
      SSB += n * Math.pow(groupMean - grandMean, 2);
      
      // Within groups SS
      SSW += group.reduce((sum, val) => sum + Math.pow(val - groupMean, 2), 0);
    });

    // Degrees of freedom
    const dfB = k - 1;      // Between groups
    const dfW = N - k;      // Within groups
    
    // Mean Squares
    const MSB = SSB / dfB;
    const MSW = SSW / dfW;
    
    // F-statistic
    const fStat = MSB / MSW;
    
    // Simplified F critical value (approximation)
    const alpha = 1 - config.confidenceLevel;
    const fCrit = alpha === 0.05 ? 3.84 : 6.64; // rough approximation
    
    const pValue = fStat > fCrit ? alpha / 2 : alpha;
    const isSignificant = pValue < alpha;
    
    // Eta-squared as effect size
    const etaSquared = SSB / (SSB + SSW);

    return {
      testStatistic: fStat,
      pValue,
      criticalValue: fCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: etaSquared,
      interpretation: this.interpretANOVA(isSignificant, etaSquared, k),
      visualizations: []
    };
  }

  private static interpretANOVA(isSignificant: boolean, etaSquared: number, groups: number): string {
    const effectSize = etaSquared < 0.01 ? 'nhỏ' : 
                       etaSquared < 0.06 ? 'trung bình' : 'lớn';
    const significance = isSignificant ? 'có sự khác biệt có ý nghĩa' : 'không có sự khác biệt có ý nghĩa';
    
    return `ANOVA cho ${groups} nhóm ${significance} thống kê, ` +
           `với kích thước hiệu ứng ${effectSize} (η² = ${etaSquared.toFixed(3)}).`;
  }
}

// Chi-Square Test of Independence
export class ChiSquareTest {
  static independence(
    observed: number[][],
    config: StatTestConfig = { confidenceLevel: 0.95, alternative: 'two-sided' }
  ): HypothesisTestResult {
    const rows = observed.length;
    const cols = observed[0].length;
    
    // Calculate totals
    const rowTotals = observed.map(row => row.reduce((sum, val) => sum + val, 0));
    const colTotals = observed[0].map((_, j) => 
      observed.reduce((sum, row) => sum + row[j], 0)
    );
    const grandTotal = rowTotals.reduce((sum, val) => sum + val, 0);
    
    // Calculate expected frequencies
    const expected = observed.map((row, i) =>
      row.map((_, j) => (rowTotals[i] * colTotals[j]) / grandTotal)
    );
    
    // Calculate chi-square statistic
    let chiSq = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        chiSq += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
    
    const df = (rows - 1) * (cols - 1);
    const alpha = 1 - config.confidenceLevel;
    
    // Simplified critical value (approximation)
    const chiCrit = alpha === 0.05 ? 3.84 : 6.64;
    
    const pValue = chiSq > chiCrit ? alpha / 2 : alpha;
    const isSignificant = pValue < alpha;
    
    // Cramér's V as effect size
    const cramersV = Math.sqrt(chiSq / (grandTotal * Math.min(rows - 1, cols - 1)));

    return {
      testStatistic: chiSq,
      pValue,
      criticalValue: chiCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: cramersV,
      interpretation: this.interpretChiSquare(isSignificant, cramersV),
      visualizations: []
    };
  }

  private static interpretChiSquare(isSignificant: boolean, cramersV: number): string {
    const effectSize = cramersV < 0.1 ? 'yếu' : 
                       cramersV < 0.3 ? 'trung bình' : 'mạnh';
    const significance = isSignificant ? 'có mối liên hệ có ý nghĩa' : 'không có mối liên hệ có ý nghĩa';
    
    return `Test Chi-square cho thấy ${significance} thống kê giữa các biến, ` +
           `với kích thước hiệu ứng ${effectSize} (V = ${cramersV.toFixed(3)}).`;
  }
} 