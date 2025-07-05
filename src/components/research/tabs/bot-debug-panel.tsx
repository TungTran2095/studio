import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';

interface BotDebugPanelProps {
  botId: string;
}

interface BotLogsData {
  bot: {
    id: string;
    name: string;
    status: string;
    total_trades: number;
    total_profit: number;
    win_rate: number;
    last_error: string | null;
    last_run_at: string | null;
    created_at: string;
    updated_at: string;
  };
  indicator_logs: Array<{
    id: string;
    indicator: string;
    value: number;
    time: string;
  }>;
  trades: Array<{
    id: string;
    symbol: string;
    side: string;
    type: string;
    quantity: number;
    entry_price: number;
    exit_price: number | null;
    status: string;
    pnl: number | null;
    open_time: string;
    close_time: string | null;
  }>;
  summary: {
    has_indicator_logs: boolean;
    has_trades: boolean;
    last_indicator_log: any;
    last_trade: any;
  };
}

export function BotDebugPanel({ botId }: BotDebugPanelProps) {
  const [logsData, setLogsData] = useState<BotLogsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/trading/bot/logs?botId=${botId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bot logs');
      }
      
      const data = await response.json();
      setLogsData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [botId]);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Đang tải thông tin debug...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Lỗi khi tải thông tin debug: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!logsData) {
    return (
      <Alert>
        <AlertDescription>Không có dữ liệu debug</AlertDescription>
      </Alert>
    );
  }

  const { bot, indicator_logs, trades, summary } = logsData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'error': return 'bg-red-100 text-red-800';
      case 'idle': return 'bg-gray-100 text-gray-800';
      case 'stopped': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Debug Information</h3>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          Refresh
        </Button>
      </div>

      {/* Bot Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Bot Status
            <Badge className={getStatusColor(bot.status)}>
              {bot.status.toUpperCase()}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Tên:</span> {bot.name}
            </div>
            <div>
              <span className="font-medium">Tổng giao dịch:</span> {bot.total_trades}
            </div>
            <div>
              <span className="font-medium">Tổng lợi nhuận:</span> {bot.total_profit}
            </div>
            <div>
              <span className="font-medium">Tỷ lệ thắng:</span> {bot.win_rate}%
            </div>
            <div>
              <span className="font-medium">Lần chạy cuối:</span> {bot.last_run_at ? new Date(bot.last_run_at).toLocaleString('vi-VN') : 'Chưa có'}
            </div>
            <div>
              <span className="font-medium">Cập nhật cuối:</span> {new Date(bot.updated_at).toLocaleString('vi-VN')}
            </div>
          </div>
          
          {bot.last_error && (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>
                <strong>Lỗi cuối:</strong> {bot.last_error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Phân tích vấn đề</CardTitle>
        </CardHeader>
        <CardContent>
          {bot.status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>
                Bot đang ở trạng thái ERROR. Kiểm tra lỗi cuối cùng ở trên.
              </AlertDescription>
            </Alert>
          )}
          
          {bot.status === 'idle' && (
            <Alert>
              <AlertDescription>
                Bot đang ở trạng thái IDLE - không chạy. Cần khởi động bot.
              </AlertDescription>
            </Alert>
          )}
          
          {bot.status === 'running' && bot.total_trades === 0 && (
            <Alert>
              <AlertDescription>
                Bot đang chạy nhưng chưa có giao dịch nào. Có thể do:
                <ul className="list-disc list-inside mt-2">
                  <li>Chưa có tín hiệu giao dịch</li>
                  <li>Vấn đề với API key</li>
                  <li>Không đủ số dư</li>
                  <li>Tham số chiến lược chưa trigger</li>
                </ul>
              </AlertDescription>
            </Alert>
          )}
          
          {bot.status === 'running' && bot.total_trades > 0 && (
            <Alert className="bg-green-50 border-green-200">
              <AlertDescription>
                Bot đang hoạt động bình thường với {bot.total_trades} giao dịch.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Indicator Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Indicator Logs ({indicator_logs.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {indicator_logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Chưa có logs indicator. Có thể bảng bot_indicator_logs chưa được tạo.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {indicator_logs.slice(0, 10).map((log) => (
                <div key={log.id} className="flex justify-between text-sm">
                  <span>{log.indicator}: {log.value}</span>
                  <span className="text-muted-foreground">
                    {new Date(log.time).toLocaleString('vi-VN')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trades */}
      <Card>
        <CardHeader>
          <CardTitle>Giao dịch ({trades.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              Chưa có giao dịch nào.
            </div>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {trades.slice(0, 10).map((trade) => (
                <div key={trade.id} className="flex justify-between text-sm">
                  <span>
                    {trade.side.toUpperCase()} {trade.quantity} {trade.symbol} @ {trade.entry_price}
                  </span>
                  <Badge variant={trade.status === 'closed' ? 'default' : 'secondary'}>
                    {trade.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 