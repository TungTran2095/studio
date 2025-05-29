# 🧪 Research Experiments - Chức năng thực tế

## ⚠️ QUAN TRỌNG: Sửa lỗi Database

**Nếu bạn gặp lỗi "Failed to fetch experiments" hoặc lỗi khi tạo thí nghiệm**, vui lòng xem file `EXPERIMENTS_SETUP_GUIDE.md` để setup database.

**TL;DR**: Chạy SQL script trong Supabase để tạo bảng `research_experiments`.

---

## Tổng quan

Chức năng **Experiments** đã được chuyển từ mock data sang hệ thống thực tế với database và API endpoints hoàn chỉnh.

## 🚀 Tính năng mới

### ✨ API Endpoints
- **GET** `/api/research/experiments` - Lấy danh sách experiments
- **POST** `/api/research/experiments` - Tạo experiment mới  
- **PUT** `/api/research/experiments?id={id}` - Cập nhật experiment
- **DELETE** `/api/research/experiments?id={id}` - Xóa experiment
- **POST** `/api/research/experiments/run` - Chạy experiment
- **POST** `/api/research/setup-experiments` - Setup database (auto)

### 🎯 Loại experiments được hỗ trợ

#### 1. **Backtest Strategy**
- Test chiến lược trading trên dữ liệu lịch sử
- Cấu hình: start_date, end_date, initial_capital, commission
- Kết quả: total_return, sharpe_ratio, max_drawdown, win_rate, etc.

#### 2. **Hypothesis Test**  
- Kiểm định giả thuyết thống kê
- Cấu hình: hypothesis type, significance_level
- Kết quả: p_value, test_statistic, reject_null, confidence_interval

#### 3. **Portfolio Optimization**
- Tối ưu hóa tham số portfolio/strategy
- Cấu hình: optimization method, objective function
- Kết quả: optimal_parameters, optimal_value, convergence

#### 4. **Monte Carlo Simulation**
- Mô phỏng Monte Carlo cho risk analysis
- Cấu hình: n_simulations, time_horizon
- Kết quả: VaR, expected_shortfall, percentiles

### 🔄 Workflow thực tế

1. **Setup database** (một lần duy nhất)
2. **Tạo experiment** với cấu hình phù hợp
3. **Chạy experiment** - hệ thống sẽ:
   - Cập nhật status thành "running"
   - Thực hiện tính toán theo loại experiment
   - Cập nhật progress real-time
   - Lưu kết quả khi hoàn thành
4. **Theo dõi tiến độ** với polling mỗi 2 giây
5. **Xem kết quả** chi tiết khi hoàn thành

### 📊 Database Schema

```sql
CREATE TABLE research_experiments (
  id UUID PRIMARY KEY,
  project_id UUID,
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('backtest', 'hypothesis_test', 'optimization', 'monte_carlo')),
  description TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
  progress INTEGER DEFAULT 0,
  results JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🛠️ Cách sửa lỗi

### Lỗi thường gặp:
1. **"Failed to fetch experiments"** → Bảng chưa tồn tại
2. **"Lỗi khi tạo thí nghiệm"** → Database chưa setup

### Giải pháp:
1. **Tự động**: Click nút "Setup Database" trong UI
2. **Manual**: Chạy SQL script trong `EXPERIMENTS_SETUP_GUIDE.md`

## 🛠️ Cách sử dụng

### 1. Tạo experiment mới
```typescript
const experiment = {
  project_id: "uuid",
  name: "Bitcoin Backtest",
  type: "backtest",
  description: "Test buy and hold strategy",
  config: {
    start_date: "2023-01-01",
    end_date: "2024-01-01", 
    initial_capital: 10000,
    commission: 0.001
  }
};
```

### 2. Chạy experiment
```typescript
const response = await fetch('/api/research/experiments/run', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ experiment_id: "uuid" })
});
```

### 3. Theo dõi tiến độ
- Component tự động poll status mỗi 2 giây
- Progress bar hiển thị real-time
- Tự động dừng polling khi hoàn thành

## 🎨 UI/UX Features

### ✅ Đã implement
- ✅ **Database setup UI** - Tự động detect và setup
- ✅ **Error handling** - User-friendly error messages
- ✅ **Dynamic config forms** cho từng loại experiment
- ✅ **Real-time progress tracking** với progress bars
- ✅ **Status management** (pending, running, completed, failed, stopped)
- ✅ **Results display** phù hợp với từng loại experiment
- ✅ **CRUD operations** đầy đủ (create, read, update, delete)
- ✅ **Auto-polling** cho real-time updates

### 🎯 Smart features
- **Auto database detection**: Tự động phát hiện table chưa tồn tại
- **One-click setup**: Setup database với 1 click
- **Adaptive UI**: Form cấu hình thay đổi theo loại experiment
- **Real-time feedback**: Progress và status updates tức thì
- **Error recovery**: Có thể chạy lại experiments bị failed
- **Data persistence**: Tất cả được lưu trong database
- **Security**: RLS policies bảo vệ data theo user

## 🔧 Technical Implementation

### Backend (API)
- **Auto table creation** - Tự động tạo table nếu chưa tồn tại
- **ExperimentRunner class** với 4 methods cho 4 loại experiments
- **Async processing** - experiments chạy background
- **Progress tracking** - cập nhật database real-time
- **Error handling** - catch và log errors properly

### Frontend (React)
- **Database setup detection** - Tự động detect setup required
- **State management** với useState hooks
- **Real-time polling** với setInterval
- **Dynamic forms** với conditional rendering
- **Loading states** và user feedback
- **Optimistic updates** cho better UX

### Database
- **JSONB config** - flexible configuration storage
- **JSONB results** - structured results storage
- **Indexes** cho performance
- **RLS policies** cho security
- **Triggers** cho auto-update timestamps

## 🚀 Kết quả

Chức năng Experiments giờ đây là **100% functional** với:
- ✅ Database integration hoàn chỉnh
- ✅ API endpoints thực tế
- ✅ Auto database setup
- ✅ Real-time progress tracking
- ✅ Multiple experiment types
- ✅ Professional UI/UX
- ✅ Error handling robust
- ✅ Security với RLS

**Không còn mock data** - tất cả đều là chức năng thực tế có thể sử dụng ngay! 