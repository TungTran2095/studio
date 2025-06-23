import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Plus, Terminal } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

interface ProjectBotsTabProps {
  projectId: string;
  models: any[];
}

// Giả lập danh sách bot (có thể thay bằng fetch API sau)
const mockBots: any[] = [
  // { id: '1', name: 'BTC MA20 Bot', status: 'stopped', rule: 'ma_crossover', symbol: 'BTCUSDT' },
];

export function ProjectBotsTab({ projectId, models }: ProjectBotsTabProps) {
  const [bots, setBots] = useState<any[]>(mockBots);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({
    name: '',
    modelId: '',
    account: 'default',
  });

  // Lọc các backtest/model completed
  const completedModels = models.filter((m: any) => m.status === 'completed');

  const handleCreateBot = () => {
    setShowModal(true);
  };

  const handleModalClose = () => {
    setShowModal(false);
    setForm({ name: '', modelId: '', account: 'default' });
  };

  const handleFormChange = (key: string, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    alert(`Tạo bot mới:\nTên: ${form.name}\nBacktest: ${form.modelId}\nTài khoản: ${form.account}`);
    handleModalClose();
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
            <Button onClick={handleCreateBot} disabled={completedModels.length === 0}>
              <Plus className="h-4 w-4 mr-2" />Tạo bot từ backtest thành công
            </Button>
            {completedModels.length === 0 && (
              <div className="text-xs text-muted-foreground mt-2">Chưa có backtest/model nào completed để tạo bot.</div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {bots.map(bot => (
            <Card key={bot.id}>
              <CardHeader>
                <CardTitle>{bot.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={bot.status === 'running' ? 'default' : 'secondary'}>
                    {bot.status}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {bot.symbol} • {bot.rule}
                  </span>
                </div>
                <div className="flex gap-2">
                  {bot.status !== 'running' ? (
                    <Button><Play className="h-4 w-4 mr-2" />Start</Button>
                  ) : (
                    <Button variant="destructive"><Pause className="h-4 w-4 mr-2" />Stop</Button>
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
              <label className="block text-sm font-medium mb-1">Chọn backtest/model làm rule</label>
              <Select value={form.modelId} onValueChange={val => handleFormChange('modelId', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn backtest/model" />
                </SelectTrigger>
                <SelectContent>
                  {completedModels.length === 0 && (
                    <SelectItem value="" disabled>Không có backtest/model nào</SelectItem>
                  )}
                  {completedModels.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name} ({m.model_type || m.algorithm})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tài khoản giao dịch</label>
              <Select value={form.account} onValueChange={val => handleFormChange('account', val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn tài khoản" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Tài khoản mặc định (Binance)</SelectItem>
                  {/* Có thể thêm các tài khoản khác ở đây */}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4 flex gap-2">
            <Button variant="outline" onClick={handleModalClose}>Hủy</Button>
            <Button onClick={handleSubmit} disabled={!form.name || !form.modelId}>Tạo bot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
} 