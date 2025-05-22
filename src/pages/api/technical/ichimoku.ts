import { NextApiRequest, NextApiResponse } from 'next';
import { calculateIchimoku } from '@/agent/tools/technical-analysis-tool';

/**
 * API endpoint để lấy dữ liệu phân tích Ichimoku
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Chỉ chấp nhận GET request
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  // Lấy tham số từ query string
  const { symbol, interval = '1d', force_real_data } = req.query;

  // Kiểm tra xem symbol có được cung cấp không
  if (!symbol) {
    return res.status(400).json({ 
      success: false, 
      error: 'Thiếu tham số symbol'
    });
  }

  try {
    console.log(`[API Ichimoku] Phân tích Ichimoku cho ${symbol} (${interval}), force_real_data=${force_real_data}`);
    
    // Gọi hàm calculateIchimoku
    const ichimokuData = await calculateIchimoku(
      symbol as string, 
      interval as string,
      force_real_data === 'true'
    );
    
    // Kiểm tra nếu có lỗi
    if (ichimokuData.error) {
      console.warn(`[API Ichimoku] Lỗi khi tính toán Ichimoku:`, ichimokuData.error);
      return res.status(500).json({
        success: false,
        error: ichimokuData.error
      });
    }
    
    // Trả về kết quả
    return res.status(200).json({
      success: true,
      data: ichimokuData,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error(`[API Ichimoku] Lỗi không xử lý được:`, error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Lỗi không xác định'
    });
  }
} 