# 🧪 Hướng dẫn Setup Database cho Experiments

## ⚠️ Lỗi hiện tại

Bạn đang gặp 2 lỗi:
1. **"Failed to fetch experiments"** - Bảng `research_experiments` chưa tồn tại
2. **Lỗi khi tạo thí nghiệm** - Do bảng chưa được tạo

## 🔧 Cách sửa lỗi

### Bước 1: Mở Supabase Dashboard
1. Truy cập [Supabase Dashboard](https://app.supabase.com)
2. Chọn project của bạn
3. Vào **SQL Editor** (biểu tượng `</>` ở sidebar)

### Bước 2: Chạy SQL Script
Copy và paste đoạn SQL sau vào SQL Editor, sau đó click **Run**:

```sql
-- =========================================
-- CREATE RESEARCH_EXPERIMENTS TABLE
-- =========================================

-- Tạo bảng research_experiments
CREATE TABLE IF NOT EXISTS research_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('backtest', 'hypothesis_test', 'optimization', 'monte_carlo')),
  description TEXT,
  config JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'stopped')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  results JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tạo indexes cho performance
CREATE INDEX IF NOT EXISTS idx_research_experiments_project_id ON research_experiments(project_id);
CREATE INDEX IF NOT EXISTS idx_research_experiments_status ON research_experiments(status);
CREATE INDEX IF NOT EXISTS idx_research_experiments_type ON research_experiments(type);
CREATE INDEX IF NOT EXISTS idx_research_experiments_created_at ON research_experiments(created_at DESC);

-- Enable Row Level Security
ALTER TABLE research_experiments ENABLE ROW LEVEL SECURITY;

-- Tạo policy cho RLS (cho phép tất cả operations)
DROP POLICY IF EXISTS "Allow all operations on research_experiments" ON research_experiments;
CREATE POLICY "Allow all operations on research_experiments" 
ON research_experiments FOR ALL USING (true);

-- Tạo trigger để auto-update updated_at
CREATE OR REPLACE FUNCTION update_research_experiments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_research_experiments_updated_at ON research_experiments;
CREATE TRIGGER update_research_experiments_updated_at 
BEFORE UPDATE ON research_experiments 
FOR EACH ROW EXECUTE FUNCTION update_research_experiments_updated_at();

-- Insert demo data (optional)
INSERT INTO research_experiments (project_id, name, type, description, config, status, progress, results) 
SELECT 
  p.id,
  'Demo Bitcoin Backtest',
  'backtest',
  'Demo experiment để test chức năng',
  '{"start_date": "2023-01-01", "end_date": "2024-01-01", "initial_capital": 10000, "commission": 0.001}'::jsonb,
  'completed',
  100,
  '{"total_return": 23.5, "sharpe_ratio": 1.6, "max_drawdown": -8.4, "win_rate": 67.3, "total_trades": 156}'::jsonb
FROM research_projects p 
WHERE p.name LIKE '%Bitcoin%' 
LIMIT 1
ON CONFLICT DO NOTHING;

-- Verify table creation
SELECT 
  'research_experiments' as table_name, 
  count(*) as record_count 
FROM research_experiments;

-- Success message
SELECT 'Research experiments table created successfully! 🧪' as status;
```

### Bước 3: Kiểm tra kết quả
Sau khi chạy SQL, bạn sẽ thấy:
- ✅ Table `research_experiments` được tạo
- ✅ Indexes được tạo
- ✅ RLS policies được setup
- ✅ Demo data được thêm (nếu có project Bitcoin)

### Bước 4: Test lại chức năng
1. Quay lại ứng dụng
2. Vào tab **Experiments** trong project detail
3. Chức năng sẽ hoạt động bình thường

## 🚀 Chức năng sau khi setup

Sau khi setup thành công, bạn có thể:

### ✅ Tạo experiments
- **Backtest Strategy**: Test chiến lược trading
- **Hypothesis Test**: Kiểm định giả thuyết thống kê  
- **Portfolio Optimization**: Tối ưu hóa portfolio
- **Monte Carlo Simulation**: Mô phỏng rủi ro

### ✅ Chạy experiments
- Real-time progress tracking
- Automatic result calculation
- Error handling

### ✅ Xem kết quả
- Performance metrics
- Charts và visualizations
- Export reports

## 🔧 Troubleshooting

### Nếu vẫn gặp lỗi:

1. **"Table already exists"**: Bỏ qua, table đã được tạo
2. **"Permission denied"**: Kiểm tra RLS policies
3. **"Function not found"**: Chạy lại phần tạo function
4. **"Foreign key constraint"**: Đảm bảo bảng `research_projects` tồn tại

### Kiểm tra table đã tạo:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_name = 'research_experiments';
```

### Kiểm tra data:
```sql
SELECT * FROM research_experiments LIMIT 5;
```

## 📞 Hỗ trợ

Nếu vẫn gặp vấn đề, hãy:
1. Kiểm tra Supabase logs
2. Verify environment variables
3. Restart development server
4. Check browser console for errors

---

**Lưu ý**: Sau khi setup thành công, chức năng Experiments sẽ hoạt động 100% với database thực tế, không còn mock data! 