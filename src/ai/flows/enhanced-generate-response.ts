'use server';

import { ai } from '@/ai/ai-instance';
import { z } from 'zod';
import { enhancedRealDataService } from '@/lib/market-data/enhanced-real-data-service';
import { getCryptoPrice } from '@/lib/services/coinmarketcap-service';

// Input schema cho enhanced response
const EnhancedGenerateResponseInputSchema = z.object({
  message: z.string().describe('Tin nhắn từ người dùng'),
  chatHistoryLength: z.number().optional().describe('Số lượng tin nhắn trong lịch sử chat'),
  hasApiKey: z.boolean().optional().describe('Có API key không'),
  hasApiSecret: z.boolean().optional().describe('Có API secret không'),
  isTestnet: z.boolean().optional().describe('Có phải testnet không'),
  useRealTime: z.boolean().optional().describe('Sử dụng dữ liệu real-time')
});

// Output schema
const EnhancedGenerateResponseOutputSchema = z.object({
  content: z.string().describe('Nội dung phản hồi'),
  dataSource: z.string().describe('Nguồn dữ liệu được sử dụng'),
  confidence: z.number().describe('Độ tin cậy của dữ liệu (0-100)'),
  timestamp: z.string().describe('Thời gian tạo phản hồi'),
  symbols: z.array(z.string()).optional().describe('Các symbol crypto được phát hiện')
});

export type EnhancedGenerateResponseInput = z.infer<typeof EnhancedGenerateResponseInputSchema>;
export type EnhancedGenerateResponseOutput = z.infer<typeof EnhancedGenerateResponseOutputSchema>;

/**
 * Enhanced crypto symbol detection với độ chính xác cao hơn
 */
function detectEnhancedCryptoSymbol(message: string): string[] {
  const text = message.toLowerCase();
  const cryptoPatterns = [
    // Bitcoin variations
    { patterns: ['bitcoin', 'btc', 'bit coin'], symbol: 'BTC' },
    // Ethereum variations  
    { patterns: ['ethereum', 'eth', 'ether'], symbol: 'ETH' },
    // Other major cryptos
    { patterns: ['binance coin', 'bnb'], symbol: 'BNB' },
    { patterns: ['cardano', 'ada'], symbol: 'ADA' },
    { patterns: ['solana', 'sol'], symbol: 'SOL' },
    { patterns: ['ripple', 'xrp'], symbol: 'XRP' },
    { patterns: ['polkadot', 'dot'], symbol: 'DOT' },
    { patterns: ['chainlink', 'link'], symbol: 'LINK' },
    { patterns: ['polygon', 'matic'], symbol: 'MATIC' },
    { patterns: ['avalanche', 'avax'], symbol: 'AVAX' }
  ];

  const detectedSymbols: string[] = [];
  
  for (const crypto of cryptoPatterns) {
    for (const pattern of crypto.patterns) {
      if (text.includes(pattern)) {
        if (!detectedSymbols.includes(crypto.symbol)) {
          detectedSymbols.push(crypto.symbol);
          console.log(`🎯 [Enhanced] Detected crypto: ${crypto.symbol} from pattern: ${pattern}`);
        }
      }
    }
  }

  return detectedSymbols;
}

/**
 * Lấy real-time data cho multiple symbols
 */
async function getRealTimeDataForSymbols(symbols: string[]): Promise<{
  success: boolean;
  data: any[];
  source: string;
  confidence: number;
}> {
  try {
    console.log(`📡 [Enhanced] Getting real-time data for symbols: ${symbols.join(', ')}`);
    
    // Lấy tất cả dữ liệu real-time
    const allData = await enhancedRealDataService.getEnhancedRealTimeData();
    
    // Lọc data cho các symbols được yêu cầu
    const filteredData = allData.filter(item => 
      symbols.some(symbol => item.symbol.startsWith(symbol))
    );

    if (filteredData.length === 0) {
      console.log('⚠️ [Enhanced] No data found for requested symbols, fetching individually...');
      
      // Fallback: lấy từng symbol riêng lẻ
      const individualData = [];
      for (const symbol of symbols) {
        const symbolData = await enhancedRealDataService.getSpecificCryptoData(`${symbol}USDT`);
        if (symbolData) {
          individualData.push(symbolData);
        }
      }
      
      if (individualData.length > 0) {
        const avgConfidence = individualData.reduce((sum, item) => sum + item.confidence, 0) / individualData.length;
        return {
          success: true,
          data: individualData,
          source: 'individual_fetch',
          confidence: avgConfidence
        };
      }
    }

    const avgConfidence = filteredData.reduce((sum, item) => sum + item.confidence, 0) / filteredData.length;
    
    return {
      success: true,
      data: filteredData,
      source: filteredData[0]?.source || 'unknown',
      confidence: avgConfidence
    };
  } catch (error) {
    console.error('❌ [Enhanced] Error getting real-time data:', error);
    return {
      success: false,
      data: [],
      source: 'error',
      confidence: 0
    };
  }
}

/**
 * Tạo phản hồi giá crypto với real-time data
 */
async function generateEnhancedCryptoPriceResponse(symbols: string[]): Promise<{
  content: string;
  dataSource: string;
  confidence: number;
}> {
  const dataResult = await getRealTimeDataForSymbols(symbols);
  
  if (!dataResult.success || dataResult.data.length === 0) {
    return {
      content: `Xin lỗi, hiện tại không thể lấy dữ liệu real-time cho ${symbols.join(', ')}. Vui lòng thử lại sau.`,
      dataSource: 'error',
      confidence: 0
    };
  }

  let response = `📊 **Thông tin giá crypto real-time** (Nguồn: ${dataResult.source.toUpperCase()})\n\n`;

  for (const crypto of dataResult.data) {
    const changeIcon = crypto.change24h >= 0 ? '📈' : '📉';
    const changeColor = crypto.change24h >= 0 ? '🟢' : '🔴';
    
    response += `${changeIcon} **${crypto.name} (${crypto.symbol})**:\n`;
    response += `- Giá hiện tại: $${crypto.price.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n`;
    response += `- Biến động 24h: ${changeColor} ${crypto.change24h.toFixed(2)}%\n`;
    response += `- Khối lượng 24h: $${(crypto.volume / 1000000).toFixed(1)}M\n`;
    response += `- Vốn hóa: $${(crypto.marketCap / 1000000000).toFixed(2)}B\n`;
    response += `- Cập nhật: ${crypto.lastUpdate.toLocaleTimeString('vi-VN')}\n`;
    response += `- Độ tin cậy: ${crypto.confidence}%\n\n`;
  }

  // Thêm phân tích tổng quan
  const avgChange = dataResult.data.reduce((sum, crypto) => sum + crypto.change24h, 0) / dataResult.data.length;
  const marketTrend = avgChange >= 0 ? 'tích cực' : 'tiêu cực';
  
  response += `📈 **Phân tích tổng quan**: Xu hướng thị trường hiện tại là **${marketTrend}** với biến động trung bình ${avgChange.toFixed(2)}%.\n\n`;
  
  // Thêm cảnh báo về độ tin cậy
  if (dataResult.confidence < 70) {
    response += `⚠️ **Lưu ý**: Dữ liệu có độ tin cậy ${dataResult.confidence.toFixed(0)}%. Khuyến nghị xác minh thêm trước khi đưa ra quyết định giao dịch.\n`;
  }

  return {
    content: response,
    dataSource: dataResult.source,
    confidence: dataResult.confidence
  };
}

/**
 * Enhanced response generation với real-time data
 */
export async function generateEnhancedResponse(input: EnhancedGenerateResponseInput): Promise<EnhancedGenerateResponseOutput> {
  const startTime = Date.now();
  console.log(`🚀 [Enhanced] Starting enhanced response generation for: "${input.message}"`);
  
  try {
    // Phát hiện crypto symbols trong message
    const detectedSymbols = detectEnhancedCryptoSymbol(input.message);
    
    // Kiểm tra xem có phải câu hỏi về giá không
    const isPriceQuery = /giá|price|bao nhiêu|hiện tại|current/i.test(input.message);
    
    if (detectedSymbols.length > 0 && isPriceQuery) {
      console.log(`💰 [Enhanced] Price query detected for: ${detectedSymbols.join(', ')}`);
      
      const priceResponse = await generateEnhancedCryptoPriceResponse(detectedSymbols);
      
      return {
        content: priceResponse.content,
        dataSource: priceResponse.dataSource,
        confidence: priceResponse.confidence,
        timestamp: new Date().toISOString(),
        symbols: detectedSymbols
      };
    }

    // Nếu không phải câu hỏi về giá, xử lý bằng AI thông thường
    console.log('🤖 [Enhanced] Using AI for general response');
    
    const aiResponse = await ai.generate({
      prompt: `
Bạn là một chuyên gia phân tích cryptocurrency. Hãy trả lời câu hỏi sau một cách chuyên nghiệp và hữu ích:

Câu hỏi: ${input.message}

Lưu ý:
- Sử dụng tiếng Việt
- Cung cấp thông tin chính xác và cập nhật
- Đưa ra lời khuyên thận trọng về đầu tư
- Nếu câu hỏi liên quan đến giá cả, hãy đề xuất người dùng hỏi cụ thể về từng loại tiền
      `,
      config: {
        temperature: 0.7,
        maxOutputTokens: 500
      }
    });

    const processingTime = Date.now() - startTime;
    console.log(`✅ [Enhanced] Response generated in ${processingTime}ms`);

    return {
      content: aiResponse.text,
      dataSource: 'ai_general',
      confidence: 85, // AI general response có confidence vừa phải
      timestamp: new Date().toISOString(),
      symbols: detectedSymbols.length > 0 ? detectedSymbols : undefined
    };

  } catch (error) {
    console.error('❌ [Enhanced] Error in enhanced response generation:', error);
    
    return {
      content: 'Xin lỗi, đã có lỗi xảy ra khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.',
      dataSource: 'error',
      confidence: 0,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Test function để kiểm tra enhanced service
 */
export async function testEnhancedService(): Promise<{
  connections: any;
  realTimeData: any;
  stats: any;
}> {
  console.log('🧪 [Enhanced] Testing enhanced service...');
  
  try {
    const [connections, realTimeData, stats] = await Promise.all([
      enhancedRealDataService.checkEnhancedConnections(),
      enhancedRealDataService.getEnhancedRealTimeData(),
      enhancedRealDataService.getEnhancedCollectionStats()
    ]);

    console.log('✅ [Enhanced] Service test completed successfully');
    
    return {
      connections,
      realTimeData: realTimeData.slice(0, 3), // Chỉ lấy 3 crypto đầu tiên
      stats
    };
  } catch (error) {
    console.error('❌ [Enhanced] Service test failed:', error);
    throw error;
  }
} 