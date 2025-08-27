# Experiment Card với Trading Metrics

## Tổng quan

Experiment card mới được thiết kế để hiển thị đầy đủ các thông số trading từ cột `results` của bảng `research_experiments`. Thay vì tạo các cột riêng biệt, chúng ta sử dụng cột JSONB `results` để lưu trữ tất cả dữ liệu trading.

## Cấu trúc dữ liệu

### Cột `results` trong database
```json
{
  "total_trades": 101,
  "win_rate": 60.4,
  "total_return": 377.68,
  "avgWin": 2.5,
  "avgLoss": -1.2,
  "max_drawdown": 6.02,
  "sharpe_ratio": 0,
  "final_capital": 4776.76,
  "initial_capital": 1000
}
```

### Trading Metrics được hiển thị
- **Total Trades**: Tổng số trades thực hiện
- **Win Rate**: Tỷ lệ thắng (%)
- **Total Return**: Tổng lợi nhuận (%)
- **Avg Win Net**: Lợi nhuận trung bình của trades thắng (%)
- **Avg Loss Net**: Lỗ trung bình của trades thua (%)
- **Max Drawdown**: Mức drawdown tối đa (%)
- **Sharpe Ratio**: Chỉ số Sharpe ratio

## Components

### 1. ExperimentCard (`src/components/research/experiment-card.tsx`)
Component chính để hiển thị experiment với đầy đủ trading metrics.

**Props:**
```typescript
interface ExperimentCardProps {
  experiment: any; // Dữ liệu từ API
  onViewDetails: (experimentId: string) => void; // Callback khi click "Chi tiết"
}
```

**Features:**
- Hiển thị thông tin cơ bản (tên, loại, trạng thái)
- Hiển thị trading metrics trong section riêng biệt
- Progress bar cho experiments đang chạy
- Icons và màu sắc theo loại và trạng thái
- Responsive design với grid layout

### 2. Experiment Utils (`src/lib/research/experiment-utils.ts`)
Utility functions để parse và format dữ liệu từ cột `results`.

**Functions chính:**
- `parseTradingMetrics(results)`: Parse dữ liệu từ results object
- `formatTradingMetrics(metrics)`: Format metrics để hiển thị trên UI
- `parseExperimentForCard(experiment)`: Parse toàn bộ experiment data
- `hasTradingMetrics(experiment)`: Kiểm tra có trading metrics không
- `getTradingMetricsSummary(experiment)`: Lấy summary text

## Cách sử dụng

### 1. Import component
```typescript
import { ExperimentCard } from '@/components/research/experiment-card';
```

### 2. Sử dụng trong component cha
```typescript
const [experiments, setExperiments] = useState([]);

const handleViewDetails = (experimentId: string) => {
  // Xử lý khi click "Chi tiết"
  console.log('View experiment:', experimentId);
};

return (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {experiments.map((experiment) => (
      <ExperimentCard
        key={experiment.id}
        experiment={experiment}
        onViewDetails={handleViewDetails}
      />
    ))}
  </div>
);
```

### 3. API Response
API `/api/research/experiments` đã được sửa để trả về:
```typescript
{
  experiments: [
    {
      id: string;
      name: string;
      type: string;
      status: string;
      progress: number;
      created_at: string;
      updated_at: string;
      results: TradingMetricsObject | null;
      config: any;
    }
  ]
}
```

## Styling

### Colors
- **Completed**: Green (bg-green-100 text-green-800)
- **Running**: Blue (bg-blue-100 text-blue-800)
- **Failed**: Red (bg-red-100 text-red-800)
- **Pending**: Yellow (bg-yellow-100 text-yellow-800)

### Icons
- **Backtest**: BarChart3
- **Hypothesis Test**: Target
- **Optimization**: TrendingUp
- **Monte Carlo**: Zap

### Layout
- Grid layout responsive (1-3 columns)
- Hover effects với shadow
- Trading metrics section với background gray
- Progress bar cho experiments đang chạy

## Testing

### Scripts test
1. **`scripts/test-experiments-results.js`**: Test cột results trong database
2. **`scripts/test-experiment-card.js`**: Test utility functions
3. **`scripts/test-experiments-api.js`**: Test API experiments mới

### Chạy test
```bash
# Test database results
node scripts/test-experiments-results.js

# Test utility functions
node scripts/test-experiment-card.js

# Test API (cần server chạy)
node scripts/test-experiments-api.js
```

## Lưu ý

1. **Không cần thêm columns mới**: Tất cả dữ liệu trading đã có trong cột `results`
2. **Backward compatible**: API vẫn hoạt động với experiments cũ
3. **Performance**: Chỉ select các fields cần thiết, không bị timeout
4. **Flexible**: Dễ dàng thêm trading metrics mới vào cột `results`

## Troubleshooting

### Lỗi thường gặp
1. **"column does not exist"**: Đã sửa, API chỉ select các fields có sẵn
2. **Database timeout**: Đã thêm limit(100) để tránh timeout
3. **Missing trading metrics**: Kiểm tra cột `results` có dữ liệu không

### Debug
```typescript
// Kiểm tra dữ liệu từ API
console.log('Experiment data:', experiment);
console.log('Results:', experiment.results);

// Kiểm tra trading metrics
import { parseTradingMetrics } from '@/lib/research/experiment-utils';
const metrics = parseTradingMetrics(experiment.results);
console.log('Parsed metrics:', metrics);
```
