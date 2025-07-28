import { botManager } from './bot-manager';

// Khởi tạo BotManager khi server start
export async function initializeBotManager() {
  try {
    console.log('🚀 Initializing BotManager...');
    
    // Khởi tạo BotManager
    await botManager.initialize();
    
    console.log('✅ BotManager initialized successfully');
    console.log('📊 Current running bots:', botManager.getRunningBotsCount());
    
    // KHÔNG khôi phục bot từ database để tránh "ghost trading"
    console.log('⚠️ Skipping bot restoration from database to prevent ghost trading');
    
  } catch (error) {
    console.error('❌ Failed to initialize BotManager:', error);
    throw error;
  }
}

// Export để có thể gọi từ các nơi khác
export { botManager }; 