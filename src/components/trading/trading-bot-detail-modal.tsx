"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Play, Pause, Terminal, ChevronDown, ChevronRight } from 'lucide-react';
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
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());

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

  // Tính toán lãi/lỗ tổng dựa trên lệnh buy/sell
  const totalBuyValue = botTrades.filter(t => t.side === 'buy').reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
  const totalSellValue = botTrades.filter(t => t.side === 'sell').reduce((sum, t) => sum + (t.quantity * t.entry_price), 0);
  const totalPnL = totalSellValue - totalBuyValue;

  // Tính toán Winrate - Logic đúng: gộp các giao dịch cùng side liên tiếp và ghép cặp buy-sell
  function calculateCorrectWinrate(trades: any[]) {
    if (!trades || trades.length === 0) {
      return { 
        winRate: 0, 
        totalPairs: 0, 
        winPairs: 0, 
        openTrades: 0,
        avgWinNet: 0,
        avgLossNet: 0,
        pairs: []
      };
    }

    // Sắp xếp trades theo thời gian
    const sortedTrades = [...trades].sort((a, b) => 
      new Date(a.open_time || a.created_at).getTime() - new Date(b.open_time || b.created_at).getTime()
    );

    // Gộp các giao dịch cùng side liên tiếp
    const groupedTrades = [];
    let currentGroup = null;

    for (const trade of sortedTrades) {
      if (!currentGroup || currentGroup.side !== trade.side) {
        // Bắt đầu nhóm mới
        if (currentGroup) {
          groupedTrades.push(currentGroup);
        }
        currentGroup = {
          side: trade.side,
          trades: [trade],
          totalQuantity: Number(trade.quantity || 0),
          totalValue: Number(trade.quantity || 0) * Number(trade.entry_price || 0),
          avgPrice: Number(trade.entry_price || 0),
          startTime: trade.open_time || trade.created_at,
          endTime: trade.open_time || trade.created_at,
          signals: [trade.entry_reason || trade.reason || trade.buy_signal || trade.sell_signal || trade.signal || '-']
        };
      } else {
        // Thêm vào nhóm hiện tại
        currentGroup.trades.push(trade);
        currentGroup.totalQuantity += Number(trade.quantity || 0);
        currentGroup.totalValue += Number(trade.quantity || 0) * Number(trade.entry_price || 0);
        currentGroup.avgPrice = currentGroup.totalValue / currentGroup.totalQuantity;
        currentGroup.endTime = trade.open_time || trade.created_at;
        currentGroup.signals.push(trade.entry_reason || trade.reason || trade.buy_signal || trade.sell_signal || trade.signal || '-');
      }
    }

    // Thêm nhóm cuối cùng
    if (currentGroup) {
      groupedTrades.push(currentGroup);
    }

    // Ghép cặp buy-sell
    const pairs = [];
    let lastBuyGroup = null;
    let openTrades = 0;

    for (const group of groupedTrades) {
      if (group.side === 'buy') {
        if (lastBuyGroup) {
          // Có buy group trước đó chưa được ghép cặp, tính là open trade
          openTrades++;
        }
        lastBuyGroup = group;
      } else if (group.side === 'sell' && lastBuyGroup) {
        // Ghép cặp buy-sell group thành công
        pairs.push({ 
          buy: lastBuyGroup, 
          sell: group,
          buyValue: lastBuyGroup.totalValue,
          sellValue: group.totalValue,
          pnl: group.totalValue - lastBuyGroup.totalValue
        });
        lastBuyGroup = null; // Reset để tìm cặp tiếp theo
      }
    }

    // Nếu còn buy group cuối cùng chưa được ghép cặp
    if (lastBuyGroup) {
      openTrades++;
    }

    // Tính số cặp thắng (P&L > 0) và tỷ lệ lãi/lỗ
    const pairsWithRatios = pairs.map(pair => ({
      ...pair,
      profitRatio: pair.buyValue > 0 ? (pair.pnl / pair.buyValue) * 100 : 0
    }));

    const winPairs = pairsWithRatios.filter(pair => pair.pnl > 0);
    const lossPairs = pairsWithRatios.filter(pair => pair.pnl < 0);
    
    const winRate = pairs.length > 0 ? (winPairs.length / pairs.length) * 100 : 0;
    
    // Tính tổng giá trị buy và sell của các cặp thắng
    const totalWinBuyValue = winPairs.reduce((sum, pair) => sum + (pair.buyValue || 0), 0);
    const totalWinSellValue = winPairs.reduce((sum, pair) => sum + (pair.sellValue || 0), 0);
    
    // Tính tổng giá trị buy và sell của các cặp thua
    const totalLossBuyValue = lossPairs.reduce((sum, pair) => sum + (pair.buyValue || 0), 0);
    const totalLossSellValue = lossPairs.reduce((sum, pair) => sum + (pair.sellValue || 0), 0);
    
    // Debug: Log để kiểm tra
    console.log('Debug Avg Win/Loss:', {
      winPairs: winPairs.length,
      lossPairs: lossPairs.length,
      totalWinBuyValue,
      totalWinSellValue,
      totalLossBuyValue,
      totalLossSellValue,
      winProfit: totalWinSellValue - totalWinBuyValue,
      lossLoss: totalLossBuyValue - totalLossSellValue
    });
    
    // Avg Win Net = (Tổng sell - Tổng buy) của các giao dịch thắng / Tổng buy của các giao dịch thắng
    const avgWinNet = totalWinBuyValue > 0 
      ? ((totalWinSellValue - totalWinBuyValue) / totalWinBuyValue) * 100 
      : 0;
    
    // Avg Loss Net = (Tổng buy - Tổng sell) của các giao dịch thua / Tổng buy của các giao dịch thua
    const avgLossNet = totalLossBuyValue > 0 
      ? ((totalLossBuyValue - totalLossSellValue) / totalLossBuyValue) * 100 
      : 0;

    return { 
      winRate, 
      totalPairs: pairs.length, 
      winPairs: winPairs.length,
      openTrades,
      avgWinNet,
      avgLossNet,
      pairs: pairsWithRatios
    };
  }

  const winrateResult = calculateCorrectWinrate(botTrades);

  const toggleRowExpansion = (index: number) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

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
                {/* Thống kê hiệu suất tổng quan - tất cả trong 1 hàng */}
                <div className="grid grid-cols-5 gap-4 mb-4">
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Tổng giao dịch</div>
                    <div className="text-lg font-semibold">{bot.total_trades}</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Lãi/Lỗ tổng</div>
                    <div className={`text-lg font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totalPnL.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">Winrate</div>
                    <div className="text-lg font-semibold">
                      {winrateResult.winRate.toFixed(2)}% ({winrateResult.winPairs}/{winrateResult.totalPairs} cặp thắng)
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">% Avg Win Net</div>
                    <div className="text-lg font-semibold text-green-600">
                      {(winrateResult.avgWinNet || 0).toFixed(2)}%
                    </div>
                  </div>
                  <div className="p-3 border rounded">
                    <div className="text-muted-foreground text-sm">% Avg Loss Net</div>
                    <div className="text-lg font-semibold text-red-600">
                      {(winrateResult.avgLossNet || 0).toFixed(2)}%
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="flex justify-between items-center mb-2">
                    <div className="font-semibold">Danh sách giao dịch hoàn thành</div>
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
                          <th className="p-2 text-center w-8"></th>
                          <th className="p-2 text-left">Thời gian mua</th>
                          <th className="p-2 text-left">Thời gian bán</th>
                          <th className="p-2 text-right">Giá mua</th>
                          <th className="p-2 text-right">Giá bán</th>
                          <th className="p-2 text-center">Signal mua</th>
                          <th className="p-2 text-center">Signal bán</th>
                          <th className="p-2 text-right">Lợi nhuận</th>
                          <th className="p-2 text-center">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tradesLoading ? (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-muted-foreground">Đang tải...</td>
                          </tr>
                        ) : winrateResult.pairs.length > 0 ? (
                          winrateResult.pairs.map((pair: any, idx: number) => {
                            // Sử dụng dữ liệu từ grouped trades
                            const buyGroup = pair.buy;
                            const sellGroup = pair.sell;
                            const pnl = pair.pnl;
                            const profitRatio = pair.profitRatio;
                            const isExpanded = expandedRows.has(idx);
                            
                            return (
                              <React.Fragment key={idx}>
                                <tr className="border-b hover:bg-muted/50">
                                  <td className="p-2 text-center">
                                    <button
                                      onClick={() => toggleRowExpansion(idx)}
                                      className="p-1 hover:bg-muted rounded"
                                    >
                                      {isExpanded ? (
                                        <ChevronDown className="h-4 w-4" />
                                      ) : (
                                        <ChevronRight className="h-4 w-4" />
                                      )}
                                    </button>
                                  </td>
                                  <td className="p-2">
                                    <div>{new Date(buyGroup.startTime).toLocaleString('vi-VN')}</div>
                                    {buyGroup.trades.length > 1 && (
                                      <div className="text-xs text-muted-foreground">
                                        ({buyGroup.trades.length} lệnh)
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2">
                                    <div>{new Date(sellGroup.startTime).toLocaleString('vi-VN')}</div>
                                    {sellGroup.trades.length > 1 && (
                                      <div className="text-xs text-muted-foreground">
                                        ({sellGroup.trades.length} lệnh)
                                      </div>
                                    )}
                                  </td>
                                  <td className="p-2 text-right">
                                    <div>{buyGroup.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-muted-foreground">(TB)</div>
                                  </td>
                                  <td className="p-2 text-right">
                                    <div>{sellGroup.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                                    <div className="text-xs text-muted-foreground">(TB)</div>
                                  </td>
                                  <td className="p-2 text-center text-xs">
                                    {buyGroup.signals.length > 1 ? `${buyGroup.signals.length} signals` : buyGroup.signals[0]}
                                  </td>
                                  <td className="p-2 text-center text-xs">
                                    {sellGroup.signals.length > 1 ? `${sellGroup.signals.length} signals` : sellGroup.signals[0]}
                                  </td>
                                  <td className="p-2 text-right">
                                    <span className={pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                                      {pnl.toFixed(2)} USDT
                                    </span>
                                    <div className="text-xs text-muted-foreground">
                                      ({profitRatio.toFixed(2)}%)
                                    </div>
                                  </td>
                                  <td className="p-2 text-center">
                                    <Badge variant="default" className="text-xs">
                                      Hoàn thành
                                    </Badge>
                                  </td>
                                </tr>
                                {isExpanded && (
                                  <tr className="border-b bg-muted/30">
                                    <td colSpan={9} className="p-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Chi tiết giao dịch mua */}
                                        <div className="space-y-3">
                                          <h4 className="font-semibold text-green-600 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                            Chi tiết giao dịch MUA ({buyGroup.trades.length} lệnh)
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Thời gian bắt đầu:</span>
                                              <span>{new Date(buyGroup.startTime).toLocaleString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Thời gian kết thúc:</span>
                                              <span>{new Date(buyGroup.endTime).toLocaleString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Giá trung bình:</span>
                                              <span className="font-mono">{buyGroup.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Tổng khối lượng:</span>
                                              <span className="font-mono">{buyGroup.totalQuantity.toFixed(8)} BTC</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Tổng giá trị:</span>
                                              <span className="font-mono">{buyGroup.totalValue.toFixed(2)} USDT</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Signals:</span>
                                              <span className="text-xs">{buyGroup.signals.join(', ')}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Chi tiết từng lệnh mua */}
                                          {buyGroup.trades.length > 1 && (
                                            <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded">
                                              <div className="text-xs font-medium text-green-800 mb-2">Chi tiết từng lệnh:</div>
                                              {buyGroup.trades.map((trade: any, tradeIdx: number) => (
                                                <div key={tradeIdx} className="text-xs text-green-700 mb-1">
                                                  {new Date(trade.open_time || trade.created_at).toLocaleString('vi-VN')} - 
                                                  {Number(trade.quantity).toFixed(8)} BTC @ {Number(trade.entry_price).toFixed(2)} USDT
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        
                                        {/* Chi tiết giao dịch bán */}
                                        <div className="space-y-3">
                                          <h4 className="font-semibold text-red-600 flex items-center gap-2">
                                            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                            Chi tiết giao dịch BÁN ({sellGroup.trades.length} lệnh)
                                          </h4>
                                          <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Thời gian bắt đầu:</span>
                                              <span>{new Date(sellGroup.startTime).toLocaleString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Thời gian kết thúc:</span>
                                              <span>{new Date(sellGroup.endTime).toLocaleString('vi-VN')}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Giá trung bình:</span>
                                              <span className="font-mono">{sellGroup.avgPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Tổng khối lượng:</span>
                                              <span className="font-mono">{sellGroup.totalQuantity.toFixed(8)} BTC</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Tổng giá trị:</span>
                                              <span className="font-mono">{sellGroup.totalValue.toFixed(2)} USDT</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-muted-foreground">Signals:</span>
                                              <span className="text-xs">{sellGroup.signals.join(', ')}</span>
                                            </div>
                                          </div>
                                          
                                          {/* Chi tiết từng lệnh bán */}
                                          {sellGroup.trades.length > 1 && (
                                            <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
                                              <div className="text-xs font-medium text-red-800 mb-2">Chi tiết từng lệnh:</div>
                                              {sellGroup.trades.map((trade: any, tradeIdx: number) => (
                                                <div key={tradeIdx} className="text-xs text-red-700 mb-1">
                                                  {new Date(trade.open_time || trade.created_at).toLocaleString('vi-VN')} - 
                                                  {Number(trade.quantity).toFixed(8)} BTC @ {Number(trade.entry_price).toFixed(2)} USDT
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                      
                                      {/* Tóm tắt lợi nhuận */}
                                      <div className="mt-4 p-3 bg-background border rounded-lg">
                                        <h5 className="font-semibold mb-2">Tóm tắt lợi nhuận</h5>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                          <div className="text-center">
                                            <div className="text-muted-foreground">Lợi nhuận tuyệt đối</div>
                                            <div className={`font-semibold ${pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {pnl.toFixed(2)} USDT
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-muted-foreground">Tỷ lệ lợi nhuận</div>
                                            <div className={`font-semibold ${profitRatio >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                              {profitRatio.toFixed(2)}%
                                            </div>
                                          </div>
                                          <div className="text-center">
                                            <div className="text-muted-foreground">Thời gian nắm giữ</div>
                                            <div className="font-semibold">
                                              {Math.round((new Date(sellGroup.startTime).getTime() - new Date(buyGroup.startTime).getTime()) / (1000 * 60 * 60))} giờ
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={9} className="p-4 text-center text-muted-foreground">Chưa có giao dịch hoàn thành nào</td>
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
                          <p className="text-xs text-blue-800">💡 <strong>Smart Balance:</strong> Bot sử dụng thuật toán thông minh để tối đa hóa balance (100%) với safety buffer động cho fees, precision và network latency.</p>
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



