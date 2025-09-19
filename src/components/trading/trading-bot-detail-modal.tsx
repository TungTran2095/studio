"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Play, Pause, Terminal } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { PriceChart } from '@/components/research/price-chart';
import { BotDebugPanel } from '@/components/research/tabs/bot-debug-panel';

type TradingBot = any; // If a proper type exists, replace any with it

interface TradingBotDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bot: TradingBot | null;
  onToggleBot?: (bot: TradingBot) => Promise<void> | void;
}

function safeToFixed(value: any, decimals: number): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }
  return Number(value).toFixed(decimals);
}

function getBotBuySignalText(bot: any, trade: any): string {
  if (!bot?.config?.strategy?.type) {
    return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }
  const strategyType = bot.config.strategy.type;
  const params = bot.config.strategy.parameters || {};
  switch (strategyType) {
    case 'rsi': {
      const buyRsiValue = trade.entry_rsi || trade.rsi_value || trade.indicator_value;
      if (buyRsiValue !== undefined && buyRsiValue !== null) {
        return `RSI = ${buyRsiValue.toFixed(2)} (Quá bán)`;
      }
      return `RSI < ${params.oversold || 30} (Quá bán)`;
    }
    case 'macd':
      return 'MACD cắt lên Signal';
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt lên MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return 'Giá chạm dải dưới BB';
    case 'moving_average':
      return `Giá > MA${params.period || 20}`;
    default:
      return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }
}

function getBotSellSignalText(bot: any, trade: any): string {
  if (!bot?.config?.strategy?.type) {
    return trade.exit_reason || trade.reason || trade.sell_signal || trade.signal || '-';
  }
  const strategyType = bot.config.strategy.type;
  const params = bot.config.strategy.parameters || {};
  switch (strategyType) {
    case 'rsi': {
      const sellRsiValue = trade.exit_rsi || trade.rsi_value || trade.indicator_value;
      if (sellRsiValue !== undefined && sellRsiValue !== null) {
        return `RSI = ${sellRsiValue.toFixed(2)} (Quá mua)`;
      }
      return `RSI > ${params.overbought || 70} (Quá mua)`;
    }
    case 'macd':
      return 'MACD cắt xuống Signal';
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt xuống MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return 'Giá chạm dải trên BB';
    case 'moving_average':
      return `Giá < MA${params.period || 20}`;
    default:
      return trade.exit_reason || trade.reason || trade.sell_signal || trade.signal || '-';
  }
}

function BotIndicatorChart({ botId }: { botId: string }) {
  const [indicatorData, setIndicatorData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchIndicatorData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/trading/bot/indicators?botId=${botId}`);
        if (response.ok) {
          const data = await response.json();
          setIndicatorData(data.indicators || []);
        }
      } catch (error) {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchIndicatorData();
  }, [botId]);
  if (loading) {
    return (
      <div className="border rounded bg-background p-4 mb-4" style={{height: 180}}>
        <div className="flex items-center justify-center h-full text-muted-foreground">Đang tải dữ liệu indicator...</div>
      </div>
    );
  }
  if (indicatorData.length === 0) {
    return (
      <div className="border rounded bg-background p-4 mb-4" style={{height: 180}}>
        <div className="flex items-center justify-center h-full text-muted-foreground">Chưa có dữ liệu indicator</div>
      </div>
    );
  }
  return (
    <div className="border rounded bg-background p-4 mb-4" style={{height: 180}}>
      <div className="font-semibold mb-2">Chỉ số kỹ thuật</div>
      <div className="h-[120px]">
        <PriceChart 
          symbol="Indicator" 
          timeframe="1h" 
          data={indicatorData.map(item => ({ timestamp: item.timestamp, open: item.value, high: item.value, low: item.value, close: item.value }))}
        />
      </div>
    </div>
  );
}

function BacktestConfigDetails({ backtest }: { backtest: any }) {
  if (!backtest?.config) return null;

  const cfg = backtest.config || {};

  const get = (obj: any, paths: string[]): any => {
    for (const p of paths) {
      const parts = p.split('.');
      let cur = obj;
      let ok = true;
      for (const key of parts) {
        if (cur && typeof cur === 'object' && key in cur) {
          cur = cur[key];
        } else { ok = false; break; }
      }
      if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
    }
    return undefined;
  };

  const symbol = get(cfg, ['symbol', 'pair', 'ticker', 'market', 'asset', 'dataset.symbol', 'data.symbol', 'exchange.symbol', 'trading.symbol']) || 'N/A';
  const timeframe = get(cfg, ['timeframe', 'interval', 'tf', 'candle', 'dataset.timeframe', 'data.timeframe', 'trading.timeframe']) || 'N/A';
  const startDate = get(cfg, ['start_date', 'startDate', 'start', 'from', 'date_range.start', 'range.start', 'trading.startDate']) || 'N/A';
  const endDate = get(cfg, ['end_date', 'endDate', 'end', 'to', 'date_range.end', 'range.end', 'trading.endDate']) || 'N/A';
  const initialCapital = get(cfg, ['initial_capital', 'initialCapital', 'initial_balance', 'capital', 'balance', 'portfolio.initial_capital', 'trading.initialCapital']) || 'N/A';

  return (
    <div className="p-4 border rounded-md bg-muted/50">
      <h4 className="font-semibold text-foreground mb-3">Cấu hình Backtest</h4>
      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">Symbol:</span> {symbol}</div>
        <div><span className="text-muted-foreground">Timeframe:</span> {timeframe}</div>
        <div><span className="text-muted-foreground">Start Date:</span> {startDate}</div>
        <div><span className="text-muted-foreground">End Date:</span> {endDate}</div>
        <div><span className="text-muted-foreground">Initial Capital:</span> {initialCapital}</div>
      </div>
      {/* Hiển thị thêm các mục chi tiết nếu có */}
      {cfg?.strategy && (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1">Chiến lược</div>
          <div className="mb-1"><span className="text-muted-foreground">Type:</span> {cfg.strategy.type || 'N/A'}</div>
          {cfg.strategy.parameters && (
            <div className="p-2 border rounded bg-muted/50 overflow-auto">
              <pre className="text-xs">{JSON.stringify(cfg.strategy.parameters, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
      {cfg?.trading && (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1">Thiết lập giao dịch</div>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="text-muted-foreground">Position Size:</span> {cfg.trading.positionSize ?? 'N/A'}</div>
            <div><span className="text-muted-foreground">Start Time:</span> {cfg.trading.startTime ?? 'N/A'}</div>
            <div><span className="text-muted-foreground">End Time:</span> {cfg.trading.endTime ?? 'N/A'}</div>
          </div>
        </div>
      )}
      {cfg?.riskManagement && (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1">Quản trị rủi ro</div>
          <div className="p-2 border rounded bg-muted/50 overflow-auto">
            <pre className="text-xs">{JSON.stringify(cfg.riskManagement, null, 2)}</pre>
          </div>
        </div>
      )}
      {cfg?.transaction_costs && (
        <div className="mt-3 text-sm">
          <div className="font-medium mb-1">Chi phí giao dịch</div>
          <div className="p-2 border rounded bg-muted/50 overflow-auto">
            <pre className="text-xs">{JSON.stringify(cfg.transaction_costs, null, 2)}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function BacktestResultsDetails({ backtest }: { backtest: any }) {
  if (!backtest?.results) return null;
  const res = backtest.results || {};
  const get = (obj: any, paths: string[]) => {
    for (const p of paths) {
      const parts = p.split('.');
      let cur = obj; let ok = true;
      for (const k of parts) { if (cur && typeof cur === 'object' && k in cur) cur = cur[k]; else { ok = false; break; } }
      if (ok && cur !== undefined && cur !== null && cur !== '') return cur;
    }
    return undefined;
  };
  const totalReturn = get(res, ['total_return', 'totalReturn', 'total_profit_percent', 'return', 'roi', 'performance.total_return']) ?? 'N/A';
  const sharpe = get(res, ['sharpe_ratio', 'sharpe', 'risk.sharpe']) ?? 'N/A';
  const maxDD = get(res, ['max_drawdown', 'maxDrawdown', 'mdd', 'risk.max_drawdown']) ?? 'N/A';
  const winRate = get(res, ['win_rate', 'winRate', 'accuracy', 'winrate', 'trading.win_rate']) ?? 'N/A';
  return (
    <div className="p-4 border rounded-md bg-muted/50">
      <h4 className="font-semibold text-foreground mb-3">Kết quả Backtest</h4>
      <div className="space-y-1 text-sm">
        <div><span className="text-muted-foreground">Total Return:</span> {totalReturn}</div>
        <div><span className="text-muted-foreground">Sharpe Ratio:</span> {sharpe}</div>
        <div><span className="text-muted-foreground">Max Drawdown:</span> {maxDD}</div>
        <div><span className="text-muted-foreground">Win Rate:</span> {winRate}</div>
      </div>
    </div>
  );
}

export function TradingBotDetailModal({ open, onOpenChange, bot, onToggleBot }: TradingBotDetailModalProps) {
  const { toast } = useToast();
  const [botTrades, setBotTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [assetData, setAssetData] = useState<any[]>([]);
  const [totalAsset, setTotalAsset] = useState(0);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);
  const [experimentConfig, setExperimentConfig] = useState<any>({});
  const [experimentResults, setExperimentResults] = useState<any>({});

  useEffect(() => {
    if (!open || !bot) return;
    const run = async () => {
      try {
        const r1 = await fetch(`/api/trading/bot/assets?botId=${bot.id}`);
        if (r1.ok) {
          const d = await r1.json();
          setAssetData(d.assets || []);
          setTotalAsset(d.totalAsset || 0);
        }
      } catch {}
      setTradesLoading(true);
      try {
        const r2 = await fetch(`/api/trading/bot/logs?botId=${bot.id}`);
        if (r2.ok) {
          const d = await r2.json();
          setBotTrades(d.trades || []);
        }
      } catch {}
      setTradesLoading(false);

      // Fetch config/results trực tiếp từ research_experiments nếu có id liên kết (experiment/backtest)
      try {
        const backtestId =
          (bot as any).experiment_id ||
          (bot as any).backtest_id ||
          (bot as any).backtestId ||
          (bot as any).config?.experiment_id ||
          (bot as any).config?.experimentId ||
          (bot as any).config?.backtestId ||
          (bot as any).config?.backtest_id;
        if (backtestId) {
          const r3 = await fetch(`/api/research/experiments?id=${backtestId}`);
          if (r3.ok) {
            const json = await r3.json();
            const exp = json.experiment || {};
            if (exp?.config) setExperimentConfig(exp.config);
            if (exp?.results) setExperimentResults(exp.results);
          }
        }
      } catch {}
    };
    run();
  }, [open, bot]);

  if (!bot) return null;

  // Chuẩn hóa dữ liệu backtest từ nhiều schema khác nhau
  const normalizeBacktest = (b: any) => {
    try {
      const raw = typeof b?.config === 'string' ? JSON.parse(b.config) : (b?.config ?? {});
      // Trường hợp chuẩn đã dùng: { config, results }
      if (raw?.config || raw?.results) {
        return { config: raw.config ?? {}, results: raw.results ?? {} };
      }
      // Trường hợp gói trong backtest
      if (raw?.backtest) {
        return { config: raw.backtest.config ?? {}, results: raw.backtest.results ?? {} };
      }
      // Trường hợp tách fields
      if (raw?.backtest_config || raw?.backtest_results) {
        return { config: raw.backtest_config ?? {}, results: raw.backtest_results ?? {} };
      }
      // Một số bot lưu trực tiếp cấu hình/ketqua ở level cao
      if (raw?.symbol || raw?.timeframe || raw?.start_date || raw?.end_date || raw?.initial_capital) {
        return { config: raw, results: {} };
      }
      // Fallback: nếu chính bot có fields dạng research_experiments
      if (b?.config?.config || b?.config?.results) {
        return { config: b.config.config ?? {}, results: b.config.results ?? {} };
      }
    } catch {}
    return { config: {}, results: {} };
  };
  const backtestData = normalizeBacktest(bot);
  const mergedConfig = Object.keys(experimentConfig || {}).length > 0 ? experimentConfig : (
    Object.keys(backtestData.config || {}).length > 0 ? backtestData.config : (
      // Fallback: cấu hình lưu trong bot.config
      (bot as any).config?.config || (bot as any).config || {}
    )
  );
  const mergedResults = Object.keys(experimentResults || {}).length > 0 ? experimentResults : (
    Object.keys(backtestData.results || {}).length > 0 ? backtestData.results : {
      total_return: (bot as any).total_profit,
      win_rate: (bot as any).win_rate,
      // max_drawdown, sharpe có thể không có ở trading_bots → để N/A nếu thiếu
    }
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[1100px] h-[95vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Chi tiết Trading Bot</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 h-full overflow-y-auto">
          <div className="flex-1 flex flex-col">
            <Tabs defaultValue="performance" className="w-full flex-1 flex flex-col">
              <TabsList className="mb-4">
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="info">Thông tin chung</TabsTrigger>
                <TabsTrigger value="debug">Debug</TabsTrigger>
              </TabsList>
              <TabsContent value="performance">
                <div className="border rounded bg-background p-4 mb-4" style={{height: 180}}>
                  <div className="font-semibold mb-2 flex items-center gap-2">
                    Tổng tài sản BTC+USDT
                    <span className="text-primary font-bold text-base">{totalAsset.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                  </div>
                  <div className="h-[120px]">
                    <PriceChart symbol="Tổng tài sản" timeframe="1h" data={assetData.map(item => ({ timestamp: item.timestamp, open: item.value, high: item.value, low: item.value, close: item.value }))} />
                  </div>
                </div>

                <BotIndicatorChart botId={bot.id} />

                <div className="grid grid-cols-3 gap-4 max-w-lg mb-4">
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Tổng giao dịch</div>
                    <div className="text-2xl font-semibold">{bot.total_trades}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Tỷ lệ thắng</div>
                    <div className="text-2xl font-semibold">{safeToFixed(bot.win_rate, 1)}%</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Tổng lợi nhuận</div>
                    <div className={`text-2xl font-semibold ${Number(bot.total_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{safeToFixed(bot.total_profit, 2)} USDT</div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">Danh sách giao dịch</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        setTradesLoading(true);
                        try {
                          const response = await fetch(`/api/trading/bot/logs?botId=${bot.id}`);
                          if (response.ok) {
                            const data = await response.json();
                            setBotTrades(data.trades || []);
                          }
                        } catch (error) {
                          // ignore
                        } finally {
                          setTradesLoading(false);
                        }
                      }}
                      disabled={tradesLoading}
                    >
                      {tradesLoading ? 'Đang tải...' : 'Làm mới'}
                    </Button>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-xs border">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Thời gian</th>
                          <th className="p-2 text-center">Loại</th>
                          <th className="p-2 text-center">Trạng thái</th>
                          <th className="p-2 text-right">Giá</th>
                          <th className="p-2 text-center">Signal mua</th>
                          <th className="p-2 text-center">Signal bán</th>
                          <th className="p-2 text-right">Số lượng</th>
                          <th className="p-2 text-right">Lợi nhuận</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradesLoading ? (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">Đang tải...</td>
                          </tr>
                        ) : botTrades.length > 0 ? (
                          botTrades.map((trade: any, idx: number) => (
                            <tr key={trade.id || idx} className="border-b">
                              <td className="p-2">{new Date(trade.open_time).toLocaleString('vi-VN')}</td>
                              <td className="p-2 text-center capitalize">{trade.side}</td>
                              <td className="p-2 text-center">
                                <Badge variant={trade.status === 'closed' ? 'default' : 'secondary'} className="text-xs">
                                  {trade.status === 'closed' ? 'Đã đóng' : 'Đang mở'}
                                </Badge>
                              </td>
                              <td className="p-2 text-right">
                                {trade.status === 'closed' && trade.exit_price 
                                  ? `${trade.entry_price?.toLocaleString('en-US', { maximumFractionDigits: 2 })} → ${trade.exit_price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
                                  : trade.entry_price?.toLocaleString('en-US', { maximumFractionDigits: 2 })
                                }
                              </td>
                              <td className="p-2 text-center text-xs">{getBotBuySignalText(bot, trade)}</td>
                              <td className="p-2 text-center text-xs">{getBotSellSignalText(bot, trade)}</td>
                              <td className="p-2 text-right">{trade.quantity}</td>
                              <td className="p-2 text-right">
                                <span className={trade.pnl !== undefined && trade.pnl !== null ? (trade.pnl >= 0 ? 'text-green-600' : 'text-red-600') : 'text-gray-500'}>
                                  {trade.pnl !== undefined && trade.pnl !== null ? trade.pnl.toFixed(2) : '-'}
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={8} className="p-4 text-center text-muted-foreground">Chưa có giao dịch nào</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="info">
                <div className="space-y-4">
                  <div className="p-4 border rounded-md bg-muted/50">
                    <h4 className="font-semibold text-foreground mb-3">Thông tin chung về Bot</h4>
                    <div className="space-y-1 text-sm">
                      <div><span className="text-muted-foreground">Tên:</span> {bot.name}</div>
                      <div><span className="text-muted-foreground">Trạng thái:</span> <Badge variant={bot.status === 'running' ? 'default' : 'secondary'}>{bot.status}</Badge></div>
                      <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(bot.created_at).toLocaleString('vi-VN')}</div>
                      {bot.last_run_at && (
                        <div><span className="text-muted-foreground">Lần chạy cuối:</span> {new Date(bot.last_run_at).toLocaleString('vi-VN')}</div>
                      )}
                    </div>
                  </div>
                  {(
                    (mergedConfig && Object.keys(mergedConfig).length > 0) ||
                    (mergedResults && Object.keys(mergedResults).length > 0)
                  ) && (
                    <>
                      <BacktestConfigDetails backtest={{ config: mergedConfig }} />
                      <BacktestResultsDetails backtest={{ results: mergedResults }} />
                    </>
                  )}
                  <div className="p-4 border rounded-md bg-muted/50">
                    <h4 className="font-semibold text-foreground mb-3">Cấu hình Position Size</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="editPositionSize">Size giao dịch: {bot.config?.positionSize || 10}% số dư</Label>
                        <div className="space-y-2 mt-2">
                          <input
                            type="range"
                            id="editPositionSize"
                            min="1"
                            max="100"
                            value={bot.config?.positionSize || 10}
                            onChange={(e) => {
                              const newValue = parseInt(e.target.value);
                              // local update only for UI; save button will persist
                              (bot as any).config = { ...(bot as any).config, positionSize: newValue };
                            }}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                            style={{ background: `linear-gradient(to right, #3b82f6 0%, #3b82f6 ${bot.config?.positionSize || 10}%, #e5e7eb ${bot.config?.positionSize || 10}%, #e5e7eb 100%)` }}
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>1%</span>
                            <span>25%</span>
                            <span>50%</span>
                            <span>75%</span>
                            <span>100%</span>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Khi đặt 100%, bot sẽ sử dụng toàn bộ số dư USDT để mua hoặc toàn bộ số BTC để bán</p>
                        {(bot.config?.positionSize || 10) > 80 && (
                          <div className="p-2 border border-orange-200 bg-orange-50 rounded-md mt-2">
                            <p className="text-xs text-orange-800">⚠️ <strong>Cảnh báo:</strong> Position Size {bot.config?.positionSize}% rất cao và có thể gây rủi ro lớn!</p>
                          </div>
                        )}
                        <div className="p-2 border border-blue-200 bg-blue-50 rounded-md mt-2">
                          <p className="text-xs text-blue-800">💡 <strong>Smart Balance:</strong> Bot sử dụng thuật toán thông minh để tối đa hóa balance (99.9%) với safety buffer động cho fees, precision và network latency.</p>
                        </div>
                        <div className="p-2 border border-yellow-200 bg-yellow-50 rounded-md mt-2">
                          <p className="text-xs text-yellow-800">⚠️ <strong>Lưu ý:</strong> Binance yêu cầu giá trị giao dịch tối thiểu 10 USDT. Với Position Size nhỏ và balance thấp, bot có thể bỏ qua signal để tránh lỗi NOTIONAL.</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={async () => {
                          try {
                            const response = await fetch('/api/trading/bot/update-config', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ botId: bot.id, positionSize: bot.config?.positionSize || 10 })
                            });
                            if (response.ok) {
                              toast({ title: 'Thành công', description: 'Đã cập nhật position size' });
                            } else {
                              throw new Error('Failed to update position size');
                            }
                          } catch (error: any) {
                            toast({ title: 'Lỗi', description: 'Không thể cập nhật position size: ' + error.message, variant: 'destructive' });
                          }
                        }}
                      >
                        Lưu thay đổi
                      </Button>
                    </div>
                  </div>
                  <div className="p-3 border rounded bg-muted max-w-md">
                    <div className="font-medium mb-2">Thông tin API</div>
                    <div className="mb-1"><span className="text-muted-foreground">Trạng thái:</span> {bot.config?.account?.testnet ? 'Testnet' : 'Live'}</div>
                    <div className="mb-1">
                      <span className="text-muted-foreground">API Key:</span> <span className="font-mono">{showApiKey ? bot.config?.account?.apiKey : (bot.config?.account?.apiKey ? bot.config.account.apiKey.slice(0, 6) + '...' + bot.config.account.apiKey.slice(-4) : '')}</span>
                      <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiKey(v => !v)}>{showApiKey ? 'Ẩn' : 'Hiện'}</button>
                    </div>
                    <div className="mb-1">
                      <span className="text-muted-foreground">API Secret:</span> <span className="font-mono">{showApiSecret ? bot.config?.account?.apiSecret : (bot.config?.account?.apiSecret ? bot.config.account.apiSecret.slice(0, 6) + '...' + bot.config.account.apiSecret.slice(-4) : '')}</span>
                      <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiSecret(v => !v)}>{showApiSecret ? 'Ẩn' : 'Hiện'}</button>
                    </div>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="debug">
                <BotDebugPanel botId={bot.id} />
              </TabsContent>
            </Tabs>
          </div>
          <div className="flex gap-2 mt-4">
            {bot.status !== 'running' ? (
              <Button className="w-full" onClick={() => onToggleBot && onToggleBot(bot)}>
                <Play className="h-4 w-4 mr-2" />Start Bot
              </Button>
            ) : (
              <Button variant="destructive" className="w-full" onClick={() => onToggleBot && onToggleBot(bot)}>
                <Pause className="h-4 w-4 mr-2" />Stop Bot
              </Button>
            )}
            <Button variant="outline" className="w-full">
              <Terminal className="h-4 w-4 mr-2" />Xem logs
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default TradingBotDetailModal;


