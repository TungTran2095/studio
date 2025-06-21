"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BookOpen,
  Play,
  ArrowRight,
  CheckCircle,
  Lightbulb,
  Target,
  Workflow,
  Brain,
  TestTube,
  BarChart3,
  Settings,
  Folder,
  Zap,
  AlertCircle,
  Info,
  TrendingUp
} from 'lucide-react';

interface GuideTabProps {
  onNavigateToTab?: (tabId: string) => void;
}

export function GuidesTab({ onNavigateToTab }: GuideTabProps) {
  const [activeGuide, setActiveGuide] = useState('overview');

  const quickStartSteps = [
    {
      id: 'project',
      title: '1. Tạo Research Project',
      description: 'Bắt đầu bằng việc tạo project để quản lý nghiên cứu',
      action: () => onNavigateToTab?.('projects'),
      icon: Folder,
      completed: false
    },
    {
      id: 'models',
      title: '2. Xây dựng Mô hình',
      description: 'Tạo và quản lý các mô hình trong project',
      action: () => onNavigateToTab?.('projects'),
      icon: Brain,
      completed: false
    },
    {
      id: 'experiments',
      title: '3. Chạy Experiments',
      description: 'Thực hiện các thí nghiệm và backtesting',
      action: () => onNavigateToTab?.('projects'),
      icon: TestTube,
      completed: false
    },
    {
      id: 'analysis',
      title: '4. Phân tích Kết quả',
      description: 'Đánh giá hiệu suất và tối ưu hóa',
      action: () => onNavigateToTab?.('projects'),
      icon: BarChart3,
      completed: false
    }
  ];

  const features = [
    {
      id: 'projects',
      name: 'Research Projects',
      description: 'Quản lý các dự án nghiên cứu định lượng',
      icon: Folder,
      capabilities: [
        'Tạo và quản lý projects',
        'Version control cho research',
        'Collaboration với team',
        'Progress tracking',
        'Xây dựng mô hình',
        'Kiểm tra giả thuyết',
        'Backtesting chiến lược',
        'Tối ưu hóa tham số'
      ],
      usage: 'Sử dụng để tổ chức và theo dõi các nghiên cứu dài hạn. Mỗi project có thể chứa nhiều models, hypothesis tests và backtests.'
    },
    {
      id: 'model-management',
      name: 'Model Management',
      description: 'Quản lý và phát triển các mô hình',
      icon: Brain,
      capabilities: [
        'Statistical models (ARIMA, GARCH)',
        'Machine Learning (RF, XGBoost, LSTM)',
        'Financial math (Black-Scholes, VaR)',
        'Custom model development',
        'Feature engineering tools',
        'Model training và evaluation'
      ],
      usage: 'Tạo prediction models hoặc trading signals trong project. Bắt đầu với templates để học, sau đó develop custom models.'
    },
    {
      id: 'experiment-tracking',
      name: 'Experiment Tracking',
      description: 'Theo dõi và quản lý các thí nghiệm',
      icon: TestTube,
      capabilities: [
        'Hypothesis testing',
        'Statistical analysis',
        'A/B testing',
        'Performance comparison',
        'Result visualization'
      ],
      usage: 'Thực hiện và theo dõi các thí nghiệm để validate ý tưởng trading trước khi deploy.'
    },
    {
      id: 'backtesting',
      name: 'Backtesting Engine',
      description: 'Kiểm tra performance trên dữ liệu lịch sử',
      icon: BarChart3,
      capabilities: [
        'Multiple strategy types',
        'Risk management rules',
        'Performance analytics',
        'Walk-forward analysis',
        'Monte Carlo simulation'
      ],
      usage: 'Đánh giá hiệu suất strategy trước khi deploy live. Quan trọng: backtest không đảm bảo future performance.'
    },
    {
      id: 'optimization',
      name: 'Parameter Optimization',
      description: 'Tự động tìm kiếm parameters tối ưu',
      icon: Settings,
      capabilities: [
        'Grid Search exhaustive',
        'Bayesian Optimization',
        'Genetic Algorithm',
        'Random Search',
        'Multi-objective optimization'
      ],
      usage: 'Fine-tune model parameters để maximize Sharpe ratio, minimize drawdown, etc. Cẩn thận overfitting!'
    }
  ];

  const bestPractices = [
    {
      category: 'Data Quality',
      icon: CheckCircle,
      tips: [
        'Luôn kiểm tra data quality trước khi phân tích',
        'Handle missing data và outliers properly',
        'Validate data với multiple sources',
        'Check for look-ahead bias'
      ]
    },
    {
      category: 'Statistical Testing',
      icon: TestTube,
      tips: [
        'Define hypothesis trước khi chạy test',
        'Sử dụng appropriate test cho data type',
        'Correct for multiple testing (Bonferroni)',
        'Consider effect size, không chỉ p-value'
      ]
    },
    {
      category: 'Model Development',
      icon: Brain,
      tips: [
        'Start simple, tăng complexity dần',
        'Cross-validation để tránh overfitting',
        'Feature selection dựa trên domain knowledge',
        'Document model assumptions và limitations'
      ]
    },
    {
      category: 'Backtesting',
      icon: BarChart3,
      tips: [
        'Use out-of-sample testing',
        'Include transaction costs và slippage',
        'Test với different market regimes',
        'Beware of survivorship bias'
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Hướng dẫn Sử dụng Module
          </h2>
          <p className="text-muted-foreground">
            Complete guide để master quantitative research workflow
          </p>
        </div>
        <Badge variant="secondary" className="px-3 py-1">
          <Lightbulb className="h-3 w-3 mr-1" />
          Interactive Guide
        </Badge>
      </div>

      <Tabs value={activeGuide} onValueChange={setActiveGuide} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
          <TabsTrigger value="features">Tính năng</TabsTrigger>
          <TabsTrigger value="best-practices">Best Practices</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Workflow className="h-5 w-5" />
                Research Workflow Overview
              </CardTitle>
              <CardDescription>
                Quy trình nghiên cứu định lượng từ ý tưởng đến deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-sm">1</div>
                    <h3 className="font-medium">Research Phase</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-10">
                    <li>• Define research questions</li>
                    <li>• Hypothesis formulation</li>
                    <li>• Data exploration</li>
                    <li>• Statistical testing</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-sm">2</div>
                    <h3 className="font-medium">Development Phase</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-10">
                    <li>• Model selection</li>
                    <li>• Feature engineering</li>
                    <li>• Parameter tuning</li>
                    <li>• Cross-validation</li>
                  </ul>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">3</div>
                    <h3 className="font-medium">Validation Phase</h3>
                  </div>
                  <ul className="space-y-1 text-sm text-muted-foreground ml-10">
                    <li>• Backtesting</li>
                    <li>• Risk analysis</li>
                    <li>• Performance metrics</li>
                    <li>• Optimization</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-500" />
                  Module Capabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Real-time market data integration</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Statistical testing với 2.7M+ records</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>ML models (LSTM, XGBoost, RF)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Advanced backtesting engine</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>Multi-objective optimization</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Important Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Past performance không đảm bảo future results</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Luôn validate models với out-of-sample data</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Consider transaction costs và market impact</span>
                </div>
                <div className="flex items-start gap-2 text-sm">
                  <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                  <span>Risk management quan trọng hơn returns</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quickstart" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🚀 Quick Start Guide</CardTitle>
              <CardDescription>
                Hoàn thành 5 bước này để có first trading strategy
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {quickStartSteps.map((step, index) => (
                  <div key={step.id} className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 flex-1">
                      <step.icon className="h-5 w-5 text-blue-500" />
                      <div>
                        <h3 className="font-medium">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={step.action}>
                      <Play className="h-3 w-3 mr-1" />
                      Start
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📝 First Project Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-medium mb-2">Example: "BTC Momentum Strategy Research"</h4>
                <ol className="space-y-2 text-sm">
                  <li><strong>1. Hypothesis:</strong> "BTC price &gt; 20-day MA có probability cao để tiếp tục tăng"</li>
                  <li><strong>2. Test:</strong> Correlation test giữa MA signal và future returns</li>
                  <li><strong>3. Model:</strong> Simple momentum strategy với MA crossover</li>
                  <li><strong>4. Backtest:</strong> 1-year period với transaction costs</li>
                  <li><strong>5. Optimize:</strong> Tune MA period để maximize Sharpe ratio</li>
                </ol>
              </div>
              <Button className="w-full" onClick={() => onNavigateToTab?.('projects')}>
                <Folder className="h-4 w-4 mr-2" />
                Tạo Project Example Này
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <div className="grid grid-cols-1 gap-6">
            {features.map((feature) => (
              <Card key={feature.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <feature.icon className="h-5 w-5" />
                    {feature.name}
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Capabilities:</h4>
                      <ul className="space-y-1 text-sm">
                        {feature.capabilities.map((cap, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <CheckCircle className="h-3 w-3 text-green-500" />
                            {cap}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">When to use:</h4>
                      <p className="text-sm text-muted-foreground">{feature.usage}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="best-practices" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bestPractices.map((practice) => (
              <Card key={practice.category}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <practice.icon className="h-5 w-5" />
                    {practice.category}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {practice.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <TrendingUp className="h-3 w-3 text-green-500 mt-1 flex-shrink-0" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Common Pitfalls to Avoid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium text-red-600">❌ Don't:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Over-optimize trên historical data</li>
                    <li>• Ignore transaction costs</li>
                    <li>• Use future information (look-ahead bias)</li>
                    <li>• Test trên cùng data đã dùng để develop</li>
                    <li>• Assume correlation implies causation</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium text-green-600">✅ Do:</h4>
                  <ul className="space-y-1 text-sm">
                    <li>• Validate với out-of-sample data</li>
                    <li>• Include realistic trading costs</li>
                    <li>• Test across different market conditions</li>
                    <li>• Keep models simple và interpretable</li>
                    <li>• Focus on risk-adjusted returns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 