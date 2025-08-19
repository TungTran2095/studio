# 📊 Backtest Strategies Guide

Hướng dẫn sử dụng các chiến lược backtest trong hệ thống.

## 🚀 Các Chiến Lược Có Sẵn

### 1. **RSI Strategy** (`rsi`)
- **Mô tả**: Chiến lược dựa trên Relative Strength Index
- **Tham số**:
  - `period`: Chu kỳ RSI (mặc định: 14)
  - `overbought`: Ngưỡng quá mua (mặc định: 70)
  - `oversold`: Ngưỡng quá bán (mặc định: 30)
- **Tín hiệu**: Mua khi RSI < oversold, Bán khi RSI > overbought

### 2. **MACD Strategy** (`macd`)
- **Mô tả**: Chiến lược dựa trên Moving Average Convergence Divergence
- **Tham số**:
  - `fastEMA`: EMA nhanh (mặc định: 12)
  - `slowEMA`: EMA chậm (mặc định: 26)
  - `signalPeriod`: Chu kỳ tín hiệu (mặc định: 9)
- **Tín hiệu**: Mua khi MACD > Signal, Bán khi MACD < Signal

### 3. **Moving Average Crossover** (`ma_crossover`)
- **Mô tả**: Chiến lược giao cắt hai đường trung bình động
- **Tham số**:
  - `fastPeriod`: Chu kỳ MA nhanh (mặc định: 10)
  - `slowPeriod`: Chu kỳ MA chậm (mặc định: 20)
- **Tín hiệu**: Mua khi MA nhanh > MA chậm, Bán khi MA nhanh < MA chậm

### 4. **Bollinger Bands** (`bollinger_bands`)
- **Mô tả**: Chiến lược dựa trên dải Bollinger Bands
- **Tham số**:
  - `period`: Chu kỳ (mặc định: 20)
  - `stdDev`: Độ lệch chuẩn (mặc định: 2)
- **Tín hiệu**: Mua khi giá chạm dải dưới, Bán khi giá chạm dải trên

### 5. **Breakout Strategy** (`breakout`)
- **Mô tả**: Chiến lược đột phá kênh giá
- **Tham số**:
  - `period`: Chu kỳ kênh giá (mặc định: 20)
  - `multiplier`: Hệ số nhân (mặc định: 2)
- **Tín hiệu**: Mua khi giá đột phá kênh trên, Bán khi giá đột phá kênh dưới

### 6. **Stochastic Oscillator** (`stochastic`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Stochastic Oscillator
- **Tham số**:
  - `k_period`: Chu kỳ %K (mặc định: 14)
  - `d_period`: Chu kỳ %D (mặc định: 3)
  - `overbought`: Ngưỡng quá mua (mặc định: 80)
  - `oversold`: Ngưỡng quá bán (mặc định: 20)
  - `smooth_k`: Làm mượt %K (mặc định: 3)
  - `smooth_d`: Làm mượt %D (mặc định: 3)
- **Tín hiệu**: Mua khi %K > %D từ vùng oversold, Bán khi %K < %D từ vùng overbought

### 7. **Williams %R** (`williams_r`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Williams %R oscillator
- **Tham số**:
  - `period`: Chu kỳ (mặc định: 14)
  - `overbought`: Ngưỡng quá mua (mặc định: -20)
  - `oversold`: Ngưỡng quá bán (mặc định: -80)
- **Tín hiệu**: Mua khi Williams %R > oversold, Bán khi Williams %R < overbought

### 8. **ADX Strategy** (`adx`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Average Directional Index
- **Tham số**:
  - `adx_period`: Chu kỳ ADX (mặc định: 14)
  - `di_period`: Chu kỳ DI (mặc định: 14)
  - `adx_threshold`: Ngưỡng ADX (mặc định: 25)
  - `trend_strength`: Độ mạnh xu hướng (mặc định: 30)
- **Tín hiệu**: Mua khi ADX > threshold và +DI > -DI, Bán khi ADX > threshold và -DI > +DI

### 9. **Ichimoku Cloud** (`ichimoku`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Ichimoku Cloud
- **Tham số**:
  - `tenkan_period`: Chu kỳ Tenkan (mặc định: 9)
  - `kijun_period`: Chu kỳ Kijun (mặc định: 26)
  - `senkou_span_b_period`: Chu kỳ Senkou Span B (mặc định: 52)
  - `displacement`: Độ dịch chuyển (mặc định: 26)
- **Tín hiệu**: Mua khi giá trên cloud và Tenkan > Kijun, Bán khi giá dưới cloud và Tenkan < Kijun

### 10. **Parabolic SAR** (`parabolic_sar`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Parabolic Stop and Reverse
- **Tham số**:
  - `acceleration`: Gia tốc (mặc định: 0.02)
  - `maximum`: Tối đa (mặc định: 0.2)
- **Tín hiệu**: Mua khi trend chuyển từ downtrend sang uptrend, Bán khi trend chuyển từ uptrend sang downtrend

### 11. **Keltner Channel** (`keltner_channel`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Keltner Channel
- **Tham số**:
  - `ema_period`: Chu kỳ EMA (mặc định: 20)
  - `atr_period`: Chu kỳ ATR (mặc định: 10)
  - `multiplier`: Hệ số nhân (mặc định: 2.0)
- **Tín hiệu**: Mua khi giá bounce từ dải dưới, Bán khi giá chạm dải trên

### 12. **VWAP Strategy** (`vwap`) ⭐ **MỚI**
- **Mô tả**: Chiến lược dựa trên Volume Weighted Average Price
- **Tham số**:
  - `vwap_period`: Chu kỳ VWAP (mặc định: 20)
  - `std_dev_multiplier`: Hệ số độ lệch chuẩn (mặc định: 2.0)
  - `volume_threshold`: Ngưỡng khối lượng (mặc định: 1.5)
- **Tín hiệu**: Mua khi giá dưới VWAP gần dải dưới với volume cao, Bán khi giá trên VWAP gần dải trên với volume cao

## 🔧 Cách Sử Dụng

### 1. **Trong Modal Backtest**
```typescript
// Chọn loại chiến lược
<Select value={strategyType} onValueChange={setStrategyType}>
  <SelectContent>
    <SelectItem value="stochastic">Stochastic Oscillator</SelectItem>
    <SelectItem value="ichimoku">Ichimoku Cloud</SelectItem>
    <SelectItem value="vwap">VWAP Strategy</SelectItem>
    {/* ... các chiến lược khác */}
  </SelectContent>
</Select>
```

### 2. **Trong Python Backtest**
```python
from backtest_strategies import StochasticStrategy, IchimokuStrategy, VWAPStrategy

# Cấu hình chiến lược
config = {
    'strategy': {
        'type': 'stochastic',
        'k_period': 14,
        'd_period': 3,
        'overbought': 80,
        'oversold': 20
    }
}

# Khởi tạo và chạy
strategy = StochasticStrategy(config)
results = strategy.run_backtest(data)
```

## 📈 Các Chỉ Báo Kỹ Thuật

Mỗi chiến lược sẽ tạo ra các chỉ báo kỹ thuật riêng:

- **Stochastic**: `stoch_k`, `stoch_d`
- **Williams %R**: `williams_r`
- **ADX**: `adx`, `di_plus`, `di_minus`
- **Ichimoku**: `tenkan`, `kijun`, `senkou_span_a`, `senkou_span_b`, `chikou`
- **Parabolic SAR**: `parabolic_sar`, `trend`
- **Keltner Channel**: `keltner_ema`, `keltner_upper`, `keltner_lower`, `keltner_atr`
- **VWAP**: `vwap`, `vwap_upper`, `vwap_lower`, `vwap_std`

## 🧪 Testing

Chạy test để kiểm tra tất cả các chiến lược:

```bash
cd scripts/backtest_strategies
python test_new_strategies.py
```

## 📝 Lưu Ý

1. **Tất cả các chiến lược đều kế thừa từ `BaseStrategy`**
2. **Hỗ trợ đầy đủ risk management**: stop loss, take profit, trailing stop
3. **Tích hợp với hệ thống backtest hiện có**
4. **Có thể tùy chỉnh tham số cho từng chiến lược**
5. **Hỗ trợ multiple timeframes và symbols**

## 🚀 Tính Năng Nâng Cao

- **Position Sizing**: Tự động tính toán kích thước vị thế
- **Risk Management**: Quản lý rủi ro thông minh
- **Performance Metrics**: Đầy đủ các chỉ số hiệu suất
- **Chart Integration**: Tích hợp với biểu đồ kỹ thuật
- **Multi-Strategy**: Có thể kết hợp nhiều chiến lược

---

**🎯 Mục tiêu**: Cung cấp bộ công cụ backtest đa dạng và mạnh mẽ cho các nhà giao dịch từ cơ bản đến nâng cao.

