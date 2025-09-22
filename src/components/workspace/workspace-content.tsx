"use client";

import { ModuleId } from '@/types/workspace';
import { WORKSPACE_MODULES } from '@/constants/workspace-modules';
import { AssetSummary } from "@/components/assets/asset-summary";
import { TradingViewWidget } from "@/components/chart/tradingview-widget";
import { TradingPanel } from "@/components/trading/trading-panel";
import { MarketDataModule } from "./modules/market-data-module";
import { RealTimeDataMonitor } from './modules/real-time-data-monitor';
import { DataCollectionJobsManager } from './modules/data-collection-jobs-manager';
import { DataSourceManager } from './modules/data-source-manager';
import { DataQualityDashboard } from './modules/data-quality-dashboard';
import { ResearchDevelopmentContent } from "@/components/research/research-development-content";
import MonteCarloAnalysis from '@/components/MonteCarloAnalysis';
import WalkForwardAnalysis from '@/components/WalkForwardAnalysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  LayoutDashboard, 
  Database, 
  Brain, 
  Settings, 
  Shield, 
  Newspaper, 
  FileText, 
  BookOpen,
  Plus,
  Zap,
  TrendingUp,
  TrendingDown,
  Activity,
  Pause,
  Play,
  Eye,
  BarChart4,
  BarChart3,
  Calendar,
  Target,
  AlertTriangle,
  Terminal
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { TotalAssetsCard } from "@/components/trading/total-assets-card";
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';
import TradingBotDetailModal from '@/components/trading/trading-bot-detail-modal';

interface WorkspaceContentProps {
  activeModule: ModuleId;
}

interface NewsArticle {
  id: string;
  title: string;
  url: string;
}

const iconMap = {
  LayoutDashboard,
  Database,
  Brain,
  Settings,
  Shield,
  Newspaper,
  FileText,
  BookOpen
};

// NewsTicker: bảng chạy tin tức ngang
function NewsTicker() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchNews = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/market-data/news?action=all_sources&limit=10');
        const result = await response.json();
        if (result.success) {
          setArticles(result.data);
        }
      } catch (error) {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    fetchNews();
    // Cập nhật mỗi 2 phút
    const interval = setInterval(fetchNews, 120000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading && articles.length === 0) return null;
  if (!articles || articles.length === 0) return null;

  return (
    <div
      className="w-full bg-card border border-primary/30 rounded-lg mb-2 flex items-center h-12 px-2 overflow-x-hidden"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      <span className="font-semibold text-primary mr-4 flex-shrink-0">📰 Tin mới:</span>
      <div
        className="flex animate-marquee"
        style={{ gap: 0, minWidth: '100%', overflow: 'hidden' }}
      >
        {articles.map((article, idx) => (
          <a
            key={article.id}
            href={article.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-700 hover:underline flex-shrink-0 px-2"
            title={article.title}
            style={{ whiteSpace: 'nowrap' }}
          >
            {article.title}
            {idx !== articles.length - 1 && <span className="mx-2 text-muted-foreground">|</span>}
          </a>
        ))}
      </div>
    </div>
  );
}

// Thêm hàm renderJsonField để phân giải jsonb
function renderJsonField(value: any) {
  if (typeof value === 'object' && value !== null) {
    if (Array.isArray(value)) {
      return (
        <ul className="list-disc pl-4">
          {value.map((item, idx) => (
            <li key={idx}>{renderJsonField(item)}</li>
          ))}
        </ul>
      );
    } else {
      return (
        <table className="w-full text-xs border border-muted-foreground/10 mb-2">
          <tbody>
            {Object.entries(value).map(([k, v]) => (
              <tr key={k}>
                <td className="font-semibold pr-2 text-muted-foreground whitespace-nowrap align-top">{k}</td>
                <td className="break-all">{renderJsonField(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      );
    }
  }
  return <span>{String(value)}</span>;
}

// Hàm forward mở modal (đã được thay thế bằng TradingBotsList)
function handleForward(type: string, data: any) {
  // Đã được thay thế bằng TradingBotsList component
  console.log('handleForward called:', type, data);
}

// (Đã chuyển modal chi tiết bot sang component dùng chung)

// Modal chi tiết
function DetailModal({ open, onClose, type, data }: { open: boolean, onClose: () => void, type: string, data: any }) {
  const jsonFields = ['metrics', 'config', 'params', 'result', 'extra', 'details'];
  if (!data) return null;
  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl relative">
        {/* Nút đóng X debug - màu đỏ, border đen, font trắng, z rất cao */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 z-[99999] text-2xl font-bold text-white bg-red-600 rounded-full hover:bg-red-700 focus:outline-none border-2 border-black"
          aria-label="Đóng"
          type="button"
          style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          ×
        </button>
        <DialogHeader>
          <DialogTitle>
            Chi tiết {type === 'model' ? 'Mô hình' : type === 'experiment' ? 'Thí nghiệm' : 'Bot'}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full text-sm mb-2">
            <tbody>
              {Object.entries(data).map(([key, value]) => (
                <tr key={key}>
                  <td className="font-semibold pr-2 text-muted-foreground whitespace-nowrap align-top">{key}</td>
                  <td className="break-all">
                    {jsonFields.includes(key) && typeof value === 'object' && value !== null
                      ? renderJsonField(value)
                      : String(value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Component danh sách Trading Bots thay thế cho ResearchTreeView
function TradingBotsList() {
  const [bots, setBots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBot, setSelectedBot] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    async function fetchBots() {
      setLoading(true);
      if (!supabase) { 
        console.log('Supabase not initialized');
        setBots([]); 
        setLoading(false); 
        return; 
      }
      
      try {
        console.log('Fetching trading bots...');
        
        // Sử dụng API endpoint để lấy bots với stats đã tính toán
        const response = await fetch('/api/trading/bot?projectId=all');
        if (response.ok) {
          const botsData = await response.json();
          console.log('Fetched bots with stats:', botsData);
          setBots(botsData || []);
        } else {
          // Fallback: thử lấy từ bảng trading_bots trực tiếp
          let { data: botsData, error } = await supabase
            .from('trading_bots')
            .select('*')
            .order('created_at', { ascending: false });

          if (error) {
            console.log('trading_bots table error:', error);
            // Thử với bảng khác nếu có
            const { data: altBotsData, error: altError } = await supabase
              .from('research_experiments')
              .select('*')
              .eq('type', 'backtest')
              .order('created_at', { ascending: false });
            
            if (altError) {
              console.error('Both tables failed:', altError);
              setBots([]);
            } else {
              console.log('Using research_experiments as bots:', altBotsData);
              setBots(altBotsData || []);
            }
          } else {
            console.log('Fetched bots from trading_bots:', botsData);
            setBots(botsData || []);
          }
        }
      } catch (error) {
        console.error('Error fetching bots:', error);
        setBots([]);
      }
      
      setLoading(false);
    }
    fetchBots();
  }, []);

  const handleBotAction = async (botId: string, action: 'start' | 'stop') => {
    try {
      const response = await fetch(`/api/trading/bot/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });

             if (response.ok && supabase) {
         // Refresh danh sách bots
         const { data: botsData } = await supabase
           .from('trading_bots')
           .select('*')
           .order('created_at', { ascending: false });
         
         setBots(botsData || []);
       }
    } catch (error) {
      console.error(`Error ${action}ing bot:`, error);
    }
  };

  const handleToggleBot = async (bot: any) => {
    const action = bot.status === 'running' ? 'stop' : 'start';
    await handleBotAction(bot.id, action);
    
    // Cập nhật trạng thái bot trong state
    setBots(prevBots => 
      prevBots.map(b => 
        b.id === bot.id 
          ? { ...b, status: action === 'start' ? 'running' : 'stopped' }
          : b
      )
    );
  };

  const handleShowDetail = async (bot: any) => {
    setSelectedBot(bot);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'text-green-600 bg-green-100';
      case 'stopped': return 'text-red-600 bg-red-100';
      case 'idle': return 'text-yellow-600 bg-yellow-100';
      case 'error': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'running': return 'Đang chạy';
      case 'stopped': return 'Đã dừng';
      case 'idle': return 'Chờ';
      case 'error': return 'Lỗi';
      default: return status;
    }
  };

  if (loading) return <Card className="flex-1 min-w-[320px] flex items-center justify-center"><span>Đang tải danh sách bot...</span></Card>;

  return (
    <>
      <Card className="flex-1 min-w-[320px]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Trading Bots</CardTitle>
              <CardDescription>Danh sách các bot giao dịch từ các dự án</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/debug/trading-bots');
                    const data = await response.json();
                    console.log('Debug data:', data);
                    alert(`Debug: trading_bots=${data.trading_bots.count}, experiments=${data.research_experiments.count}, projects=${data.research_projects.count}`);
                  } catch (error) {
                    console.error('Debug error:', error);
                  }
                }}
              >
                Debug
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    const response = await fetch('/api/debug/create-sample-bot', { method: 'POST' });
                    const data = await response.json();
                    console.log('Create sample bot result:', data);
                    if (data.success) {
                      alert('Đã tạo sample bot thành công!');
                      // Refresh danh sách
                      window.location.reload();
                    } else {
                      alert('Lỗi tạo sample bot: ' + data.error);
                    }
                  } catch (error) {
                    console.error('Create sample bot error:', error);
                  }
                }}
              >
                Tạo Sample
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {bots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Zap className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Chưa có trading bot nào</p>
                <p className="text-sm">Tạo bot từ các backtest đã hoàn thành</p>
              </div>
            ) : (
              bots.map((bot) => (
                <div key={bot.id} className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                                         <div className="flex-1">
                       <h4 className="font-medium text-sm">{bot.name}</h4>
                       <p className="text-xs text-muted-foreground">
                         Dự án ID: {bot.project_id || 'Không xác định'}
                       </p>
                     </div>
                    <Badge 
                      variant="outline" 
                      className={`text-xs ${getStatusColor(bot.status)}`}
                    >
                      {getStatusText(bot.status)}
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-5 gap-1 text-xs mb-3">
                    <div>
                      <span className="text-muted-foreground">Giao dịch:</span>
                      <div className="font-medium">{bot.total_trades || 0}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Lợi nhuận:</span>
                      <div className={`font-medium ${(bot.total_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        ${(bot.total_profit || 0).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win Rate:</span>
                      <div className="font-medium">{(bot.win_rate || 0).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">% Avg Win:</span>
                      <div className="font-medium text-green-600">{(bot.avg_win_net || 0).toFixed(1)}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">% Avg Loss:</span>
                      <div className="font-medium text-red-600">{(bot.avg_loss_net || 0).toFixed(1)}%</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {bot.status === 'running' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleBotAction(bot.id, 'stop')}
                      >
                        <Pause className="h-3 w-3 mr-1" />
                        Dừng
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleBotAction(bot.id, 'start')}
                        disabled={bot.status === 'error'}
                      >
                        <Play className="h-3 w-3 mr-1" />
                        Chạy
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleShowDetail(bot)}
                    >
                      <Eye className="h-3 w-3" />
                    </Button>
                  </div>

                  {bot.last_error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                      <strong>Lỗi:</strong> {bot.last_error}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>


      <TradingBotDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        bot={selectedBot}
        onToggleBot={handleToggleBot}
      />
    </>
  );
}

// Component cho Dashboard chung (module hiện tại)
function DashboardModule() {
  return (
    <div className="flex flex-col gap-4 p-4 min-h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4"> {/* Flex container for title and toggle */}
          <div>
            <h1 className="text-2xl font-bold">Dashboard Chung</h1>
            <p className="text-muted-foreground">Tổng quan thị trường và tài sản</p>
          </div>
          <ThemeToggle />
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live
        </Badge>
      </div>

      {/* News Ticker ở trên dãy card */}
      {/* <NewsTicker /> */}

      {/* Dãy card nhỏ: Tổng tài sản + placeholder */}
      <div className="flex flex-row gap-4 mb-2 w-full">
        <div className="w-1/5 min-w-[160px]">
          <TotalAssetsCard />
        </div>
        <div className="w-1/5 min-w-[160px]">
          <Card className="p-2 flex flex-col items-start justify-center shadow-sm border border-primary/30">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Lợi nhuận</div>
              <div className="text-sm font-bold text-muted">--</div>
            </CardContent>
          </Card>
        </div>
        <div className="w-1/5 min-w-[160px]">
          <Card className="p-2 flex flex-col items-start justify-center shadow-sm border border-primary/30">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Đòn bẩy</div>
              <div className="text-sm font-bold text-muted">--</div>
            </CardContent>
          </Card>
        </div>
        <div className="w-1/5 min-w-[160px]">
          <Card className="p-2 flex flex-col items-start justify-center shadow-sm border border-primary/30">
            <CardContent className="p-2 flex flex-col gap-1">
              <div className="text-xs font-semibold text-muted-foreground mb-1">Tài sản khác</div>
              <div className="text-sm font-bold text-muted">--</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Content: Chart và Quản lý tài khoản cùng hàng */}
      <div className="flex flex-row gap-4 min-h-[400px] w-full">
        {/* Chart Panel */}
        <div className="flex-1 min-w-0 flex flex-col">
          <Card className="flex-1 flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                BTC/USDT Price Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex">
              <TradingViewWidget className="h-full w-full flex-1" />
            </CardContent>
          </Card>
          {/* Thêm TreeView bên dưới Chart */}
          <div className="mt-4">
            <TradingBotsList />
          </div>
        </div>
        {/* Asset Summary Panel */}
        <div className="w-1/3 min-w-[320px] flex flex-col">
          <Card className="flex-1">
            <AssetSummary isExpanded={true} onToggle={() => {}} />
          </Card>
          {/* Panel Giao dịch */}
          <div className="mt-4">
            <Card className="flex-1">
              <TradingPanel />
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Algorithm Optimization Module
function AlgorithmOptimizationModule() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">🎯 Theo dõi và tối ưu hóa thuật toán</h1>
          <p className="text-muted-foreground">
            Giám sát và tối ưu hóa hiệu suất thuật toán giao dịch với Monte Carlo, Walk Forward Analysis, Cross Validation
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="text-sm">
            Advanced Analytics
          </Badge>
          <Badge variant="outline" className="text-sm">
            Real-time Monitoring
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="monte-carlo" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="monte-carlo">Monte Carlo</TabsTrigger>
          <TabsTrigger value="walk-forward">Walk Forward</TabsTrigger>
        </TabsList>
        <TabsContent value="monte-carlo">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart4 className="h-5 w-5" />
                Monte Carlo Analysis
              </CardTitle>
              <CardDescription>
                Phân tích rủi ro toàn diện thông qua mô phỏng Monte Carlo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MonteCarloAnalysis key="workspace-monte-carlo" />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="walk-forward">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Walk Forward Analysis
              </CardTitle>
              <CardDescription>
                Phân tích rủi ro và hiệu suất thuật toán trong quá trình Walk Forward
              </CardDescription>
            </CardHeader>
            <CardContent>
              <WalkForwardAnalysis key="workspace-walk-forward" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Component placeholder cho các module khác
function ModulePlaceholder({ moduleId }: { moduleId: ModuleId }) {
  const module = WORKSPACE_MODULES.find(m => m.id === moduleId);
  if (!module) return null;

  const IconComponent = iconMap[module.icon as keyof typeof iconMap];

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center min-h-full">
      <div className="max-w-md mx-auto">
        <div className="w-20 h-20 mx-auto mb-6 bg-primary/10 rounded-full flex items-center justify-center">
          <IconComponent className="h-10 w-10 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold mb-2">{module.name}</h2>
        <p className="text-muted-foreground mb-6">{module.description}</p>
        
        <div className="space-y-3">
          <Button className="w-full" size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Bắt đầu sử dụng
          </Button>
          
          <p className="text-sm text-muted-foreground">
            Module này đang được phát triển
          </p>
        </div>

        {/* Feature highlights */}
        <div className="mt-8 grid grid-cols-1 gap-3">
          <div className="p-3 bg-card border rounded-lg text-left">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-yellow-500" />
              <span className="font-medium text-sm">Tính năng chính</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Các tính năng quan trọng sẽ được tích hợp trong module này
            </p>
          </div>
          
          <div className="p-3 bg-card border rounded-lg text-left">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="h-4 w-4 text-green-500" />
              <span className="font-medium text-sm">Real-time</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Cập nhật dữ liệu và phân tích theo thời gian thực
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WorkspaceContent({ activeModule }: WorkspaceContentProps) {
  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <DashboardModule />;
      case 'market-data':
        return <MarketDataModule />;
      case 'quantitative-research':
        return <ResearchDevelopmentContent />;
      case 'data-collection':
        return <DataCollectionJobsManager />;
      case 'real-time-monitor':
        return <RealTimeDataMonitor />;
      case 'data-sources':
        return <DataSourceManager />;
      case 'data-quality':
        return <DataQualityDashboard />;
      case 'algorithm-optimization':
        return <AlgorithmOptimizationModule />;
      default:
        return <ModulePlaceholder moduleId={activeModule} />;
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      {renderModule()}
    </div>
  );
}