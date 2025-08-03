# 📅 Walk-Forward Analysis - Phân tích ổn định chiến lược

## ✅ **Tính năng mới: Walk-Forward Analysis**

Walk-Forward Analysis đã được thêm vào module **Theo dõi và tối ưu hóa thuật toán** để đánh giá tính ổn định và khả năng tổng quát hóa của chiến lược giao dịch.

---

## 🎯 **Walk-Forward Analysis là gì?**

Walk-Forward Analysis là một phương pháp validation nâng cao cho chiến lược giao dịch, giúp:

- **Phát hiện overfitting**: So sánh hiệu suất in-sample vs out-sample
- **Đánh giá độ ổn định**: Kiểm tra sự thay đổi của tham số theo thời gian
- **Kiểm tra robustness**: Đảm bảo chiến lược hoạt động tốt trong nhiều điều kiện thị trường
- **Phát hiện regime changes**: Nhận biết khi thị trường thay đổi

---

## 📈 **Quy trình Walk-Forward Analysis**

### **1. Chia dữ liệu thành các periods:**

```
Period 1: [Training: 2023-01-01 → 2023-12-31] [Testing: 2024-01-01 → 2024-03-31]
Period 2: [Training: 2023-02-01 → 2024-01-31] [Testing: 2024-02-01 → 2024-04-30]
Period 3: [Training: 2023-03-01 → 2024-02-29] [Testing: 2024-03-01 → 2024-05-31]
...
```

### **2. Quy trình cho mỗi period:**

1. **In-Sample Period (Training)**:
   - Tối ưu hóa tham số trên dữ liệu training
   - Tính toán hiệu suất in-sample
   - Lưu tham số tối ưu

2. **Out-Sample Period (Testing)**:
   - Test chiến lược với tham số đã tối ưu
   - Tính toán hiệu suất out-sample
   - So sánh với in-sample performance

3. **Step Forward**:
   - Di chuyển cửa sổ thời gian
   - Lặp lại quá trình

---

## ⚙️ **Cấu hình Walk-Forward Analysis**

### **Tham số chính:**

```typescript
interface WalkForwardConfig {
  totalPeriod: number;        // Tổng thời gian (ngày)
  inSamplePeriod: number;     // Thời gian training (ngày)
  outSamplePeriod: number;    // Thời gian testing (ngày)
  stepSize: number;           // Bước di chuyển (ngày)
  optimizationMethod: string; // Phương pháp tối ưu
  rebalanceFrequency: string; // Tần suất rebalance
}
```

### **Ví dụ cấu hình:**

```typescript
const config = {
  totalPeriod: 252 * 2,      // 2 năm
  inSamplePeriod: 252,       // 1 năm training
  outSamplePeriod: 63,       // 3 tháng testing
  stepSize: 21,              // Di chuyển 1 tháng
  optimizationMethod: 'genetic_algorithm',
  rebalanceFrequency: 'monthly'
};
```

---

## 📊 **Kết quả phân tích**

### **1. Metrics cho mỗi period:**

```typescript
interface WalkForwardPeriod {
  id: string;
  startDate: string;
  endDate: string;
  inSampleReturn: number;     // Lợi nhuận training
  outSampleReturn: number;    // Lợi nhuận testing
  inSampleSharpe: number;     // Sharpe ratio training
  outSampleSharpe: number;    // Sharpe ratio testing
  parameterDrift: number;     // Độ trôi tham số
  stability: number;          // Độ ổn định (0-1)
}
```

### **2. Overall metrics:**

- **Average In-Sample Return**: Lợi nhuận trung bình training
- **Average Out-Sample Return**: Lợi nhuận trung bình testing
- **Average Stability**: Độ ổn định trung bình
- **Consistency Score**: Điểm nhất quán (0-100%)
- **Overfitting Risk**: Rủi ro overfitting (0-100%)
- **Recommendation**: Đánh giá tổng thể

---

## 🎯 **Cách sử dụng**

### **1. Trong UI:**

1. Truy cập **Trading Strategy** → **Walk Forward Analysis**
2. Cấu hình các tham số:
   - Tổng thời gian: 2 năm (504 ngày)
   - In-Sample Period: 1 năm (252 ngày)
   - Out-Sample Period: 3 tháng (63 ngày)
   - Step Size: 1 tháng (21 ngày)
3. Chọn phương pháp tối ưu hóa
4. Click "Chạy Walk-Forward Analysis"

### **2. API Endpoint:**

```typescript
const response = await fetch('/api/research/walk-forward', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    experiment_id: `walk-forward-${Date.now()}`,
    config: {
      total_period: 252 * 2,
      in_sample_period: 252,
      out_sample_period: 63,
      step_size: 21,
      optimization_method: 'genetic_algorithm',
      rebalance_frequency: 'monthly',
      strategy_params: {
        fastEMA: 10,
        slowEMA: 21,
        rsiPeriod: 14
      }
    }
  })
});
```

---

## 📈 **Diễn giải kết quả**

### **1. Đánh giá độ ổn định:**

- **Excellent (80-100%)**: Chiến lược rất ổn định và hiệu quả
- **Good (60-80%)**: Chiến lược tốt, có thể sử dụng
- **Fair (40-60%)**: Chiến lược cần cải thiện
- **Poor (0-40%)**: Chiến lược không ổn định

### **2. Phát hiện overfitting:**

```typescript
// Nếu in-sample >> out-sample → Overfitting
if (inSampleReturn - outSampleReturn > 10) {
  console.log('⚠️ Có dấu hiệu overfitting');
}

// Nếu parameter drift cao → Không ổn định
if (parameterDrift > 0.3) {
  console.log('⚠️ Tham số thay đổi nhiều');
}
```

### **3. Market regime detection:**

- **Stable periods**: Tham số ổn định, hiệu suất nhất quán
- **Regime changes**: Tham số thay đổi đột ngột, hiệu suất giảm
- **Adaptive periods**: Tham số thích nghi, hiệu suất cải thiện

---

## 🔧 **Tích hợp với hệ thống**

### **1. Database Integration:**

```sql
-- Lưu kết quả walk-forward analysis
INSERT INTO research_experiments (
  experiment_id,
  experiment_type,
  config,
  results,
  status
) VALUES (
  'walk-forward-123',
  'walk_forward_analysis',
  '{"total_period": 504, ...}',
  '{"periods": [...], "overall_metrics": {...}}',
  'completed'
);
```

### **2. Experiments Integration:**

```typescript
// Tự động chạy walk-forward khi tạo experiment
static async runWalkForwardAnalysis(config: any, experimentId: string) {
  const response = await fetch('/api/research/walk-forward', {
    method: 'POST',
    body: JSON.stringify({ experiment_id: experimentId, config })
  });
  return response.json();
}
```

---

## 📊 **So sánh với các phương pháp khác**

| Aspect | Backtest | Monte Carlo | Walk-Forward |
|--------|----------|-------------|--------------|
| **Overfitting Detection** | ❌ Không | ⚠️ Gián tiếp | ✅ Trực tiếp |
| **Parameter Stability** | ❌ Không | ❌ Không | ✅ Có |
| **Market Regime** | ❌ Không | ❌ Không | ✅ Có |
| **Robustness** | ⚠️ Hạn chế | ✅ Tốt | ✅ Rất tốt |
| **Computational Cost** | Thấp | Trung bình | Cao |

---

## 🚀 **Best Practices**

### **1. Cấu hình khuyến nghị:**

- **In-Sample Period**: 1-2 năm (đủ dữ liệu để tối ưu)
- **Out-Sample Period**: 3-6 tháng (đủ dài để test)
- **Step Size**: 1-3 tháng (cân bằng giữa chi tiết và tốc độ)
- **Total Period**: 3-5 năm (nhiều market conditions)

### **2. Monitoring:**

- **Parameter Drift**: < 20% (ổn định)
- **Consistency Score**: > 70% (nhất quán)
- **Overfitting Risk**: < 15% (an toàn)

### **3. Action Items:**

- **High Drift**: Xem xét lại chiến lược
- **Low Consistency**: Cải thiện robustness
- **High Overfitting**: Giảm complexity

---

## 🎯 **Kết luận**

✅ **Walk-Forward Analysis** cung cấp:

- **Validation nâng cao** cho chiến lược giao dịch
- **Phát hiện overfitting** chính xác
- **Đánh giá độ ổn định** theo thời gian
- **Market regime detection** tự động
- **Recommendations** dựa trên dữ liệu

🚀 **Tích hợp hoàn chỉnh** với hệ thống research và experiments!

---

## 📚 **Tài liệu tham khảo**

- [Walk-Forward Analysis in Trading](https://www.investopedia.com/terms/w/walk-forward-analysis.asp)
- [Parameter Stability Testing](https://www.quantstart.com/articles/Parameter-Stability-Testing-in-Quantitative-Trading/)
- [Overfitting Detection Methods](https://www.mlq.ai/overfitting-detection-methods/) 