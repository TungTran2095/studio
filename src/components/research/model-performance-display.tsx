"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Clock, 
  BarChart3, 
  Activity,
  CheckCircle,
  AlertCircle,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModelPerformanceDisplayProps {
  performanceMetrics: any;
  className?: string;
  compact?: boolean;
}

interface ParsedMetrics {
  training?: {
    accuracy?: number;
    loss?: number;
    rmse?: number;
    mae?: number;
    r2_score?: number;
    val_accuracy?: number;
    val_loss?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
  testing?: {
    accuracy?: number;
    loss?: number;
    rmse?: number;
    mae?: number;
    r2_score?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
  metrics?: {
    accuracy?: number;
    loss?: number;
    rmse?: number;
    mae?: number;
    r2_score?: number;
    precision?: number;
    recall?: number;
    f1_score?: number;
  };
  training_info?: {
    training_time_seconds?: number;
    epochs_completed?: number;
    convergence?: boolean;
    best_epoch?: number;
  };
  model_info?: {
    algorithm_type?: string;
    dataset_size?: number;
    parameters_count?: number;
  };
  status?: string;
  python_results?: any;
}

export function ModelPerformanceDisplay({ 
  performanceMetrics, 
  className,
  compact = false 
}: ModelPerformanceDisplayProps) {
  // Parse JSON nếu là string
  const parseMetrics = (): ParsedMetrics => {
    try {
      if (typeof performanceMetrics === 'string') {
        return JSON.parse(performanceMetrics);
      }
      return performanceMetrics || {};
    } catch (error) {
      console.error('Error parsing performance metrics:', error);
      return {};
    }
  };

  const metrics = parseMetrics();

  // Hàm format số
  const formatNumber = (value: number | undefined, decimals: number = 3): string => {
    if (value === undefined || value === null) return 'N/A';
    return value.toFixed(decimals);
  };

  // Hàm format phần trăm
  const formatPercentage = (value: number | undefined): string => {
    if (value === undefined || value === null) return 'N/A';
    return `${(value * 100).toFixed(1)}%`;
  };

  // Hàm format thời gian
  const formatTime = (seconds: number | undefined): string => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  // Hàm đánh giá hiệu suất
  const getPerformanceLevel = (accuracy: number | undefined): { level: string; color: string; icon: React.ReactNode } => {
    if (!accuracy) return { level: 'Unknown', color: 'text-muted-foreground', icon: <Info className="h-4 w-4" /> };
    
    if (accuracy >= 0.9) return { level: 'Excellent', color: 'text-green-600', icon: <CheckCircle className="h-4 w-4" /> };
    if (accuracy >= 0.8) return { level: 'Good', color: 'text-blue-600', icon: <TrendingUp className="h-4 w-4" /> };
    if (accuracy >= 0.7) return { level: 'Fair', color: 'text-yellow-600', icon: <Activity className="h-4 w-4" /> };
    return { level: 'Poor', color: 'text-red-600', icon: <AlertCircle className="h-4 w-4" /> };
  };

  // Lấy metrics chính (ưu tiên testing > training > metrics)
  const mainMetrics = metrics.testing || metrics.training || metrics.metrics || {};
  const trainingInfo = metrics.training_info || {};
  const modelInfo = metrics.model_info || {};

  // Đánh giá hiệu suất tổng thể
  const overallAccuracy = mainMetrics.accuracy || mainMetrics.r2_score;
  const performance = getPerformanceLevel(overallAccuracy);

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">Hiệu suất</span>
          <div className="flex items-center gap-2">
            {performance.icon}
            <span className={cn("text-sm font-medium", performance.color)}>
              {performance.level}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          {mainMetrics.accuracy && (
            <div className="flex justify-between">
              <span>Accuracy:</span>
              <span className="font-mono">{formatPercentage(mainMetrics.accuracy)}</span>
            </div>
          )}
          {mainMetrics.rmse && (
            <div className="flex justify-between">
              <span>RMSE:</span>
              <span className="font-mono">{formatNumber(mainMetrics.rmse, 4)}</span>
            </div>
          )}
          {mainMetrics.loss && (
            <div className="flex justify-between">
              <span>Loss:</span>
              <span className="font-mono">{formatNumber(mainMetrics.loss, 4)}</span>
            </div>
          )}
          {mainMetrics.r2_score && (
            <div className="flex justify-between">
              <span>R² Score:</span>
              <span className="font-mono">{formatNumber(mainMetrics.r2_score, 3)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <BarChart3 className="h-5 w-5" />
          Hiệu suất mô hình
          <div className="flex items-center gap-2 ml-auto">
            {performance.icon}
            <Badge variant="outline" className={performance.color}>
              {performance.level}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Main Performance Metrics */}
        {Object.keys(mainMetrics).length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4" />
              Chỉ số chính
            </h4>
            
            <div className="grid grid-cols-2 gap-3">
              {mainMetrics.accuracy && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Accuracy</span>
                    <span className="font-mono font-medium">{formatPercentage(mainMetrics.accuracy)}</span>
                  </div>
                  <Progress value={mainMetrics.accuracy * 100} className="h-2" />
                </div>
              )}

              {mainMetrics.r2_score && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">R² Score</span>
                    <span className="font-mono font-medium">{formatNumber(mainMetrics.r2_score, 3)}</span>
                  </div>
                  <Progress value={Math.max(0, mainMetrics.r2_score * 100)} className="h-2" />
                </div>
              )}

              {mainMetrics.precision && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Precision</span>
                    <span className="font-mono font-medium">{formatPercentage(mainMetrics.precision)}</span>
                  </div>
                  <Progress value={mainMetrics.precision * 100} className="h-2" />
                </div>
              )}

              {mainMetrics.recall && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Recall</span>
                    <span className="font-mono font-medium">{formatPercentage(mainMetrics.recall)}</span>
                  </div>
                  <Progress value={mainMetrics.recall * 100} className="h-2" />
                </div>
              )}

              {mainMetrics.f1_score && (
                <div className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">F1 Score</span>
                    <span className="font-mono font-medium">{formatPercentage(mainMetrics.f1_score)}</span>
                  </div>
                  <Progress value={mainMetrics.f1_score * 100} className="h-2" />
                </div>
              )}
            </div>

            {/* Error Metrics */}
            {(mainMetrics.loss || mainMetrics.rmse || mainMetrics.mae) && (
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                {mainMetrics.loss && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Loss</div>
                    <div className="font-mono text-sm font-medium">{formatNumber(mainMetrics.loss, 4)}</div>
                  </div>
                )}
                {mainMetrics.rmse && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">RMSE</div>
                    <div className="font-mono text-sm font-medium">{formatNumber(mainMetrics.rmse, 4)}</div>
                  </div>
                )}
                {mainMetrics.mae && (
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">MAE</div>
                    <div className="font-mono text-sm font-medium">{formatNumber(mainMetrics.mae, 4)}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Training vs Validation Comparison */}
        {metrics.training && (metrics.training.val_accuracy || metrics.training.val_loss) && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Training vs Validation
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Training</div>
                  {metrics.training.accuracy && (
                    <div className="flex justify-between text-sm">
                      <span>Accuracy:</span>
                      <span className="font-mono">{formatPercentage(metrics.training.accuracy)}</span>
                    </div>
                  )}
                  {metrics.training.loss && (
                    <div className="flex justify-between text-sm">
                      <span>Loss:</span>
                      <span className="font-mono">{formatNumber(metrics.training.loss, 4)}</span>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground">Validation</div>
                  {metrics.training.val_accuracy && (
                    <div className="flex justify-between text-sm">
                      <span>Accuracy:</span>
                      <span className="font-mono">{formatPercentage(metrics.training.val_accuracy)}</span>
                    </div>
                  )}
                  {metrics.training.val_loss && (
                    <div className="flex justify-between text-sm">
                      <span>Loss:</span>
                      <span className="font-mono">{formatNumber(metrics.training.val_loss, 4)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Overfitting Detection */}
              {metrics.training.accuracy && metrics.training.val_accuracy && (
                <div className="p-2 rounded-md bg-muted/50">
                  <div className="text-xs">
                    {Math.abs(metrics.training.accuracy - metrics.training.val_accuracy) > 0.1 ? (
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-3 w-3" />
                        <span>Có thể bị overfitting (chênh lệch {formatPercentage(Math.abs(metrics.training.accuracy - metrics.training.val_accuracy))})</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        <span>Mô hình ổn định (chênh lệch {formatPercentage(Math.abs(metrics.training.accuracy - metrics.training.val_accuracy))})</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Training Information */}
        {Object.keys(trainingInfo).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Thông tin huấn luyện
              </h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {trainingInfo.training_time_seconds && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Thời gian:</span>
                    <span className="font-mono">{formatTime(trainingInfo.training_time_seconds)}</span>
                  </div>
                )}
                {trainingInfo.epochs_completed && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Epochs:</span>
                    <span className="font-mono">{trainingInfo.epochs_completed}</span>
                  </div>
                )}
                {trainingInfo.best_epoch && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Best Epoch:</span>
                    <span className="font-mono">{trainingInfo.best_epoch}</span>
                  </div>
                )}
                {trainingInfo.convergence !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Convergence:</span>
                    <span className={trainingInfo.convergence ? "text-green-600" : "text-red-600"}>
                      {trainingInfo.convergence ? "✓ Yes" : "✗ No"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Model Information */}
        {Object.keys(modelInfo).length > 0 && (
          <>
            <Separator />
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Thông tin mô hình</h4>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {modelInfo.algorithm_type && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Algorithm:</span>
                    <Badge variant="outline">{modelInfo.algorithm_type}</Badge>
                  </div>
                )}
                {modelInfo.dataset_size && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Dataset Size:</span>
                    <span className="font-mono">{modelInfo.dataset_size.toLocaleString()}</span>
                  </div>
                )}
                {modelInfo.parameters_count && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Parameters:</span>
                    <span className="font-mono">{modelInfo.parameters_count.toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Status and Additional Info */}
        {metrics.status && (
          <>
            <Separator />
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={metrics.status === 'completed' ? 'default' : 'secondary'}>
                {metrics.status}
              </Badge>
            </div>
          </>
        )}

        {/* Raw JSON for debugging (only in development) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="text-xs">
            <summary className="cursor-pointer text-muted-foreground">Raw JSON (Dev)</summary>
            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-32">
              {JSON.stringify(metrics, null, 2)}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
} 