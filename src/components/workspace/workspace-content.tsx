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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Activity
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle'; // Import ThemeToggle
import { TotalAssetsCard } from "@/components/trading/total-assets-card";
import { useEffect, useState } from 'react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { supabase } from '@/lib/supabase-client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from '@/components/ui/dialog';

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

// Hàm forward mở modal
function handleForward(type: string, data: any) {
  setModalData({ type, data });
  setModalOpen(true);
}

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

// Component TreeView cho Nghiên cứu Định lượng & Phát triển Mô hình
function ResearchTreeView() {
  const [treeData, setTreeData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDetail, setSelectedDetail] = useState<{type: string, data: any} | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState<{type: string, data: any} | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      if (!supabase) { setTreeData([]); setLoading(false); return; }
      const { data: projects } = await supabase.from('research_projects').select('*');
      const { data: models } = await supabase.from('research_models').select('*');
      const { data: experiments } = await supabase.from('research_experiments').select('*');
      let bots: any[] = [];
      try {
        const botsRes = await supabase.from('trading_bots').select('*');
        bots = botsRes.data || [];
      } catch { bots = []; }
      const tree = (projects || []).map((project: any) => ({
        ...project,
        models: (models || []).filter((m: any) => m.project_id === project.id),
        experiments: (experiments || []).filter((e: any) => e.project_id === project.id),
        bots: (bots || []).filter((b: any) => b.project_id === project.id),
      }));
      setTreeData(tree);
      setLoading(false);
    }
    fetchData();
  }, []);

  function renderDetail() {
    if (!selectedDetail) return null;
    const { type, data } = selectedDetail;
    // Các trường jsonb phổ biến
    const jsonFields = ['metrics', 'config', 'params', 'result', 'extra', 'details'];
    return (
      <Card className="mt-4 border border-primary/30">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            Chi tiết {type === 'model' ? 'Mô hình' : type === 'experiment' ? 'Thí nghiệm' : 'Bot'}
            <Button
              size="sm"
              variant="outline"
              className="ml-2"
              onClick={() => handleForward(type, data)}
            >
              Xem chi tiết
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (loading) return <Card className="flex-1 min-w-[320px] flex items-center justify-center"><span>Đang tải dữ liệu...</span></Card>;

  return (
    <>
      <Card className="flex-1 min-w-[320px]">
        <CardHeader>
          <CardTitle className="text-base">Nghiên cứu & Mô hình</CardTitle>
          <CardDescription>Danh sách dự án, mô hình, thí nghiệm, bot</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {treeData.map(project => (
              <AccordionItem value={project.id} key={project.id}>
                <AccordionTrigger>{project.name}</AccordionTrigger>
                <AccordionContent>
                  {/* Cây con cho Mô hình */}
                  <Accordion type="single" collapsible className="mb-2">
                    <AccordionItem value="models">
                      <AccordionTrigger>Mô hình ({project.models.length})</AccordionTrigger>
                      <AccordionContent>
                        <ul className="pl-4 space-y-1">
                          {project.models.length === 0 && <li className="text-xs text-muted-foreground">Chưa có mô hình</li>}
                          {project.models.map((model: any) => (
                            <li key={model.id} className="flex items-center gap-2 text-sm cursor-pointer hover:underline" onClick={() => setSelectedDetail({type: 'model', data: model})}>
                              <span className="text-blue-600">{model.name}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  {/* Cây con cho Thí nghiệm */}
                  <Accordion type="single" collapsible className="mb-2">
                    <AccordionItem value="experiments">
                      <AccordionTrigger>Thí nghiệm ({project.experiments.length})</AccordionTrigger>
                      <AccordionContent>
                        <ul className="pl-4 space-y-1">
                          {project.experiments.length === 0 && <li className="text-xs text-muted-foreground">Chưa có thí nghiệm</li>}
                          {project.experiments.map((exp: any) => (
                            <li key={exp.id} className="flex items-center gap-2 text-sm cursor-pointer hover:underline" onClick={() => setSelectedDetail({type: 'experiment', data: exp})}>
                              <span className="text-green-600">{exp.name || exp.title}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  {/* Cây con cho Bot */}
                  <Accordion type="single" collapsible>
                    <AccordionItem value="bots">
                      <AccordionTrigger>Bot ({project.bots.length})</AccordionTrigger>
                      <AccordionContent>
                        <ul className="pl-4 space-y-1">
                          {project.bots.length === 0 && <li className="text-xs text-muted-foreground">Chưa có bot</li>}
                          {project.bots.map((bot: any) => (
                            <li key={bot.id} className="flex items-center gap-2 text-sm cursor-pointer hover:underline" onClick={() => setSelectedDetail({type: 'bot', data: bot})}>
                              <span className="text-yellow-600">{bot.name || bot.title}</span>
                            </li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {renderDetail()}
        </CardContent>
      </Card>
      {/* Modal chi tiết */}
      <DetailModal open={modalOpen} onClose={() => setModalOpen(false)} type={modalData?.type || ''} data={modalData?.data} />
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
      <NewsTicker />

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
            <ResearchTreeView />
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