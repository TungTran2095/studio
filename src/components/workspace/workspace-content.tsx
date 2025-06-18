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

interface WorkspaceContentProps {
  activeModule: ModuleId;
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
          <ThemeToggle /> {/* Add ThemeToggle here */}
        </div>
        <Badge variant="secondary" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          Live
        </Badge>
      </div>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[600px]">
        {/* Chart Panel */}
        <div className="lg:col-span-2 flex flex-col">
          <Card className="flex-1 min-h-[600px]">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                BTC/USDT Price Chart
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 h-[500px]">
              <TradingViewWidget />
            </CardContent>
          </Card>
        </div>

        {/* Side Panel */}
        <div className="flex flex-col gap-4">
          {/* Asset Summary */}
          <Card className="flex-1">
            <AssetSummary isExpanded={true} onToggle={() => {}} />
          </Card>

          {/* Trading Panel */}
          <Card className="flex-1">
            <TradingPanel />
          </Card>
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