"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Clock,
  Target,
  AlertTriangle,
  Download,
  RefreshCw,
  Play,
  Settings,
  LineChart,
  PieChart
} from 'lucide-react';

interface WalkForwardPeriod {
  id: string;
  startDate: string;
  endDate: string;
  inSampleReturn: number;
  outSampleReturn: number;
  inSampleSharpe: number;
  outSampleSharpe: number;
  inSampleDrawdown: number;
  outSampleDrawdown: number;
  parameterDrift: number;
  stability: number;
  status: 'completed' | 'running' | 'pending' | 'failed';
}

interface WalkForwardConfig {
  totalPeriod: number; // Tổng số ngày
  inSamplePeriod: number; // Số ngày cho training
  outSamplePeriod: number; // Số ngày cho testing
  stepSize: number; // Số ngày di chuyển mỗi bước
  optimizationMethod: string;
  rebalanceFrequency: string;
  minDataPoints: number;
}

interface WalkForwardAnalysisProps {
  strategyName?: string;
  initialConfig?: Partial<WalkForwardConfig>;
  onAnalysisComplete?: (results: WalkForwardPeriod[]) => void;
  className?: string;
}

export default function WalkForwardAnalysis({ 
  strategyName = "Chiến lược giao dịch",
  initialConfig,
  onAnalysisComplete,
  className = ""
}: WalkForwardAnalysisProps) {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [config, setConfig] = useState<WalkForwardConfig>({
    totalPeriod: 252 * 2, // 2 năm
    inSamplePeriod: 252, // 1 năm training
    outSamplePeriod: 63, // 3 tháng testing
    stepSize: 21, // 1 tháng
    optimizationMethod: 'genetic_algorithm',
    rebalanceFrequency: 'monthly',
    minDataPoints: 100,
    ...initialConfig
  });

  const [periods, setPeriods] = useState<WalkForwardPeriod[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [analysisResults, setAnalysisResults] = useState<any>(null);

  // Tạo các periods cho walk-forward analysis
  const generatePeriods = useCallback(() => {
    const periods: WalkForwardPeriod[] = [];
    const startDate = new Date('2023-01-01');
    
    let currentStart = new Date(startDate);
    let periodId = 1;
    
    while (currentStart.getTime() < startDate.getTime() + (config.totalPeriod * 24 * 60 * 60 * 1000)) {
      const inSampleEnd = new Date(currentStart.getTime() + (config.inSamplePeriod * 24 * 60 * 60 * 1000));
      const outSampleEnd = new Date(inSampleEnd.getTime() + (config.outSamplePeriod * 24 * 60 * 60 * 1000));
      
      periods.push({
        id: `period-${periodId}`,
        startDate: currentStart.toISOString().split('T')[0],
        endDate: outSampleEnd.toISOString().split('T')[0],
        inSampleReturn: 0,
        outSampleReturn: 0,
        inSampleSharpe: 0,
        outSampleSharpe: 0,
        inSampleDrawdown: 0,
        outSampleDrawdown: 0,
        parameterDrift: 0,
        stability: 0,
        status: 'pending'
      });
      
      currentStart = new Date(currentStart.getTime() + (config.stepSize * 24 * 60 * 60 * 1000));
      periodId++;
    }
    
    return periods;
  }, [config]);

  // Chạy walk-forward analysis thực tế
  const runWalkForwardAnalysis = async () => {
    setIsRunning(true);
    const generatedPeriods = generatePeriods();
    setPeriods(generatedPeriods);
    
    try {
      // Gọi API thực tế
      const response = await fetch('/api/research/walk-forward', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          experiment_id: `walk-forward-${Date.now()}`,
          config: {
            total_period: config.totalPeriod,
            in_sample_period: config.inSamplePeriod,
            out_sample_period: config.outSamplePeriod,
            step_size: config.stepSize,
            optimization_method: config.optimizationMethod,
            param_ranges: {
              fast_period: [5, 20, 5],
              slow_period: [20, 100, 10],
              stop_loss: [0.02, 0.10, 0.02],
              take_profit: [0.05, 0.20, 0.05]
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.results) {
        // Cập nhật periods với kết quả thực tế
        const realPeriods = data.results.periods.map((period: any) => ({
          id: period.id,
          startDate: period.startDate,
          endDate: period.endDate,
          inSampleReturn: period.inSampleMetrics?.totalReturn || 0,
          outSampleReturn: period.outSampleMetrics?.totalReturn || 0,
          inSampleSharpe: period.inSampleMetrics?.sharpeRatio || 0,
          outSampleSharpe: period.outSampleMetrics?.sharpeRatio || 0,
          inSampleDrawdown: period.inSampleMetrics?.maxDrawdown || 0,
          outSampleDrawdown: period.outSampleMetrics?.maxDrawdown || 0,
          parameterDrift: period.parameterDrift || 0,
          stability: period.stability || 0,
          status: period.status
        }));

        setPeriods(realPeriods);

        // Cập nhật overall metrics
        if (data.results.overallMetrics) {
          setAnalysisResults({
            totalPeriods: data.results.overallMetrics.totalPeriods,
            averageInSampleReturn: data.results.overallMetrics.averageInSampleReturn,
            averageOutSampleReturn: data.results.overallMetrics.averageOutSampleReturn,
            averageStability: data.results.overallMetrics.averageStability,
            consistencyScore: data.results.overallMetrics.consistencyScore,
            overfittingRisk: data.results.overallMetrics.overfittingRisk,
            recommendation: data.results.overallMetrics.recommendation
          });
        }

        if (onAnalysisComplete) {
          onAnalysisComplete(realPeriods);
        }
      } else {
        throw new Error('Invalid response format');
      }
      
    } catch (error) {
      console.error('Error running walk-forward analysis:', error);
      toast({
        title: "Lỗi",
        description: "Không thể chạy Walk Forward Analysis. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getRecommendation = (periods: WalkForwardPeriod[]) => {
    const avgStability = periods.reduce((sum, p) => sum + p.stability, 0) / periods.length;
    const avgOutSampleReturn = periods.reduce((sum, p) => sum + p.outSampleReturn, 0) / periods.length;
    
    if (avgStability > 0.8 && avgOutSampleReturn > 10) {
      return 'excellent';
    } else if (avgStability > 0.6 && avgOutSampleReturn > 5) {
      return 'good';
    } else if (avgStability > 0.4 && avgOutSampleReturn > 0) {
      return 'fair';
    } else {
      return 'poor';
    }
  };

  const getRecommendationText = (recommendation: string) => {
    switch (recommendation) {
      case 'excellent':
        return 'Chiến lược rất ổn định và hiệu quả';
      case 'good':
        return 'Chiến lược tốt, có thể sử dụng';
      case 'fair':
        return 'Chiến lược cần cải thiện';
      case 'poor':
        return 'Chiến lược không ổn định, cần xem xét lại';
      default:
        return 'Chưa có đánh giá';
    }
  };

  const getRecommendationColor = (recommendation: string) => {
    switch (recommendation) {
      case 'excellent':
        return 'bg-green-100 text-green-800';
      case 'good':
        return 'bg-blue-100 text-blue-800';
      case 'fair':
        return 'bg-yellow-100 text-yellow-800';
      case 'poor':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Configuration Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Cấu hình Walk-Forward Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Tổng thời gian (ngày): {config.totalPeriod}
              </label>
              <input 
                type="range" 
                min="252" 
                max="2520" 
                step="252" 
                value={config.totalPeriod}
                onChange={(e) => setConfig({
                  ...config, 
                  totalPeriod: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                In-Sample Period (ngày): {config.inSamplePeriod}
              </label>
              <input 
                type="range" 
                min="63" 
                max="504" 
                step="21" 
                value={config.inSamplePeriod}
                onChange={(e) => setConfig({
                  ...config, 
                  inSamplePeriod: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Out-Sample Period (ngày): {config.outSamplePeriod}
              </label>
              <input 
                type="range" 
                min="21" 
                max="252" 
                step="21" 
                value={config.outSamplePeriod}
                onChange={(e) => setConfig({
                  ...config, 
                  outSamplePeriod: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">
                Step Size (ngày): {config.stepSize}
              </label>
              <input 
                type="range" 
                min="7" 
                max="63" 
                step="7" 
                value={config.stepSize}
                onChange={(e) => setConfig({
                  ...config, 
                  stepSize: parseInt(e.target.value)
                })}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Phương pháp tối ưu</label>
              <select 
                className="w-full p-2 border rounded"
                value={config.optimizationMethod}
                onChange={(e) => setConfig({
                  ...config, 
                  optimizationMethod: e.target.value
                })}
              >
                <option value="genetic_algorithm">Genetic Algorithm</option>
                <option value="grid_search">Grid Search</option>
                <option value="bayesian">Bayesian Optimization</option>
                <option value="random_search">Random Search</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Tần suất rebalance</label>
              <select 
                className="w-full p-2 border rounded"
                value={config.rebalanceFrequency}
                onChange={(e) => setConfig({
                  ...config, 
                  rebalanceFrequency: e.target.value
                })}
              >
                <option value="weekly">Hàng tuần</option>
                <option value="monthly">Hàng tháng</option>
                <option value="quarterly">Hàng quý</option>
              </select>
            </div>
          </div>

          <div className="mt-6">
            <Button 
              onClick={runWalkForwardAnalysis}
              disabled={isRunning}
              className="w-full"
            >
              {isRunning ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Đang chạy Walk-Forward Analysis...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Chạy Walk-Forward Analysis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Overview */}
      {analysisResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Tổng quan kết quả
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📊 Tổng số periods</h4>
                <div className="text-2xl font-bold text-blue-600">
                  {analysisResults.totalPeriods}
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📈 In-Sample Return TB</h4>
                <div className="text-2xl font-bold text-green-600">
                  {analysisResults.averageInSampleReturn.toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-orange-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">📉 Out-Sample Return TB</h4>
                <div className="text-2xl font-bold text-orange-600">
                  {analysisResults.averageOutSampleReturn.toFixed(2)}%
                </div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">🎯 Độ ổn định TB</h4>
                <div className="text-2xl font-bold text-purple-600">
                  {(analysisResults.averageStability * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">🔄 Consistency Score</h4>
                <div className="text-xl font-bold">
                  {(analysisResults.consistencyScore * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-red-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">⚠️ Overfitting Risk</h4>
                <div className="text-xl font-bold text-red-600">
                  {(analysisResults.overfittingRisk * 100).toFixed(1)}%
                </div>
              </div>
              
              <div className="bg-indigo-50 p-4 rounded-lg">
                <h4 className="font-medium text-sm mb-2">💡 Đánh giá</h4>
                <Badge className={getRecommendationColor(analysisResults.recommendation)}>
                  {getRecommendationText(analysisResults.recommendation)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Periods List */}
      {periods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Chi tiết từng Period
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {periods.map((period) => (
                <div 
                  key={period.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedPeriod === period.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPeriod(period.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{period.id}</span>
                      <Badge variant={
                        period.status === 'completed' ? 'default' :
                        period.status === 'running' ? 'secondary' :
                        period.status === 'failed' ? 'destructive' : 'outline'
                      }>
                        {period.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500">
                      {period.startDate} → {period.endDate}
                    </div>
                  </div>
                  
                  {period.status === 'completed' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">In-Sample Return:</span>
                        <span className={`ml-2 font-medium ${period.inSampleReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {period.inSampleReturn.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Out-Sample Return:</span>
                        <span className={`ml-2 font-medium ${period.outSampleReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {period.outSampleReturn.toFixed(2)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Stability:</span>
                        <span className="ml-2 font-medium">
                          {(period.stability * 100).toFixed(1)}%
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Parameter Drift:</span>
                        <span className="ml-2 font-medium text-orange-600">
                          {(period.parameterDrift * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Về Walk-Forward Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">🎯 Mục đích</h4>
              <p className="text-sm text-gray-600">
                Walk-Forward Analysis giúp đánh giá tính ổn định và khả năng tổng quát hóa của chiến lược giao dịch 
                bằng cách kiểm tra hiệu suất trên nhiều khoảng thời gian khác nhau.
              </p>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">📈 Quy trình</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>In-Sample Period:</strong> Thời gian training và tối ưu hóa tham số</li>
                <li>• <strong>Out-Sample Period:</strong> Thời gian testing với tham số đã tối ưu</li>
                <li>• <strong>Step Forward:</strong> Di chuyển cửa sổ thời gian và lặp lại quá trình</li>
                <li>• <strong>Stability Analysis:</strong> Đánh giá độ ổn định của tham số theo thời gian</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">⚠️ Lưu ý quan trọng</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• <strong>Overfitting Detection:</strong> So sánh in-sample vs out-sample performance</li>
                <li>• <strong>Parameter Stability:</strong> Kiểm tra độ ổn định của tham số tối ưu</li>
                <li>• <strong>Market Regime Changes:</strong> Phát hiện thay đổi trong điều kiện thị trường</li>
                <li>• <strong>Robustness Testing:</strong> Đảm bảo chiến lược hoạt động tốt trong nhiều điều kiện</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 