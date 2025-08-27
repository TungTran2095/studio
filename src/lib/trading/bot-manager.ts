import { BotExecutor } from './bot-executor';
import { TradingBot } from './trading-bot';
import { supabase } from '@/lib/supabase-client';
import { createClient } from '@supabase/supabase-js';

class BotManager {
  private static instance: BotManager;
  private runningBots: Map<string, BotExecutor> = new Map();
  private isInitialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  
  // Supabase admin client để bypass RLS
  private supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  private constructor() {}

  static getInstance(): BotManager {
    if (!BotManager.instance) {
      BotManager.instance = new BotManager();
    }
    return BotManager.instance;
  }

  async initialize() {
    // Đảm bảo chỉ khởi tạo một lần
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    if (this.isInitialized) {
      console.log('[BotManager] Đã được khởi tạo trước đó');
      return;
    }

    this.initializationPromise = this._initialize();
    return this.initializationPromise;
  }

  private async _initialize() {
    try {
      console.log('[BotManager] 🚀 Bắt đầu khởi tạo BotManager...');
      
      // Đảm bảo tất cả bot trong database có status 'stopped' khi khởi động
      await this.ensureAllBotsStopped();
      
      // Khôi phục các bot đang running từ database (nếu có)
      await this.restoreRunningBots();
      
      this.isInitialized = true;
      console.log('[BotManager] ✅ BotManager đã khởi tạo thành công');
    } catch (error) {
      console.error('[BotManager] ❌ Lỗi khi khởi tạo:', error);
      throw error;
    }
  }

  private async ensureAllBotsStopped() {
    try {
      console.log('[BotManager] 🔒 Đảm bảo tất cả bot đều stopped...');
      
      // Cập nhật tất cả bot về status 'stopped' sử dụng supabaseAdmin
      const { error } = await this.supabaseAdmin
        .from('trading_bots')
        .update({ 
          status: 'stopped',
          updated_at: new Date().toISOString()
        })
        .eq('status', 'running');

      if (error) {
        console.error('[BotManager] Lỗi khi cập nhật bot status:', error);
      } else {
        console.log('[BotManager] ✅ Đã đảm bảo tất cả bot đều stopped');
      }
    } catch (error) {
      console.error('[BotManager] Lỗi khi ensure all bots stopped:', error);
    }
  }

  private async restoreRunningBots() {
    try {
      console.log('[BotManager] 🔄 Khôi phục các bot đang running...');
      
      const { data: runningBots, error } = await this.supabaseAdmin
        .from('trading_bots')
        .select('*')
        .eq('status', 'running');

      if (error) {
        console.error('[BotManager] Lỗi khi lấy danh sách bot running:', error);
        return;
      }

      if (!runningBots || runningBots.length === 0) {
        console.log('[BotManager] ✅ Không có bot nào đang running');
        return;
      }

      console.log(`[BotManager] ⚠️ Tìm thấy ${runningBots.length} bot đang running, sẽ dừng chúng...`);

      for (const bot of runningBots) {
        try {
          // Cập nhật status về stopped thay vì khôi phục
          await this.updateBotStatus(bot.id, 'stopped');
          console.log(`[BotManager] ✅ Đã dừng bot ${bot.name} (${bot.id})`);
        } catch (error) {
          console.error(`[BotManager] ❌ Lỗi khi dừng bot ${bot.name}:`, error);
        }
      }
    } catch (error) {
      console.error('[BotManager] Lỗi khi restore running bots:', error);
    }
  }

  async startBot(bot: TradingBot): Promise<boolean> {
    try {
      // Đảm bảo BotManager đã được khởi tạo
      await this.initialize();
      
      console.log(`[BotManager] 🚀 Bắt đầu start bot: ${bot.name} (${bot.id})`);
      console.log(`[BotManager] 📊 Bot config:`, {
        symbol: bot.config?.trading?.symbol || 'BTCUSDT',
        strategy: bot.config?.strategy?.type || 'unknown',
        positionSize: bot.config?.positionSize || 10,
        testnet: bot.config?.account?.testnet || false
      });
      
      // Kiểm tra xem bot đã đang chạy chưa
      if (this.runningBots.has(bot.id)) {
        console.log(`[BotManager] ⚠️ Bot ${bot.name} đã đang chạy trong memory`);
        return true;
      }

      // Kiểm tra trạng thái trong database
      console.log(`[BotManager] 🔍 Kiểm tra trạng thái bot ${bot.name} trong database...`);
      const { data: dbBot } = await this.supabaseAdmin
        .from('trading_bots')
        .select('status')
        .eq('id', bot.id)
        .single();

      if (dbBot && dbBot.status === 'running') {
        console.log(`[BotManager] ⚠️ Bot ${bot.name} đã running trong database, dừng trước`);
        await this.stopBot(bot.id);
      }

      // Tạo BotExecutor mới
      console.log(`[BotManager] 🔧 Tạo BotExecutor cho bot ${bot.name}...`);
      const executor = new BotExecutor(bot);
      
      // Khởi tạo bot
      console.log(`[BotManager] 🔄 Khởi tạo bot ${bot.name}...`);
      const initialized = await executor.initialize();
      if (!initialized) {
        console.error(`[BotManager] ❌ Không thể khởi tạo bot ${bot.name}`);
        return false;
      }
      console.log(`[BotManager] ✅ Bot ${bot.name} đã được khởi tạo thành công`);

      // Lưu executor vào map
      this.runningBots.set(bot.id, executor);
      console.log(`[BotManager] 📝 Bot ${bot.name} đã được thêm vào runningBots map`);
      
      // Chạy bot trong background (không await)
      console.log(`[BotManager] 🔄 Bắt đầu chạy bot ${bot.name} trong background...`);
      this.runBotInBackground(bot.id, executor);
      
      console.log(`[BotManager] ✅ Bot ${bot.name} đã được khởi động thành công`);
      console.log(`[BotManager] 📊 Tổng số bot đang chạy: ${this.runningBots.size}`);
      return true;
      
    } catch (error) {
      console.error(`[BotManager] ❌ Lỗi khi start bot ${bot.name}:`, error);
      return false;
    }
  }

  private async runBotInBackground(botId: string, executor: BotExecutor) {
    try {
      console.log(`[BotManager] 🔄 Chạy bot ${botId} trong background...`);
      
      // Cập nhật status bot thành running
      await this.updateBotStatus(botId, 'running');
      
      // Chạy bot trong background
      executor.start().catch(async (error) => {
        console.error(`[BotManager] ❌ Bot ${botId} gặp lỗi:`, error);
        await this.stopBot(botId);
      });
      
    } catch (error) {
      console.error(`[BotManager] ❌ Lỗi khi chạy bot ${botId} trong background:`, error);
      await this.stopBot(botId);
    }
  }

  async stopBot(botId: string): Promise<boolean> {
    try {
      console.log(`[BotManager] 🛑 Dừng bot: ${botId}`);
      
      // Cập nhật status ngay lập tức để ngăn chặn giao dịch mới
      await this.updateBotStatus(botId, 'stopped');
      
      const executor = this.runningBots.get(botId);
      if (!executor) {
        console.log(`[BotManager] ℹ️ Bot ${botId} không đang chạy trong memory`);
        return true;
      }

      // Dừng executor
      await executor.stop();
      
      // Xóa khỏi map
      this.runningBots.delete(botId);
      
      // Đảm bảo status đã được cập nhật
      try {
        const { data: botStatus } = await this.supabaseAdmin
          .from('trading_bots')
          .select('status')
          .eq('id', botId)
          .single();
        
        if (botStatus && botStatus.status !== 'stopped') {
          console.log(`[BotManager] ⚠️ Bot ${botId} status not properly updated, forcing stop`);
          await this.updateBotStatus(botId, 'stopped');
        }
      } catch (error) {
        console.error(`[BotManager] Error verifying bot ${botId} stop status:`, error);
      }
      
      console.log(`[BotManager] ✅ Bot ${botId} đã được dừng thành công`);
      return true;
      
    } catch (error) {
      console.error(`[BotManager] ❌ Lỗi khi stop bot ${botId}:`, error);
      return false;
    }
  }

  async stopAllBots(): Promise<void> {
    console.log('[BotManager] 🛑 Dừng tất cả bot...');
    
    const botIds = Array.from(this.runningBots.keys());
    console.log(`[BotManager] 📋 Tìm thấy ${botIds.length} bot đang chạy:`, botIds);
    
    for (const botId of botIds) {
      await this.stopBot(botId);
    }
    
    console.log('[BotManager] ✅ Đã dừng tất cả bot');
  }

  isBotRunning(botId: string): boolean {
    return this.runningBots.has(botId);
  }

  getRunningBotsCount(): number {
    return this.runningBots.size;
  }

  getRunningBots(): string[] {
    return Array.from(this.runningBots.keys());
  }

  private async updateBotStatus(botId: string, status: TradingBot['status']) {
    try {
      console.log(`[BotManager] 📊 Cập nhật status bot ${botId}: ${status}`);
      
      // Sử dụng supabaseAdmin để bypass RLS
      const { error } = await this.supabaseAdmin
        .from('trading_bots')
        .update({ 
          status,
          updated_at: new Date().toISOString(),
          ...(status === 'running' ? { last_run_at: new Date().toISOString() } : {})
        })
        .eq('id', botId);

      if (error) {
        console.error('[BotManager] ❌ Lỗi khi cập nhật status bot:', error);
      } else {
        console.log(`[BotManager] ✅ Đã cập nhật status bot ${botId}: ${status}`);
      }
    } catch (error) {
      console.error('[BotManager] ❌ Lỗi khi cập nhật status bot:', error);
    }
  }
}

export const botManager = BotManager.getInstance(); 