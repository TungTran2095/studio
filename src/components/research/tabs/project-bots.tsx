import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Plus, Terminal, Eye, AlertTriangle, TrendingUp } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { 
  createTradingBot, 
  fetchTradingBots, 
  updateTradingBotStatus, 
  deleteTradingBot,
  TradingBot 
} from '@/lib/trading/trading-bot';
import { BotExecutor } from '@/lib/trading/bot-executor';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { TradingViewWidget } from '@/components/chart/tradingview-widget';
import { PriceChart } from '@/components/research/price-chart';
import { supabase } from '@/lib/supabase-client';

// Helper functions để tạo text signal cho bot
function getBotBuySignalText(bot: any, trade: any): string {
  if (!bot?.config?.strategy?.type) {
    return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }

  const strategyType = bot.config.strategy.type;
  const params = bot.config.strategy.parameters || {};

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm mua
      const buyRsiValue = trade.entry_rsi || trade.rsi_value || trade.indicator_value;
      if (buyRsiValue !== undefined && buyRsiValue !== null) {
        return `RSI = ${buyRsiValue.toFixed(2)} (Quá bán)`;
      }
      return `RSI < ${params.oversold || 30} (Quá bán)`;
    case 'macd':
      return `MACD cắt lên Signal`;
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt lên MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải dưới BB`;
    case 'moving_average':
      return `Giá > MA${params.period || 20}`;
    case 'momentum':
      return `Momentum tăng > 2%`;
    case 'mean_reversion':
      return `Giá < SMA${params.period || 20} - 3%`;
    default:
      return trade.entry_reason || trade.reason || trade.buy_signal || trade.signal || '-';
  }
}

function getBotSellSignalText(bot: any, trade: any): string {
  // Ưu tiên hiển thị exit_reason từ backend nếu có
  if (trade.exit_reason) {
    switch (trade.exit_reason) {
      case 'stoploss':
        return 'Stoploss';
      case 'take_profit':
        return 'Take Profit';
      case 'signal':
        // Nếu là signal, hiển thị theo strategy type
        break;
      default:
        return trade.exit_reason;
    }
  }

  if (!bot?.config?.strategy?.type) {
    return trade.sell_signal || '-';
  }

  const strategyType = bot.config.strategy.type;
  const params = bot.config.strategy.parameters || {};

  switch (strategyType) {
    case 'rsi':
      // Lấy giá trị RSI thực tế tại thời điểm bán
      const sellRsiValue = trade.exit_rsi || trade.rsi_value || trade.indicator_value;
      if (sellRsiValue !== undefined && sellRsiValue !== null) {
        return `RSI = ${sellRsiValue.toFixed(2)} (Quá mua)`;
      }
      return `RSI > ${params.overbought || 70} (Quá mua)`;
    case 'macd':
      return `MACD cắt xuống Signal`;
    case 'ma_crossover':
      return `MA${params.fastPeriod || 10} cắt xuống MA${params.slowPeriod || 20}`;
    case 'bollinger_bands':
      return `Giá chạm dải trên BB`;
    case 'moving_average':
      return `Giá < MA${params.period || 20}`;
    case 'momentum':
      return `Momentum giảm > 1%`;
    case 'mean_reversion':
      return `Giá > SMA${params.period || 20}`;
    default:
      return trade.sell_signal || '-';
  }
}

import {
  LineChart as RechartsLineChart,
  Line as RechartsLine,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ResponsiveContainer as RechartsResponsiveContainer
} from 'recharts';
import { BotDebugPanel } from './bot-debug-panel';

const createBotSchema = z.object({
  name: z.string().min(1, 'Tên bot là bắt buộc'),
  description: z.string().optional(),
  experimentId: z.string().min(1, 'Vui lòng chọn backtest'),
  apiKey: z.string().min(1, 'API key là bắt buộc'),
  apiSecret: z.string().min(1, 'API secret là bắt buộc')
});

interface ProjectBotsTabProps {
  projectId: string;
  backtests: any[];
}

function safeToFixed(val: any, digits = 2) {
  const num = Number(val);
  return isFinite(num) ? num.toFixed(digits) : '0.00';
}

function BacktestConfigDetails({ backtest }: { backtest: any }) {
  if (!backtest || !backtest.config) {
    return null;
  }

  const formatValue = (key: string, value: any): string => {
    if (typeof value === 'number') {
      if (key.toLowerCase().includes('size') ||
          key.toLowerCase().includes('profit') ||
          key.toLowerCase().includes('loss') ||
          key.toLowerCase().includes('drawdown')) {
        return `${value}%`;
      }
      return value.toString();
    }
    if (typeof value === 'boolean') {
      return value ? 'Có' : 'Không';
    }
    return String(value);
  };

  const renderConfigSection = (title: string, data: any) => {
    if (!data || Object.keys(data).length === 0) return null;
    
    return (
      <div>
        <p className="text-muted-foreground font-medium mb-2 text-xs">{title}</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs pl-2">
          {Object.entries(data).map(([key, value]: [string, any]) => (
            <div key={key} className="flex justify-between items-baseline py-0.5">
              <span className="text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').toLowerCase()}:</span>
              <span className="font-mono">{formatValue(key, value)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const config = backtest.config || {};
  const { trading, strategy, riskManagement } = config;

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/50 animate-in fade-in-0">
      <h4 className="font-semibold text-foreground mb-3">Cấu hình Backtest</h4>
      <div className="space-y-3">
        {renderConfigSection('Thông số giao dịch', trading)}
        {renderConfigSection('Thông số chiến lược', strategy?.parameters || strategy?.params)}
        {renderConfigSection('Quản lý rủi ro', riskManagement)}
      </div>
    </div>
  );
}

function BacktestResultsDetails({ backtest }: { backtest: any }) {
  if (!backtest || !backtest.results) {
    return null;
  }
  const results = backtest.results;

  const renderMetricPair = (label1: string, value1: any, unit1: string, label2: string, value2: any, unit2: string) => {
    const renderMetric = (label: string, value: any, unit: string) => {
      if (value === undefined || value === null) {
        return <div />; // Return an empty div to maintain grid structure
      }
      
      let colorClass = '';
      if (['Total Return', 'Win Rate', 'Winning Trades', 'Average Win'].includes(label) && Number(value) > 0) {
        colorClass = 'text-green-600';
      } else if (['Max Drawdown', 'Losing Trades'].includes(label) && Number(value) > 0) {
        colorClass = 'text-red-600';
      } else if (label === 'Average Loss' && Number(value) < 0) {
        colorClass = 'text-red-600';
      }

      return (
        <div className="flex justify-between items-baseline text-xs">
          <span className="text-muted-foreground">{label}:</span>
          <span className={`font-mono ${colorClass}`}>
            {typeof value === 'number' ? safeToFixed(value, 2) : String(value)}{unit}
          </span>
        </div>
      );
    };

    return (
      <div className="grid grid-cols-2 gap-x-4">
        {renderMetric(label1, value1, unit1)}
        {renderMetric(label2, value2, unit2)}
      </div>
    );
  };

  return (
    <div className="mt-4 p-4 border rounded-md bg-muted/50 animate-in fade-in-0">
      <h4 className="font-semibold text-foreground mb-3">Kết quả Backtest</h4>
      <div className="space-y-3">
        <div>
          <div className="text-muted-foreground font-medium text-xs mb-2">Hiệu suất tổng thể</div>
          {renderMetricPair(
            'Total Return', results?.total_return, '%',
            'Final Capital', results?.final_capital, ' USDT'
          )}
          {renderMetricPair(
            'Sharpe Ratio', results?.sharpe_ratio, '',
            'Max Drawdown', results?.max_drawdown, '%'
          )}
        </div>

        <div>
          <div className="text-muted-foreground font-medium text-xs mb-2">Thống kê giao dịch</div>
          {renderMetricPair(
            'Total Trades', results?.total_trades, '',
            'Win Rate', results?.win_rate, '%'
          )}
          {renderMetricPair(
            'Winning Trades', results?.winning_trades, '',
            'Losing Trades', results?.losing_trades, ''
          )}
        </div>

        <div>
          <div className="text-muted-foreground font-medium text-xs mb-2">Phân tích lợi nhuận</div>
          {renderMetricPair(
            'Average Win', results?.average_win, ' USDT',
            'Average Loss', results?.average_loss, ' USDT'
          )}
        </div>
      </div>
    </div>
  );
}

async function fetchBinanceAccounts() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('binance_account')
    .select('*');
  if (error) {
    console.error('Lỗi khi lấy danh sách tài khoản Binance:', error);
    return [];
  }
  return (data || []).map((item: any) => ({
    id: item.id || item.Name || `acc-${Math.random()}`,
    name: item.Name || 'Binance',
    apiKey: item.config?.apiKey,
    apiSecret: item.config?.apiSecret,
    testnet: item.config?.isTestnet ?? false,
  }));
}

function parseIntervalToMs(interval: string) {
  if (!interval) return 60000;
  const match = interval.match(/^([0-9]+)([mhdw])$/i);
  if (!match) return 60000;
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  switch (unit) {
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    case 'w': return value * 7 * 24 * 60 * 60 * 1000;
    default: return 60000;
  }
}

function BotIndicatorChart({ botId }: { botId: string }) {
  const [indicatorData, setIndicatorData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<string>('1m');
  const [triggers, setTriggers] = useState<{overbought?: number, oversold?: number}>({});

  // useEffect 1: fetch lần đầu khi botId đổi, lấy indicatorData và timeframe
  useEffect(() => {
    let stopped = false;
    setLoading(true);
    fetch(`/api/trading/bot/indicator-history?botId=${botId}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!stopped && data) {
          setIndicatorData(data);
          setTimeframe(data.timeframe || '1m');
          if (data.indicatorName === 'RSI') {
            setTriggers({
              overbought: data.triggerValue,
              oversold: data.oversold || 30
            });
          } else {
            setTriggers({ overbought: data.triggerValue });
          }
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => { stopped = true; };
  }, [botId]);

  // useEffect 2: khi đã có timeframe, setup interval fetch đúng ms
  useEffect(() => {
    if (!timeframe) return;
    let intervalId: any;
    let stopped = false;
    const ms = parseIntervalToMs(timeframe);
    intervalId = setInterval(() => {
      if (stopped) return;
      fetch(`/api/trading/bot/indicator-history?botId=${botId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (!stopped && data) {
            setIndicatorData(data);
            if (data.indicatorName === 'RSI') {
              setTriggers({
                overbought: data.triggerValue,
                oversold: data.oversold || 30
              });
            } else {
              setTriggers({ overbought: data.triggerValue });
            }
          }
        });
    }, ms);
    return () => {
      stopped = true;
      if (intervalId) clearInterval(intervalId);
    };
  }, [botId, timeframe]);

  if (loading && !indicatorData) return <div className="text-xs text-muted-foreground">Đang tải chỉ số...</div>;
  if (!indicatorData) return <div className="text-xs text-muted-foreground">Không có dữ liệu chỉ số</div>;

  // Lấy điểm cuối cùng
  const last = indicatorData.history.length > 0 ? indicatorData.history[indicatorData.history.length-1] : null;
  const formattedTime = last ? new Date(Number(last.time)).toLocaleString('vi-VN', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit'
  }) : '';

  // Xác định rule trục X theo timeframe
  let xTickFormatter = (t: any) => new Date(Number(t)).toLocaleTimeString('vi-VN');
  if (indicatorData && indicatorData.history.length > 1) {
    const t0 = Number(indicatorData.history[0].time);
    const t1 = Number(indicatorData.history[1].time);
    const diff = t1 - t0;
    if (diff >= 3600000) {
      xTickFormatter = (t: any) => new Date(Number(t)).toLocaleDateString('vi-VN');
    } else {
      xTickFormatter = (t: any) => new Date(Number(t)).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    }
  }

  // Chuẩn bị data cho chart với các trigger
  const chartData = indicatorData.history.map((d: any) => ({
    ...d,
    trigger: triggers.overbought,
    triggerLow: triggers.oversold
  }));

  return (
    <div className="my-2">
      <div className="mb-1 text-xs">
        {last && <div>{formattedTime}</div>}
        <b>Chỉ số {indicatorData.indicatorName} :</b> <span style={{color: 'blue'}}>{last ? last.value : 'N/A'}</span>
        <br/>
        {indicatorData.indicatorName === 'RSI' && (
          <>
            <b>Trigger trên (Overbought):</b> <span style={{color: 'red'}}>{triggers.overbought}</span>
            <br/>
            <b>Trigger dưới (Oversold):</b> <span style={{color: 'green'}}>{triggers.oversold}</span>
          </>
        )}
        {indicatorData.indicatorName !== 'RSI' && (
          <>
            <b>Trigger :</b> <span style={{color: 'red'}}>{indicatorData.triggerValue}</span>
          </>
        )}
      </div>
      <div style={{ width: '100%', height: 220 }}>
        <RechartsResponsiveContainer width="100%" height={220}>
          <RechartsLineChart data={chartData}>
            <RechartsXAxis dataKey="time" tickFormatter={xTickFormatter} />
            <RechartsYAxis hide />
            <RechartsTooltip labelFormatter={t => new Date(Number(t)).toLocaleString('vi-VN')} />
            <RechartsLegend />
            <RechartsLine type="monotone" dataKey="value" stroke="#8884d8" name={`Chỉ số ${indicatorData.indicatorName}`} dot={false} isAnimationActive={false} />
            <RechartsLine type="monotone" dataKey="trigger" stroke="#ff0000" name="Trigger trên" dot={false} isAnimationActive={false} />
            {indicatorData.indicatorName === 'RSI' && (
              <RechartsLine type="monotone" dataKey="triggerLow" stroke="#00b300" name="Trigger dưới" dot={false} isAnimationActive={false} />
            )}
          </RechartsLineChart>
        </RechartsResponsiveContainer>
      </div>
    </div>
  );
}

export function ProjectBotsTab({ projectId, backtests }: ProjectBotsTabProps) {
  const { toast } = useToast();
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
  const [selectedBacktest, setSelectedBacktest] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: '',
    backtestId: '',
    account: 'default',
  });

  // State quản lý tài khoản giao dịch
  const [accounts, setAccounts] = useState<any[]>([
    {
      id: 'default',
      name: 'Tài khoản mặc định (Binance)',
      apiKey: 'UrsDp0aGxKhpBaR8ELTWyJaAMLMUlDXHk038kx2XeqVQYm7DBQh4zJHxR6Veuryw',
      apiSecret: 'IqoUeRkJiUMkb4ly9VLXfzYsxaNOgvkV9CoxGJbByoyhehwKJ1CsI5EgA7ues937',
      testnet: true
    }
  ]);
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [newAccount, setNewAccount] = useState({ name: '', apiKey: '', apiSecret: '', testnet: false });

  // Lọc các backtest completed
  const completedBacktests = backtests.filter((b: any) => b.status === 'completed');

  // Fetch danh sách bots
  const loadBots = async () => {
    const botsList = await fetchTradingBots(projectId);
    setBots(botsList);
  };

  useEffect(() => {
    loadBots();
  }, [projectId]);

  const handleCreateBot = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setForm({ name: '', backtestId: '', account: 'default' });
    setSelectedBacktest(null);
  };

  const handleFormChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleBacktestSelect = (backtestId: string) => {
    handleFormChange('backtestId', backtestId);
    const backtestDetails = completedBacktests.find(b => b.id === backtestId);
    setSelectedBacktest(backtestDetails || null);
  };

  const handleSubmit = async () => {
    try {
      const accountObj = accounts.find(acc => acc.id === form.account);
      if (!accountObj || !selectedBacktest) {
        toast({
          title: "Lỗi",
          description: "Vui lòng chọn tài khoản và backtest",
          variant: "destructive"
        });
        return;
      }

      const backtestFullConfig = {
        name: selectedBacktest.name,
        type: selectedBacktest.type,
        config: selectedBacktest.config,
        results: selectedBacktest.results,
      };

      const response = await fetch('/api/trading/run-bot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: projectId,
          name: form.name,
          backtestId: form.backtestId,
          account: {
            apiKey: accountObj.apiKey,
            apiSecret: accountObj.apiSecret,
            testnet: accountObj.testnet,
          },
          config: backtestFullConfig,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Thành công",
          description: result.message || "Đã tạo bot giao dịch mới",
        });
        handleModalClose();
        loadBots();
      } else {
        throw new Error(result.message || "Không thể tạo bot giao dịch");
      }
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể tạo bot giao dịch: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  // Thêm tài khoản mới
  const handleAddAccount = () => {
    if (!newAccount.name || !newAccount.apiKey || !newAccount.apiSecret) return;
    setAccounts(prev => [
      ...prev,
      { id: `acc-${Date.now()}`, ...newAccount }
    ]);
    setShowAddAccount(false);
    setNewAccount({ name: '', apiKey: '', apiSecret: '', testnet: false });
  };

  // Xem chi tiết bot
  const handleViewBot = async (bot: TradingBot) => {
    setSelectedBot(bot);
    setShowDetailModal(true);
    
    // Fetch trades của bot này
    setTradesLoading(true);
    try {
      const response = await fetch(`/api/trading/bot/logs?botId=${bot.id}`);
      if (response.ok) {
        const data = await response.json();
        setBotTrades(data.trades || []);
      } else {
        console.error('Failed to fetch bot trades');
        setBotTrades([]);
      }
    } catch (error) {
      console.error('Error fetching bot trades:', error);
      setBotTrades([]);
    } finally {
      setTradesLoading(false);
    }
  };

  // Start/Stop bot
  const handleToggleBot = async (bot: TradingBot) => {
    // Ensure testnet property exists for safety
    if (bot.config.account.testnet === undefined) {
      bot.config.account.testnet = false; 
    }
    try {
      if (bot.status === 'running') {
        // Stop bot bằng API backend
        const res = await fetch('/api/trading/bot', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: bot.id, action: 'stop' })
        });
        if (!res.ok) throw new Error('Không thể dừng bot trên server');
        toast({
          title: "Thành công",
          description: "Đã dừng bot giao dịch"
        });
      } else {
        // Start bot bằng API backend
        const res = await fetch('/api/trading/bot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botId: bot.id })
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || 'Không thể khởi động bot trên server');
        }
        toast({
          title: "Thành công",
          description: "Đã khởi động bot giao dịch"
        });
      }
      loadBots(); // Refresh danh sách
    } catch (error) {
      toast({
        title: "Lỗi",
        description: "Không thể thay đổi trạng thái bot: " + (error as Error).message,
        variant: "destructive"
      });
    }
  };

  const [showApiKey, setShowApiKey] = useState(false);
  const [showApiSecret, setShowApiSecret] = useState(false);

  // State cho data tổng tài sản và tổng hiện tại
  const [assetData, setAssetData] = useState<any[]>([]);
  const [totalAsset, setTotalAsset] = useState<number>(0);
  
  // State cho trades của bot được chọn
  const [botTrades, setBotTrades] = useState<any[]>([]);
  const [tradesLoading, setTradesLoading] = useState<boolean>(false);

  useEffect(() => {
    async function fetchAssetData() {
      if (!selectedBot) return;
      
      // Ensure testnet property exists for safety
      if (selectedBot.config.account.testnet === undefined) {
        selectedBot.config.account.testnet = false; 
      }

      if (!selectedBot.config.account.apiKey || !selectedBot.config.account.apiSecret) return;
      try {
        const res = await fetch('/api/portfolio/assets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: selectedBot.config.account.apiKey,
            apiSecret: selectedBot.config.account.apiSecret,
            isTestnet: selectedBot.config.account.testnet,
          }),
        });
        const result = await res.json();
        if (result.success && Array.isArray(result.data)) {
          const btc = result.data.find((a: any) => a.symbol === 'BTC');
          const usdt = result.data.find((a: any) => a.symbol === 'USDT');
          // Lấy giá BTCUSDT từ totalValue của BTC (nếu có)
          const btcPrice = btc && btc.quantity ? btc.totalValue / btc.quantity : 0;
          const total = (btc?.quantity || 0) * (btcPrice || 0) + (usdt?.quantity || 0);
          setTotalAsset(total);
          // Để demo, chỉ 1 điểm, nếu muốn vẽ biến động cần lưu lại nhiều lần fetch
          setAssetData([{ timestamp: Date.now(), value: total }]);
        } else {
          setAssetData([]);
          setTotalAsset(0);
        }
      } catch (err) {
        setAssetData([]);
        setTotalAsset(0);
      }
    }
    fetchAssetData();
  }, [selectedBot]);

  // Thêm useEffect để load tài khoản khi mở modal
  useEffect(() => {
    if (!showModal) return;
    async function loadAccounts() {
      const accs = await fetchBinanceAccounts();
      setAccounts([
        {
          id: 'default',
          name: 'Tài khoản mặc định (Binance)',
          apiKey: 'UrsDp0aGxKhpBaR8ELTWyJaAMLMUlDXHk038kx2XeqVQYm7DBQh4zJHxR6Veuryw',
          apiSecret: 'IqoUeRkJiUMkb4ly9VLXfzYsxaNOgvkV9CoxGJbByoyhehwKJ1CsI5EgA7ues937',
          testnet: true
        },
        ...accs
      ]);
    }
    loadAccounts();
  }, [showModal]);

  // Thêm hàm xử lý xóa bot
  const handleDeleteBot = async (botId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bot này?')) return;
    try {
      const success = await deleteTradingBot(botId);
      if (success) {
        toast({
          title: 'Thành công',
          description: 'Đã xóa bot giao dịch',
        });
        loadBots();
      } else {
        throw new Error('Không thể xóa bot giao dịch');
      }
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: 'Không thể xóa bot giao dịch: ' + (error as Error).message,
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Danh sách Trading Bots</h3>
        <Button onClick={handleCreateBot}>
          <Plus className="h-4 w-4 mr-2" />Tạo bot mới từ backtest
        </Button>
      </div>

      {bots.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Chưa có bot nào</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4">Bạn có thể tạo bot giao dịch tự động từ các backtest đã thành công.</p>
            <Button onClick={handleCreateBot} disabled={completedBacktests.length === 0}>
              <Plus className="h-4 w-4 mr-2" />Tạo bot từ backtest thành công
            </Button>
            {completedBacktests.length === 0 && (
              <div className="text-xs text-muted-foreground mt-2">Chưa có backtest nào completed để tạo bot.</div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-2 gap-y-4 justify-start">
          {bots.map(bot => (
            <Card key={bot.id} className="w-full">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{bot.name}</CardTitle>
                  <Button variant="ghost" size="icon" onClick={() => handleViewBot(bot)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={bot.status === 'running' ? 'default' : bot.status === 'error' ? 'destructive' : 'secondary'}>
                    {bot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Tài khoản
                  </span>
                </div>

                {/* Thống kê */}
                <div className="flex flex-col space-y-1">
                  <Label>Thống kê</Label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Tổng GD</div>
                      <div className="font-medium">{Number(bot.total_trades ?? 0)}</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Lợi nhuận</div>
                      <div className="font-medium">{safeToFixed(bot.total_profit)}%</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Tỷ lệ thắng</div>
                      <div className="font-medium">{safeToFixed(bot.win_rate)}%</div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  {bot.status === 'error' && (
                    <Button variant="destructive" className="w-full">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Lỗi: {bot.last_error}
                    </Button>
                  )}
                  {bot.status !== 'running' ? (
                    <Button className="w-full" onClick={() => handleToggleBot(bot)}>
                      <Play className="h-4 w-4 mr-2" />Start
                    </Button>
                  ) : (
                    <Button variant="destructive" className="w-full" onClick={() => handleToggleBot(bot)}>
                      <Pause className="h-4 w-4 mr-2" />Stop
                    </Button>
                  )}
                  {/* Nút xóa bot */}
                  <Button variant="outline" className="w-full" onClick={() => handleDeleteBot(bot.id)}>
                    Xóa
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal tạo bot mới */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Tạo Trading Bot mới</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-6 -mr-6">
            <div className="space-y-2">
              <Label htmlFor="botName">Tên Trading Bot</Label>
              <Input
                id="botName"
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                placeholder="Nhập tên bot..."
                className="border-input text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="backtest">Chọn backtest làm rule</Label>
              <Select value={form.backtestId} onValueChange={handleBacktestSelect}>
                <SelectTrigger id="backtest">
                  <SelectValue placeholder="Chọn backtest" />
                </SelectTrigger>
                <SelectContent>
                  {completedBacktests.length === 0 && (
                    <SelectItem value="no-backtests" disabled>Không có backtest nào</SelectItem>
                  )}
                  {completedBacktests.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.strategy_config?.type || b.config?.strategy?.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedBacktest && <BacktestConfigDetails backtest={selectedBacktest} />}
              {selectedBacktest && <BacktestResultsDetails backtest={selectedBacktest} />}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="account">Tài khoản giao dịch</Label>
              <Select value={form.account} onValueChange={val => handleFormChange('account', val)}>
                <SelectTrigger id="account">
                  <SelectValue placeholder="Chọn tài khoản giao dịch" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map(acc => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name || acc.apiKey}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Form thêm tài khoản mới */}
            {showAddAccount && (
              <div className="mt-3 p-3 border rounded bg-muted">
                <div className="mb-2">
                  <Input
                    placeholder="Tên tài khoản"
                    value={newAccount.name}
                    onChange={e => setNewAccount(a => ({ ...a, name: e.target.value }))}
                    className="mb-1"
                  />
                  <Input
                    placeholder="API Key"
                    value={newAccount.apiKey}
                    onChange={e => setNewAccount(a => ({ ...a, apiKey: e.target.value }))}
                    className="mb-1"
                  />
                  <Input
                    placeholder="API Secret"
                    value={newAccount.apiSecret}
                    onChange={e => setNewAccount(a => ({ ...a, apiSecret: e.target.value }))}
                    className="mb-1"
                  />
                  <label className="flex items-center gap-2 mt-1 text-sm">
                    <input
                      type="checkbox"
                      checked={newAccount.testnet}
                      onChange={e => setNewAccount(a => ({ ...a, testnet: e.target.checked }))}
                    />
                    Sử dụng Testnet
                  </label>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddAccount} disabled={!newAccount.name || !newAccount.apiKey || !newAccount.apiSecret}>Lưu</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddAccount(false)}>Hủy</Button>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="mt-4 flex gap-2 border-t pt-4">
            <Button variant="outline" onClick={handleModalClose}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.backtestId}>Tạo bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal xem chi tiết bot */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-5xl max-w-[1100px] h-[95vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Chi tiết Trading Bot</DialogTitle>
          </DialogHeader>
          {selectedBot && (
            <div className="flex flex-col gap-4 h-full overflow-y-auto">
              {/* Tabs thông tin */}
              <div className="flex-1 flex flex-col">
                <Tabs defaultValue="performance" className="w-full flex-1 flex flex-col">
                  <TabsList className="mb-4">
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="info">Thông tin chung</TabsTrigger>
                    <TabsTrigger value="debug">Debug</TabsTrigger>
                  </TabsList>
                  <TabsContent value="performance">
                    {/* Tổng tài sản BTC+USDT */}
                    <div className="border rounded bg-background p-4 mb-4" style={{height: 180}}>
                      <div className="font-semibold mb-2 flex items-center gap-2">
                        Tổng tài sản BTC+USDT
                        <span className="text-primary font-bold text-base">{totalAsset.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT</span>
                      </div>
                      <div className="h-[120px]">
                        <PriceChart symbol="Tổng tài sản" timeframe="1h" data={assetData.map(item => ({ timestamp: item.timestamp, open: item.value, high: item.value, low: item.value, close: item.value }))} />
                      </div>
                    </div>
                    
                    {/* Chart chỉ số indicator cho bot */}
                    <BotIndicatorChart botId={selectedBot.id} />
                    <div className="grid grid-cols-3 gap-4 max-w-lg mb-4">
                      <div className="p-3 border rounded">
                        <div className="text-muted-foreground text-sm">Tổng giao dịch</div>
                        <div className="text-2xl font-semibold">{selectedBot.total_trades}</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-muted-foreground text-sm">Tỷ lệ thắng</div>
                        <div className="text-2xl font-semibold">{safeToFixed(selectedBot.win_rate, 1)}%</div>
                      </div>
                      <div className="p-3 border rounded">
                        <div className="text-muted-foreground text-sm">Tổng lợi nhuận</div>
                        <div className={`text-2xl font-semibold ${Number(selectedBot.total_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{safeToFixed(selectedBot.total_profit, 2)} USDT</div>
                      </div>
                    </div>
                    {/* Bảng danh sách giao dịch */}
                    <div className="mt-4">
                      <div className="flex justify-between items-center mb-2">
                        <div className="font-semibold">Danh sách giao dịch</div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            if (!selectedBot) return;
                            setTradesLoading(true);
                            try {
                              const response = await fetch(`/api/trading/bot/logs?botId=${selectedBot.id}`);
                              if (response.ok) {
                                const data = await response.json();
                                setBotTrades(data.trades || []);
                              }
                            } catch (error) {
                              console.error('Error refreshing trades:', error);
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
                                  <td className="p-2 text-center text-xs">
                                    {getBotBuySignalText(selectedBot, trade)}
                                  </td>
                                  <td className="p-2 text-center text-xs">
                                    {getBotSellSignalText(selectedBot, trade)}
                                  </td>
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
                          <div><span className="text-muted-foreground">Tên:</span> {selectedBot.name}</div>
                          <div><span className="text-muted-foreground">Trạng thái:</span> <Badge variant={selectedBot.status === 'running' ? 'default' : 'secondary'}>{selectedBot.status}</Badge></div>
                          <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(selectedBot.created_at).toLocaleString('vi-VN')}</div>
                          {selectedBot.last_run_at && (
                            <div><span className="text-muted-foreground">Lần chạy cuối:</span> {new Date(selectedBot.last_run_at).toLocaleString('vi-VN')}</div>
                          )}
                        </div>
                      </div>

                      {/* Backtest Info from Bot's Config */}
                      {selectedBot.config && (
                        <>
                          <BacktestConfigDetails backtest={{ config: selectedBot.config.config }} />
                          <BacktestResultsDetails backtest={{ results: selectedBot.config.results }} />
                        </>
                      )}

                      {/* Thông tin API */}
                      <div className="p-3 border rounded bg-muted max-w-md">
                        <div className="font-medium mb-2">Thông tin API</div>
                        <div className="mb-1">
                          <span className="text-muted-foreground">Trạng thái:</span> {selectedBot.config.account?.testnet ? 'Testnet' : 'Live'}
                        </div>
                        <div className="mb-1">
                          <span className="text-muted-foreground">API Key:</span> <span className="font-mono">{showApiKey ? selectedBot.config.account?.apiKey : (selectedBot.config.account?.apiKey ? selectedBot.config.account.apiKey.slice(0, 6) + '...' + selectedBot.config.account.apiKey.slice(-4) : '')}</span>
                          <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiKey(v => !v)}>{showApiKey ? 'Ẩn' : 'Hiện'}</button>
                        </div>
                        <div className="mb-1">
                          <span className="text-muted-foreground">API Secret:</span> <span className="font-mono">{showApiSecret ? selectedBot.config.account?.apiSecret : (selectedBot.config.account?.apiSecret ? selectedBot.config.account.apiSecret.slice(0, 6) + '...' + selectedBot.config.account.apiSecret.slice(-4) : '')}</span>
                          <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiSecret(v => !v)}>{showApiSecret ? 'Ẩn' : 'Hiện'}</button>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="debug">
                    <BotDebugPanel botId={selectedBot.id} />
                  </TabsContent>
                </Tabs>
              </div>

              {/* Nút điều khiển */}
              <div className="flex gap-2 mt-4">
                {selectedBot.status !== 'running' ? (
                  <Button className="w-full" onClick={() => handleToggleBot(selectedBot)}>
                    <Play className="h-4 w-4 mr-2" />Start Bot
                  </Button>
                ) : (
                  <Button variant="destructive" className="w-full" onClick={() => handleToggleBot(selectedBot)}>
                    <Pause className="h-4 w-4 mr-2" />Stop Bot
                  </Button>
                )}
                <Button variant="outline" className="w-full">
                  <Terminal className="h-4 w-4 mr-2" />Xem logs
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 