'use server';

import { z } from 'zod';
import { placeBuyOrder, placeSellOrder } from './trade';
import type { GenerateResponseOutput } from '@/ai/flows/generate-response';

// Schema cho input
const ChatTradeInputSchema = z.object({
  tradingIntent: z.object({
    detected: z.boolean(),
    action: z.enum(['BUY', 'SELL', 'NONE']),
    symbol: z.string().optional(),
    quantity: z.number().optional(),
    orderType: z.enum(['MARKET', 'LIMIT', 'NONE']),
    price: z.number().optional(),
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
  
  // Chuẩn bị tham số cho giao dịch
  const symbol = `${intent.symbol.toUpperCase()}USDT`; // Mặc định giao dịch với USDT
  const price = intent.price;
  const quantity = intent.quantity;
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