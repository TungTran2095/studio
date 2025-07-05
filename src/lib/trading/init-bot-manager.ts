import { botManager } from './bot-manager';

let isInitialized = false;

export async function initializeBotManager() {
  if (isInitialized) return;
  
  try {
    console.log('[Init] Khởi tạo BotManager...');
    await botManager.initialize();
    isInitialized = true;
    console.log('[Init] BotManager đã được khởi tạo thành công');
  } catch (error) {
    console.error('[Init] Lỗi khi khởi tạo BotManager:', error);
  }
}

// Khởi tạo ngay khi module được load
if (typeof window === 'undefined') {
  // Chỉ chạy trên server side
  initializeBotManager().catch(console.error);
} 