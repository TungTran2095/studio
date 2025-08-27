"use client";

import { useState, useEffect } from 'react';
import { useAssetStore } from '@/store/asset-store';
import { fetchBinanceAssets, fetchBinanceTradeHistory } from "@/actions/binance";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  DollarSign, 
  TrendingUp, 
  PieChart, 
  List, 
  BarChart4,
  Clock,
  History,
  RefreshCw
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from "next/link";

export default function PortfolioPage() {
  const { 
    accounts,
    activeAccountId,
    apiKey, 
    apiSecret, 
    isTestnet, 
    updateAccount
  } = useAssetStore();
  
  // Get active account data
  const activeAccount = accounts.find(acc => acc.id === activeAccountId);
  const assets = activeAccount?.assets || [];
  const trades = activeAccount?.trades || [];
  const isConnected = activeAccount?.isConnected || false;
  
  const [isLoading, setIsLoading] = useState(false);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [btcBalance, setBtcBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const { toast } = useToast();

  // Tính tổng giá trị và cập nhật các giá trị chính
  useEffect(() => {
    if ((assets || []).length > 0) {
      // Tính tổng giá trị danh mục
      const totalValue = assets.reduce((sum, asset) => sum + asset.totalValue, 0);
      setPortfolioValue(totalValue);

      // Tìm số dư BTC
      const btcAsset = assets.find(asset => asset.symbol === 'BTC');
      setBtcBalance(btcAsset ? btcAsset.quantity : 0);

      // Tìm số dư USDT
      const usdtAsset = assets.find(asset => asset.symbol === 'USDT');
      setUsdtBalance(usdtAsset ? usdtAsset.quantity : 0);
    }
  }, [assets]);

  // Hàm làm mới dữ liệu
  const refreshData = async () => {
    if (!apiKey || !apiSecret || !activeAccountId) {
      toast({ 
        title: "Không có thông tin đăng nhập", 
        description: "Vui lòng cung cấp API key và secret ở phần Binance Account", 
        variant: "destructive" 
      });
      return;
    }

    setIsLoading(true);
    try {
      // Lấy thông tin tài sản
      const assetResult = await fetchBinanceAssets({ apiKey, apiSecret, isTestnet });
      if (assetResult.success && assetResult.data) {
        // Update the active account with new assets
        updateAccount(activeAccountId, { 
          assets: assetResult.data,
          isConnected: true 
        });
        
        // Lấy lịch sử giao dịch cho BTC
        const tradeResult = await fetchBinanceTradeHistory({ 
          apiKey, 
          apiSecret, 
          isTestnet, 
          symbols: ['BTCUSDT'],
          limit: 100 
        });
        
        if (tradeResult.success && tradeResult.data) {
          // Update the active account with new trades
          updateAccount(activeAccountId, { 
            trades: tradeResult.data 
          });
        }

        toast({ title: "Cập nhật thành công", description: "Dữ liệu tài sản đã được cập nhật." });
      } else {
        toast({ 
          title: "Lỗi", 
          description: assetResult.error || "Không thể cập nhật dữ liệu tài sản.", 
          variant: "destructive" 
        });
      }
    } catch (error: any) {
      toast({ 
        title: "Lỗi", 
        description: error.message || "Đã xảy ra lỗi khi cập nhật dữ liệu.", 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Hàm tính lợi nhuận từ lịch sử giao dịch
  const calculateTradingPerformance = () => {
    if (!trades || (trades || []).length === 0) {
      return { profitLoss: 0, profitLossPercent: 0, tradesCount: 0, winRate: 0 };
    }

    let totalBuys = 0;
    let totalSells = 0;
    let buyVolume = 0;
    let sellVolume = 0;
    let winCount = 0;

    trades.forEach(trade => {
      const price = parseFloat(trade.price);
      const quantity = parseFloat(trade.qty);
      
      if (trade.isBuyer) {
        totalBuys += (price * quantity);
        buyVolume += quantity;
      } else {
        totalSells += (price * quantity);
        sellVolume += quantity;

        // Nếu giá bán > giá mua trung bình, đó là lời
        if (price > (totalBuys / buyVolume)) {
          winCount++;
        }
      }
    });

    const profitLoss = totalSells - totalBuys;
    const profitLossPercent = totalBuys > 0 ? (profitLoss / totalBuys) * 100 : 0;
    const winRate = trades.filter(t => !t.isBuyer).length > 0 
      ? (winCount / trades.filter(t => !t.isBuyer).length) * 100 
      : 0;

    return {
      profitLoss,
      profitLossPercent,
      tradesCount: trades.length,
      winRate
    };
  };

  const performance = calculateTradingPerformance();

  return (
    <div className="container py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Danh Mục Đầu Tư</h1>
          <p className="text-muted-foreground">Quản lý và phân tích tài sản của bạn</p>
        </div>
        <Button 
          onClick={refreshData} 
          disabled={isLoading || !isConnected}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Đang cập nhật...' : 'Cập nhật'}
        </Button>
      </div>

      {/* Hiển thị thông báo nếu không có API key */}
      {!isConnected && (
        <Card className="mb-6 bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-amber-100 rounded-full dark:bg-amber-900">
                <Clock className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h3 className="font-medium">Chưa kết nối tài khoản Binance</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vui lòng kết nối tài khoản Binance của bạn trong phần "Binance Account" 
                  ở trang chính để xem thông tin chi tiết về tài sản.
                </p>
                <div className="mt-3">
                  <Link href="/">
                    <Button variant="secondary" size="sm">
                      Quay lại trang chính
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tổng giá trị</p>
                <h2 className="text-2xl font-bold">${portfolioValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</h2>
              </div>
              <div className="p-2 bg-primary/10 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">BTC</p>
                <h2 className="text-2xl font-bold">{btcBalance.toLocaleString('vi-VN', { maximumFractionDigits: 8 })}</h2>
              </div>
              <div className="p-2 bg-orange-500/10 rounded-full">
                <PieChart className="h-5 w-5 text-orange-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">USDT</p>
                <h2 className="text-2xl font-bold">{usdtBalance.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</h2>
              </div>
              <div className="p-2 bg-green-500/10 rounded-full">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Lợi nhuận</p>
                <h2 className={`text-2xl font-bold ${performance.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  ${performance.profitLoss.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                </h2>
                <p className={`text-xs ${performance.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {performance.profitLossPercent >= 0 ? '+' : ''}{performance.profitLossPercent.toFixed(2)}%
                </p>
              </div>
              <div className={`p-2 ${performance.profitLoss >= 0 ? 'bg-green-500/10' : 'bg-red-500/10'} rounded-full`}>
                {performance.profitLoss >= 0 ? (
                  <ArrowUpRight className="h-5 w-5 text-green-500" />
                ) : (
                  <ArrowDownRight className="h-5 w-5 text-red-500" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab để chuyển đổi giữa các dạng xem */}
      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="assets">Tài sản</TabsTrigger>
          <TabsTrigger value="history">Lịch sử giao dịch</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo</TabsTrigger>
        </TabsList>

        {/* Tab Tổng quan */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Phân bổ tài sản</CardTitle>
              <CardDescription>Phân bổ tài sản của bạn theo giá trị USD</CardDescription>
            </CardHeader>
            <CardContent>
              {(assets || []).length > 0 ? (
                <div className="space-y-4">
                  {assets.slice(0, 5).map((asset) => (
                    <div key={asset.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-xs font-medium">{asset.symbol.substring(0, 2)}</span>
                        </div>
                        <div>
                          <p className="font-medium">{asset.symbol}</p>
                          <p className="text-xs text-muted-foreground">{asset.quantity.toLocaleString('vi-VN', { maximumFractionDigits: 8 })}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">${asset.totalValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-foreground">
                          {((asset.totalValue / portfolioValue) * 100).toFixed(2)}%
                        </p>
                      </div>
                    </div>
                  ))}

                  {/* Thanh tiến trình phân bổ */}
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    {assets.slice(0, 5).map((asset, index) => {
                      const width = (asset.totalValue / portfolioValue) * 100;
                      const colors = ['bg-primary', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500'];
                      let left = 0;
                      
                      for (let i = 0; i < index; i++) {
                        left += (assets[i].totalValue / portfolioValue) * 100;
                      }
                      
                      return (
                        <div
                          key={asset.symbol}
                          className={`absolute h-2 ${colors[index % colors.length]}`}
                          style={{ width: `${width}%`, left: `${left}%` }}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  {isConnected ? 'Không có dữ liệu tài sản' : 'Vui lòng kết nối tài khoản để xem tài sản'}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hiệu suất giao dịch</CardTitle>
              <CardDescription>Phân tích hiệu suất giao dịch của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tổng giao dịch</p>
                  <p className="text-2xl font-bold">{performance.tradesCount}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tỷ lệ thắng</p>
                  <p className="text-2xl font-bold">{performance.winRate.toFixed(1)}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Tài sản */}
        <TabsContent value="assets">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách tài sản</CardTitle>
              <CardDescription>Tất cả tài sản trong danh mục của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {(assets || []).length > 0 ? (
                    assets.map((asset) => (
                      <div key={asset.symbol} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="font-medium">{asset.symbol.substring(0, 3)}</span>
                          </div>
                          <div>
                            <p className="font-medium">{asset.symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {asset.quantity.toLocaleString('vi-VN', { 
                                maximumFractionDigits: asset.quantity < 1 ? 8 : 2 
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${asset.totalValue.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}</p>
                          <p className="text-xs text-muted-foreground">
                            {((asset.totalValue / portfolioValue) * 100).toFixed(2)}%
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {isConnected ? 'Không có dữ liệu tài sản' : 'Vui lòng kết nối tài khoản để xem tài sản'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Lịch sử giao dịch */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <CardDescription>Các giao dịch gần đây của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[400px]">
                <div className="space-y-4">
                  {(trades || []).length > 0 ? (
                    trades.map((trade) => (
                      <div key={trade.id} className="flex items-center justify-between p-3 hover:bg-muted rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className={`w-10 h-10 rounded-full ${trade.isBuyer ? 'bg-green-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                            {trade.isBuyer ? (
                              <ArrowUpRight className="h-5 w-5 text-green-500" />
                            ) : (
                              <ArrowDownRight className="h-5 w-5 text-red-500" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{trade.isBuyer ? 'Mua' : 'Bán'} {trade.symbol}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(trade.time), 'dd/MM/yyyy HH:mm:ss')}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{parseFloat(trade.qty).toLocaleString('vi-VN', { maximumFractionDigits: 8 })}</p>
                          <p className="text-xs text-muted-foreground">
                            ${(parseFloat(trade.price) * parseFloat(trade.qty)).toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      {isConnected ? 'Không có lịch sử giao dịch' : 'Vui lòng kết nối tài khoản để xem lịch sử giao dịch'}
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Báo cáo */}
        <TabsContent value="reports">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo tài chính</CardTitle>
              <CardDescription>Phân tích kết quả giao dịch và hiệu suất của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Lợi nhuận ròng</p>
                  <p className={`text-2xl font-bold ${performance.profitLoss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ${performance.profitLoss.toLocaleString('vi-VN', { maximumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Lợi nhuận %</p>
                  <p className={`text-2xl font-bold ${performance.profitLossPercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {performance.profitLossPercent >= 0 ? '+' : ''}{performance.profitLossPercent.toFixed(2)}%
                  </p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">Tỷ lệ thắng</p>
                  <p className="text-2xl font-bold">{performance.winRate.toFixed(1)}%</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">Báo cáo dòng tiền</h3>
                <p className="text-muted-foreground">
                  {isConnected 
                    ? 'Báo cáo dòng tiền chi tiết sẽ được cập nhật trong phiên bản tiếp theo.' 
                    : 'Vui lòng kết nối tài khoản để xem báo cáo dòng tiền'}
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 text-center">
        <Link href="/">
          <Button variant="outline">Quay lại trang chính</Button>
        </Link>
      </div>
    </div>
  );
} 