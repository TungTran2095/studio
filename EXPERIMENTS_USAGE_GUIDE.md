# 🧪 Hướng dẫn sử dụng Experiments - Chi tiết và Thực tế

## 📋 Tổng quan

Experiments là nơi bạn test các ý tưởng trading, phân tích rủi ro và tối ưu hóa strategies. Thay vì đoán mò, bạn sẽ có data cụ thể để đưa ra quyết định.

---

## 🔄 1. BACKTEST STRATEGY

### 💡 **Backtest là gì?**
- Test strategy trading trên dữ liệu lịch sử
- Xem strategy đó có profitable không trong quá khứ
- **VD**: "Nếu tôi mua Bitcoin mỗi tuần $100 từ đầu 2023, giờ có bao nhiều tiền?"

### 🎯 **Khi nào dùng Backtest?**
- ✅ Muốn test một strategy trước khi bỏ tiền thật
- ✅ So sánh nhiều strategies khác nhau
- ✅ Tìm hiểu risk/reward của strategy
- ✅ Validate ý tưởng trading

### 📊 **Templates có sẵn:**

#### 1. **Bitcoin DCA Strategy**
```
Chiến lược: Mua Bitcoin $100 mỗi tuần
Kỳ vọng: Return 15-25%, Drawdown -30%
Phù hợp: Investor dài hạn, ít thời gian
```

#### 2. **Ethereum Momentum Trading**
```
Chiến lược: Mua khi giá > MA20, bán khi giá < MA10
Kỳ vọng: Return 20-40%, Win rate 60-70%
Phù hợp: Active trader, theo dõi thường xuyên
```

#### 3. **Portfolio Rebalancing**
```
Chiến lược: 50% BTC, 30% ETH, 20% altcoins, rebalance monthly
Kỳ vọng: Return 18-28%, Sharpe ratio 1.1
Phù hợp: Diversified investor
```

### 🔧 **Cách setup:**
1. Chọn template hoặc tự tạo
2. Set ngày bắt đầu/kết thúc (VD: 2023-01-01 đến 2024-01-01)
3. Set vốn ban đầu (VD: $10,000)
4. Set phí giao dịch (VD: 0.1% = 0.001)
5. Click "Chạy" và đợi kết quả

### 📈 **Kết quả sẽ có:**
- **Total Return**: Tổng lợi nhuận (VD: +23.5%)
- **Sharpe Ratio**: Risk-adjusted return (>1 = tốt)
- **Max Drawdown**: Loss lớn nhất (VD: -8.4%)
- **Win Rate**: % trades thắng (VD: 67%)

---

## 🧪 2. HYPOTHESIS TEST (Kiểm định giả thuyết)

### 💡 **Hypothesis Test là gì?**
- Kiểm tra xem một "giả thuyết" có đúng không bằng thống kê
- **VD**: "Giá Bitcoin có thường giảm vào cuối tuần không?"

### 🎯 **Khi nào dùng?**
- ✅ Muốn verify một pattern/trend
- ✅ Kiểm tra correlation giữa assets
- ✅ Test market efficiency
- ✅ Validate trading signals

### 📊 **Templates có sẵn:**

#### 1. **Weekend Effect in Crypto**
```
Giả thuyết: Giá crypto giảm vào cuối tuần
Test: So sánh return T6-CN vs T2-T5
Kết quả: P-value < 0.05 = có weekend effect
```

#### 2. **BTC-ETH Correlation Test**
```
Giả thuyết: Bitcoin và Ethereum có correlation cao
Test: Tính correlation coefficient
Kết quả: >0.7 = correlation cao, <0.3 = thấp
```

### 🔧 **Cách setup:**
1. Chọn giả thuyết muốn test
2. Set significance level (0.05 = 95% confidence)
3. Chọn assets và time period
4. Click "Chạy"

### 📊 **Kết quả sẽ có:**
- **P-value**: <0.05 = reject null hypothesis (có effect)
- **Test Statistic**: Độ mạnh của effect
- **Conclusion**: Accept/Reject hypothesis

---

## 🎯 3. OPTIMIZATION (Tối ưu hóa)

### 💡 **Optimization là gì?**
- Tìm tham số/allocation tối ưu để maximize mục tiêu
- **VD**: "Tỷ lệ BTC/ETH/altcoins nào cho Sharpe ratio cao nhất?"

### 🎯 **Khi nào dùng?**
- ✅ Tối ưu portfolio allocation
- ✅ Fine-tune strategy parameters
- ✅ Maximize risk-adjusted returns
- ✅ Find optimal entry/exit points

### 📊 **Templates có sẵn:**

#### 1. **Portfolio Optimization**
```
Mục tiêu: Maximize Sharpe ratio
Assets: BTC, ETH, BNB, ADA
Constraints: Min 5%, Max 60% mỗi asset
Kết quả: Optimal weights cho từng asset
```

#### 2. **Strategy Parameter Tuning**
```
Strategy: Moving Average Crossover
Parameters: Fast MA (5-20), Slow MA (20-100), Stop Loss (2-10%)
Mục tiêu: Maximize total return
Kết quả: Best parameter combination
```

### 🔧 **Cách setup:**
1. Chọn optimization method (Genetic Algorithm recommended)
2. Set objective function (Sharpe ratio, Total return, etc.)
3. Define constraints (min/max weights)
4. Click "Chạy"

### 📊 **Kết quả sẽ có:**
- **Optimal Parameters**: Best combination found
- **Objective Value**: Achieved target (VD: Sharpe = 1.8)
- **Allocation**: % cho mỗi asset

---

## ⚡ 4. MONTE CARLO SIMULATION

### 💡 **Monte Carlo là gì?**
- Chạy hàng nghìn scenarios khác nhau để tính risk
- **VD**: "Trong 10,000 kịch bản, portfolio tôi loss >20% bao nhiều lần?"

### 🎯 **Khi nào dùng?**
- ✅ Stress test portfolio
- ✅ Tính Value at Risk (VaR)
- ✅ Estimate worst-case scenarios
- ✅ Risk management planning

### 📊 **Templates có sẵn:**

#### 1. **Portfolio Risk Analysis**
```
Setup: 10,000 simulations, 1 year horizon
Portfolio: 60% BTC, 40% ETH
Kết quả: VaR 95%, Expected Shortfall
```

#### 2. **Strategy Stress Test**
```
Setup: 5,000 simulations với extreme scenarios
Test: Bear market, high volatility, flash crash
Kết quả: Survival rate, worst case loss
```

### 🔧 **Cách setup:**
1. Set số simulations (10,000 recommended)
2. Set time horizon (252 days = 1 year)
3. Define portfolio composition
4. Set confidence levels (95%, 99%)
5. Click "Chạy"

### 📊 **Kết quả sẽ có:**
- **VaR 95%**: 95% chance loss không vượt quá X%
- **Expected Shortfall**: Average loss trong 5% worst cases
- **Survival Rate**: % scenarios không bị wipeout

---

## 🚀 Workflow thực tế

### **Bước 1: Research & Hypothesis**
```
VD: "DCA Bitcoin có tốt hơn lump sum không?"
→ Tạo 2 Backtest experiments để so sánh
```

### **Bước 2: Test & Validate**
```
→ Chạy Hypothesis Test để verify pattern
→ Dùng Monte Carlo để check risk
```

### **Bước 3: Optimize**
```
→ Dùng Optimization để fine-tune parameters
→ Tìm allocation tối ưu
```

### **Bước 4: Implementation**
```
→ Apply strategy với confidence cao
→ Monitor và adjust theo thời gian
```

---

## ⚠️ Lưu ý quan trọng

### **Backtest Limitations:**
- Past performance ≠ future results
- Market conditions thay đổi
- Slippage và fees thực tế có thể khác

### **Best Practices:**
- ✅ Test trên multiple time periods
- ✅ Include transaction costs
- ✅ Use out-of-sample testing
- ✅ Consider market regime changes
- ✅ Start small với real money

### **Red Flags:**
- ❌ Too good to be true results
- ❌ Overfitting (quá nhiều parameters)
- ❌ Không test trên bear market
- ❌ Ignore transaction costs

---

## 🎯 Examples thực tế

### **Scenario 1: Beginner Investor**
```
Goal: Đầu tư Bitcoin dài hạn
Experiment: Bitcoin DCA Strategy backtest
Result: +18% return, -25% max drawdown
Decision: Implement với $500/month
```

### **Scenario 2: Active Trader**
```
Goal: Short-term trading strategy
Experiment: Momentum strategy + optimization
Result: +35% return, 65% win rate
Decision: Start với $5,000, scale up nếu profitable
```

### **Scenario 3: Portfolio Manager**
```
Goal: Diversified crypto portfolio
Experiment: Portfolio optimization + Monte Carlo
Result: 40% BTC, 30% ETH, 30% alts, VaR 15%
Decision: Implement với rebalancing quarterly
```

---

## 🔧 Troubleshooting

### **Experiment không chạy?**
- Check database setup (click Setup Database)
- Verify date ranges hợp lý
- Ensure có đủ data cho time period

### **Kết quả không realistic?**
- Increase transaction costs
- Add slippage assumptions
- Test trên bear market periods

### **Quá nhiều parameters?**
- Start với templates có sẵn
- Focus vào 2-3 key parameters
- Use cross-validation

---

**💡 Pro Tip**: Bắt đầu với templates có sẵn, hiểu kết quả, rồi mới customize. Experiments là tool mạnh nhưng cần hiểu limitations để avoid false confidence! 