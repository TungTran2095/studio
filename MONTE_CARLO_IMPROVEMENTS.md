# Cải Tiến Monte Carlo Simulation - Tổng Lợi Nhuận

## 🎯 **Mục tiêu:**

Xây dựng Monte Carlo simulation **đơn giản và chính xác** cho **tổng lợi nhuận** với các tham số cơ bản từ backtest.

## 📊 **Tham số đầu vào:**

```typescript
interface BacktestMetrics {
  totalTrades: number;      // Số lượng trade
  winRate: number;          // Win rate (%)
  avgWinNet: number;        // Tỷ lệ lãi net trung bình (%)
  avgLossNet: number;       // Tỷ lệ lỗ net trung bình (%)
}
```

## 🔧 **Cách hoạt động:**

### 1. **Mô phỏng từng trade:**
```typescript
for (let trade = 0; trade < totalTrades; trade++) {
  // Xác định win/loss dựa trên win rate thực tế
  const isWin = Math.random() < metrics.winRate / 100;
  
  if (isWin) {
    // Lãi dựa trên avg win net + randomness
    const winAmount = metrics.avgWinNet + (Math.random() - 0.5) * 0.5;
    equity *= (1 + winAmount / 100);
  } else {
    // Lỗ dựa trên avg loss net + randomness
    const lossAmount = metrics.avgLossNet + (Math.random() - 0.5) * 0.5;
    equity *= (1 + lossAmount / 100);
  }
}
```

### 2. **Tính toán kết quả:**
- **Total Return**: `(finalEquity - initialCapital) / initialCapital * 100`
- **Max Drawdown**: Tính trong quá trình mô phỏng
- **Final Win Rate**: Tỷ lệ win thực tế trong simulation

## 📈 **Kết quả:**

### **Histogram phân bổ tổng lợi nhuận:**
- 1000 simulations với initial capital $10,000
- Phân bổ tổng lợi nhuận từ các simulation
- So sánh với kết quả backtest thực tế

### **Thống kê:**
- **Mean**: Lợi nhuận trung bình
- **Median**: Lợi nhuận trung vị
- **Standard Deviation**: Độ biến động
- **Percentiles**: 5%, 25%, 50%, 75%, 95%

## 🎯 **Ưu điểm:**

### 1. **Đơn giản và rõ ràng:**
- Chỉ tập trung vào **tổng lợi nhuận**
- Sử dụng **4 tham số cơ bản** từ backtest
- Không phức tạp với nhiều metrics

### 2. **Chính xác:**
- Dựa trên **dữ liệu thực** từ backtest
- Mô phỏng **từng trade** thay vì ước tính
- **Randomness** hợp lý (±0.25%)

### 3. **Thực tế:**
- **Initial Capital**: $10,000
- **Simulations**: 1000 lần
- **So sánh** với kết quả backtest thực tế

## 🔧 **Cách sử dụng:**

```typescript
<MonteCarloHistogram 
  backtestMetrics={{
    totalTrades: resultObj.total_trades,
    winRate: resultObj.win_rate,
    avgWinNet: resultObj.avg_win_net,
    avgLossNet: resultObj.avg_loss_net
  }}
  initialCapital={10000}
  simulations={1000}
  backtestResult={{
    totalReturn: resultObj.total_return,
    maxDrawdown: resultObj.max_drawdown
  }}
/>
```

## 📊 **Ví dụ kết quả:**

```
Backtest Metrics:
- Total Trades: 127
- Win Rate: 58.3%
- Avg Win Net: +1.87%
- Avg Loss Net: -1.23%

Monte Carlo Results (1000 simulations):
- Mean Return: 12.5%
- Median Return: 11.8%
- Standard Deviation: 8.2%
- 5th Percentile: -2.1%
- 95th Percentile: 28.3%

Backtest Actual: 15.2% (được đánh dấu trên histogram)
```

## 🎯 **Kết luận:**

Monte Carlo simulation mới **đơn giản, chính xác và thực tế**, tập trung vào việc mô phỏng **tổng lợi nhuận** dựa trên các tham số cơ bản từ backtest thực tế. 