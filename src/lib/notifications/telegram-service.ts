// Telegram Bot notification service
export interface TelegramMessage {
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  disable_web_page_preview?: boolean;
}

export interface TradingNotification {
  botName: string;
  action: 'BUY' | 'SELL' | 'ERROR' | 'START' | 'STOP';
  symbol?: string;
  price?: number;
  quantity?: number;
  value?: number;
  error?: string;
  timestamp: Date;
}

class TelegramService {
  private botToken: string | null = null;
  private chatId: string | null = null;
  private enabled: boolean = false;

  constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || null;
    this.chatId = process.env.TELEGRAM_CHAT_ID || null;
    this.enabled = !!(this.botToken && this.chatId);
    
    if (this.enabled) {
      console.log('[TelegramService] ✅ Telegram notifications enabled');
    } else {
      console.log('[TelegramService] ⚠️ Telegram notifications disabled - missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID');
    }
  }

  async sendMessage(message: TelegramMessage): Promise<boolean> {
    if (!this.enabled) {
      console.log('[TelegramService] Skipping message - service disabled');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/sendMessage`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: this.chatId,
          text: message.text,
          parse_mode: message.parse_mode || 'HTML',
          disable_web_page_preview: message.disable_web_page_preview ?? true,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[TelegramService] Failed to send message:', response.status, errorText);
        return false;
      }

      console.log('[TelegramService] ✅ Message sent successfully');
      return true;
    } catch (error) {
      console.error('[TelegramService] Error sending message:', error);
      return false;
    }
  }

  async sendTradingNotification(notification: TradingNotification): Promise<boolean> {
    const message = this.formatTradingMessage(notification);
    return await this.sendMessage(message);
  }

  private formatTradingMessage(notification: TradingNotification): TelegramMessage {
    const { botName, action, symbol, price, quantity, value, error, timestamp } = notification;
    const timeStr = timestamp.toLocaleString('vi-VN', { 
      timeZone: 'Asia/Ho_Chi_Minh',
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    let emoji = '';
    let title = '';
    let details = '';

    switch (action) {
      case 'BUY':
        emoji = '🟢';
        title = `<b>${emoji} MUA THÀNH CÔNG</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
💰 <b>Symbol:</b> ${symbol}
💵 <b>Giá:</b> $${price?.toFixed(2)}
📦 <b>Số lượng:</b> ${quantity?.toFixed(6)}
💎 <b>Giá trị:</b> $${value?.toFixed(2)}`;
        break;

      case 'SELL':
        emoji = '🔴';
        title = `<b>${emoji} BÁN THÀNH CÔNG</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
💰 <b>Symbol:</b> ${symbol}
💵 <b>Giá:</b> $${price?.toFixed(2)}
📦 <b>Số lượng:</b> ${quantity?.toFixed(6)}
💎 <b>Giá trị:</b> $${value?.toFixed(2)}`;
        break;

      case 'ERROR':
        emoji = '❌';
        title = `<b>${emoji} LỖI BOT</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
⚠️ <b>Lỗi:</b> ${error}`;
        break;

      case 'START':
        emoji = '🚀';
        title = `<b>${emoji} BOT KHỞI ĐỘNG</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
✅ <b>Trạng thái:</b> Đang chạy`;
        break;

      case 'STOP':
        emoji = '🛑';
        title = `<b>${emoji} BOT DỪNG</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
⏹️ <b>Trạng thái:</b> Đã dừng`;
        break;

      default:
        emoji = 'ℹ️';
        title = `<b>${emoji} THÔNG BÁO BOT</b>`;
        details = `
📊 <b>Bot:</b> ${botName}
📝 <b>Action:</b> ${action}`;
    }

    const text = `${title}

${details}

🕐 <b>Thời gian:</b> ${timeStr}

━━━━━━━━━━━━━━━━━━━━`;

    return {
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    };
  }

  // Test connection
  async testConnection(): Promise<boolean> {
    if (!this.enabled) {
      console.log('[TelegramService] Cannot test - service disabled');
      return false;
    }

    try {
      const url = `https://api.telegram.org/bot${this.botToken}/getMe`;
      const response = await fetch(url);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[TelegramService] ✅ Connection test successful:', data.result.username);
        return true;
      } else {
        console.error('[TelegramService] ❌ Connection test failed:', response.status);
        return false;
      }
    } catch (error) {
      console.error('[TelegramService] ❌ Connection test error:', error);
      return false;
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}

// Export singleton instance
export const telegramService = new TelegramService();

// Helper functions for common notifications
export const notifyTrade = async (
  botName: string, 
  action: 'BUY' | 'SELL', 
  symbol: string, 
  price: number, 
  quantity: number
) => {
  const value = price * quantity;
  return await telegramService.sendTradingNotification({
    botName,
    action,
    symbol,
    price,
    quantity,
    value,
    timestamp: new Date(),
  });
};

export const notifyError = async (botName: string, error: string) => {
  return await telegramService.sendTradingNotification({
    botName,
    action: 'ERROR',
    error,
    timestamp: new Date(),
  });
};

export const notifyBotStatus = async (botName: string, action: 'START' | 'STOP') => {
  return await telegramService.sendTradingNotification({
    botName,
    action,
    timestamp: new Date(),
  });
};
