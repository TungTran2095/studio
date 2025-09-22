import { supabase } from '@/lib/supabase-client';

export interface BotStats {
  total_trades: number;
  total_profit: number;
  win_rate: number;
  avg_win_net: number;
  avg_loss_net: number;
}

// Function để tính toán stats cho bot dựa trên trades
export async function calculateBotStats(botId: string, fallbackBot?: any): Promise<BotStats> {
  try {
    if (!supabase) {
      throw new Error('Supabase client is not initialized');
    }

    console.log(`[BotStatsCalculator] Calculating stats for bot: ${botId}`);

    // Lấy tất cả trades của bot
    const { data: trades, error } = await supabase
      .from('trades')
      .select('*')
      .eq('bot_id', botId)
      .order('open_time', { ascending: true });

    if (error) {
      console.error(`[BotStatsCalculator] Error fetching trades for bot ${botId}:`, error);
      return {
        total_trades: 0,
        total_profit: 0,
        win_rate: 0,
        avg_win_net: 0,
        avg_loss_net: 0
      };
    }

    console.log(`[BotStatsCalculator] Found ${trades?.length || 0} trades for bot ${botId}`);

    if (!trades || trades.length === 0) {
      console.log(`[BotStatsCalculator] No trades found for bot ${botId}`);
      
      // Nếu có fallback bot data, sử dụng dữ liệu từ đó
      if (fallbackBot) {
        console.log(`[BotStatsCalculator] Using fallback bot data for ${botId}`);
        return {
          total_trades: fallbackBot.total_trades || 0,
          total_profit: fallbackBot.total_profit || 0,
          win_rate: fallbackBot.win_rate || 0,
          avg_win_net: fallbackBot.avg_win_net || 0,
          avg_loss_net: fallbackBot.avg_loss_net || 0
        };
      }
      
      console.log(`[BotStatsCalculator] No fallback data, returning zero stats`);
      return {
        total_trades: 0,
        total_profit: 0,
        win_rate: 0,
        avg_win_net: 0,
        avg_loss_net: 0
      };
    }

    // Gộp các giao dịch cùng side liên tiếp
    const groupedTrades = [];
    let currentGroup = null;

    for (const trade of trades) {
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
          endTime: trade.open_time || trade.created_at
        };
      } else {
        // Thêm vào nhóm hiện tại
        currentGroup.trades.push(trade);
        currentGroup.totalQuantity += Number(trade.quantity || 0);
        currentGroup.totalValue += Number(trade.quantity || 0) * Number(trade.entry_price || 0);
        currentGroup.avgPrice = currentGroup.totalValue / currentGroup.totalQuantity;
        currentGroup.endTime = trade.open_time || trade.created_at;
      }
    }

    // Thêm nhóm cuối cùng
    if (currentGroup) {
      groupedTrades.push(currentGroup);
    }

    // Ghép cặp buy-sell
    const pairs = [];
    let lastBuyGroup = null;

    for (const group of groupedTrades) {
      if (group.side === 'buy') {
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

    // Tính toán stats
    const totalTrades = pairs.length;
    const totalProfit = pairs.reduce((sum, pair) => sum + pair.pnl, 0);
    
    // Tính win rate và phân loại pairs
    const winPairs = pairs.filter(pair => pair.pnl > 0);
    const lossPairs = pairs.filter(pair => pair.pnl < 0);
    const winRate = totalTrades > 0 ? (winPairs.length / totalTrades) * 100 : 0;
    
    // Tính tổng giá trị buy và sell của các cặp thắng
    const totalWinBuyValue = winPairs.reduce((sum, pair) => sum + pair.buyValue, 0);
    const totalWinSellValue = winPairs.reduce((sum, pair) => sum + pair.sellValue, 0);
    
    // Tính tổng giá trị buy và sell của các cặp thua
    const totalLossBuyValue = lossPairs.reduce((sum, pair) => sum + pair.buyValue, 0);
    const totalLossSellValue = lossPairs.reduce((sum, pair) => sum + pair.sellValue, 0);
    
    // Avg Win Net = (Tổng sell - Tổng buy) của các giao dịch thắng / Tổng buy của các giao dịch thắng
    const avgWinNet = totalWinBuyValue > 0 
      ? ((totalWinSellValue - totalWinBuyValue) / totalWinBuyValue) * 100 
      : 0;
    
    // Avg Loss Net = (Tổng buy - Tổng sell) của các giao dịch thua / Tổng buy của các giao dịch thua
    const avgLossNet = totalLossBuyValue > 0 
      ? ((totalLossBuyValue - totalLossSellValue) / totalLossBuyValue) * 100 
      : 0;

    const result = {
      total_trades: totalTrades,
      total_profit: totalProfit,
      win_rate: winRate,
      avg_win_net: avgWinNet,
      avg_loss_net: avgLossNet
    };

    console.log(`[BotStatsCalculator] Calculated stats for bot ${botId}:`, result);
    return result;

  } catch (error) {
    console.error('Error calculating bot stats:', error);
    return {
      total_trades: 0,
      total_profit: 0,
      win_rate: 0,
      avg_win_net: 0,
      avg_loss_net: 0
    };
  }
}

// Function để tính toán stats cho nhiều bots
export async function calculateMultipleBotsStats(botIds: string[], botsData?: any[]): Promise<Record<string, BotStats>> {
  const results: Record<string, BotStats> = {};
  
  // Tính toán song song cho tất cả bots
  const promises = botIds.map(async (botId) => {
    const fallbackBot = botsData?.find(bot => bot.id === botId);
    const stats = await calculateBotStats(botId, fallbackBot);
    results[botId] = stats;
  });
  
  await Promise.all(promises);
  
  return results;
}
