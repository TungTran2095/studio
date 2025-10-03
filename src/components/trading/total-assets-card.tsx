import { Card, CardContent } from '@/components/ui/card';
import { useAssetStore } from '@/store/asset-store';
import { useMemo } from 'react';
import { useWebSocketPrice } from '@/hooks/use-websocket-price';

export function TotalAssetsCard({ className = '' }: { className?: string }) {
  const accounts = useAssetStore(state => state.accounts);
  
  // Sử dụng WebSocket thay vì REST API để lấy giá BTCUSDT
  const { price: btcUsdtPrice, isLoading, error } = useWebSocketPrice({ 
    symbol: 'BTCUSDT',
    fallbackToRest: true // Cho phép fallback nếu WebSocket không hoạt động
  });

  const btcUsdt = btcUsdtPrice ? parseFloat(btcUsdtPrice) : null;

  // Tính tổng tài sản quy đổi về USDT
  const { totalBTC, totalUSDT, totalInUSDT } = useMemo(() => {
    let btc = 0, usdt = 0;
    accounts.forEach(acc => {
      acc.assets.forEach(asset => {
        if (asset.symbol === 'BTC') btc += asset.quantity;
        if (asset.symbol === 'USDT') usdt += asset.quantity;
      });
    });
    const totalInUSDT = btcUsdt ? (btc * btcUsdt + usdt) : null;
    return { totalBTC: btc, totalUSDT: usdt, totalInUSDT };
  }, [accounts, btcUsdt]);

  return (
    <Card className={`p-2 flex flex-col items-start justify-center shadow-sm border border-primary/30 ${className}`} style={{ minWidth: 0, width: '100%' }}>
      <CardContent className="p-2 flex flex-col gap-1">
        <div className="text-xs font-semibold text-muted-foreground mb-1">Tổng tài sản (quy đổi USDT)</div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-bold">{totalInUSDT !== null ? totalInUSDT.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '--'} USDT</span>
          <span className="text-xs text-muted-foreground">({totalBTC.toLocaleString('en-US', { maximumFractionDigits: 8 })} BTC, {totalUSDT.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDT)</span>
          {btcUsdt && <span className="text-xs text-muted-foreground">BTC/USDT: {btcUsdt.toLocaleString('en-US', { maximumFractionDigits: 2 })}</span>}
        </div>
      </CardContent>
    </Card>
  );
} 