'use server';

import { z } from 'zod';
import { placeBuyOrder, placeSellOrder } from './trade';
import type { GenerateResponseOutput } from '@/ai/flows/generate-response';
import { getCryptoPriceForAI } from './market-data';

// Schema mở rộng cho giao dịch với % hoặc số lượng cụ thể
const ChatTradeInputSchema = z.object({
  tradingIntent: z.object({
    detected: z.boolean(),
    action: z.enum(['BUY', 'SELL', 'NONE']),
    symbol: z.string().optional(),
    quantity: z.union([z.number(), z.string()]).optional(), // Hỗ trợ cả số và chuỗi (cho %)
    orderType: z.enum(['MARKET', 'LIMIT', 'NONE']),
    price: z.number().optional(),
    portfolio: z.array(z.object({
      symbol: z.string(),
      percentage: z.number(),
      action: z.enum(['BUY', 'SELL', 'HOLD']).optional()
    })).optional(), // Hỗ trợ giao dịch danh mục
  }),
  apiKey: z.string().min(10, "API Key cần ít nhất 10 ký tự"),
  apiSecret: z.string().min(10, "API Secret cần ít nhất 10 ký tự"),
  isTestnet: z.boolean().default(false),
});

// Type cho kết quả
interface ChatTradeResult {
  success: boolean;
  message: string;
  orderId?: number;
  portfolioResults?: Array<{
    symbol: string;
    success: boolean;
    message: string;
    orderId?: number;
  }>;
}

// Hàm để kiểm tra số lượng
function isPercentage(quantity: string | number): boolean {
  if (typeof quantity === 'string') {
    return quantity.includes('%');
  }
  return false;
}

// Hàm để chuyển đổi % thành số lượng cụ thể
async function convertPercentageToQuantity(
  symbol: string,
  percentage: string,
  action: 'BUY' | 'SELL',
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean
): Promise<number> {
  try {
    const numericPercentage = parseFloat(percentage.replace('%', '')) / 100;
    
    // Tùy thuộc vào hành động, xử lý khác nhau
    if (action === 'BUY') {
      // Giả sử người dùng muốn sử dụng X% USDT để mua
      // Tính toán dựa trên giá hiện tại và số USDT có
      // Đây là phiên bản đơn giản, cần tích hợp với ví thực tế
      const availableUsdt = 1000; // Giả sử có 1000 USDT (cần thay thế bằng dữ liệu thực)
      const priceInfo = await getCryptoPriceForAI(symbol);
      
      // Parse giá từ thông tin giá
      const priceMatch = priceInfo.match(/Giá hiện tại: \$([0-9,.]+)/);
      if (!priceMatch) {
        throw new Error("Không thể xác định giá hiện tại");
      }
      
      const price = parseFloat(priceMatch[1].replace(/,/g, ''));
      const usdtToUse = availableUsdt * numericPercentage;
      const quantity = usdtToUse / price;
      
      // Làm tròn số lượng để tránh lỗi precision
      return parseFloat(quantity.toFixed(5));
    } else { // SELL
      // Giả sử người dùng muốn bán X% số coin đang có
      // Cần tích hợp với ví thực tế
      const availableCoin = 0.1; // Giả sử có 0.1 BTC (cần thay thế bằng dữ liệu thực)
      return availableCoin * numericPercentage;
    }
  } catch (error: any) {
    console.error('[convertPercentageToQuantity] Lỗi khi chuyển đổi phần trăm:', error);
    throw error;
  }
}

// Server action để thực hiện giao dịch từ chat
export async function executeChatTrade(
  aiResponse: GenerateResponseOutput,
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean
): Promise<ChatTradeResult> {
  console.log("[executeChatTrade] Phân tích ý định giao dịch từ AI");
  
  // Kiểm tra nếu không có ý định giao dịch
  if (!aiResponse.tradingIntent || !aiResponse.tradingIntent.detected || aiResponse.tradingIntent.action === 'NONE') {
    return {
      success: false,
      message: "Không phát hiện ý định giao dịch"
    };
  }
  
  // Lấy thông tin giao dịch
  const intent = aiResponse.tradingIntent;
  
  // Xử lý danh mục đầu tư (portfolio)
  if (intent.portfolio && intent.portfolio.length > 0) {
    return await executePortfolioTrade(intent.portfolio, apiKey, apiSecret, isTestnet);
  }
  
  // Xử lý giao dịch đơn lẻ
  // Kiểm tra đủ thông tin cần thiết
  if (!intent.symbol) {
    return {
      success: false,
      message: "Thiếu thông tin về cryptocurrency (ví dụ: BTC)"
    };
  }
  
  if (!intent.quantity) {
    return {
      success: false,
      message: "Thiếu thông tin về số lượng cần giao dịch"
    };
  }
  
  if (intent.orderType === 'LIMIT' && !intent.price) {
    return {
      success: false,
      message: "Thiếu thông tin về giá cho lệnh LIMIT"
    };
  }
  
  // Kiểm tra và xử lý orderType
  if (intent.orderType === 'NONE') {
    return {
      success: false,
      message: "Loại lệnh không hợp lệ. Chỉ hỗ trợ MARKET hoặc LIMIT."
    };
  }
  
  // Kiểm tra và xử lý action
  if (intent.action === 'NONE') {
    return {
      success: false,
      message: "Hành động giao dịch không hợp lệ. Chỉ hỗ trợ BUY hoặc SELL."
    };
  }
  
  let quantity = typeof intent.quantity === 'number' 
    ? intent.quantity 
    : parseFloat(intent.quantity);
  
  // Xử lý nếu quantity là phần trăm
  if (isPercentage(intent.quantity)) {
    try {
      quantity = await convertPercentageToQuantity(
        intent.symbol,
        intent.quantity.toString(),
        intent.action,
        apiKey,
        apiSecret,
        isTestnet
      );
    } catch (error: any) {
      return {
        success: false,
        message: `Lỗi khi xử lý phần trăm: ${error.message}`
      };
    }
  }
  
  // Chuẩn bị tham số cho giao dịch
  const symbol = `${intent.symbol.toUpperCase()}USDT`; // Mặc định giao dịch với USDT
  const price = intent.price;
  const orderType = intent.orderType;
  
  const tradeParams = {
    apiKey,
    apiSecret,
    isTestnet,
    symbol,
    quantity,
    orderType,
    ...(orderType === 'LIMIT' && { price })
  };
  
  console.log(`[executeChatTrade] Thực hiện lệnh ${intent.action} cho ${quantity} ${intent.symbol} bằng lệnh ${orderType}`, {
    ...tradeParams,
    apiKey: '***',
    apiSecret: '***'
  });
  
  try {
    // Thực hiện giao dịch tương ứng
    const result = intent.action === 'BUY'
      ? await placeBuyOrder(tradeParams)
      : await placeSellOrder(tradeParams);
    
    return {
      success: result.success,
      message: result.message,
      orderId: result.orderId
    };
  } catch (error: any) {
    console.error("[executeChatTrade] Lỗi khi thực hiện giao dịch:", error);
    return {
      success: false,
      message: `Lỗi khi thực hiện giao dịch: ${error.message || 'Lỗi không xác định'}`
    };
  }
}

// Hàm xử lý giao dịch danh mục
async function executePortfolioTrade(
  portfolio: Array<{
    symbol: string;
    percentage: number;
    action?: 'BUY' | 'SELL' | 'HOLD';
  }>,
  apiKey: string,
  apiSecret: string,
  isTestnet: boolean
): Promise<ChatTradeResult> {
  console.log('[executePortfolioTrade] Thực hiện giao dịch danh mục với', portfolio.length, 'coin');
  
  const results = [];
  let overallSuccess = true;
  let combinedMessage = '';
  
  // Giả sử tổng số USDT có sẵn (cần tích hợp với ví thực tế)
  const totalUsdtAvailable = 1000;
  
  for (const item of portfolio) {
    // Bỏ qua các coin được đánh dấu HOLD
    if (item.action === 'HOLD') {
      results.push({
        symbol: item.symbol,
        success: true,
        message: `Giữ nguyên ${item.symbol} (${item.percentage}%)`
      });
      continue;
    }
    
    const action = item.action || 'BUY'; // Mặc định là MUA nếu không chỉ định
    
    try {
      // Tính toán số lượng dựa trên %
      let quantity;
      
      if (action === 'BUY') {
        // Lấy thông tin giá hiện tại
        const priceInfo = await getCryptoPriceForAI(item.symbol);
        const priceMatch = priceInfo.match(/Giá hiện tại: \$([0-9,.]+)/);
        if (!priceMatch) {
          throw new Error(`Không thể xác định giá hiện tại cho ${item.symbol}`);
        }
        
        const price = parseFloat(priceMatch[1].replace(/,/g, ''));
        const usdtToUse = totalUsdtAvailable * (item.percentage / 100);
        quantity = usdtToUse / price;
        
        // Làm tròn số lượng
        quantity = parseFloat(quantity.toFixed(5));
      } else {
        // Xử lý bán (giả định số lượng, cần tích hợp với ví thực tế)
        const availableCoin = 0.1; // Ví dụ: có 0.1 BTC
        quantity = availableCoin * (item.percentage / 100);
        quantity = parseFloat(quantity.toFixed(5));
      }
      
      // Chuẩn bị tham số giao dịch
      const symbol = `${item.symbol.toUpperCase()}USDT`;
      const tradeParams = {
        apiKey,
        apiSecret,
        isTestnet,
        symbol,
        quantity,
        orderType: 'MARKET' as 'MARKET'
      };
      
      // Thực hiện giao dịch
      const result = action === 'BUY'
        ? await placeBuyOrder(tradeParams)
        : await placeSellOrder(tradeParams);
      
      results.push({
        symbol: item.symbol,
        success: result.success,
        message: result.message,
        orderId: result.orderId
      });
      
      if (!result.success) {
        overallSuccess = false;
      }
      
      combinedMessage += `${item.symbol}: ${result.success ? 'Thành công' : 'Thất bại'} - ${result.message}. `;
    } catch (error: any) {
      console.error(`[executePortfolioTrade] Lỗi khi xử lý ${item.symbol}:`, error);
      
      results.push({
        symbol: item.symbol,
        success: false,
        message: error.message || 'Lỗi không xác định'
      });
      
      overallSuccess = false;
      combinedMessage += `${item.symbol}: Thất bại - ${error.message || 'Lỗi không xác định'}. `;
    }
  }
  
  return {
    success: overallSuccess,
    message: combinedMessage || 'Đã thực hiện giao dịch danh mục',
    portfolioResults: results
  };
} 