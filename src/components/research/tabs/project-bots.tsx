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
  TradingBot 
} from '@/lib/trading/trading-bot';
import { BotExecutor } from '@/lib/trading/bot-executor';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Label } from '@/components/ui/label';

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

export function ProjectBotsTab({ projectId, backtests }: ProjectBotsTabProps) {
  const { toast } = useToast();
  const [bots, setBots] = useState<TradingBot[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBot, setSelectedBot] = useState<TradingBot | null>(null);
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
  };

  const handleFormChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    try {
      const accountObj = accounts.find(acc => acc.id === form.account);
      if (!accountObj) {
        toast({
          title: "Lỗi",
          description: "Không tìm thấy tài khoản giao dịch",
          variant: "destructive"
        });
        return;
      }

      const bot = await createTradingBot(projectId, {
        name: form.name,
        backtestId: form.backtestId,
        account: {
          apiKey: accountObj.apiKey,
          apiSecret: accountObj.apiSecret,
          testnet: accountObj.testnet || false
        }
      });

      if (bot) {
        toast({
          title: "Thành công",
          description: "Đã tạo bot giao dịch mới"
        });
        handleModalClose();
        loadBots();
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
  const handleViewBot = (bot: TradingBot) => {
    setSelectedBot(bot);
    setShowDetailModal(true);
  };

  // Start/Stop bot
  const handleToggleBot = async (bot: TradingBot) => {
    try {
      if (bot.status === 'running') {
        // Stop bot
        await updateTradingBotStatus(bot.id, 'stopped');
        toast({
          title: "Thành công",
          description: "Đã dừng bot giao dịch"
        });
      } else {
        // Start bot
        const executor = new BotExecutor(bot);
        executor.start();
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map(bot => (
            <Card key={bot.id}>
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
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Modal tạo bot mới */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tạo Trading Bot mới</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Tên Trading Bot</label>
              <Input
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
                placeholder="Nhập tên bot..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Chọn backtest làm rule</label>
              <Select value={form.backtestId} onValueChange={val => handleFormChange('backtestId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn backtest" />
                </SelectTrigger>
                <SelectContent>
                  {completedBacktests.length === 0 && (
                    <SelectItem value="" disabled>Không có backtest nào</SelectItem>
                  )}
                  {completedBacktests.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name} ({b.strategy_config?.type || b.config?.strategy?.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tài khoản giao dịch</label>
              <div className="flex gap-2 items-center">
                <Select value={form.account} onValueChange={val => handleFormChange('account', val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn tài khoản" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map(acc => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => setShowAddAccount(true)}>+ Thêm tài khoản</Button>
              </div>
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
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleModalClose}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.backtestId}>Tạo bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal xem chi tiết bot */}
      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Chi tiết Trading Bot</DialogTitle>
          </DialogHeader>
          {selectedBot && (
            <div className="space-y-6">
              {/* Thông tin cơ bản */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Thông tin chung</h4>
                  <div className="space-y-1 text-sm">
                    <div><span className="text-muted-foreground">Tên:</span> {selectedBot.name}</div>
                    <div><span className="text-muted-foreground">Trạng thái:</span> {selectedBot.status}</div>
                    <div><span className="text-muted-foreground">Tài khoản:</span> Tài khoản</div>
                    <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(selectedBot.created_at).toLocaleString('vi-VN')}</div>
                    {selectedBot.last_run_at && (
                      <div><span className="text-muted-foreground">Lần chạy cuối:</span> {new Date(selectedBot.last_run_at).toLocaleString('vi-VN')}</div>
                    )}
                  </div>
                  {/* Thông tin tài khoản giao dịch */}
                  <div className="mt-4 p-3 border rounded bg-muted">
                    <div className="font-medium mb-2">Thông tin API</div>
                    {/* Nếu có trường testnet thì hiển thị, mặc định là Live */}
                    <div className="mb-1">
                      <span className="text-muted-foreground">Trạng thái:</span> {selectedBot.config.account.apiKey && selectedBot.config.account.apiKey.toLowerCase().includes('test') ? 'Testnet' : 'Live'}
                    </div>
                    <div className="mb-1">
                      <span className="text-muted-foreground">API Key:</span> <span className="font-mono">{showApiKey ? selectedBot.config.account.apiKey : (selectedBot.config.account.apiKey ? selectedBot.config.account.apiKey.slice(0, 6) + '...' + selectedBot.config.account.apiKey.slice(-4) : '')}</span>
                      <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiKey(v => !v)}>{showApiKey ? 'Ẩn' : 'Hiện'}</button>
                    </div>
                    <div className="mb-1">
                      <span className="text-muted-foreground">API Secret:</span> <span className="font-mono">{showApiSecret ? selectedBot.config.account.apiSecret : (selectedBot.config.account.apiSecret ? selectedBot.config.account.apiSecret.slice(0, 6) + '...' + selectedBot.config.account.apiSecret.slice(-4) : '')}</span>
                      <button type="button" className="ml-2 text-xs underline text-blue-600" onClick={() => setShowApiSecret(v => !v)}>{showApiSecret ? 'Ẩn' : 'Hiện'}</button>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Thống kê</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 border rounded">
                      <div className="text-muted-foreground text-sm">Tổng giao dịch</div>
                      <div className="text-2xl font-semibold">{selectedBot.total_trades}</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-muted-foreground text-sm">Tỷ lệ thắng</div>
                      <div className="text-2xl font-semibold">{safeToFixed(selectedBot.win_rate, 1)}%</div>
                    </div>
                    <div className="p-3 border rounded col-span-2">
                      <div className="text-muted-foreground text-sm">Tổng lợi nhuận</div>
                      <div className={`text-2xl font-semibold ${Number(selectedBot.total_profit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {safeToFixed(selectedBot.total_profit, 2)} USDT
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Biểu đồ hiệu suất */}
              <div>
                <h4 className="font-medium mb-2">Biểu đồ hiệu suất</h4>
                <div className="h-[300px] border rounded flex items-center justify-center text-muted-foreground">
                  <TrendingUp className="h-8 w-8 mr-2" />
                  Đang phát triển...
                </div>
              </div>

              {/* Nút điều khiển */}
              <div className="flex gap-2">
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