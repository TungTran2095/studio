// src/components/assets/asset-summary.tsx
"use client";

import type { FC } from "react";
import { useState, useEffect, useCallback, useRef } from "react"; // Added useRef
import { useForm, useWatch } from "react-hook-form"; // Added useWatch
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronDown, ChevronUp, RotateCw } from 'lucide-react'; // Import icons
import { fetchBinanceAssets, fetchBinanceTradeHistory } from "@/actions/binance"; // Import Server Actions
import type { Asset, Trade } from "@/actions/binance"; // Import types
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Keep Card parts for internal structure
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Import Tabs components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format } from 'date-fns'; // For formatting timestamps
import { useAssetStore, BinanceAccount } from '@/store/asset-store'; // Import Zustand store
import { useRouter } from 'next/navigation'; // Import router
import { supabase as supabaseClient } from '@/lib/supabase-client';

// Schema for form validation - remains the same
const formSchema = z.object({
  apiKey: z.string().min(1, { message: "API Key is required." }),
  apiSecret: z.string().min(1, { message: "API Secret is required." }),
  isTestnet: z.boolean().default(false),
  useDefault: z.boolean().default(false), // Thêm trường mới cho tích chọn mặc định
});

// Định nghĩa thông số tài khoản mặc định
const DEFAULT_API_KEY = "UrsDp0aGxKhpBaR8ELTWyJaAMLMUlDXHk038kx2XeqVQYm7DBQh4zJHxR6Veuryw";
const DEFAULT_API_SECRET = "IqoUeRkJiUMkb4ly9VLXfzYsxaNOgvkV9CoxGJbByoyhehwKJ1CsI5EgA7ues937";
const DEFAULT_IS_TESTNET = true;

// Define props including isExpanded and onToggle
interface AssetSummaryProps {
  isExpanded: boolean;
  onToggle: () => void;
}

// Define the list of symbols to ALWAYS check for trade history and display assets for
const TARGET_SYMBOLS = ['BTC', 'USDT']; // UPDATED: Only BTC and USDT
const REFRESH_INTERVAL_MS = 5000; // 5 seconds

// Helper lấy message từ error
const getErrorMessage = (error: any) => typeof error === 'object' && error !== null ? error.message : error;

export const AssetSummary: FC<AssetSummaryProps> = ({ isExpanded, onToggle }) => {
  const router = useRouter(); // Add router
  const {
    accounts,
    activeAccountId,
    addAccount,
    removeAccount,
    updateAccount,
    setActiveAccount,
    activeTab,
    setActiveTab,
  } = useAssetStore();
  const { toast } = useToast();
  const [showAddForm, setShowAddForm] = useState(false);
  const [newAccount, setNewAccount] = useState({
    name: '',
    apiKey: '',
    apiSecret: '',
    isTestnet: false,
  });
  const [loadingAccounts, setLoadingAccounts] = useState<string[]>([]); // Danh sách accountId đang loading
  const [selectedAccountId, setSelectedAccountId] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const activeAccount = accounts.find(acc => acc.id === activeAccountId) || null;

  // Hàm lưu tài khoản vào bảng binance_account
  const insertBinanceAccount = async (name: string, apiKey: string, apiSecret: string, isTestnet: boolean) => {
    if (!supabaseClient) return { error: 'Supabase client not initialized' };
    const { error } = await supabaseClient
      .from('binance_account')
      .insert({
        Name: name,
        config: { apiKey, apiSecret, isTestnet },
      });
    return { error };
  };

  // Hàm xóa tài khoản khỏi bảng binance_account
  const deleteBinanceAccount = async (name: string, apiKey: string) => {
    if (!supabaseClient) return { error: 'Supabase client not initialized' };
    // Xóa theo Name và apiKey trong config
    const { error } = await supabaseClient
      .from('binance_account')
      .delete()
      .match({ Name: name, 'config->>apiKey': apiKey });
    return { error };
  };

  // Handler thêm tài khoản mới
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccount.apiKey || !newAccount.apiSecret) {
      toast({ title: 'Thiếu thông tin', description: 'Vui lòng nhập API Key và Secret', variant: 'destructive' });
      return;
    }
    // Lưu vào database trước
    const { error } = await insertBinanceAccount(newAccount.name, newAccount.apiKey, newAccount.apiSecret, newAccount.isTestnet);
    if (error) {
      toast({ title: 'Lỗi khi lưu vào database', description: getErrorMessage(error), variant: 'destructive' });
      return;
    }
    addAccount(newAccount);
    setShowAddForm(false);
    setNewAccount({ name: '', apiKey: '', apiSecret: '', isTestnet: false });
    toast({ title: 'Thêm tài khoản thành công', description: 'Tài khoản đã được lưu vào database', variant: 'default' });
  };

  // Hàm fetch tài sản và lịch sử giao dịch cho 1 account
  const fetchAccountData = async (acc: BinanceAccount) => {
    setLoadingAccounts(prev => [...prev, acc.id]);
    try {
      // Lấy tài sản
      const assetRes = await fetchBinanceAssets({ apiKey: acc.apiKey, apiSecret: acc.apiSecret, isTestnet: acc.isTestnet });
      let assets = assetRes.success ? assetRes.data : [];
      let ownedSymbols = assetRes.ownedSymbols || ['BTC', 'USDT'];
      // Lấy lịch sử giao dịch (chỉ lấy BTCUSDT, ETHUSDT, ...)
      const tradeRes = await fetchBinanceTradeHistory({ apiKey: acc.apiKey, apiSecret: acc.apiSecret, isTestnet: acc.isTestnet, symbols: ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'], limit: 100 });
      let trades = tradeRes.success ? tradeRes.data : [];
      updateAccount(acc.id, { assets, trades, ownedSymbols });
    } catch (err) {
      toast({ title: 'Lỗi khi lấy dữ liệu Binance', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setLoadingAccounts(prev => prev.filter(id => id !== acc.id));
    }
  };

  // Khi thêm tài khoản mới thì fetch luôn dữ liệu
  useEffect(() => {
    accounts.forEach(acc => {
      if ((!acc.assets || acc.assets.length === 0) && !loadingAccounts.includes(acc.id)) {
        fetchAccountData(acc);
      }
    });
    // eslint-disable-next-line
  }, [accounts.length]);

  // Tự động fetch lại tài sản và lịch sử giao dịch mỗi 5 giây
  useEffect(() => {
    if (accounts.length === 0) return;
    const interval = setInterval(() => {
      accounts.forEach(acc => {
        fetchAccountData(acc);
      });
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [accounts]);

  // Hàm fetch danh sách tài khoản từ Supabase
  const fetchAccountsFromSupabase = async () => {
    if (!supabaseClient) return [];
    const { data, error } = await supabaseClient
      .from('binance_account')
      .select('*');
    if (error) {
      toast({ title: 'Lỗi khi lấy tài khoản', description: getErrorMessage(error), variant: 'destructive' });
      return [];
    }
    // Map dữ liệu từ Supabase về đúng format của store
    return (data || []).map((item: any) => ({
      id: item.id || item.Name || `acc-${Math.random()}`,
      name: item.Name || 'Binance',
      apiKey: item.config?.apiKey,
      apiSecret: item.config?.apiSecret,
      isTestnet: item.config?.isTestnet ?? false,
      assets: [],
      trades: [],
      isLoadingAssets: false,
      isLoadingTrades: false,
      isConnected: false,
      ownedSymbols: [],
    }));
  };

  // useEffect fetch tài khoản từ Supabase khi mount (chỉ khi chưa có account trong store)
  useEffect(() => {
    if (accounts.length === 0) {
      fetchAccountsFromSupabase().then(accs => {
        accs.forEach(acc => {
          addAccount({
            name: acc.name,
            apiKey: acc.apiKey,
            apiSecret: acc.apiSecret,
            isTestnet: acc.isTestnet,
          });
        });
      });
    }
    // eslint-disable-next-line
  }, []);

  // Lấy danh sách giao dịch đã lọc
  const filteredTrades = accounts.length > 0 ? accounts
    .filter(acc => selectedAccountId === "all" || acc.id === selectedAccountId)
    .flatMap(acc => acc.trades)
    .filter(trade => {
      let valid = true;
      if (dateFrom) valid = valid && new Date(trade.time) >= new Date(dateFrom);
      if (dateTo) valid = valid && new Date(trade.time) <= new Date(dateTo);
      return valid;
    }) : [];

  // UI danh sách tài khoản
  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <CardHeader className="p-3 border-b border-border flex-shrink-0 flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-medium text-foreground">Quản lý tài khoản Binance</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setShowAddForm(v => !v)}>
          {showAddForm ? 'Đóng' : 'Thêm tài khoản'}
        </Button>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-2 overflow-auto">
        {/* Form thêm tài khoản mới */}
        {showAddForm && (
          <form className="border rounded p-3 mb-2 flex flex-col gap-2 bg-muted/30" onSubmit={handleAddAccount}>
            <label className="text-black font-medium text-xs">Tên tài khoản (tuỳ chọn)
              <Input className="text-black border-2 border-border font-medium" placeholder="Tên tài khoản (tuỳ chọn)" value={newAccount.name} onChange={e => setNewAccount({ ...newAccount, name: e.target.value })} />
            </label>
            <label className="text-black font-medium text-xs">API Key
              <Input className="text-black border-2 border-border font-medium" placeholder="API Key" value={newAccount.apiKey} onChange={e => setNewAccount({ ...newAccount, apiKey: e.target.value })} required />
            </label>
            <label className="text-black font-medium text-xs">API Secret
              <Input className="text-black border-2 border-border font-medium" placeholder="API Secret" value={newAccount.apiSecret} onChange={e => setNewAccount({ ...newAccount, apiSecret: e.target.value })} required type="password" />
            </label>
            <div className="flex items-center gap-2">
              <Checkbox checked={newAccount.isTestnet} onCheckedChange={v => setNewAccount({ ...newAccount, isTestnet: !!v })} />
              <span className="text-xs text-black font-medium">Testnet</span>
            </div>
            <Button type="submit" size="sm">Thêm tài khoản</Button>
          </form>
        )}
        {/* Tabs quản lý tài khoản */}
        <Tabs defaultValue="assets" className="flex-1 flex flex-col">
          <TabsList className="mb-2">
            <TabsTrigger value="assets">Tình trạng tài sản</TabsTrigger>
            <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
          </TabsList>
          {/* Tab tình trạng tài sản */}
          <TabsContent value="assets" className="flex-1 flex flex-col">
            <ScrollArea className="flex-1">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài khoản</TableHead>
                    <TableHead className="text-right">Tổng BTC (BTC/USDT)</TableHead>
                    <TableHead className="text-right">Tổng USDT</TableHead>
                    <TableHead className="text-right">Tổng tài sản (BTC+USDT)</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.length > 0 ? (
                    <>
                      {accounts.map(acc => {
                        // Tính tổng BTC, tổng USDT, tổng tài sản quy đổi
                        const btcAsset = acc.assets.find(a => a.symbol === 'BTC');
                        const usdtAsset = acc.assets.find(a => a.symbol === 'USDT');
                        const btc = btcAsset ? btcAsset.quantity : 0;
                        const btcValue = btcAsset ? btcAsset.totalValue : 0;
                        const usdt = usdtAsset ? usdtAsset.quantity : 0;
                        // Tổng tài sản quy đổi: BTC (theo USDT) + USDT
                        const total = btcValue + usdt;
                        return (
                          <TableRow key={acc.id}>
                            <TableCell>{acc.name || 'Binance'}</TableCell>
                            <TableCell className="text-right">{btc.toFixed(8)} ({btcValue.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT)</TableCell>
                            <TableCell className="text-right">{usdt.toLocaleString(undefined, { maximumFractionDigits: 2 })}</TableCell>
                            <TableCell className="text-right">{total.toLocaleString(undefined, { maximumFractionDigits: 2 })} USDT</TableCell>
                            <TableCell className="text-right">
                              <Button 
                                size="sm" 
                                variant="destructive"
                                onClick={async () => {
                                  const { error } = await deleteBinanceAccount(acc.name || '', acc.apiKey);
                                  if (error) {
                                    toast({ title: 'Lỗi khi xóa database', description: getErrorMessage(error), variant: 'destructive' });
                                    return;
                                  }
                                  removeAccount(acc.id);
                                  toast({ title: 'Đã xóa tài khoản', description: 'Tài khoản đã được xóa thành công', variant: 'default' });
                                }}
                              >
                                Xóa
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      {/* Thêm dòng trống nếu thiếu */}
                      {Array.from({ length: 10 - accounts.length }).map((_, idx) => (
                        <TableRow key={`empty-${idx}`}>
                          <TableCell colSpan={5} className="h-8 bg-muted/10" />
                        </TableRow>
                      ))}
                    </>
                  ) : (
                    <>
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">Chưa có tài khoản nào</TableCell></TableRow>
                      {/* Nếu chưa có tài khoản, vẫn render 9 dòng trống */}
                      {Array.from({ length: 9 }).map((_, idx) => (
                        <TableRow key={`empty-init-${idx}`}>
                          <TableCell colSpan={5} className="h-8 bg-muted/10" />
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </TabsContent>
          {/* Tab lịch sử giao dịch */}
          <TabsContent value="history" className="flex-1 flex flex-col">
            {/* Filter UI */}
            <div className="flex flex-wrap gap-2 mb-2 items-end">
              <div>
                <label className="block text-xs font-medium mb-1">Tài khoản</label>
                <select
                  className="border rounded px-2 py-1 text-xs"
                  value={selectedAccountId}
                  onChange={e => setSelectedAccountId(e.target.value)}
                >
                  <option value="all">Tất cả</option>
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name || 'Binance'}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Từ ngày</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Đến ngày</label>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="flex-1 max-h-[400px] overflow-y-auto">
              <Table className="w-full text-xs">
                <TableHeader>
                  <TableRow>
                    <TableHead>Tài khoản</TableHead>
                    <TableHead>Symbol</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTrades.length > 0 ?
                    filteredTrades.map(trade => {
                      const acc = accounts.find(a => a.trades.some(t => t.id === trade.id));
                      return (
                        <TableRow key={(acc?.id || "") + '-' + trade.id}>
                          <TableCell>{acc?.name || 'Binance'}</TableCell>
                          <TableCell>{trade.symbol}</TableCell>
                          <TableCell>{trade.isBuyer ? 'BUY' : 'SELL'}</TableCell>
                          <TableCell className="text-right">{trade.price}</TableCell>
                          <TableCell className="text-right">{trade.qty}</TableCell>
                          <TableCell className="text-right">{new Date(trade.time).toLocaleString()}</TableCell>
                        </TableRow>
                      );
                    }) : (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">Không có lịch sử giao dịch</TableCell></TableRow>
                    )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </div>
  );
};

    