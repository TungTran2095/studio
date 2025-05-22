/**
 * Hệ thống phát hiện ý định và nhận dạng thực thể
 */
import { IntentDetectionResult } from '../types';
import { extractAssetSymbolFromMessage } from '@/utils/balance-utils';
import { getScenariosByTrigger } from '../scenarios';

/**
 * Phát hiện ý định từ tin nhắn người dùng
 */
export async function detectIntent(message: string): Promise<IntentDetectionResult> {
  console.log('[detectIntent] Phân tích ý định từ tin nhắn:', message);
  
  // Chuẩn bị thông tin cơ bản
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const entities: Record<string, any> = {};
  
  // Bước 1: Nhận diện thực thể từ tin nhắn
  await extractEntities(message, normalizedMessage, entities);
  
  // Bước 2: Xác định kịch bản phù hợp dựa trên từ khóa kích hoạt
  const matchedScenarios = getScenariosByTrigger(message);
  
  // Bước 3: Nếu có nhiều kịch bản khớp, chọn kịch bản phù hợp nhất
  // dựa trên các thực thể được nhận diện và độ ưu tiên
  let bestScenario = selectBestScenario(matchedScenarios, entities);
  
  // Xử lý đặc biệt cho yêu cầu liên quan đến Ichimoku
  if (normalizedMessage.includes('ichimoku') && !bestScenario) {
    bestScenario = {
      id: 'ichimoku_analysis',
      confidence: 0.9
    };
  }
  
  // Nếu không tìm thấy kịch bản phù hợp, sử dụng kịch bản mặc định
  if (!bestScenario) {
    bestScenario = {
      id: 'general_chat',
      confidence: 0.7
    };
  }
  
  console.log('[detectIntent] Kết quả nhận diện:', {
    scenarioId: bestScenario.id,
    confidence: bestScenario.confidence,
    entitiesCount: Object.keys(entities).length
  });
  
  return {
    scenarioId: bestScenario.id,
    confidence: bestScenario.confidence,
    entities
  };
}

/**
 * Trích xuất các thực thể từ tin nhắn
 */
async function extractEntities(
  message: string, 
  normalizedMessage: string, 
  entities: Record<string, any>
): Promise<void> {
  // 1. Nhận diện mã tiền (symbol)
  const symbol = await extractAssetSymbolFromMessage(message);
  if (symbol) {
    entities.symbol = symbol;
  }
  
  // 2. Nhận diện ý định giao dịch
  const tradingIntent = detectTradingIntent(message, normalizedMessage);
  if (tradingIntent.detected) {
    entities.tradingIntent = tradingIntent;
  }
  
  // 3. Nhận diện khung thời gian (timeframe)
  const timeframe = detectTimeframe(message, normalizedMessage);
  if (timeframe) {
    entities.timeframe = timeframe;
  }
  
  // 4. Nhận diện Ichimoku
  if (normalizedMessage.includes('ichimoku')) {
    entities.ichimoku = {
      requested: true,
      // Xác định mã tiền nếu chưa có
      symbol: entities.symbol || detectCryptoSymbol(message) || 'BTC',
      // Xác định timeframe nếu chưa có
      timeframe: entities.timeframe || '1h'
    };
  }
  
  // Tiếp tục thêm các phương thức nhận diện thực thể khác
}

/**
 * Chọn kịch bản tốt nhất dựa trên thực thể và độ ưu tiên
 */
function selectBestScenario(
  scenarios: any[], 
  entities: Record<string, any>
): { id: string; confidence: number } | null {
  if (scenarios.length === 0) {
    return null;
  }
  
  if (scenarios.length === 1) {
    return {
      id: scenarios[0].id,
      confidence: 0.9
    };
  }
  
  // Ưu tiên các kịch bản có thực thể cần thiết khớp với thực thể đã nhận diện
  const entitiesKeys = Object.keys(entities);
  
  // Tính điểm cho mỗi kịch bản
  const scoredScenarios = scenarios.map(scenario => {
    let score = 0;
    
    // Cộng điểm cho các thực thể khớp
    if (scenario.requiredEntities) {
      const matchedEntities = scenario.requiredEntities.filter((entity: string) => 
        entitiesKeys.includes(entity)
      );
      score += matchedEntities.length * 0.2;
    }
    
    // Cộng điểm cho các kịch bản ưu tiên cao
    if (entities.tradingIntent && scenario.id === 'trading') {
      score += 0.5;
    }
    
    // Cộng điểm cho phân tích Ichimoku
    if (entities.ichimoku && 
        (scenario.id === 'ichimoku_analysis' || scenario.id === 'market_analysis')) {
      score += entities.ichimoku ? 0.8 : 0;
      
      // Ưu tiên kịch bản Ichimoku chuyên biệt
      if (scenario.id === 'ichimoku_analysis') {
        score += 0.3;
      }
    }
    
    return {
      id: scenario.id,
      score
    };
  });
  
  // Sắp xếp kịch bản theo điểm số
  scoredScenarios.sort((a, b) => b.score - a.score);
  
  // Chọn kịch bản có điểm cao nhất
  return {
    id: scoredScenarios[0].id,
    confidence: Math.min(0.5 + scoredScenarios[0].score, 0.99)
  };
}

/**
 * Nhận diện ý định giao dịch từ tin nhắn
 */
function detectTradingIntent(message: string, normalizedMessage: string): any {
  // Chưa triển khai đầy đủ
  const result = {
    detected: false,
    action: 'NONE',
    symbol: '',
    quantity: 0,
    orderType: 'MARKET'
  };
  
  // Nhận diện mua/bán
  if (normalizedMessage.includes('mua') || normalizedMessage.includes('buy')) {
    result.detected = true;
    result.action = 'BUY';
  } else if (normalizedMessage.includes('ban') || normalizedMessage.includes('sell')) {
    result.detected = true;
    result.action = 'SELL';
  }
  
  // Nếu phát hiện ý định giao dịch, tìm thêm thông tin
  if (result.detected) {
    // Tìm mã tiền
    const symbolMatch = message.match(/\b(BTC|ETH|XRP|LTC|ADA|SOL|DOT|AVAX|LINK|BNB)\b/i);
    if (symbolMatch) {
      result.symbol = symbolMatch[0].toUpperCase();
    }
    
    // Tìm số lượng
    const quantityMatch = message.match(/\b(\d+(\.\d+)?)\s*(BTC|ETH|XRP|LTC|ADA|SOL|DOT|AVAX|LINK|BNB)\b/i);
    if (quantityMatch) {
      result.quantity = parseFloat(quantityMatch[1]);
    }
  }
  
  return result;
}

/**
 * Nhận diện khung thời gian từ tin nhắn
 */
function detectTimeframe(message: string, normalizedMessage: string): string | null {
  if (normalizedMessage.includes('1 phut') || normalizedMessage.includes('1m') || normalizedMessage.includes('1 minute')) {
    return '1m';
  }
  if (normalizedMessage.includes('5 phut') || normalizedMessage.includes('5m') || normalizedMessage.includes('5 minute')) {
    return '5m';
  }
  if (normalizedMessage.includes('15 phut') || normalizedMessage.includes('15m')) {
    return '15m';
  }
  if (normalizedMessage.includes('30 phut') || normalizedMessage.includes('30m')) {
    return '30m';
  }
  if (normalizedMessage.includes('1 gio') || normalizedMessage.includes('1h') || normalizedMessage.includes('1 hour')) {
    return '1h';
  }
  if (normalizedMessage.includes('4 gio') || normalizedMessage.includes('4h')) {
    return '4h';
  }
  if (normalizedMessage.includes('ngay') || normalizedMessage.includes('1d') || normalizedMessage.includes('daily')) {
    return '1d';
  }
  if (normalizedMessage.includes('tuan') || normalizedMessage.includes('week') || normalizedMessage.includes('1w')) {
    return '1w';
  }
  if (normalizedMessage.includes('thang') || normalizedMessage.includes('month') || normalizedMessage.includes('1M')) {
    return '1M';
  }
  
  // Nếu yêu cầu liên quan đến Ichimoku nhưng không xác định được timeframe,
  // mặc định sẽ sử dụng khung 1h
  if (normalizedMessage.includes('ichimoku')) {
    return '1h';
  }
  
  return null;
}

/**
 * Phát hiện mã tiền điện tử từ tin nhắn
 */
function detectCryptoSymbol(message: string): string | null {
  // Chuyển đổi sang chữ thường
  const lowerMessage = message.toLowerCase();
  
  // Kiểm tra nhanh cho BTC
  if (lowerMessage.includes('btc') || lowerMessage.includes('bitcoin')) {
    return 'BTC';
  }
  
  // Kiểm tra nhanh cho ETH
  if (lowerMessage.includes('eth') || lowerMessage.includes('ethereum')) {
    return 'ETH';
  }
  
  // Danh sách mã tiền phổ biến
  const symbols = ['BTC', 'ETH', 'BNB', 'ADA', 'XRP', 'SOL', 'DOT', 'AVAX', 'LINK', 'DOGE'];
  
  // Tìm mã tiền trong tin nhắn
  for (const symbol of symbols) {
    if (lowerMessage.includes(symbol.toLowerCase())) {
      return symbol;
    }
  }
  
  return null;
} 