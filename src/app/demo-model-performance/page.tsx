"use client";

import { ModelPerformanceDisplay } from '@/components/research/model-performance-display';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function DemoModelPerformancePage() {
  // Sample data từ training API
  const sampleMetrics1 = {
    training_completed_at: "2024-01-15T10:30:00Z",
    training_time_seconds: 245,
    status: "completed",
    metrics: {
      accuracy: 0.87,
      loss: 0.234,
      r2_score: 0.82,
      rmse: 0.0156
    },
    python_results: {
      results: {
        rmse: 0.0156,
        mae: 0.0123,
        r2: 0.82
      }
    },
    training_config: {
      algorithm_type: "LSTM",
      dataset_size: 50000
    },
    logs_summary: {
      total_log_entries: 150,
      last_updated: "2024-01-15T10:30:00Z"
    }
  };

  // Sample data với training vs validation
  const sampleMetrics2 = {
    status: "completed",
    training: {
      accuracy: 0.92,
      loss: 0.156,
      val_accuracy: 0.88,
      val_loss: 0.198,
      rmse: 0.0234,
      mae: 0.0189
    },
    training_info: {
      training_time_seconds: 1800,
      epochs_completed: 100,
      convergence: true,
      best_epoch: 85
    },
    model_info: {
      algorithm_type: "Random Forest",
      dataset_size: 100000,
      parameters_count: 250000
    }
  };

  // Sample data với classification metrics
  const sampleMetrics3 = {
    status: "completed",
    testing: {
      accuracy: 0.91,
      precision: 0.89,
      recall: 0.93,
      f1_score: 0.91,
      loss: 0.187
    },
    training_info: {
      training_time_seconds: 3600,
      epochs_completed: 150,
      convergence: true,
      best_epoch: 120
    },
    model_info: {
      algorithm_type: "XGBoost",
      dataset_size: 75000,
      parameters_count: 180000
    }
  };

  // Sample data với overfitting
  const sampleMetrics4 = {
    status: "completed",
    training: {
      accuracy: 0.98,
      loss: 0.045,
      val_accuracy: 0.76,
      val_loss: 0.312,
      precision: 0.95,
      recall: 0.97,
      f1_score: 0.96
    },
    training_info: {
      training_time_seconds: 2400,
      epochs_completed: 200,
      convergence: false,
      best_epoch: 45
    },
    model_info: {
      algorithm_type: "Deep Neural Network",
      dataset_size: 25000,
      parameters_count: 500000
    }
  };

  // Sample data JSON string (như từ database)
  const sampleMetricsJSON = JSON.stringify({
    status: "completed",
    metrics: {
      accuracy: 0.84,
      rmse: 0.0298,
      mae: 0.0234,
      r2_score: 0.79
    },
    training_info: {
      training_time_seconds: 900,
      epochs_completed: 75,
      convergence: true
    },
    model_info: {
      algorithm_type: "Linear Regression",
      dataset_size: 30000
    }
  });

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">📊 Model Performance Display Demo</h1>
        <p className="text-muted-foreground">
          Demo component hiển thị hiệu suất mô hình từ JSON performance_metrics
        </p>
      </div>

      <Tabs defaultValue="full" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="full">Full Display</TabsTrigger>
          <TabsTrigger value="compact">Compact Display</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="full" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">LSTM Model - Basic Metrics</h3>
              <ModelPerformanceDisplay performanceMetrics={sampleMetrics1} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Random Forest - Training vs Validation</h3>
              <ModelPerformanceDisplay performanceMetrics={sampleMetrics2} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">XGBoost - Classification Metrics</h3>
              <ModelPerformanceDisplay performanceMetrics={sampleMetrics3} />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">DNN - Overfitting Example</h3>
              <ModelPerformanceDisplay performanceMetrics={sampleMetrics4} />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Linear Regression - From JSON String</h3>
            <ModelPerformanceDisplay performanceMetrics={sampleMetricsJSON} />
          </div>
        </TabsContent>

        <TabsContent value="compact" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[sampleMetrics1, sampleMetrics2, sampleMetrics3, sampleMetrics4].map((metrics, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Model {index + 1}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ModelPerformanceDisplay 
                    performanceMetrics={metrics} 
                    compact={true}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Good Model (No Overfitting)</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelPerformanceDisplay 
                  performanceMetrics={sampleMetrics2} 
                  compact={true}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Overfitted Model</CardTitle>
              </CardHeader>
              <CardContent>
                <ModelPerformanceDisplay 
                  performanceMetrics={sampleMetrics4} 
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Performance Comparison Table</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Model</th>
                      <th className="text-left p-2">Algorithm</th>
                      <th className="text-left p-2">Accuracy</th>
                      <th className="text-left p-2">Training Time</th>
                      <th className="text-left p-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2">LSTM</td>
                      <td className="p-2">LSTM</td>
                      <td className="p-2">87.0%</td>
                      <td className="p-2">4m 5s</td>
                      <td className="p-2">✅ Good</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Random Forest</td>
                      <td className="p-2">Random Forest</td>
                      <td className="p-2">92.0% / 88.0%</td>
                      <td className="p-2">30m 0s</td>
                      <td className="p-2">✅ Good</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">XGBoost</td>
                      <td className="p-2">XGBoost</td>
                      <td className="p-2">91.0%</td>
                      <td className="p-2">1h 0m</td>
                      <td className="p-2">✅ Excellent</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2">Deep NN</td>
                      <td className="p-2">Deep Neural Network</td>
                      <td className="p-2">98.0% / 76.0%</td>
                      <td className="p-2">40m 0s</td>
                      <td className="p-2">⚠️ Overfitted</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>📋 Cách sử dụng</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Import component:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`import { ModelPerformanceDisplay } from '@/components/research/model-performance-display';`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">2. Sử dụng với data từ Supabase:</h4>
            <pre className="bg-muted p-3 rounded text-sm overflow-x-auto">
{`// Full display
<ModelPerformanceDisplay performanceMetrics={model.performance_metrics} />

// Compact display
<ModelPerformanceDisplay 
  performanceMetrics={model.performance_metrics} 
  compact={true} 
/>`}
            </pre>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">3. Supported metrics:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li><strong>Basic:</strong> accuracy, loss, rmse, mae, r2_score</li>
              <li><strong>Classification:</strong> precision, recall, f1_score</li>
              <li><strong>Training info:</strong> training_time, epochs, convergence</li>
              <li><strong>Validation:</strong> val_accuracy, val_loss (overfitting detection)</li>
              <li><strong>Model info:</strong> algorithm_type, dataset_size, parameters_count</li>
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium">4. Features:</h4>
            <ul className="list-disc list-inside text-sm space-y-1 text-muted-foreground">
              <li>Tự động parse JSON string hoặc object</li>
              <li>Phát hiện overfitting tự động</li>
              <li>Đánh giá hiệu suất (Excellent/Good/Fair/Poor)</li>
              <li>Progress bars cho metrics</li>
              <li>Responsive design</li>
              <li>Debug mode (development only)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 