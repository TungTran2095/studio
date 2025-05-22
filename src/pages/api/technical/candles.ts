import { NextApiRequest, NextApiResponse } from 'next';
import { Spot } from '@binance/connector';

/**
 * API endpoint để lấy dữ liệu nến cho phân tích kỹ thuật
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const { symbol, interval, limit, force_real_data } = req.query;
    const forceRealData = force_real_data === 'true';
    
    // Kiểm tra tham số đầu vào
    if (!symbol) {
      console.error('[API/technical/candles] Thiếu tham số symbol');
      return res.status(400).json({ success: false, error: 'Thiếu tham số symbol' });
    }
    
    console.log(`[API/technical/candles] Đang lấy dữ liệu nến cho ${symbol} (${interval || '1h'}) với limit=${limit || 100}, force_real_data=${forceRealData}`);
    
    // Thay đổi: Sử dụng fetch API trực tiếp thay vì Binance connector
    try {
      // URL API Binance trực tiếp
      const formattedSymbol = symbol.toString().includes('USDT') ? symbol : `${symbol}USDT`;
      const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=${formattedSymbol}&interval=${interval || '1h'}&limit=${limit || 100}`;
      console.log(`[API/technical/candles] Đang gọi Binance API: ${binanceUrl}`);
      
      // Thiết lập timeout 15 giây
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(binanceUrl, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        console.error(`[API/technical/candles] Binance API trả về lỗi: ${response.status} ${response.statusText}`);
        try {
          const errorData = await response.text();
          console.error(`[API/technical/candles] Chi tiết lỗi API: ${errorData}`);
        } catch (error) {
          console.error(`[API/technical/candles] Không thể đọc chi tiết lỗi API`);
        }
        
        // Nếu người dùng buộc sử dụng dữ liệu thực, trả về lỗi 500 thay vì dữ liệu mẫu
        if (forceRealData) {
          console.error(`[API/technical/candles] Người dùng yêu cầu dữ liệu thực, không sử dụng dữ liệu dự phòng`);
          return res.status(500).json({
            success: false,
            error: `Không thể lấy dữ liệu thực từ Binance API: ${response.status} ${response.statusText}`
          });
        }
        
        return provideFallbackData(symbol as string, res, true, `Lỗi API: ${response.status} ${response.statusText}`);
      }
      
      try {
        const rawData = await response.json();
        
        if (!Array.isArray(rawData) || rawData.length === 0) {
          console.error(`[API/technical/candles] Không nhận được dữ liệu hợp lệ từ Binance`);
          console.error(`[API/technical/candles] Phản hồi từ API: ${JSON.stringify(rawData)}`);
          
          // Nếu người dùng buộc sử dụng dữ liệu thực, trả về lỗi 500 thay vì dữ liệu mẫu
          if (forceRealData) {
            return res.status(500).json({
              success: false,
              error: `Không nhận được dữ liệu hợp lệ từ Binance API. Yêu cầu dữ liệu thực nhưng không thể lấy được.`
            });
          }
          
          return provideFallbackData(symbol as string, res, true, "Dữ liệu API không hợp lệ");
        }
        
        // Kiểm tra số lượng nến tối thiểu cho phân tích Ichimoku (cần ít nhất 52 nến)
        if (rawData.length < 52) {
          console.warn(`[API/technical/candles] Không đủ dữ liệu cho phân tích Ichimoku (${rawData.length} nến < 52 nến yêu cầu)`);
          
          // Nếu người dùng buộc sử dụng dữ liệu thực, trả về lỗi 500 thay vì dữ liệu mẫu
          if (forceRealData) {
            return res.status(500).json({
              success: false,
              error: `Không đủ dữ liệu từ Binance API cho phân tích Ichimoku (cần 52 nến, chỉ có ${rawData.length}). Yêu cầu dữ liệu thực nhưng không đủ.`
            });
          }
          
          return provideFallbackData(symbol as string, res, true, `Số lượng nến không đủ (${rawData.length} < 52)`);
        }
        
        console.log(`[API/technical/candles] Đã nhận ${rawData.length} nến từ Binance API cho ${formattedSymbol}`);
        console.log(`[API/technical/candles] Mẫu dữ liệu nến đầu tiên: ${JSON.stringify(rawData[0])}`);
        
        // Chuyển đổi dữ liệu Binance sang định dạng chuẩn
        const formattedCandles = rawData.map((candle: any) => {
          return {
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          };
        });
        
        return res.status(200).json({
          success: true,
          data: formattedCandles,
          source: "binance_api",
          realData: true
        });
      } catch (jsonError: any) {
        console.error(`[API/technical/candles] Lỗi khi phân tích JSON từ API:`, jsonError);
        
        // Nếu người dùng buộc sử dụng dữ liệu thực, trả về lỗi 500 thay vì dữ liệu mẫu
        if (forceRealData) {
          return res.status(500).json({
            success: false,
            error: `Lỗi khi phân tích JSON từ Binance API: ${jsonError.message}. Yêu cầu dữ liệu thực nhưng không thể xử lý.`
          });
        }
        
        return provideFallbackData(symbol as string, res, true, `Lỗi khi phân tích JSON: ${jsonError.message}`);
      }
    } catch (apiError: any) {
      console.error(`[API/technical/candles] Lỗi khi gọi Binance API: ${apiError.message}`);
      
      // Nếu người dùng buộc sử dụng dữ liệu thực, trả về lỗi 500 thay vì dữ liệu mẫu
      if (forceRealData) {
        return res.status(500).json({
          success: false,
          error: `Lỗi khi kết nối đến Binance API: ${apiError.message}. Yêu cầu dữ liệu thực nhưng không thể kết nối.`
        });
      }
      
      return provideFallbackData(symbol as string, res, true, apiError.message);
    }
  } catch (error: any) {
    console.error('[API/technical/candles] Error:', error);
    
    // Cung cấp thông tin lỗi chi tiết hơn
    const errorMessage = error.message || 'Unknown error';
    console.error(`[API/technical/candles] Chi tiết lỗi: ${errorMessage}`);
    
    // Sử dụng dữ liệu dự phòng nếu API bị lỗi
    if (req.query.symbol) {
      return provideFallbackData(req.query.symbol as string, res, true, errorMessage);
    }
    
    return res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
}

/**
 * Cung cấp dữ liệu dự phòng cho trường hợp không lấy được dữ liệu từ API
 */
function provideFallbackData(
  symbol: string, 
  res: NextApiResponse, 
  isError: boolean = false,
  errorReason: string = "Không thể kết nối với Binance API"
) {
  console.log(`[API/technical/candles] Sử dụng dữ liệu dự phòng cho ${symbol}. Lý do: ${errorReason}`);
  
  // Xác định giá cơ sở theo loại coin
  let basePrice = 0;
  if (symbol.includes('BTC')) {
    basePrice = 110157; // Cập nhật giá hiện tại cho BTC
  } else if (symbol.includes('ETH')) {
    basePrice = 3050;   // Giá gần đúng cho ETH
  } else if (symbol.includes('BNB')) {
    basePrice = 600;    // Giá gần đúng cho BNB
  } else if (symbol.includes('SOL')) {
    basePrice = 140;    // Giá gần đúng cho SOL
  } else if (symbol.includes('XRP')) {
    basePrice = 0.52;   // Giá gần đúng cho XRP
  } else {
    basePrice = 100;    // Giá mặc định cho các coin khác
  }
  
  const now = Date.now();
  
  // Tạo xu hướng giả định ngẫu nhiên (tăng, giảm hoặc sideway)
  const trend = Math.random();
  // Tăng: 0.4, Giảm: 0.3, Sideway: 0.3
  const trendFactor = trend < 0.4 ? 0.0001 : trend < 0.7 ? -0.0001 : 0;
  
  // Tạo 60 nến mẫu với độ biến động hợp lý (đủ cho phân tích Ichimoku)
  const mockCandles = Array.from({ length: 60 }, (_, i) => {
    const timeOffset = (59 - i) * 60 * 60 * 1000; // 1 giờ mỗi nến
    const time = now - timeOffset;
    
    // Tạo biến động theo xu hướng, tăng dần theo thời gian
    const trendComponent = basePrice * (trendFactor * i);
    
    // Tạo biến động ngẫu nhiên ±0.5%
    const randomFactor = 0.995 + Math.random() * 0.01;
    
    // Tính giá đóng cửa với xu hướng và biến động
    const close = basePrice * randomFactor + trendComponent;
    
    // Tạo giá mở cửa gần với giá đóng
    const open = close * (0.998 + Math.random() * 0.004);
    
    // Tạo giá cao và thấp
    const highLowRange = Math.max(close, open) * 0.004; // Biên độ 0.4%
    const high = Math.max(open, close) + Math.random() * highLowRange;
    const low = Math.min(open, close) - Math.random() * highLowRange;
    
    // Tạo khối lượng theo biến động giá
    const priceChange = Math.abs(close - open) / close;
    const baseVolume = basePrice * 10; // Khối lượng cơ sở phụ thuộc vào giá
    const volume = baseVolume * (0.8 + priceChange * 50 + Math.random() * 0.4);
    
    return {
      time,
      open,
      high,
      low,
      close,
      volume
    };
  });
  
  return res.status(isError ? 200 : 200).json({
    success: true,
    data: mockCandles,
    source: "fallback_data",
    reason: errorReason,
    isMockData: true
  });
} 