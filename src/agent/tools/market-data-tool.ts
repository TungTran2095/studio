/**
 * Công cụ lấy dữ liệu thị trường cho AI Agent
 */
import { Tool, AgentContext } from '../types';
import { getCryptoPriceForAI, getMarketDataForAI, getTechnicalAnalysisForAI } from '@/actions/market-data';

export const marketDataTool: Tool = {
  name: 'marketDataTool',
  description: 'Công cụ lấy dữ liệu thị trường hiện tại',
  
  async execute(message: string, context: AgentContext, entities?: Record<string, any>): Promise<any> {
    console.log('[marketDataTool] Đang lấy dữ liệu thị trường...');
    
    try {
      // Xác định xem cần thông tin thị trường chung hay thông tin cụ thể về một mã tiền
      const needsSpecificSymbol = !!entities?.symbol;
      const symbol = entities?.symbol || 'BTC';
      
      if (needsSpecificSymbol) {
        // Lấy giá của một mã tiền cụ thể
        console.log(`[marketDataTool] Lấy giá cho ${symbol}...`);
        const priceData = await getCryptoPriceForAI(symbol);
        
        // Lấy thêm phân tích kỹ thuật cho mã tiền đó
        console.log(`[marketDataTool] Lấy phân tích kỹ thuật cho ${symbol}...`);
        const technicalData = await getTechnicalAnalysisForAI(symbol);
        
        return {
          success: true,
          priceData,
          technicalData
        };
      } else {
        // Lấy tổng quan thị trường
        console.log('[marketDataTool] Lấy tổng quan thị trường...');
        const marketData = await getMarketDataForAI();
        
        return {
          success: true,
          marketData
        };
      }
    } catch (error: any) {
      console.error('[marketDataTool] Lỗi khi lấy dữ liệu thị trường:', error);
      return {
        success: false,
        error: error.message || 'Không thể lấy dữ liệu thị trường.'
      };
    }
  }
}; 