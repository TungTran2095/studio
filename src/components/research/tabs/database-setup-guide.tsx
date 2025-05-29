"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Database, 
  ExternalLink, 
  Copy, 
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Play
} from 'lucide-react';

const SQL_SCRIPT = `-- Research Projects
CREATE TABLE IF NOT EXISTS research_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  objective TEXT,
  status TEXT CHECK (status IN ('active', 'completed', 'archived')) DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,
  tags TEXT[] DEFAULT '{}',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100)
);

-- Models
CREATE TABLE IF NOT EXISTS research_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('statistical', 'machine_learning', 'financial_math')) NOT NULL,
  algorithm_type TEXT NOT NULL,
  parameters JSONB DEFAULT '{}',
  hyperparameters JSONB DEFAULT '{}',
  feature_config JSONB DEFAULT '{}',
  training_config JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('draft', 'training', 'completed', 'failed')) DEFAULT 'draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID,
  model_file_path TEXT,
  training_time_seconds INTEGER,
  data_size INTEGER
);

-- Hypothesis Tests
CREATE TABLE IF NOT EXISTS hypothesis_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT NOT NULL,
  null_hypothesis TEXT NOT NULL,
  alternative_hypothesis TEXT NOT NULL,
  test_type TEXT CHECK (test_type IN ('correlation', 't_test', 'anova', 'chi_square', 'granger_causality')) NOT NULL,
  variables JSONB NOT NULL,
  test_config JSONB DEFAULT '{}',
  results JSONB DEFAULT '{}',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
);

-- Backtests
CREATE TABLE IF NOT EXISTS backtests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID,
  project_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  strategy_config JSONB NOT NULL,
  backtest_config JSONB NOT NULL,
  risk_management JSONB DEFAULT '{}',
  performance_metrics JSONB DEFAULT '{}',
  trades JSONB DEFAULT '[]',
  equity_curve JSONB DEFAULT '[]',
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed')) DEFAULT 'pending',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  user_id UUID
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_research_projects_user_id ON research_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_research_projects_status ON research_projects(status);
CREATE INDEX IF NOT EXISTS idx_research_models_project_id ON research_models(project_id);
CREATE INDEX IF NOT EXISTS idx_research_models_status ON research_models(status);
CREATE INDEX IF NOT EXISTS idx_hypothesis_tests_project_id ON hypothesis_tests(project_id);
CREATE INDEX IF NOT EXISTS idx_backtests_model_id ON backtests(model_id);
CREATE INDEX IF NOT EXISTS idx_backtests_status ON backtests(status);`;

export function DatabaseSetupGuide() {
  const [copied, setCopied] = useState(false);
  const [testing, setTesting] = useState(false);
  const [setupStatus, setSetupStatus] = useState<'pending' | 'success' | 'error'>('pending');

  const copySQL = () => {
    navigator.clipboard.writeText(SQL_SCRIPT);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const response = await fetch('/api/research/setup-database', { method: 'POST' });
      const result = await response.json();
      
      console.log('Test connection response:', response.status, result);
      
      if (response.ok) {
        setSetupStatus('success');
      } else if (response.status === 400) {
        // Expected case - tables don't exist yet
        setSetupStatus('error');
        console.log('📋 Database setup required. SQL Script:', result.sql_script);
        
        // Auto-copy SQL script to clipboard
        if (result.sql_script) {
          try {
            await navigator.clipboard.writeText(result.sql_script);
            console.log('✅ SQL script auto-copied to clipboard');
          } catch (err) {
            console.log('Could not auto-copy SQL script');
          }
        }
      } else {
        setSetupStatus('error');
        console.error('Unexpected error:', result);
      }
    } catch (error) {
      console.error('Network error:', error);
      setSetupStatus('error');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <Database className="h-12 w-12 mx-auto mb-4 text-blue-500" />
        <h2 className="text-2xl font-bold mb-2">Database Setup Required</h2>
        <p className="text-muted-foreground">
          Cần tạo database tables để sử dụng tính năng nghiên cứu định lượng
        </p>
      </div>

      {/* Status */}
      <Alert className={setupStatus === 'success' ? 'border-green-500' : setupStatus === 'error' ? 'border-yellow-500' : ''}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {setupStatus === 'pending' && 'Database chưa được setup. Follow các bước dưới đây để tạo tables.'}
          {setupStatus === 'success' && '✅ Database đã được setup thành công!'}
          {setupStatus === 'error' && '⚠️ Tables chưa được tạo. Hãy copy SQL script và chạy trong Supabase Dashboard. SQL đã được auto-copy vào clipboard!'}
        </AlertDescription>
      </Alert>

      {/* Step-by-step guide */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
              Mở Supabase Dashboard
            </CardTitle>
            <CardDescription>
              Truy cập vào SQL Editor trong Supabase project
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm">• Vào <strong>supabase.com/dashboard</strong></p>
              <p className="text-sm">• Chọn project Urus Studio</p>
              <p className="text-sm">• Click <strong>SQL Editor</strong> ở sidebar</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Mở Supabase Dashboard
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
              Copy SQL Script
            </CardTitle>
            <CardDescription>
              Copy đoạn SQL để tạo các tables cần thiết
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={copySQL}
              className="w-full"
              variant={copied ? "default" : "outline"}
            >
              {copied ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Đã Copy!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy SQL Script
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* SQL Script Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
            SQL Script to Run
          </CardTitle>
          <CardDescription>
            Paste đoạn code này vào SQL Editor và click RUN
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto max-h-60">
            <pre>{SQL_SCRIPT}</pre>
          </div>
          <div className="mt-4 flex gap-2">
            <Button onClick={copySQL} variant="outline" size="sm">
              <Copy className="h-4 w-4 mr-2" />
              Copy Script
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
            Test Database Connection
          </CardTitle>
          <CardDescription>
            Kiểm tra xem tables đã được tạo thành công chưa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testConnection} 
            disabled={testing}
            className="w-full"
          >
            {testing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Đang test...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Test Database Connection
              </>
            )}
          </Button>

          {setupStatus === 'success' && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-700">
                <CheckCircle className="h-5 w-5" />
                <span className="font-medium">Setup thành công!</span>
              </div>
              <p className="text-sm text-green-600 mt-1">
                Database tables đã được tạo. Bạn có thể bắt đầu sử dụng module nghiên cứu.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Next Steps */}
      {setupStatus === 'success' && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="text-green-700">🎉 Ready to Start!</CardTitle>
            <CardDescription>
              Bây giờ bạn có thể bắt đầu workflow nghiên cứu định lượng
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>1. Tạo dự án nghiên cứu mới</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>2. Định nghĩa giả thuyết và test statistical</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>3. Xây dựng và train models</span>
              </div>
              <div className="flex items-center gap-2">
                <ArrowRight className="h-4 w-4 text-green-500" />
                <span>4. Backtest strategies và optimize</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 