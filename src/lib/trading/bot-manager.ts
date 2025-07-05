import { BotExecutor } from './bot-executor';
import { TradingBot } from './trading-bot';
import { supabase } from '@/lib/supabase-client';

class BotManager {
  private static instance: BotManager;
  private runningBots: Map<string, BotExecutor> = new Map();
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  async initialize() {
    if (this.isInitialized) return;
    
    console.log('[BotManager] Khởi tạo BotManager...');
    
    // Khôi phục các bot đang running từ database
    await this.restoreRunningBots();
    
    this.isInitialized = true;
    console.log('[BotManager] BotManager đã khởi tạo xong');
  }

  private async restoreRunningBots() {
    try {
      console.log('[BotManager] Khôi phục các bot đang running...');
      
      if (!supabase) {
        console.error('[BotManager] Supabase client chưa được khởi tạo');
        return;
      }
      
      const { data: runningBots, error } = await supabase
        .from('trading_bots')
        .select('*')
        .eq('status', 'running');

      if (error) {
        console.error('[BotManager] Lỗi khi lấy danh sách bot running:', error);
        return;
      }

      if (!runningBots || runningBots.length === 0) {
        console.log('[BotManager] Không có bot nào đang running');
        return;
      }

      console.log(`[BotManager] Tìm thấy ${runningBots.length} bot đang running, khôi phục...`);

      for (const bot of runningBots) {
        try {
          await this.startBot(bot as TradingBot);
        } catch (error) {
          console.error(`[BotManager] Lỗi khi khôi phục bot ${bot.name}:`, error);
          // Cập nhật status bot về stopped nếu không thể khôi phục
          await this.updateBotStatus(bot.id, 'stopped');
        }
      }
    } catch (error) {
      console.error('[BotManager] Lỗi khi khôi phục bot:', error);
    }
  }

  async startBot(bot: TradingBot): Promise<boolean> {
    try {
      console.log(`[BotManager] Bắt đầu start bot: ${bot.name} (${bot.id})`);
      
      // Kiểm tra xem bot đã đang chạy chưa
      if (this.runningBots.has(bot.id)) {
        console.log(`[BotManager] Bot ${bot.name} đã đang chạy`);
        return true;
      }

      // Tạo BotExecutor mới
      const executor = new BotExecutor(bot);
      
      // Khởi tạo bot
      const initialized = await executor.initialize();
      if (!initialized) {
        console.error(`[BotManager] Không thể khởi tạo bot ${bot.name}`);
        return false;
      }

      // Lưu executor vào map
      this.runningBots.set(bot.id, executor);
      
      // Chạy bot trong background (không await)
      this.runBotInBackground(bot.id, executor);
      
      console.log(`[BotManager] Bot ${bot.name} đã được khởi động thành công`);
      return true;
      
    } catch (error) {
      console.error(`[BotManager] Lỗi khi start bot ${bot.name}:`, error);
      return false;
    }
  }

  private async runBotInBackground(botId: string, executor: BotExecutor) {
    try {
      console.log(`[BotManager] Chạy bot ${botId} trong background...`);
      
      // Cập nhật status bot thành running
      await this.updateBotStatus(botId, 'running');
      
      // Chạy bot trong background
      executor.start().catch(async (error) => {
        console.error(`[BotManager] Bot ${botId} gặp lỗi:`, error);
        await this.stopBot(botId);
      });
      
    } catch (error) {
      console.error(`[BotManager] Lỗi khi chạy bot ${botId} trong background:`, error);
      await this.stopBot(botId);
    }
  }

  async stopBot(botId: string): Promise<boolean> {
    try {
      console.log(`[BotManager] Dừng bot: ${botId}`);
      
      const executor = this.runningBots.get(botId);
      if (!executor) {
        console.log(`[BotManager] Bot ${botId} không đang chạy`);
        return true;
      }

      // Dừng executor
      await executor.stop();
      
      // Xóa khỏi map
      this.runningBots.delete(botId);
      
      // Cập nhật status bot
      await this.updateBotStatus(botId, 'stopped');
      
      console.log(`[BotManager] Bot ${botId} đã được dừng thành công`);
      return true;
      
    } catch (error) {
      console.error(`[BotManager] Lỗi khi stop bot ${botId}:`, error);
      return false;
    }
  }

  async stopAllBots(): Promise<void> {
    console.log('[BotManager] Dừng tất cả bot...');
    
    const botIds = Array.from(this.runningBots.keys());
    for (const botId of botIds) {
      await this.stopBot(botId);
    }
    
    console.log('[BotManager] Đã dừng tất cả bot');
  }

  isBotRunning(botId: string): boolean {
    return this.runningBots.has(botId);
  }

  getRunningBotsCount(): number {
    return this.runningBots.size;
  }

  private async updateBotStatus(botId: string, status: TradingBot['status']) {
    try {
      if (!supabase) {
        console.error('[BotManager] Supabase client chưa được khởi tạo');
        return;
      }
      
      const { error } = await supabase
        .from('trading_bots')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
        })
        .eq('id', botId);

      if (error) {
        console.error('[BotManager] Lỗi khi cập nhật status bot:', error);
      }
    } catch (error) {
      console.error('[BotManager] Lỗi khi cập nhật status bot:', error);
    }
  }
}

export const botManager = BotManager.getInstance(); 