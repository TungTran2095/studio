// Tính giá trị trung bình
function mean(data: number[]): number {
  return data.reduce((a, b) => a + b, 0) / data.length;
}

// Tính độ lệch chuẩn
function standardDeviation(data: number[]): number {
  const m = mean(data);
  const variance = data.reduce((a, b) => a + Math.pow(b - m, 2), 0) / data.length;
  return Math.sqrt(variance);
}

// Tính t-statistic
function tStatistic(data: number[], mu0: number = 0): number {
  const m = mean(data);
  const s = standardDeviation(data);
  const n = data.length;
  return (m - mu0) / (s / Math.sqrt(n));
}

// Tính p-value cho t-test
function tTestPValue(t: number, df: number): number {
  // Sử dụng xấp xỉ cho phân phối t
  const x = df / (df + t * t);
  const beta = Math.exp(
    Math.log(x) * (df / 2) +
    Math.log(1 - x) * 0.5 +
    Math.log(0.5) +
    Math.log(1 - x) * (df / 2 - 1)
  );
  return beta;
}

// Thực hiện t-test
export function ttest(data: number[], alpha: number = 0.05) {
  const t = tStatistic(data);
  const df = data.length - 1;
  const pValue = tTestPValue(Math.abs(t), df);
  
  return {
    statistic: t,
    pValue,
    significant: pValue < alpha,
    alpha,
    degreesOfFreedom: df
  };
}

// Thực hiện z-test
export function ztest(data: number[], alpha: number = 0.05) {
  const m = mean(data);
  const s = standardDeviation(data);
  const n = data.length;
  const z = (m - 0) / (s / Math.sqrt(n));
  
  // Tính p-value cho z-test
  const pValue = 2 * (1 - 0.5 * (1 + Math.erf(Math.abs(z) / Math.sqrt(2))));
  
  return {
    statistic: z,
    pValue,
    significant: pValue < alpha,
    alpha
  };
}

// Thực hiện chi-square test
export function chiSquare(data: number[], alpha: number = 0.05) {
  // Chia dữ liệu thành các khoảng
  const bins = 10;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const binSize = (max - min) / bins;
  
  // Đếm tần suất quan sát
  const observed = new Array(bins).fill(0);
  data.forEach(value => {
    const binIndex = Math.min(Math.floor((value - min) / binSize), bins - 1);
    observed[binIndex]++;
  });
  
  // Tính tần suất kỳ vọng
  const expected = new Array(bins).fill(data.length / bins);
  
  // Tính chi-square statistic
  const chi2 = observed.reduce((sum, obs, i) => {
    return sum + Math.pow(obs - expected[i], 2) / expected[i];
  }, 0);
  
  // Tính p-value (xấp xỉ)
  const df = bins - 1;
  const pValue = 1 - Math.pow(chi2 / (2 * df), df / 2);
  
  return {
    statistic: chi2,
    pValue,
    significant: pValue < alpha,
    alpha,
    degreesOfFreedom: df
  };
}

// Thực hiện ANOVA test
export function anova(groups: number[][], alpha: number = 0.05) {
  const k = groups.length;
  const n = groups.reduce((sum, group) => sum + group.length, 0);
  
  // Tính tổng bình phương giữa các nhóm (SSB)
  const grandMean = mean(groups.flat());
  const ssb = groups.reduce((sum, group) => {
    const groupMean = mean(group);
    return sum + group.length * Math.pow(groupMean - grandMean, 2);
  }, 0);
  
  // Tính tổng bình phương trong nhóm (SSW)
  const ssw = groups.reduce((sum, group) => {
    const groupMean = mean(group);
    return sum + group.reduce((groupSum, value) => {
      return groupSum + Math.pow(value - groupMean, 2);
    }, 0);
  }, 0);
  
  // Tính F-statistic
  const dfb = k - 1;
  const dfw = n - k;
  const msb = ssb / dfb;
  const msw = ssw / dfw;
  const f = msb / msw;
  
  // Tính p-value (xấp xỉ)
  const pValue = 1 - Math.pow(f / (f + dfw / dfb), dfw / 2);
  
  return {
    statistic: f,
    pValue,
    significant: pValue < alpha,
    alpha,
    degreesOfFreedom: {
      between: dfb,
      within: dfw
    }
  };
} 