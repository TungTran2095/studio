# Monte Carlo Analysis - Phân tích Monte Carlo

## Tổng quan

Monte Carlo Analysis là một tab mới được thêm vào module "Theo dõi và tối ưu hóa thuật toán" trong hệ thống Advanced Backtesting. Tính năng này cung cấp phân tích rủi ro toàn diện thông qua mô phỏng Monte Carlo.

## Tính năng chính

### 1. Cấu hình Monte Carlo
- **Số lượng mô phỏng**: 100 - 10,000 simulations
- **Mức độ tin cậy**: 80% - 99%
- **Thời gian dự báo**: 30 - 500 ngày

### 2. Tham số rủi ro
- **Mô hình biến động**: Constant, GARCH, EWMA, Regime Switching
- **Phân phối lợi nhuận**: Normal, Student's t, Skewed t, Empirical
- **Cấu trúc tương quan**: Historical, Constant, Dynamic, Copula

### 3. Phân tích kịch bản
- **Kịch bản thị trường**:
  - Bull Market (+20% annual return)
  - Bear Market (-20% annual return)
  - Sideways Market (±5% annual return)
  - High/Low Volatility Periods

- **Stress Test Scenarios**:
  - Financial Crisis (2008-like)
  - COVID-19 Crash (2020-like)
  - Dot-com Bubble Burst

### 4. Tối ưu hóa danh mục
- **Phương pháp tối ưu**:
  - Efficient Frontier
  - Risk Parity
  - Black-Litterman
  - Maximum Sharpe Ratio
  - Minimum Variance

- **Tần suất tái cân bằng**: Daily, Weekly, Monthly, Quarterly, Annually
- **Ngưỡng chi phí giao dịch**: Có thể điều chỉnh

## Kết quả phân tích

### 1. Chỉ số chính
- **Xác suất có lãi**: Tỷ lệ phần trăm các mô phỏng có lợi nhuận dương
- **Value at Risk (VaR)**: Mức thua lỗ tối đa với mức tin cậy cho trước
- **Sharpe Ratio dự kiến**: Tỷ lệ lợi nhuận điều chỉnh rủi ro

### 2. Khoảng tin cậy
- **90% Confidence Interval**: Khoảng lợi nhuận với độ tin cậy 90%
- **95% Confidence Interval**: Khoảng lợi nhuận với độ tin cậy 95%
- **99% Confidence Interval**: Khoảng lợi nhuận với độ tin cậy 99%

### 3. Chỉ số rủi ro đuôi
- **Expected Shortfall**: Mức thua lỗ trung bình khi vượt quá VaR
- **Tail Dependence**: Mức độ phụ thuộc giữa các sự kiện cực đoan
- **Maximum Drawdown**: Mức sụt giảm tối đa từ đỉnh

### 4. Phân tích kịch bản
- **Expected Return**: Lợi nhuận dự kiến cho từng kịch bản
- **Volatility**: Độ biến động dự kiến
- **Probability**: Xác suất xảy ra kịch bản

## Biểu đồ trực quan

### Risk-Return Distribution Chart
- Hiển thị các khoảng tin cậy với màu sắc khác nhau
- Đường VaR được đánh dấu rõ ràng
- Legend giải thích ý nghĩa của từng thành phần

## API Endpoint

### POST /api/research/monte-carlo

**Request Body:**
```json
{
  "experiment_id": "string",
  "config": {
    "n_simulations": 1000,
    "confidence_level": 0.95,
    "time_horizon_days": 252,
    "volatility_model": "garch",
    "return_distribution": "normal",
    "correlation_structure": "historical",
    "optimization_method": "efficient_frontier",
    "risk_tolerance": 50,
    "rebalancing_frequency": "monthly",
    "transaction_cost_threshold": 0.005,
    "scenarios": {
      "bull_market": true,
      "bear_market": true,
      "sideways_market": true,
      "high_volatility": true,
      "low_volatility": true,
      "financial_crisis": false,
      "covid_crash": false,
      "dotcom_bubble": false
    }
  }
}
```

**Response:**
```json
{
  "success": true,
  "results": {
    "probability_of_profit": 95.2,
    "value_at_risk": -8.5,
    "expected_sharpe_ratio": 1.85,
    "confidence_intervals": {
      "ci_90": [-5.2, 15.8],
      "ci_95": [-8.5, 22.1],
      "ci_99": [-15.3, 35.7]
    },
    "tail_risk_metrics": {
      "expected_shortfall": -12.3,
      "tail_dependence": 0.67,
      "maximum_drawdown": -18.9
    },
    "scenario_analysis": {
      "bull_market": {
        "expected_return": 25.5,
        "volatility": 12.3,
        "probability": 0.35
      }
    }
  },
  "experiment_id": "string"
}
```

## Cách sử dụng

1. **Truy cập tab Monte Carlo**: Chọn tab "🎲 Monte Carlo Analysis" trong Advanced Backtesting
2. **Cấu hình tham số**: Điều chỉnh các tham số theo nhu cầu
3. **Chọn kịch bản**: Bật/tắt các kịch bản thị trường và stress test
4. **Chạy phân tích**: Nhấn "Run Monte Carlo Analysis"
5. **Xem kết quả**: Phân tích các chỉ số và biểu đồ
6. **Xuất kết quả**: Tải về file JSON nếu cần

## Lưu ý kỹ thuật

- Kết quả được lưu vào database với `experiment_type: 'monte_carlo_analysis'`
- Sử dụng các hàm phân phối chuẩn để tính toán VaR và confidence intervals
- Biểu đồ được vẽ bằng HTML5 Canvas với responsive design
- Tất cả tính toán được thực hiện server-side để đảm bảo độ chính xác

## Mở rộng tương lai

- Tích hợp với dữ liệu thị trường thực tế
- Thêm các mô hình phân phối phức tạp hơn
- Hỗ trợ phân tích đa tài sản
- Tích hợp machine learning để dự báo
- Thêm các chỉ số rủi ro nâng cao 