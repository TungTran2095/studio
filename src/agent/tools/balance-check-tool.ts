/**
 * Công cụ kiểm tra số dư tài khoản cho AI Agent
 */
import { Tool, AgentContext } from '../types';
import { generateBalanceReport } from '@/actions/chat-balance';
import { extractAssetSymbolFromMessage } from '@/utils/balance-utils';

export const balanceCheckTool: Tool = {
  name: 'balanceCheckTool',
  description: 'Công cụ kiểm tra số dư tài khoản Binance',
  
  async execute(message: string, context: AgentContext, entities?: Record<string, any>): Promise<any> {
    console.log('[balanceCheckTool] Đang kiểm tra số dư tài khoản...');
    
    // Kiểm tra xem người dùng đã cung cấp API key và secret chưa
    if (!context.apiKey || !context.apiSecret) {
      return {
        success: false,
        error: 'Thiếu thông tin API key/secret để kiểm tra số dư. Vui lòng thiết lập API key trước khi sử dụng tính năng này.'
      };
    }
    
    try {
      // Xác định mã tài sản cụ thể nếu có
      // Ưu tiên entities từ intent detection, sau đó mới đến phân tích từ tin nhắn
      const assetSymbol = entities?.symbol || await extractAssetSymbolFromMessage(message);
      console.log(`[balanceCheckTool] Mã tài sản được yêu cầu: ${assetSymbol || 'Không có'}`);
      
      // Gọi API để lấy thông tin số dư
      const balanceReport = await generateBalanceReport({
        apiKey: context.apiKey,
        apiSecret: context.apiSecret,
        isTestnet: context.isTestnet,
        symbol: assetSymbol
      });
      
      if (balanceReport.success) {
        console.log('[balanceCheckTool] Lấy báo cáo số dư thành công');
        return {
          success: true,
          message: balanceReport.message,
          data: balanceReport.data
        };
      } else {
        console.warn('[balanceCheckTool] Không thể lấy báo cáo số dư:', balanceReport.error);
        return {
          success: false,
          error: balanceReport.error || 'Không thể lấy thông tin số dư'
        };
      }
    } catch (error: any) {
      console.error('[balanceCheckTool] Lỗi khi kiểm tra số dư:', error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi kiểm tra số dư'
      };
    }
  }
}; 