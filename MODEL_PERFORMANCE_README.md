# 📊 Model Performance Display Component

## Tổng quan

Component `ModelPerformanceDisplay` được tạo để hiển thị hiệu suất của các mô hình machine learning bằng cách phân giải JSON từ cột `performance_metrics` trong bảng `research_models` của Supabase.

## 🚀 Tính năng

### ✨ Hiển thị đa dạng metrics
- **Basic metrics**: accuracy, loss, rmse, mae, r2_score
- **Classification metrics**: precision, recall, f1_score  
- **Training info**: training_time, epochs, convergence, best_epoch
- **Validation metrics**: val_accuracy, val_loss với phát hiện overfitting
- **Model info**: algorithm_type, dataset_size, parameters_count

### 🎯 Smart features
- **Auto JSON parsing**: Tự động parse JSON string hoặc object
- **Overfitting detection**: Phát hiện overfitting tự động
- **Performance rating**: Đánh giá hiệu suất (Excellent/Good/Fair/Poor)
- **Progress bars**: Visual progress bars cho metrics
- **Responsive design**: Tương thích mobile và desktop
- **Debug mode**: Raw JSON display trong development

## 📦 Cài đặt

Component đã được tích hợp sẵn trong project. Chỉ cần import và sử dụng:

```tsx
import { ModelPerformanceDisplay } from '@/components/research/model-performance-display';
```

## 🔧 Cách sử dụng

### 1. Basic Usage

```tsx
// Full display
<ModelPerformanceDisplay performanceMetrics={model.performance_metrics} />

// Compact display
<ModelPerformanceDisplay 
  performanceMetrics={model.performance_metrics} 
  compact={true} 
/>
```

### 2. Với data từ Supabase

```tsx
// Trong component research models
{model.performance_metrics && (
  <ModelPerformanceDisplay 
    performanceMetrics={model.performance_metrics}
    compact={true}
  />
)}
```

### 3. Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `performanceMetrics` | `any` | - | JSON object hoặc string từ database |
| `compact` | `boolean` | `false` | Hiển thị compact hoặc full |
| `className` | `string` | - | CSS classes tùy chỉnh |

## 📊 Cấu trúc dữ liệu

### JSON Structure từ database

```json
{
  "status": "completed",
  "training_completed_at": "2024-01-15T10:30:00Z",
  "training_time_seconds": 245,
  "metrics": {
    "accuracy": 0.87,
    "loss": 0.234,
    "r2_score": 0.82,
    "rmse": 0.0156,
    "precision": 0.89,
    "recall": 0.93,
    "f1_score": 0.91
  },
  "training": {
    "accuracy": 0.92,
    "loss": 0.156,
    "val_accuracy": 0.88,
    "val_loss": 0.198
  },
  "training_info": {
    "training_time_seconds": 1800,
    "epochs_completed": 100,
    "convergence": true,
    "best_epoch": 85
  },
  "model_info": {
    "algorithm_type": "LSTM",
    "dataset_size": 100000,
    "parameters_count": 250000
  }
}
```

### Metrics Priority

Component sẽ ưu tiên hiển thị metrics theo thứ tự:
1. `testing` metrics (nếu có)
2. `training` metrics (nếu có)  
3. `metrics` metrics (fallback)

## 🎨 UI Features

### Performance Rating
- **Excellent** (≥90%): 🟢 Green với CheckCircle icon
- **Good** (≥80%): 🔵 Blue với TrendingUp icon  
- **Fair** (≥70%): 🟡 Yellow với Activity icon
- **Poor** (<70%): 🔴 Red với AlertCircle icon

### Overfitting Detection
Tự động phát hiện overfitting khi:
- Có cả training và validation accuracy
- Chênh lệch > 10% giữa training và validation

```
✅ Mô hình ổn định (chênh lệch 4.0%)
⚠️ Có thể bị overfitting (chênh lệch 22.0%)
```

### Progress Bars
Visual progress bars cho:
- Accuracy (0-100%)
- R² Score (0-100%, có thể âm)
- Precision, Recall, F1 Score (0-100%)

## 🔄 Integration Points

### 1. Project Detail View
File: `src/components/research/tabs/project-detail-view.tsx`
```tsx
{model.performance_metrics && (
  <ModelPerformanceDisplay 
    performanceMetrics={model.performance_metrics}
    compact={true}
  />
)}
```

### 2. Model Builder Tab  
File: `src/components/research/tabs/model-builder-tab.tsx`
```tsx
{model.performance_metrics && (
  <ModelPerformanceDisplay 
    performanceMetrics={model.performance_metrics}
    compact={true}
  />
)}
```

## 🧪 Demo & Testing

### Demo Page
Truy cập: `http://localhost:9002/demo-model-performance`

Demo bao gồm:
- **Full Display**: Hiển thị đầy đủ tất cả metrics
- **Compact Display**: Hiển thị compact trong cards
- **Comparison**: So sánh models khác nhau

### Sample Data
```tsx
const sampleMetrics = {
  status: "completed",
  metrics: {
    accuracy: 0.87,
    loss: 0.234,
    rmse: 0.0156
  },
  training_info: {
    training_time_seconds: 245,
    epochs_completed: 50,
    convergence: true
  }
};
```

## 🔧 Development

### Debug Mode
Trong development, component sẽ hiển thị raw JSON:
```tsx
{process.env.NODE_ENV === 'development' && (
  <details className="text-xs">
    <summary>Raw JSON (Dev)</summary>
    <pre>{JSON.stringify(metrics, null, 2)}</pre>
  </details>
)}
```

### Error Handling
Component có error handling cho:
- Invalid JSON parsing
- Missing metrics
- Undefined values
- Type safety với TypeScript

## 📈 Performance

### Optimizations
- Memoized calculations
- Conditional rendering
- Lazy loading cho large datasets
- Efficient JSON parsing

### Bundle Size
- Tree-shakeable imports
- Minimal dependencies
- Optimized icons từ lucide-react

## 🔮 Future Enhancements

### Planned Features
1. **Charts Integration**: Thêm charts cho training history
2. **Export Functions**: Export metrics sang CSV/PDF
3. **Comparison Mode**: So sánh multiple models
4. **Custom Metrics**: Support custom metrics definitions
5. **Real-time Updates**: Live updates during training

### API Extensions
```tsx
// Future API
<ModelPerformanceDisplay 
  performanceMetrics={metrics}
  showCharts={true}
  compareWith={[otherModel1, otherModel2]}
  exportable={true}
  realTime={true}
/>
```

## 🐛 Troubleshooting

### Common Issues

1. **JSON Parse Error**
   ```
   Error parsing performance metrics: Unexpected token
   ```
   **Solution**: Kiểm tra format JSON trong database

2. **Missing Metrics**
   ```
   No metrics to display
   ```
   **Solution**: Đảm bảo model đã được train và có performance_metrics

3. **TypeScript Errors**
   ```
   Property 'accuracy' does not exist
   ```
   **Solution**: Cập nhật interface ParsedMetrics

### Debug Steps
1. Check console logs với prefix `[ModelPerformanceDisplay]`
2. Enable debug mode trong development
3. Verify JSON structure trong database
4. Test với sample data từ demo page

## 📞 Support

Nếu có vấn đề:
1. Check demo page: `/demo-model-performance`
2. Verify database schema: `performance_metrics` column
3. Test với sample data
4. Check console errors

---

**Ready to use! 🚀**

Component đã được tích hợp và sẵn sàng sử dụng trong toàn bộ research module của Urus Studio. 