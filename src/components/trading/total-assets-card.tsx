import { Card, CardContent } from '@/components/ui/card';
import { useAssetStore } from '@/store/asset-store';
import { useMemo, useEffect, useState } from 'react';

export function TotalAssetsCard({ className = '' }: { className?: string }) {
  const accounts = useAssetStore(state => state.accounts);
  const [btcUsdt, setBtcUsdt] = useState<number | null>(null);

  // Lấy giá BTCUSDT realtime
  useEffect(() => {
    async function fetchPrice() {
      try {
        const res = await fetch('https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT');
        const data = await res.json();
        setBtcUsdt(parseFloat(data.price));
      } catch {
        setBtcUsdt(null);
      }
    }
    fetchPrice();
    const interval = setInterval(fetchPrice, 30000); // cập nhật mỗi 30s
    return () => clearInterval(interval);
  }, []);

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