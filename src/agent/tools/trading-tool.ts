/**
 * Công cụ giao dịch cho AI Agent
 */
import { Tool, AgentContext } from '../types';
import { executeChatTrade } from '@/actions/chat-trade';

export const tradingTool: Tool = {
  name: 'tradingTool',
  description: 'Công cụ thực hiện giao dịch tiền điện tử',
  
  async execute(message: string, context: AgentContext, entities?: Record<string, any>): Promise<any> {
    console.log('[tradingTool] Đang chuẩn bị giao dịch...');
    
    // Kiểm tra xem người dùng đã cung cấp API key và secret chưa
    if (!context.apiKey || !context.apiSecret) {
      return {
        success: false,
        error: 'Thiếu thông tin API key/secret để thực hiện giao dịch. Vui lòng thiết lập API key trước khi sử dụng tính năng này.'
      };
    }
    
    // Kiểm tra xem có thông tin giao dịch không
    if (!entities?.tradingIntent) {
      return {
        success: false,
        error: 'Không tìm thấy thông tin giao dịch cụ thể'
      };
    }
    
    const tradingIntent = entities.tradingIntent;
    
    try {
      // Chuẩn bị dữ liệu đầu vào cho hàm giao dịch
      const tradeInput = {
        response: message, // Đây là tin nhắn từ AI, chưa có trường hợp sử dụng thực tế
        tradingIntent: {
          detected: true,
          action: tradingIntent.action || 'NONE',
          symbol: tradingIntent.symbol,
          quantity: tradingIntent.quantity,
          orderType: tradingIntent.orderType || 'MARKET',
          price: tradingIntent.price,
          portfolio: tradingIntent.portfolio
        }
      };
      
      // Thực hiện giao dịch
      console.log('[tradingTool] Gọi API giao dịch với thông tin:', {
        action: tradeInput.tradingIntent.action,
        symbol: tradeInput.tradingIntent.symbol,
        quantity: tradeInput.tradingIntent.quantity,
        orderType: tradeInput.tradingIntent.orderType,
        price: tradeInput.tradingIntent.price,
        hasPortfolio: !!tradeInput.tradingIntent.portfolio
      });
      
      const tradeResult = await executeChatTrade(
        tradeInput,
        context.apiKey,
        context.apiSecret,
        context.isTestnet
      );
      
      if (tradeResult.success) {
        console.log('[tradingTool] Giao dịch thành công:', tradeResult.message);
        return {
          success: true,
          message: tradeResult.message,
          data: tradeResult.data
        };
      } else {
        console.warn('[tradingTool] Giao dịch thất bại:', tradeResult.message);
        return {
          success: false,
          error: tradeResult.message
        };
      }
    } catch (error: any) {
      console.error('[tradingTool] Lỗi khi thực hiện giao dịch:', error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi thực hiện giao dịch'
      };
    }
  }
}; 