// Statistical Tests Library
// Implements real statistical calculations

import { HypothesisTestResult, TestVariable } from '@/types/research-models';

export interface DataPoint {
  value: number;
  timestamp?: string;
}

export interface StatTestConfig {
  confidenceLevel: number;
  alternative: 'two-sided' | 'greater' | 'less';
  sampleSize?: number;
  power?: number;
}

// Utility class for statistical calculations
class StatisticalCalculations {
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

  static correlation(x: number[], y: number[]): number {
    const n = x.length;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    
    const numerator = x.reduce((sum, xi, i) => 
      sum + (xi - meanX) * (y[i] - meanY), 0);
    
    const denominator = Math.sqrt(
      x.reduce((sum, xi) => sum + Math.pow(xi - meanX, 2), 0) *
      y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0)
    );
    
    return numerator / denominator;
  }

  static tCritical(df: number, alpha: number): number {
    // Approximation using normal distribution for large df
    if (df > 30) {
      return this.normalCritical(alpha);
    }
    
    // Simplified t-distribution critical values
    const criticalValues: { [key: number]: { [key: number]: number } } = {
      0.05: { 1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 10: 2.228, 20: 2.086, 30: 2.042 },
      0.01: { 1: 63.657, 2: 9.925, 3: 5.841, 4: 4.604, 5: 4.032, 10: 3.169, 20: 2.845, 30: 2.750 }
    };
    
    return criticalValues[alpha][df] || this.normalCritical(alpha);
  }

  static normalCritical(alpha: number): number {
    const criticalValues: { [key: number]: number } = {
      0.05: 1.96,
      0.01: 2.576,
      0.001: 3.291
    };
    return criticalValues[alpha] || 1.96;
  }

  static calculateEffectSize(mean1: number, mean2: number, pooledSD: number): number {
    return Math.abs(mean1 - mean2) / pooledSD;
  }

  static calculatePower(effectSize: number, sampleSize: number, alpha: number): number {
    // Simplified power calculation
    const criticalValue = this.normalCritical(alpha);
    const noncentrality = effectSize * Math.sqrt(sampleSize / 2);
    return 1 - this.normalCDF(criticalValue - noncentrality);
  }

  static normalCDF(x: number): number {
    // Approximation of normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2.0);

    const t = 1.0 / (1.0 + p * x);
    const erf = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * erf);
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
    
    // Calculate p-value
    const alpha = 1 - config.confidenceLevel;
    const tCrit = StatisticalCalculations.tCritical(df, alpha);
    
    let pValue: number;
    switch (config.alternative) {
      case 'greater':
        pValue = 1 - StatisticalCalculations.normalCDF(tStat);
        break;
      case 'less':
        pValue = StatisticalCalculations.normalCDF(tStat);
        break;
      default: // two-sided
        pValue = 2 * (1 - StatisticalCalculations.normalCDF(Math.abs(tStat)));
    }
    
    const isSignificant = pValue < alpha;
    
    // Calculate confidence interval for correlation
    const z = Math.atanh(r);
    const se = 1 / Math.sqrt(n - 3);
    const zCrit = StatisticalCalculations.normalCritical(alpha);
    const ci: [number, number] = [
      Math.tanh(z - zCrit * se),
      Math.tanh(z + zCrit * se)
    ];
    
    return {
      testStatistic: tStat,
      pValue,
      criticalValue: tCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: Math.abs(r),
      interpretation: this.interpretCorrelation(r, isSignificant, ci),
      visualizations: this.generateVisualizations(x, y, r)
    };
  }

  private static interpretCorrelation(r: number, isSignificant: boolean, ci: [number, number]): string {
    const strength = Math.abs(r) < 0.3 ? 'yếu' : 
                     Math.abs(r) < 0.7 ? 'trung bình' : 'mạnh';
    const direction = r > 0 ? 'thuận' : 'nghịch';
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    
    return `Tương quan ${direction} ${strength} (r = ${r.toFixed(3)}, 95% CI: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]) và ${significance}.`;
  }

  private static generateVisualizations(x: number[], y: number[], r: number): any[] {
    return [
      {
        type: 'scatter',
        data: {
          x: x,
          y: y,
          mode: 'markers',
          type: 'scatter'
        },
        layout: {
          title: `Scatter Plot (r = ${r.toFixed(3)})`,
          xaxis: { title: 'X' },
          yaxis: { title: 'Y' }
        }
      }
    ];
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
    
    let pValue: number;
    switch (config.alternative) {
      case 'greater':
        pValue = 1 - StatisticalCalculations.normalCDF(tStat);
        break;
      case 'less':
        pValue = StatisticalCalculations.normalCDF(tStat);
        break;
      default: // two-sided
        pValue = 2 * (1 - StatisticalCalculations.normalCDF(Math.abs(tStat)));
    }
    
    const isSignificant = pValue < alpha;
    
    // Cohen's d as effect size
    const pooledSD = Math.sqrt(pooledVar);
    const cohensD = (mean1 - mean2) / pooledSD;
    
    // Calculate confidence interval
    const ci: [number, number] = [
      (mean1 - mean2) - tCrit * standardError,
      (mean1 - mean2) + tCrit * standardError
    ];

    return {
      testStatistic: tStat,
      pValue,
      criticalValue: tCrit,
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: Math.abs(cohensD),
      interpretation: this.interpretTTest(mean1, mean2, isSignificant, cohensD, ci),
      visualizations: this.generateVisualizations(group1, group2, mean1, mean2)
    };
  }

  private static interpretTTest(
    mean1: number, 
    mean2: number, 
    isSignificant: boolean, 
    cohensD: number,
    ci: [number, number]
  ): string {
    const direction = mean1 > mean2 ? 'lớn hơn' : 'nhỏ hơn';
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    const effect = Math.abs(cohensD) < 0.2 ? 'nhỏ' :
                  Math.abs(cohensD) < 0.5 ? 'trung bình' :
                  Math.abs(cohensD) < 0.8 ? 'lớn' : 'rất lớn';
    
    return `Trung bình nhóm 1 ${direction} trung bình nhóm 2 (95% CI: [${ci[0].toFixed(3)}, ${ci[1].toFixed(3)}]) ` +
           `và ${significance}. Hiệu ứng ${effect} (d = ${Math.abs(cohensD).toFixed(3)}).`;
  }

  private static generateVisualizations(
    group1: number[], 
    group2: number[], 
    mean1: number, 
    mean2: number
  ): any[] {
    return [
      {
        type: 'box',
        data: [
          {
            y: group1,
            name: 'Group 1',
            boxpoints: 'all',
            jitter: 0.3,
            pointpos: -1.8
          },
          {
            y: group2,
            name: 'Group 2',
            boxpoints: 'all',
            jitter: 0.3,
            pointpos: -1.8
          }
        ],
        layout: {
          title: 'Box Plot Comparison',
          yaxis: { title: 'Value' },
          showlegend: true
        }
      }
    ];
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
    
    // Calculate p-value using F-distribution approximation
    const alpha = 1 - config.confidenceLevel;
    const pValue = this.calculateFPValue(fStat, dfB, dfW);
    const isSignificant = pValue < alpha;
    
    // Eta-squared as effect size
    const etaSquared = SSB / (SSB + SSW);
    
    // Calculate confidence intervals for group means
    const ci = groups.map(group => {
      if (group.length < 2) {
        throw new Error('Each group must have at least 2 observations');
      }
      const mean = StatisticalCalculations.mean(group);
      const se = Math.sqrt(MSW / group.length);
      const tCrit = StatisticalCalculations.tCritical(group.length - 1, alpha);
      return {
        lower: mean - tCrit * se,
        upper: mean + tCrit * se
      };
    });

    return {
      testStatistic: fStat,
      pValue,
      criticalValue: this.getFCritical(dfB, dfW, alpha),
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: etaSquared,
      interpretation: this.interpretANOVA(isSignificant, etaSquared, k, ci),
      visualizations: this.generateVisualizations(groups, ci)
    };
  }

  private static calculateFPValue(f: number, df1: number, df2: number): number {
    // Simplified F-distribution p-value calculation
    const x = df2 / (df2 + df1 * f);
    const beta = this.betaFunction(df1/2, df2/2);
    return this.incompleteBeta(x, df1/2, df2/2) / beta;
  }

  private static betaFunction(a: number, b: number): number {
    return Math.exp(
      this.logGamma(a) + this.logGamma(b) - this.logGamma(a + b)
    );
  }

  private static logGamma(x: number): number {
    // Stirling's approximation
    return Math.log(Math.sqrt(2 * Math.PI / x)) + 
           x * Math.log(x / Math.E) + 
           1 / (12 * x) - 1 / (360 * Math.pow(x, 3));
  }

  private static incompleteBeta(x: number, a: number, b: number): number {
    // Simplified incomplete beta function
    const beta = this.betaFunction(a, b);
    return Math.pow(x, a) * Math.pow(1 - x, b) / (a * beta);
  }

  private static getFCritical(df1: number, df2: number, alpha: number): number {
    // Simplified F critical values
    const criticalValues: { [key: string]: number } = {
      '0.05_1_10': 4.96,
      '0.05_2_10': 4.10,
      '0.05_3_10': 3.71,
      '0.01_1_10': 10.04,
      '0.01_2_10': 7.56,
      '0.01_3_10': 6.55
    };
    
    const key = `${alpha}_${df1}_${df2}`;
    return criticalValues[key] || 3.84; // Default to common value
  }

  private static interpretANOVA(
    isSignificant: boolean, 
    etaSquared: number, 
    k: number,
    ci: Array<{lower: number, upper: number}>
  ): string {
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    const effect = etaSquared < 0.01 ? 'nhỏ' :
                  etaSquared < 0.06 ? 'trung bình' :
                  etaSquared < 0.14 ? 'lớn' : 'rất lớn';
    
    let interpretation = `Phân tích phương sai ${significance} giữa ${k} nhóm. `;
    interpretation += `Hiệu ứng ${effect} (η² = ${etaSquared.toFixed(3)}).\n`;
    
    interpretation += 'Khoảng tin cậy 95% cho trung bình các nhóm:\n';
    ci.forEach((interval, i) => {
      interpretation += `Nhóm ${i + 1}: [${interval.lower.toFixed(3)}, ${interval.upper.toFixed(3)}]\n`;
    });
    
    return interpretation;
  }

  private static generateVisualizations(
    groups: number[][], 
    ci: Array<{lower: number, upper: number}>
  ): any[] {
    return [
      {
        type: 'box',
        data: groups.map((group, i) => ({
          y: group,
          name: `Group ${i + 1}`,
          boxpoints: 'all',
          jitter: 0.3,
          pointpos: -1.8
        })),
        layout: {
          title: 'Box Plot Comparison',
          yaxis: { title: 'Value' },
          showlegend: true
        }
      },
      {
        type: 'scatter',
        data: groups.map((group, i) => ({
          y: group,
          x: Array(group.length).fill(i + 1),
          mode: 'markers',
          name: `Group ${i + 1}`
        })),
        layout: {
          title: 'Scatter Plot with Confidence Intervals',
          xaxis: { title: 'Group' },
          yaxis: { title: 'Value' },
          showlegend: true
        }
      }
    ];
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
    
    // Calculate p-value
    const pValue = this.calculateChiSquarePValue(chiSq, df);
    const isSignificant = pValue < alpha;
    
    // Cramér's V as effect size
    const cramersV = Math.sqrt(chiSq / (grandTotal * Math.min(rows - 1, cols - 1)));
    
    // Calculate standardized residuals
    const residuals = observed.map((row, i) =>
      row.map((obs, j) => (obs - expected[i][j]) / Math.sqrt(expected[i][j]))
    );

    return {
      testStatistic: chiSq,
      pValue,
      criticalValue: this.getChiSquareCritical(df, alpha),
      confidenceLevel: config.confidenceLevel,
      isSignificant,
      effect_size: cramersV,
      interpretation: this.interpretChiSquare(isSignificant, cramersV, residuals),
      visualizations: this.generateVisualizations(observed, expected, residuals)
    };
  }

  private static calculateChiSquarePValue(chiSq: number, df: number): number {
    // Simplified chi-square p-value calculation
    const x = chiSq / 2;
    const k = df / 2;
    return this.incompleteGamma(k, x) / this.gamma(k);
  }

  private static incompleteGamma(k: number, x: number): number {
    // Simplified incomplete gamma function
    return Math.pow(x, k) * Math.exp(-x) / k;
  }

  private static gamma(k: number): number {
    // Simplified gamma function
    return Math.sqrt(2 * Math.PI / k) * Math.pow(k / Math.E, k);
  }

  private static getChiSquareCritical(df: number, alpha: number): number {
    // Simplified chi-square critical values
    const criticalValues: { [key: string]: number } = {
      '0.05_1': 3.84,
      '0.05_2': 5.99,
      '0.05_3': 7.81,
      '0.01_1': 6.63,
      '0.01_2': 9.21,
      '0.01_3': 11.34
    };
    
    const key = `${alpha}_${df}`;
    return criticalValues[key] || 3.84; // Default to common value
  }

  private static interpretChiSquare(
    isSignificant: boolean, 
    cramersV: number,
    residuals: number[][]
  ): string {
    const significance = isSignificant ? 'có ý nghĩa thống kê' : 'không có ý nghĩa thống kê';
    const effect = cramersV < 0.1 ? 'yếu' :
                  cramersV < 0.3 ? 'trung bình' :
                  cramersV < 0.5 ? 'mạnh' : 'rất mạnh';
    
    let interpretation = `Kiểm định Chi-square ${significance}. `;
    interpretation += `Hiệu ứng ${effect} (V = ${cramersV.toFixed(3)}).\n\n`;
    
    interpretation += 'Phân tích phần dư chuẩn hóa:\n';
    residuals.forEach((row, i) => {
      row.forEach((res, j) => {
        if (Math.abs(res) > 2) {
          interpretation += `Ô (${i+1},${j+1}): ${res.toFixed(2)} - `;
          interpretation += res > 0 ? 'cao hơn dự kiến\n' : 'thấp hơn dự kiến\n';
        }
      });
    });
    
    return interpretation;
  }

  private static generateVisualizations(
    observed: number[][],
    expected: number[][],
    residuals: number[][]
  ): any[] {
    return [
      {
        type: 'heatmap',
        data: [{
          z: observed,
          type: 'heatmap',
          colorscale: 'Viridis'
        }],
        layout: {
          title: 'Observed Frequencies',
          xaxis: { title: 'Column' },
          yaxis: { title: 'Row' }
        }
      },
      {
        type: 'heatmap',
        data: [{
          z: residuals,
          type: 'heatmap',
          colorscale: 'RdBu',
          zmid: 0
        }],
        layout: {
          title: 'Standardized Residuals',
          xaxis: { title: 'Column' },
          yaxis: { title: 'Row' }
        }
      }
    ];
  }
} 