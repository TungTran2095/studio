"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Play, 
  Eye, 
  Download,
  TrendingUp,
  BarChart3,
  Calculator,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

interface HypothesisTest {
  id: string;
  name: string;
  test_type: string;
  status: string;
  created_at: string;
  results?: any;
}

export function HypothesisTestingTab() {
  const [activeTab, setActiveTab] = useState('create');
  const [tests, setTests] = useState<HypothesisTest[]>([]);
  const [loading, setLoading] = useState(false);
  const [testConfig, setTestConfig] = useState({
    name: '',
    test_type: 'correlation',
    description: '',
    run_immediately: false
  });

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      const response = await fetch('/api/research/hypothesis-tests');
      if (response.ok) {
        const data = await response.json();
        setTests(data.tests || []);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
    }
  };

  const createTest = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/research/hypothesis-tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Test created:', result);
        await fetchTests();
        setActiveTab('results');
      } else {
        console.error('Failed to create test');
      }
    } catch (error) {
      console.error('Error creating test:', error);
    } finally {
      setLoading(false);
    }
  };

  const runQuickTest = async (testType: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/research/test?type=${testType}`);
      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Quick ${testType} test result:`, result);
        // Hiển thị kết quả trong modal hoặc alert
        alert(`Test ${testType} completed! Check console for details.`);
      }
    } catch (error) {
      console.error(`Error running ${testType} test:`, error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Kiểm tra Giả thuyết Thống kê</h2>
          <p className="text-muted-foreground">
            Phân tích thống kê với dữ liệu market thực từ Supabase
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => runQuickTest('correlation')}
            disabled={loading}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Quick Correlation Test
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => runQuickTest('ttest')}
            disabled={loading}
          >
            <Calculator className="h-4 w-4 mr-2" />
            Quick T-Test
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create">Tạo Test</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="results">Kết quả</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Tạo Hypothesis Test Mới</CardTitle>
              <CardDescription>
                Sử dụng dữ liệu market thực để kiểm tra giả thuyết thống kê
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="test-name">Tên Test</Label>
                  <Input
                    id="test-name"
                    placeholder="VD: BTC Price vs Volume Correlation"
                    value={testConfig.name}
                    onChange={(e) => setTestConfig(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="test-type">Loại Test</Label>
                  <Select 
                    value={testConfig.test_type} 
                    onValueChange={(value) => setTestConfig(prev => ({ ...prev, test_type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn test type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="correlation">Correlation Test</SelectItem>
                      <SelectItem value="ttest">T-Test</SelectItem>
                      <SelectItem value="anova">ANOVA</SelectItem>
                      <SelectItem value="chi_square">Chi-Square</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  placeholder="Mô tả giả thuyết cần kiểm tra..."
                  value={testConfig.description}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="run-immediately"
                  checked={testConfig.run_immediately}
                  onChange={(e) => setTestConfig(prev => ({ ...prev, run_immediately: e.target.checked }))}
                />
                <Label htmlFor="run-immediately">Chạy ngay sau khi tạo</Label>
              </div>

              <Button onClick={createTest} disabled={loading || !testConfig.name}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang tạo...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Tạo Test
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Volume-Price Correlation
                </CardTitle>
                <CardDescription>
                  Kiểm tra mối tương quan giữa volume và price movement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => runQuickTest('correlation')}
                >
                  Chạy Template
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Returns Distribution Test
                </CardTitle>
                <CardDescription>
                  T-test so sánh returns trước và sau tin tức quan trọng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => runQuickTest('ttest')}
                >
                  Chạy Template
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="results" className="space-y-4">
          <div className="space-y-4">
            {tests.length > 0 ? tests.map((test) => (
              <Card key={test.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{test.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={
                          test.status === 'completed' ? 'default' :
                          test.status === 'running' ? 'secondary' : 'outline'
                        }
                      >
                        {test.status === 'completed' ? 'Hoàn thành' :
                         test.status === 'running' ? 'Đang chạy' : 
                         test.status === 'failed' ? 'Lỗi' : test.status}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <CardDescription>
                    Test type: {test.test_type} • Created: {new Date(test.created_at).toLocaleDateString('vi-VN')}
                  </CardDescription>
                </CardHeader>
                {test.results && (
                  <CardContent>
                    <div className="bg-muted p-3 rounded text-sm font-mono">
                      <pre>{JSON.stringify(test.results, null, 2)}</pre>
                    </div>
                  </CardContent>
                )}
              </Card>
            )) : (
              <Card>
                <CardContent className="text-center py-8">
                  <TestTube className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-medium mb-2">Chưa có test nào</h3>
                  <p className="text-muted-foreground mb-4">
                    Tạo hypothesis test đầu tiên để kiểm tra giả thuyết thống kê
                  </p>
                  <Button onClick={() => setActiveTab('create')}>
                    Tạo Test Mới
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
} 