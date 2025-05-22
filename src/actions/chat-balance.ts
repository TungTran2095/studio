'use server';

/**
 * Mô-đun cung cấp chức năng để hiển thị báo cáo số dư tài sản thông qua chat
 */

import { fetchBinanceAssets } from './binance';
import { z } from 'zod';
import { extractAssetSymbolFromMessage, isBalanceQuery } from '@/utils/balance-utils';

// Định nghĩa schema đầu vào
const ChatBalanceInputSchema = z.object({
  apiKey: z.string().min(10, "API key phải có ít nhất 10 ký tự"),
  apiSecret: z.string().min(10, "API secret phải có ít nhất 10 ký tự"),
  isTestnet: z.boolean().default(false),
  symbol: z.string().optional() // Mã tài sản cụ thể cần kiểm tra (ví dụ: BTC, ETH...)
});

// Định nghĩa kiểu dữ liệu đầu vào
export type ChatBalanceInput = z.infer<typeof ChatBalanceInputSchema>;

// Định nghĩa interface kết quả trả về
export interface ChatBalanceResult {
  success: boolean;
  message: string; // Thông báo phản hồi
  data?: {
    totalValue: number; // Tổng giá trị tài sản (USD)
    assetCount: number; // Số lượng loại tài sản
    specificAsset?: { // Chi tiết tài sản cụ thể (nếu có yêu cầu)
      symbol: string;
      quantity: number;
      value: number;
    };
    topAssets: Array<{ // Top 5 tài sản có giá trị cao nhất
      symbol: string;
      quantity: number;
      value: number;
    }>;
  };
  error?: string;
}

/**
 * Tạo báo cáo số dư tài sản khi người dùng hỏi qua chat
 * 
 * @param input Thông tin API key và tùy chọn mã tài sản cụ thể
 * @returns Promise<ChatBalanceResult> Kết quả báo cáo số dư
 */
export async function generateBalanceReport(input: ChatBalanceInput): Promise<ChatBalanceResult> {
  try {
    console.log('[generateBalanceReport] Đang lấy dữ liệu tài sản...');
    // Gọi hàm fetchBinanceAssets để lấy tất cả tài sản
    const assetsResult = await fetchBinanceAssets({
      apiKey: input.apiKey,
      apiSecret: input.apiSecret,
      isTestnet: input.isTestnet
    });
    
    // Kiểm tra nếu có lỗi khi lấy tài sản
    if (!assetsResult.success || !assetsResult.data || assetsResult.data.length === 0) {
      return {
        success: false,
        message: "Không thể lấy thông tin tài sản từ Binance.",
        error: assetsResult.error || "Không có dữ liệu tài sản."
      };
    }
    
    // Tính tổng giá trị tài sản
    const totalValue = assetsResult.data.reduce((sum, asset) => sum + asset.totalValue, 0);
    
    // Lấy top 5 tài sản có giá trị cao nhất
    const topAssets = assetsResult.data
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 5)
      .map(asset => ({
        symbol: asset.symbol,
        quantity: asset.quantity,
        value: asset.totalValue
      }));
    
    // Tìm tài sản cụ thể nếu người dùng yêu cầu
    let specificAsset = undefined;
    if (input.symbol) {
      const targetSymbol = input.symbol.toUpperCase();
      const foundAsset = assetsResult.data.find(asset => 
        asset.symbol.toUpperCase() === targetSymbol
      );
      
      if (foundAsset) {
        specificAsset = {
          symbol: foundAsset.symbol,
          quantity: foundAsset.quantity,
          value: foundAsset.totalValue
        };
      }
    }
    
    // Tạo thông báo phản hồi
    let message = "";
    if (specificAsset) {
      // Nếu tìm thấy tài sản cụ thể
      message = `Bạn hiện có ${specificAsset.quantity.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 8 })} ${specificAsset.symbol}, tương đương $${specificAsset.value.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`;
    } else if (input.symbol) {
      // Nếu yêu cầu tài sản cụ thể nhưng không tìm thấy
      message = `Bạn không có tài sản ${input.symbol.toUpperCase()} nào trong tài khoản.`;
    } else {
      // Báo cáo tổng quát
      message = `Tổng giá trị tài sản: $${totalValue.toLocaleString('vi-VN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}. Bạn có ${assetsResult.data.length} loại tài sản khác nhau. Top 5 tài sản giá trị nhất: ${topAssets.map(a => `${a.symbol} (${a.quantity.toLocaleString('vi-VN', { minimumFractionDigits: 0, maximumFractionDigits: 8 })})`).join(', ')}.`;
    }
    
    return {
      success: true,
      message,
      data: {
        totalValue,
        assetCount: assetsResult.data.length,
        specificAsset,
        topAssets
      }
    };
  } catch (error: any) {
    console.error('[generateBalanceReport] Lỗi:', error);
    return {
      success: false,
      message: "Đã xảy ra lỗi khi lấy thông tin số dư tài sản.",
      error: error.message || "Lỗi không xác định."
    };
  }
}