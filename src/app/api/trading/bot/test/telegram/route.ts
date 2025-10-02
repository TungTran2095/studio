import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/notifications/telegram-service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { botName } = body;

    if (!botName) {
      return NextResponse.json({
        success: false,
        error: 'Bot name is required'
      }, { status: 400 });
    }

    // Kiểm tra Telegram service có được enable không
    if (!telegramService.isEnabled()) {
      return NextResponse.json({
        success: false,
        error: 'Telegram service chưa được cấu hình. Vui lòng thêm TELEGRAM_BOT_TOKEN và TELEGRAM_CHAT_ID vào file .env'
      }, { status: 400 });
    }

    // Test connection trước
    const connectionTest = await telegramService.testConnection();
    if (!connectionTest) {
      return NextResponse.json({
        success: false,
        error: 'Không thể kết nối đến Telegram Bot. Kiểm tra lại TELEGRAM_BOT_TOKEN'
      }, { status: 400 });
    }

    // Gửi test notification
    const testResult = await telegramService.sendTradingNotification({
      botName: botName,
      action: 'START',
      timestamp: new Date(),
    });

    if (testResult) {
      return NextResponse.json({
        success: true,
        message: 'Test notification đã được gửi thành công đến Telegram!'
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Không thể gửi test notification. Kiểm tra lại TELEGRAM_CHAT_ID'
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('Test Telegram notification error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Lỗi server khi test Telegram notification'
    }, { status: 500 });
  }
}
