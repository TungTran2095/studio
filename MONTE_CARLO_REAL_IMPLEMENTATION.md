# 🎲 Monte Carlo Analysis - Implementation Thực tế

## ✅ **Đã cập nhật: Từ Mock Data sang Real Data**

Chức năng Monte Carlo Analysis đã được nâng cấp từ mock data sang **tính toán thực tế** dựa trên dữ liệu thị trường thực từ database.

---

## 🔄 **Thay đổi chính**

### ❌ **Trước đây (Mock Data):**
```typescript
// Chỉ tạo random numbers
const results = {
  mean_return: (Math.random() * 20 - 5).toFixed(3),
  std_return: (Math.random() * 15 + 5).toFixed(3),
  var_95: -(Math.random() * 10 + 5).toFixed(3),
  // ... các giá trị random khác
};
```

### ✅ **Bây giờ (Real Data):**
```typescript
// 1. Lấy dữ liệu thực từ Supabase
const historicalData = await fetchHistoricalData(symbols, start_date, end_date);

// 2. Tính toán thống kê thực tế
const marketStats = calculateMarketStatistics(historicalData);

// 3. Chạy Monte Carlo với parameters thực
const simulationResults = await runMonteCarloSimulations(
  marketStats, n_simulations, time_horizon_days, initial_capital
);

// 4. Tính risk metrics từ kết quả thực
const riskMetrics = calculateRiskMetrics(simulationResults, confidence_level);
```

---

## 📊 **Dữ liệu thực tế được sử dụng**

### **Nguồn dữ liệu:**
- **Database**: Supabase với 2.7M+ records
- **Tables**: `ohlcv_btc_usdt_1m`, `ohlcv_eth_usdt_1m`
- **Timeframe**: 1-minute OHLCV data
- **Symbols**: BTC, ETH (có thể mở rộng)

### **Thống kê được tính toán:**
```typescript
stats[symbol] = {
  mean_return: annualizedReturn,        // Lợi nhuận trung bình năm
  volatility: annualizedVolatility,     // Độ biến động năm
  total_returns: returns.length,        // Số điểm dữ liệu
  price_range: {                        // Phạm vi giá
    min: Math.min(...prices),
    max: Math.max(...prices),
    current: prices[prices.length - 1]
  },
  returns_distribution: {               // Phân phối lợi nhuận
    mean: meanReturn,
    std: volatility,
    skewness: calculateSkewness(returns),
    kurtosis: calculateKurtosis(returns)
  }
};
```

---

## 🎯 **Monte Carlo Simulation thực tế**

### **Quy trình tính toán:**

1. **Lấy dữ liệu lịch sử** từ database
2. **Tính toán thống kê** (mean, volatility, skewness, kurtosis)
3. **Chạy simulations** với Box-Muller transform cho normal distribution
4. **Tính risk metrics** từ kết quả simulations

### **Công thức sử dụng:**

#### **Box-Muller Transform (Normal Distribution):**
```typescript
function generateNormalRandom(mean: number, std: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + std * z0;
}
```

#### **Annualization:**
```typescript
// Từ 1-minute data sang annual
const annualizedReturn = meanReturn * 1440 * 252;  // 1440 phút/ngày * 252 ngày
const annualizedVolatility = volatility * Math.sqrt(1440 * 252);
```

#### **Risk Metrics:**
```typescript
// Value at Risk (VaR)
const valueAtRisk = -returns[varIndex];

// Expected Shortfall
const expectedShortfall = -returns.slice(0, esIndex).reduce((sum, r) => sum + r, 0) / esIndex;

// Probability of Loss
const probabilityOfLoss = returns.filter(r => r < 0).length / n;
```

---

## 🚀 **Cách sử dụng**

### **1. Trong UI:**
```typescript
// Click button "Chạy Monte Carlo với dữ liệu thực tế"
const runRealMonteCarloAnalysis = async () => {
  const response = await fetch('/api/research/monte-carlo', {
    method: 'POST',
    body: JSON.stringify({
      experiment_id: `monte-carlo-${Date.now()}`,
      config: {
        n_simulations: 1000,
        confidence_level: 0.95,
        time_horizon_days: 252,
        symbols: ['BTC', 'ETH'],
        initial_capital: 10000
      }
    })
  });
};
```

### **2. Trong Experiments:**
```typescript
// Tự động gọi khi chạy Monte Carlo experiment
static async runMonteCarloSimulation(config: any, experimentId: string) {
  // Gọi API thực tế
  const response = await fetch('/api/research/monte-carlo', {
    method: 'POST',
    body: JSON.stringify({ experiment_id, config })
  });
}
```

---

## 📈 **Kết quả thực tế**

### **Risk Metrics:**
- **Probability of Profit**: % simulations có lợi nhuận dương
- **Value at Risk (95%)**: 95% chance loss không vượt quá X%
- **Expected Sharpe Ratio**: Risk-adjusted return
- **Expected Shortfall**: Average loss trong worst cases

### **Market Statistics:**
- **Mean Return**: Lợi nhuận trung bình năm
- **Volatility**: Độ biến động năm
- **Data Points**: Số điểm dữ liệu sử dụng
- **Distribution**: Skewness, Kurtosis

### **Confidence Intervals:**
- **90% CI**: [lower, upper] bounds
- **95% CI**: [lower, upper] bounds  
- **99% CI**: [lower, upper] bounds

---

## 🔧 **Fallback Strategy**

Nếu API thực tế fail, hệ thống sẽ fallback về mock data:

```typescript
try {
  // Gọi API thực tế
  const result = await fetch('/api/research/monte-carlo', ...);
  return result.results;
} catch (error) {
  console.log('🔄 Falling back to mock data...');
  // Trả về mock data với progress simulation
  return mockResults;
}
```

---

## 📊 **So sánh: Mock vs Real**

| Aspect | Mock Data | Real Data |
|--------|-----------|-----------|
| **Dữ liệu nguồn** | Random numbers | Historical OHLCV từ database |
| **Tính chính xác** | Không chính xác | Dựa trên thị trường thực |
| **Risk metrics** | Giả định | Tính toán từ simulations |
| **Market stats** | Không có | Thống kê thực từ dữ liệu |
| **Performance** | Nhanh | Chậm hơn do tính toán phức tạp |
| **Reliability** | Luôn hoạt động | Phụ thuộc database |

---

## 🎯 **Kết luận**

✅ **Monte Carlo Analysis giờ đây là tính toán thực tế** dựa trên:
- Dữ liệu thị trường thực từ database
- Thống kê thực tế (mean, volatility, skewness, kurtosis)
- Risk metrics được tính toán từ simulations
- Fallback strategy cho reliability

🚀 **Cải thiện đáng kể về độ chính xác và giá trị thực tế!** 