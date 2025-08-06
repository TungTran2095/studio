import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Activity, Calendar, DollarSign } from 'lucide-react';

interface PatchResult {
  patchId: number;
  startDate: string;
  endDate: string;
  initialCapital: number;
  finalCapital: number;
  totalReturn: number;
  trades: any[];
  metrics: {
    winRate: number;
    totalTrades: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
  };
}

interface PatchBacktestResultsProps {
  results: {
    totalPatches: number;
    finalCapital: number;
    totalReturn: number;
    totalTrades: number;
    winRate: number;
    avgWin: number;
    avgLoss: number;
    maxDrawdown: number;
    sharpeRatio: number;
    patches: PatchResult[];
  };
}

export function PatchBacktestResults({ results }: PatchBacktestResultsProps) {
  if (!results || !results.patches) {
    return (
      <Card>
        <CardContent>
          <p className="text-muted-foreground">Không có dữ liệu patch-based backtest</p>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Tổng kết */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Tổng kết Patch-based Backtest
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {results.totalPatches}
              </div>
              <div className="text-sm text-muted-foreground">Tổng số patches</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(results.finalCapital)}
              </div>
              <div className="text-sm text-muted-foreground">Vốn cuối</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${results.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(results.totalReturn)}
              </div>
              <div className="text-sm text-muted-foreground">Tổng lợi nhuận</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {results.totalTrades}
              </div>
              <div className="text-sm text-muted-foreground">Tổng giao dịch</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center">
              <div className="text-lg font-semibold text-blue-600">
                {formatPercentage(results.winRate)}
              </div>
              <div className="text-sm text-muted-foreground">Tỷ lệ thắng</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(results.avgWin)}
              </div>
              <div className="text-sm text-muted-foreground">Lãi TB</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(results.avgLoss)}
              </div>
              <div className="text-sm text-muted-foreground">Lỗ TB</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600">
                {formatPercentage(results.maxDrawdown)}
              </div>
              <div className="text-sm text-muted-foreground">Max Drawdown</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Chi tiết từng patch */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Chi tiết từng Patch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {results.patches.map((patch, index) => (
              <div key={patch.patchId} className="border rounded-lg p-4 hover:bg-muted/50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Patch {patch.patchId}</Badge>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(patch.startDate)} - {formatDate(patch.endDate)}
                    </span>
                  </div>
                  <Badge variant={patch.totalReturn >= 0 ? 'default' : 'destructive'}>
                    {patch.totalReturn >= 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                    {formatPercentage(patch.totalReturn)}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <div className="font-semibold text-muted-foreground">Vốn đầu</div>
                    <div className="font-mono">{formatCurrency(patch.initialCapital)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground">Vốn cuối</div>
                    <div className="font-mono">{formatCurrency(patch.finalCapital)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground">Giao dịch</div>
                    <div className="font-mono">{patch.metrics.totalTrades}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground">Tỷ lệ thắng</div>
                    <div className="font-mono">{formatPercentage(patch.metrics.winRate)}</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-3 text-sm">
                  <div>
                    <div className="font-semibold text-muted-foreground">Lãi TB</div>
                    <div className="font-mono text-green-600">{formatCurrency(patch.metrics.avgWin)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground">Lỗ TB</div>
                    <div className="font-mono text-red-600">{formatCurrency(patch.metrics.avgLoss)}</div>
                  </div>
                  <div>
                    <div className="font-semibold text-muted-foreground">Max DD</div>
                    <div className="font-mono text-orange-600">{formatPercentage(patch.metrics.maxDrawdown)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Biểu đồ equity curve */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Equity Curve theo Patch
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <TrendingUp className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Biểu đồ equity curve sẽ được hiển thị ở đây</p>
              <p className="text-xs">Tính năng đang được phát triển</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 