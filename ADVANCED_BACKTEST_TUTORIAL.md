# 🎓 Hướng dẫn sử dụng Advanced Backtesting - Từ cơ bản đến nâng cao

## 📋 **Mục lục**
1. [Giới thiệu](#giới-thiệu)
2. [Cài đặt và chuẩn bị](#cài-đặt-và-chuẩn-bị)
3. [Chạy lần đầu tiên](#chạy-lần-đầu-tiên)
4. [Hiểu kết quả](#hiểu-kết-quả)
5. [Tùy chỉnh cấu hình](#tùy-chỉnh-cấu-hình)
6. [Sử dụng UI](#sử-dụng-ui)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 **1. Giới thiệu**

Advanced Backtesting là phiên bản nâng cấp của hệ thống backtest cơ bản, bao gồm:

### ✨ **Tính năng mới so với Basic Backtest:**

| **Tính năng** | **Basic Backtest** | **Advanced Backtest** |
|---------------|-------------------|----------------------|
| **Walk-Forward** | ❌ Không có | ✅ Chia data thành training/testing |
| **Monte Carlo** | ❌ Không có | ✅ 1000+ simulations |
| **Transaction Costs** | ❌ Không có | ✅ Realistic fees |
| **Slippage** | ❌ Không có | ✅ Market impact |
| **Position Sizing** | ❌ Fixed size | ✅ Kelly Criterion |
| **Multi-timeframe** | ❌ Single timeframe | ✅ Multiple timeframes |

---

## 🔧 **2. Cài đặt và chuẩn bị**

### **2.1 Kiểm tra môi trường**
```bash
# Kiểm tra Python version
python --version

# Kiểm tra các packages đã cài
python -c "import pandas, numpy, supabase; print('✅ All packages installed')"
```

### **2.2 Cấu hình database**
Đảm bảo file `.env.local` có các thông tin:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

---

## 🚀 **3. Chạy lần đầu tiên**

### **3.1 Chạy với sample configuration (Dễ nhất)**

```bash
# Chạy với cấu hình mẫu
python scripts/backtest_strategies/advanced_backtest_runner.py \
  --experiment_id "my-first-test" \
  --sample
```

**Kết quả mong đợi:**
```
🚀 Starting Advanced Backtest...
📊 Loaded 8760 data points from 2023-01-01 to 2023-12-31
📈 Initialized advanced_rsi strategy
✅ Advanced backtest completed successfully!

📊 ADVANCED BACKTEST RESULTS SUMMARY:
==================================================
🔄 Walk-Forward Analysis:
   - Total periods: 8
   - Avg OOS return: 12.45%
   - Consistency score: 0.823

🎲 Monte Carlo Simulation:
   - Simulations: 1000
   - VaR (95%): -8.23%
   - Probability of loss: 34.8%

📈 Enhanced Backtest:
   - Total return: 23.67%
   - Sharpe ratio: 1.456
   - Max drawdown: -7.89%
   - Total costs: $45.23
```

### **3.2 Chạy với custom configuration**

Tạo file `my_config.json`:
```json
{
  "trading": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "startDate": "2023-06-01",
    "endDate": "2023-12-31",
    "initialCapital": 50000
  },
  "strategy": {
    "type": "advanced_rsi",
    "parameters": {
      "period": 14,
      "overbought": 75,
      "oversold": 25
    }
  },
  "walk_forward": {
    "train_period_days": 180,
    "test_period_days": 45,
    "step_size_days": 15
  },
  "monte_carlo": {
    "n_simulations": 500,
    "confidence_level": 0.95,
    "time_horizon_days": 180
  }
}
```

Chạy với config:
```bash
python scripts/backtest_strategies/advanced_backtest_runner.py \
  --experiment_id "custom-test" \
  --config "$(cat my_config.json)"
```

---

## 📊 **4. Hiểu kết quả**

### **4.1 Walk-Forward Analysis**

```json
{
  "walk_forward_analysis": {
    "summary": {
      "total_periods": 8,
      "avg_out_of_sample_return": 12.5,
      "consistency_score": 0.85,
      "stability_score": 0.78
    }
  }
}
```

**Giải thích:**
- **`total_periods`**: Số lần chia data thành training/testing
- **`avg_out_of_sample_return`**: Lợi nhuận trung bình trên data test
- **`consistency_score`**: Độ ổn định (0-1, càng cao càng tốt)
- **`stability_score`**: Độ ổn định qua thời gian

**Đánh giá:**
- ✅ **Consistency > 0.7**: Strategy ổn định
- ✅ **OOS Return > 0**: Strategy có lợi nhuận
- ⚠️ **Consistency < 0.5**: Strategy không ổn định

### **4.2 Monte Carlo Simulation**

```json
{
  "monte_carlo_simulation": {
    "risk_metrics": {
      "var": -8.5,
      "expected_shortfall": -12.3,
      "probability_of_loss": 35.2,
      "probability_of_positive_return": 64.8
    }
  }
}
```

**Giải thích:**
- **`var`**: Value at Risk (95%) - Loss tối đa có thể xảy ra
- **`expected_shortfall`**: Loss trung bình khi vượt quá VaR
- **`probability_of_loss`**: Xác suất thua lỗ
- **`probability_of_positive_return`**: Xác suất có lợi nhuận

**Đánh giá:**
- ✅ **VaR > -10%**: Rủi ro chấp nhận được
- ✅ **Probability of positive return > 60%**: Strategy tốt
- ⚠️ **VaR < -15%**: Rủi ro cao

### **4.3 Enhanced Backtest**

```json
{
  "enhanced_backtest": {
    "performance": {
      "total_return": 23.5,
      "sharpe_ratio": 1.45,
      "max_drawdown": -8.2,
      "win_rate": 62.3
    },
    "cost_analysis": {
      "total_transaction_costs": 45.20,
      "total_slippage": 23.10,
      "cost_impact": 0.68
    }
  }
}
```

**Giải thích:**
- **`total_return`**: Tổng lợi nhuận (%)
- **`sharpe_ratio`**: Risk-adjusted return (>1 = tốt)
- **`max_drawdown`**: Loss lớn nhất (%)
- **`cost_impact`**: Tác động của phí giao dịch (%)

**Đánh giá:**
- ✅ **Sharpe > 1.0**: Strategy tốt
- ✅ **Max drawdown < -10%**: Rủi ro chấp nhận được
- ✅ **Cost impact < 1%**: Phí giao dịch hợp lý

---

## ⚙️ **5. Tùy chỉnh cấu hình**

### **5.1 Cấu hình Walk-Forward**

```json
{
  "walk_forward": {
    "train_period_days": 252,    // 1 năm training
    "test_period_days": 63,      // 3 tháng testing  
    "step_size_days": 21         // Bước nhảy 1 tháng
  }
}
```

**Khuyến nghị:**
- **Training period**: 200-300 ngày (đủ data để học)
- **Testing period**: 50-100 ngày (đủ để validate)
- **Step size**: 15-30 ngày (không quá nhỏ)

### **5.2 Cấu hình Monte Carlo**

```json
{
  "monte_carlo": {
    "n_simulations": 1000,       // Số simulations
    "confidence_level": 0.95,    // Mức tin cậy
    "time_horizon_days": 252     // Thời gian mô phỏng
  }
}
```

**Khuyến nghị:**
- **n_simulations**: 500-2000 (càng nhiều càng chính xác)
- **confidence_level**: 0.95 (95% confidence)
- **time_horizon**: 180-365 ngày

### **5.3 Cấu hình Transaction Costs**

```json
{
  "transaction_costs": {
    "commission_rate": 0.001,    // 0.1% commission
    "minimum_commission": 1.0,   // $1 minimum
    "maker_fee": 0.0005,         // 0.05% maker fee
    "taker_fee": 0.001           // 0.1% taker fee
  }
}
```

**Fees thực tế:**
- **Binance**: 0.1% taker, 0.075% maker
- **Coinbase**: 0.5% taker, 0.4% maker
- **Kraken**: 0.26% taker, 0.16% maker

---

## 🖥️ **6. Sử dụng UI**

### **6.1 Truy cập UI**

1. **Khởi động server:**
```bash
npm run dev
```

2. **Truy cập:** `http://localhost:9002/advanced-backtesting`

### **6.2 Các tab trong UI**

#### **⚙️ Configuration Tab**
- **Trading Configuration**: Symbol, timeframe, capital
- **Strategy Selection**: Chọn strategy và parameters
- **Real-time adjustment**: Thay đổi parameters ngay lập tức

#### **🎯 Advanced Features Tab**
- **Walk-Forward Analysis**: Cấu hình training/testing periods
- **Monte Carlo Simulation**: Số simulations và confidence level
- **Transaction Costs**: Commission và fees
- **Enhanced Features**: Toggle các tính năng nâng cao

#### **📊 Results Tab**
- **Real-time results**: Kết quả hiển thị ngay khi chạy
- **Performance metrics**: Tất cả metrics quan trọng
- **Cost analysis**: Phân tích tác động của costs

#### **🔍 Insights Tab**
- **Strategy insights**: Thống kê chi tiết về strategy
- **Risk analysis**: Phân tích rủi ro
- **Performance breakdown**: Chi tiết performance

### **6.3 Workflow sử dụng UI**

1. **Bước 1**: Chọn strategy và cấu hình cơ bản
2. **Bước 2**: Bật/tắt các advanced features
3. **Bước 3**: Click "Run Advanced Backtest"
4. **Bước 4**: Xem kết quả và insights
5. **Bước 5**: Điều chỉnh parameters và chạy lại

---

## 🚨 **7. Troubleshooting**

### **7.1 Lỗi thường gặp**

#### **Lỗi: "No data found"**
```bash
# Kiểm tra database connection
python -c "
from supabase import create_client
import os
supabase = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)
print('✅ Database connected')
"
```

#### **Lỗi: "Memory error"**
```bash
# Giảm số simulations
{
  "monte_carlo": {
    "n_simulations": 100  # Giảm từ 1000 xuống 100
  }
}
```

#### **Lỗi: "Slow performance"**
```bash
# Giảm timeframe
{
  "trading": {
    "timeframe": "4h",  # Thay vì 1h
    "startDate": "2023-10-01"  # Giảm period
  }
}
```

### **7.2 Debug tips**

#### **Enable verbose logging**
```python
# Thêm vào config
{
  "debug": {
    "verbose": true,
    "save_intermediate": true
  }
}
```

#### **Test với sample data**
```bash
# Luôn test với --sample trước
python scripts/backtest_strategies/advanced_backtest_runner.py \
  --experiment_id "debug-test" \
  --sample
```

#### **Validate từng component**
```bash
# Test walk-forward riêng
python -c "
from scripts.backtest_strategies.advanced_backtest_engine import WalkForwardConfig
print('✅ WalkForwardConfig imported')
"
```

---

## 📈 **8. Best Practices**

### **8.1 Configuration Guidelines**

#### **Cho người mới:**
```json
{
  "walk_forward": {
    "train_period_days": 200,
    "test_period_days": 50,
    "step_size_days": 25
  },
  "monte_carlo": {
    "n_simulations": 500,
    "confidence_level": 0.95
  },
  "transaction_costs": {
    "commission_rate": 0.001
  }
}
```

#### **Cho chuyên gia:**
```json
{
  "walk_forward": {
    "train_period_days": 300,
    "test_period_days": 100,
    "step_size_days": 20
  },
  "monte_carlo": {
    "n_simulations": 2000,
    "confidence_level": 0.99
  },
  "enhanced_features": {
    "position_sizing": "kelly",
    "multi_timeframe": true,
    "divergence_detection": true
  }
}
```

### **8.2 Strategy Development Workflow**

1. **Start Simple**: Bắt đầu với basic strategy
2. **Add Features**: Thêm từng advanced feature một
3. **Validate**: Test với walk-forward analysis
4. **Optimize**: Tối ưu parameters
5. **Risk Assessment**: Đánh giá rủi ro với Monte Carlo
6. **Deploy**: Triển khai khi đạt yêu cầu

### **8.3 Performance Benchmarks**

| **Metric** | **Poor** | **Good** | **Excellent** |
|------------|----------|----------|---------------|
| **Sharpe Ratio** | < 0.5 | 0.5 - 1.5 | > 1.5 |
| **Max Drawdown** | > -20% | -10% to -20% | < -10% |
| **Consistency Score** | < 0.5 | 0.5 - 0.8 | > 0.8 |
| **VaR (95%)** | < -15% | -10% to -15% | > -10% |
| **Win Rate** | < 40% | 40% - 60% | > 60% |

---

## 🎯 **9. Ví dụ thực tế**

### **9.1 RSI Strategy với Advanced Features**

```json
{
  "trading": {
    "symbol": "BTCUSDT",
    "timeframe": "1h",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "initialCapital": 10000
  },
  "strategy": {
    "type": "advanced_rsi",
    "parameters": {
      "period": 14,
      "overbought": 70,
      "oversold": 30
    }
  },
  "walk_forward": {
    "train_period_days": 252,
    "test_period_days": 63,
    "step_size_days": 21
  },
  "monte_carlo": {
    "n_simulations": 1000,
    "confidence_level": 0.95,
    "time_horizon_days": 252
  },
  "enhanced_features": {
    "position_sizing": "kelly",
    "multi_timeframe": true,
    "dynamic_levels": true,
    "divergence_detection": true,
    "trend_confirmation": true
  }
}
```

**Kết quả mong đợi:**
- Total Return: 20-30%
- Sharpe Ratio: 1.2-1.8
- Max Drawdown: -8% to -12%
- Consistency Score: 0.7-0.9

---

## 🔮 **10. Next Steps**

### **10.1 Nâng cao kỹ năng**
1. **Học về Kelly Criterion**: Tối ưu position sizing
2. **Hiểu Monte Carlo**: Risk management
3. **Master Walk-Forward**: Avoid overfitting
4. **Study Market Microstructure**: Slippage và costs

### **10.2 Thực hành**
1. **Test nhiều strategies**: RSI, MACD, Bollinger Bands
2. **Experiment với parameters**: Tìm optimal settings
3. **Compare results**: So sánh các approaches
4. **Document findings**: Ghi chép kết quả

### **10.3 Resources**
- **Papers**: Academic papers về backtesting
- **Books**: "Advances in Financial Machine Learning"
- **Courses**: Quantitative finance courses
- **Communities**: Reddit r/algotrading

---

**🎯 Advanced Backtesting giúp bạn trở thành một quantitative trader chuyên nghiệp!** 