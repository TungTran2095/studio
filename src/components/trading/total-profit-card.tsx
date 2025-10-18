"use client";

import { Card, CardContent } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase-client';

interface BotStats {
  total_trades: number;
  total_profit: number;
  win_rate: number;
  avg_win_net: number;
  avg_loss_net: number;
}

interface BotData {
  id: string;
  name: string;
  total_profit: number;
}

export function TotalProfitCard() {
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [botsData, setBotsData] = useState<BotData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function calculateTotalProfit() {
      setIsLoading(true);
      
      if (!supabase) {
        console.log('Supabase not initialized');
        setTotalProfit(0);
        setIsLoading(false);
        return;
      }

      try {
        console.log('Calculating total profit from all bots...');
        
        // Sử dụng API endpoint để lấy bots với stats đã tính toán
        const response = await fetch('/api/trading/bot?projectId=all');
        if (response.ok) {
          const botsData = await response.json();
          console.log('Fetched bots for total profit calculation:', botsData);
          
          // Lưu dữ liệu bot để hiển thị chi tiết
          const botsWithProfit = botsData.map((bot: any) => ({
            id: bot.id,
            name: bot.name || `Bot ${bot.id.slice(0, 8)}`,
            total_profit: bot.total_profit || 0
          }));
          setBotsData(botsWithProfit);
          
          // Tính tổng lợi nhuận từ tất cả bots
          const total = botsData.reduce((sum: number, bot: any) => {
            return sum + (bot.total_profit || 0);
          }, 0);
          
          setTotalProfit(total);
        } else {
          // Fallback: thử lấy từ bảng trading_bots trực tiếp
          let { data: botsData, error } = await supabase
            .from('trading_bots')
            .select('id, name, total_profit')
            .not('total_profit', 'is', null);

          if (error) {
            console.log('trading_bots table error:', error);
            // Thử với bảng khác nếu có
            const { data: altBotsData, error: altError } = await supabase
              .from('research_experiments')
              .select('id, name, total_profit')
              .eq('type', 'backtest')
              .not('total_profit', 'is', null);
            
            if (altError) {
              console.error('Both tables failed:', altError);
              setTotalProfit(0);
              setBotsData([]);
            } else {
              console.log('Using research_experiments for total profit:', altBotsData);
              const botsWithProfit = altBotsData.map((bot: any) => ({
                id: bot.id,
                name: bot.name || `Bot ${bot.id.slice(0, 8)}`,
                total_profit: bot.total_profit || 0
              }));
              setBotsData(botsWithProfit);
              
              const total = altBotsData.reduce((sum: number, bot: any) => {
                return sum + (bot.total_profit || 0);
              }, 0);
              setTotalProfit(total);
            }
          } else {
            console.log('Fetched bots from trading_bots for total profit:', botsData);
            const botsWithProfit = botsData.map((bot: any) => ({
              id: bot.id,
              name: bot.name || `Bot ${bot.id.slice(0, 8)}`,
              total_profit: bot.total_profit || 0
            }));
            setBotsData(botsWithProfit);
            
            const total = botsData.reduce((sum: number, bot: any) => {
              return sum + (bot.total_profit || 0);
            }, 0);
            setTotalProfit(total);
          }
        }
      } catch (error) {
        console.error('Error calculating total profit:', error);
        setTotalProfit(0);
        setBotsData([]);
      }
      
      setIsLoading(false);
    }

    calculateTotalProfit();
    
    // Cập nhật mỗi 30 giây
    const interval = setInterval(calculateTotalProfit, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-2 flex flex-col items-start justify-center shadow-sm border border-primary/30">
      <CardContent className="p-2 flex flex-col gap-1">
        <div className="text-xs font-semibold text-muted-foreground mb-1">Lợi nhuận</div>
        <div className={`text-sm font-bold ${isLoading ? 'text-muted' : totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {isLoading ? '...' : `$${totalProfit.toFixed(2)}`}
        </div>
        
        {/* Chi tiết lợi nhuận từng bot */}
        {!isLoading && botsData.length > 0 && (
          <div className="mt-2 space-y-1">
            <div className="text-xs text-muted-foreground">Chi tiết:</div>
            <div className="max-h-20 overflow-y-auto space-y-0.5">
              {botsData.map((bot) => (
                <div key={bot.id} className="text-xs flex justify-between items-center">
                  <span className="truncate max-w-[80px]" title={bot.name}>
                    {bot.name}
                  </span>
                  <span className={`font-medium ${bot.total_profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${bot.total_profit.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
