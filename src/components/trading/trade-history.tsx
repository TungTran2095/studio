"use client";

import React, { useState, useEffect } from 'react';
import { useAssetStore } from '@/store/asset-store';
import { fetchBinanceTradeHistory } from '@/actions/binance';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface Trade {
  symbol: string;
  id: number;
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;
  commission: string;
  commissionAsset: string;
  time: number;
  isBuyer: boolean;
  isMaker: boolean;
  baseAsset?: string;
  quoteAsset?: string;
}

export const TradeHistory: React.FC = () => {
  const { apiKey, apiSecret, isTestnet, isConnected, ownedSymbols } = useAssetStore();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrades = async () => {
      if (!isConnected || !apiKey || !apiSecret || !ownedSymbols || ownedSymbols.length === 0) {
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Tạo danh sách các cặp giao dịch phổ biến từ ownedSymbols
        const tradingPairs = generateTradingPairs(ownedSymbols);
        console.log("[TradeHistory] Fetching trades for pairs:", tradingPairs);

        const result = await fetchBinanceTradeHistory({
          apiKey,
          apiSecret,
          isTestnet,
          symbols: tradingPairs,
          limit: 30, // Giới hạn 30 giao dịch mỗi cặp
        });

        if (result.success) {
          setTrades(result.data);
        } else {
          setError(result.error || "Không thể tải lịch sử giao dịch");
        }
      } catch (err: any) {
        console.error("[TradeHistory] Error fetching trades:", err);
        setError(err.message || "Đã xảy ra lỗi khi tải lịch sử giao dịch");
      } finally {
        setLoading(false);
      }
    };

    fetchTrades();
  }, [apiKey, apiSecret, isTestnet, isConnected, ownedSymbols]);

  // Hàm tạo các cặp giao dịch phổ biến từ danh sách tài sản
  const generateTradingPairs = (symbols: string[]): string[] => {
    const stablecoins = ['USDT', 'BUSD', 'USDC', 'DAI', 'TUSD'];
    const majorCoins = ['BTC', 'ETH', 'BNB'];
    const pairs: string[] = [];

    // Tạo cặp với stablecoin
    for (const symbol of symbols) {
      if (symbol !== 'USDT') {
        pairs.push(`${symbol}USDT`);
      }
      // Thêm các cặp khác nếu cần
      if (!stablecoins.includes(symbol) && symbol !== 'BTC') {
        pairs.push(`${symbol}BTC`);
      }
      if (!stablecoins.includes(symbol) && symbol !== 'ETH' && symbol !== 'BTC') {
        pairs.push(`${symbol}ETH`);
      }
      if (!stablecoins.includes(symbol) && symbol !== 'BNB' && symbol !== 'BTC' && symbol !== 'ETH') {
        pairs.push(`${symbol}BNB`);
      }
    }

    // Lọc các cặp trùng và giới hạn số lượng cặp
    return [...new Set(pairs)].slice(0, 50);
  };

  // Format timestamp thành ngày giờ
  const formatDate = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className="flex flex-col h-full w-full overflow-hidden border-none shadow-none bg-transparent">
      <CardHeader className="p-3 border-b border-border flex-shrink-0">
        <CardTitle className="text-lg font-medium text-foreground">Lịch sử giao dịch</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-3 overflow-y-auto">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Lỗi</AlertTitle>
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
        )}

        {!isConnected ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Chưa kết nối</AlertTitle>
            <AlertDescription>
              Vui lòng kết nối tài khoản Binance trong phần cài đặt để xem lịch sử giao dịch.
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-2">
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        ) : trades.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            {error ? "Không thể tải lịch sử giao dịch." : "Không tìm thấy giao dịch nào."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Thời gian</TableHead>
                <TableHead className="text-xs">Cặp</TableHead>
                <TableHead className="text-xs">Loại</TableHead>
                <TableHead className="text-xs">Giá</TableHead>
                <TableHead className="text-xs">Số lượng</TableHead>
                <TableHead className="text-xs">Tổng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.map((trade) => (
                <TableRow key={`${trade.symbol}-${trade.id}`}>
                  <TableCell className="text-xs">
                    {formatDate(trade.time)}
                  </TableCell>
                  <TableCell className="text-xs">
                    {trade.symbol}
                  </TableCell>
                  <TableCell className="text-xs">
                    <Badge 
                      variant={trade.isBuyer ? "default" : "destructive"}
                      className={`text-xs ${trade.isBuyer ? 'bg-green-600' : 'bg-red-600'}`}
                    >
                      {trade.isBuyer ? 'MUA' : 'BÁN'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {parseFloat(trade.price).toLocaleString('vi-VN', { maximumFractionDigits: 8 })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {parseFloat(trade.qty).toLocaleString('vi-VN', { maximumFractionDigits: 8 })}
                  </TableCell>
                  <TableCell className="text-xs">
                    {parseFloat(trade.quoteQty).toLocaleString('vi-VN', { maximumFractionDigits: 8 })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default TradeHistory; 