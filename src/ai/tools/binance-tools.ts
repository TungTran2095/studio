// src/ai/tools/binance-tools.ts
import { z } from 'genkit';
import { placeBuyOrder, placeSellOrder } from '@/actions/trade';

// Input schema cho trading tool phải khớp với PlaceOrderInput từ actions/trade.ts
const tradingToolSchema = z.object({
  apiKey: z.string().describe('API Key từ tài khoản Binance của người dùng'),
  apiSecret: z.string().describe('API Secret từ tài khoản Binance của người dùng'),
  isTestnet: z.boolean().describe('Có sử dụng môi trường Binance Testnet không'),
  symbol: z.string().describe('Cặp giao dịch, ví dụ: BTCUSDT'),
  quantity: z.number().describe('Số lượng cần giao dịch (lượng của base asset, ví dụ: BTC)'),
  orderType: z.enum(['MARKET', 'LIMIT']).describe('Loại lệnh: MARKET là lệnh thị trường, LIMIT là lệnh giới hạn'),
  price: z.number().optional().describe('Giá chỉ định cho lệnh LIMIT, không cần cho lệnh MARKET'),
});

// Output schema
const tradingOutputSchema = z.object({
  success: z.boolean().describe('Lệnh có thành công không'),
  orderId: z.number().optional().describe('ID của lệnh nếu thành công'),
  message: z.string().describe('Thông báo kết quả hoặc lỗi')
});

// Tool đặt lệnh MUA
export const placeBuyOrderTool = {
  schema: {
    name: 'placeBuyOrder',
    description: 'Đặt lệnh MUA Bitcoin hoặc tiền điện tử khác trên Binance. Phải được sử dụng khi người dùng muốn mua BTC hoặc tiền điện tử khác.',
    parameters: tradingToolSchema,
    returnType: tradingOutputSchema,
  },
  execute: async (input: z.infer<typeof tradingToolSchema>) => {
    console.log('Đang đặt lệnh MUA với:', { ...input, apiKey: '***', apiSecret: '***' });
    try {
      const result = await placeBuyOrder(input);
      return result;
    } catch (error: any) {
      console.error('Lỗi khi đặt lệnh MUA:', error);
      return {
        success: false,
        message: `Lỗi khi đặt lệnh MUA: ${error.message || 'Lỗi không xác định'}`
      };
    }
  },
};

// Tool đặt lệnh BÁN
export const placeSellOrderTool = {
  schema: {
    name: 'placeSellOrder',
    description: 'Đặt lệnh BÁN Bitcoin hoặc tiền điện tử khác trên Binance. Phải được sử dụng khi người dùng muốn bán BTC hoặc tiền điện tử khác.',
    parameters: tradingToolSchema,
    returnType: tradingOutputSchema,
  },
  execute: async (input: z.infer<typeof tradingToolSchema>) => {
    console.log('Đang đặt lệnh BÁN với:', { ...input, apiKey: '***', apiSecret: '***' });
    try {
      const result = await placeSellOrder(input);
      return result;
    } catch (error: any) {
      console.error('Lỗi khi đặt lệnh BÁN:', error);
      return {
        success: false,
        message: `Lỗi khi đặt lệnh BÁN: ${error.message || 'Lỗi không xác định'}`
      };
    }
  },
}; 