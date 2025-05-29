"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  MessageSquare, 
  Brain, 
  Database, 
  Zap, 
  TrendingUp,
  Newspaper,
  Clock,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

interface WorkspaceCommand {
  id: string;
  name: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  category: 'data' | 'jobs' | 'news' | 'stats';
}

const workspaceCommands: WorkspaceCommand[] = [
  {
    id: 'collect-btc',
    name: 'Thu thập dữ liệu BTC',
    description: 'Bắt đầu thu thập dữ liệu OHLCV cho Bitcoin',
    example: 'Yinsen, thu thập dữ liệu BTC cho tôi',
    icon: <Database className="h-4 w-4" />,
    category: 'data'
  },
  {
    id: 'create-job',
    name: 'Tạo Job ETH',
    description: 'Tạo job thu thập dữ liệu tự động cho Ethereum',
    example: 'Tạo job thu thập ETH mỗi 5 phút',
    icon: <Clock className="h-4 w-4" />,
    category: 'jobs'
  },
  {
    id: 'get-stats',
    name: 'Thống kê hệ thống',
    description: 'Lấy báo cáo thống kê thu thập dữ liệu',
    example: 'Cho tôi xem thống kê thu thập dữ liệu',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'stats'
  },
  {
    id: 'get-news',
    name: 'Tin tức crypto',
    description: 'Thu thập tin tức mới nhất từ các nguồn uy tín',
    example: 'Lấy tin tức crypto mới nhất',
    icon: <Newspaper className="h-4 w-4" />,
    category: 'news'
  },
  {
    id: 'realtime-data',
    name: 'Dữ liệu real-time',
    description: 'Lấy giá và dữ liệu thời gian thực',
    example: 'Cho tôi xem dữ liệu real-time BTC ETH',
    icon: <Zap className="h-4 w-4" />,
    category: 'data'
  },
  {
    id: 'manage-jobs',
    name: 'Quản lý Jobs',
    description: 'Start, stop hoặc xem danh sách jobs',
    example: 'Hiển thị danh sách jobs đang chạy',
    icon: <CheckCircle className="h-4 w-4" />,
    category: 'jobs'
  }
];

export default function DemoYinsenWorkspace() {
  const [message, setMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [workspaceActive, setWorkspaceActive] = useState(false);

  const handleSendMessage = async () => {
    if (!message.trim()) return;
    
    setIsLoading(true);
    setWorkspaceActive(false);
    
    try {
      // Call workspace API instead of importing directly
      const response = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message }),
      });
      
      const result = await response.json();
      
      if (result.success) {
        setWorkspaceActive(result.isWorkspaceRequest);
        setResponse(result.response);
      } else {
        setResponse(`❌ Lỗi: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error calling workspace API:', error);
      setResponse(`❌ Lỗi khi gọi API: ${error?.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setMessage(example);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'data': return 'bg-blue-500';
      case 'jobs': return 'bg-green-500';
      case 'news': return 'bg-purple-500';
      case 'stats': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
          <Brain className="h-8 w-8 text-blue-500" />
          Yinsen ⚡ Workspace Integration
        </h1>
        <p className="text-muted-foreground">
          Demo tích hợp AI chat với chức năng thu thập dữ liệu thị trường
        </p>
      </div>

      {/* Chat Interface */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Chat với Yinsen
          </CardTitle>
          <CardDescription>
            Gửi tin nhắn để Yinsen tự động thực hiện các chức năng workspace
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Ví dụ: Thu thập dữ liệu BTC, tạo job ETH, xem thống kê..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <Button onClick={handleSendMessage} disabled={isLoading}>
              {isLoading ? 'Đang xử lý...' : 'Gửi'}
            </Button>
          </div>

          {response && (
            <Alert className={workspaceActive ? 'border-green-500 bg-green-50' : ''}>
              <Brain className="h-4 w-4" />
              <AlertDescription className="whitespace-pre-wrap">
                {response}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Workspace Commands */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workspaceCommands.map((command) => (
          <Card key={command.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  {command.icon}
                  <h3 className="font-medium">{command.name}</h3>
                </div>
                <Badge className={getCategoryColor(command.category)}>
                  {command.category}
                </Badge>
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {command.description}
              </p>
              
              <div className="space-y-2">
                <p className="text-xs text-gray-500">Ví dụ:</p>
                <div 
                  className="text-sm bg-gray-100 p-2 rounded cursor-pointer hover:bg-gray-200 transition-colors"
                  onClick={() => handleExampleClick(command.example)}
                >
                  "{command.example}"
                  <ArrowRight className="h-3 w-3 inline ml-1" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status */}
      <Card>
        <CardHeader>
          <CardTitle>Trạng thái Integration</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Workspace Tools</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Request Detection</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">Action Execution</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-sm">API Integration</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* How it works */}
      <Card>
        <CardHeader>
          <CardTitle>Cách hoạt động</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">1</span>
              <span>Người dùng gửi tin nhắn cho Yinsen</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">2</span>
              <span>AI phát hiện từ khóa workspace (thu thập, job, thống kê, tin tức...)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">3</span>
              <span>Xác định action cụ thể và extract parameters</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
              <span>Gọi workspace API tương ứng (jobs, market-data, news...)</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs">5</span>
              <span>Trả về kết quả cho người dùng với phản hồi thân thiện</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 