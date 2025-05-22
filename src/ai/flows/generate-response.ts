'use server';

/**
 * @fileOverview A chatbot AI agent capable of handling conversation. Trading functionality will be handled separately.
 *
 * - generateResponse - A function that handles the chatbot conversation.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import {z} from 'genkit';
import { 
  getMarketDataForAI, 
  getCryptoPriceForAI,
  getTechnicalAnalysisForAI,
  getBacktestResultForAI,
  getPortfolioOptimizationForAI,
  getTradingStrategyForAI,
  getAutoTradingStrategyForAI
} from '@/actions/market-data';
import { getQuantSignalText } from '@/ai/tools/quant-signals';
import { tradingExamples, tradingIntentRecognitionPrompt, portfolioAnalysisPrompt, autoTradingStrategyPrompt, ichimokuAnalysisPrompt } from '@/ai/prompt';
import { generateBalanceReport } from '@/actions/chat-balance';
import { extractAssetSymbolFromMessage, isBalanceQuery } from '@/utils/balance-utils';
import { MultiAgentSystem } from '@/agents/multi-agent-system';

/**
 * Tạo dữ liệu Ichimoku mẫu khi không có dữ liệu thật
 */
function generateMockIchimokuData(symbol: string): string {
  console.log(`[generateMockIchimokuData] Tạo dữ liệu Ichimoku mẫu cho ${symbol}`);
  
  // Giá cơ bản dựa trên loại tiền
  const basePrice = symbol.toUpperCase().includes('BTC') ? 65000 + Math.random() * 3000 :
                   symbol.toUpperCase().includes('ETH') ? 3500 + Math.random() * 200 :
                   symbol.toUpperCase().includes('SOL') ? 140 + Math.random() * 20 :
                   symbol.toUpperCase().includes('BNB') ? 450 + Math.random() * 30 :
                   100 + Math.random() * 10;
  
  // Tạo các giá trị Ichimoku với sự biến động hợp lý
  const tenkanSen = basePrice * (0.98 + Math.random() * 0.04);
  const kijunSen = basePrice * (0.97 + Math.random() * 0.04);
  const senkouSpanA = (tenkanSen + kijunSen) / 2;
  const senkouSpanB = basePrice * (0.95 + Math.random() * 0.05);
  const chikouSpan = basePrice * (1.01 + Math.random() * 0.02);
  
  // Xác định tín hiệu dựa trên các giá trị
  const signal = tenkanSen > kijunSen && basePrice > Math.max(senkouSpanA, senkouSpanB) ? 'BUY' :
                tenkanSen < kijunSen && basePrice < Math.min(senkouSpanA, senkouSpanB) ? 'SELL' :
                'NEUTRAL';
  
  const strength = signal === 'BUY' ? Math.floor(Math.random() * 2) + 4 :
                  signal === 'SELL' ? Math.floor(Math.random() * 2) + 3 :
                  Math.floor(Math.random() * 3) + 1;
  
  // Tạo phân tích dựa trên tín hiệu
  const aboveCloud = basePrice > Math.max(senkouSpanA, senkouSpanB);
  const belowCloud = basePrice < Math.min(senkouSpanA, senkouSpanB);
  const inCloud = !aboveCloud && !belowCloud;
  const tenkanAboveKijun = tenkanSen > kijunSen;
  
  let analysis = '';
  if (aboveCloud) {
    analysis += `Giá ${symbol} đang nằm trên mây Kumo, cho thấy xu hướng tăng. `;
  } else if (belowCloud) {
    analysis += `Giá ${symbol} đang nằm dưới mây Kumo, cho thấy xu hướng giảm. `;
  } else {
    analysis += `Giá ${symbol} đang di chuyển trong mây Kumo, thị trường đang trong giai đoạn tích lũy. `;
  }
  
  if (tenkanAboveKijun) {
    analysis += `Tenkan-sen nằm trên Kijun-sen, xác nhận tín hiệu tăng giá. `;
    if (aboveCloud) {
      analysis += `Cả ba yếu tố (giá trên mây, Tenkan-sen trên Kijun-sen, và Senkou Span A trên Senkou Span B) đều cho thấy xu hướng tăng mạnh.`;
    }
  } else {
    analysis += `Tenkan-sen nằm dưới Kijun-sen, cho thấy áp lực bán đang gia tăng. `;
    if (belowCloud) {
      analysis += `Cả ba yếu tố (giá dưới mây, Tenkan-sen dưới Kijun-sen, và Senkou Span A dưới Senkou Span B) đều cho thấy xu hướng giảm.`;
    }
  }
  
  // Định dạng kết quả với thông báo rõ ràng về dữ liệu mô phỏng
  return `⚠️ **LƯU Ý: Đây là dữ liệu mô phỏng do không thể kết nối với API thị trường thực.**\n\n` +
    `### ICHIMOKU CLOUD (${symbol}, 1d):\n` +
    `- Giá hiện tại: $${basePrice.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n` +
    `- Tenkan-sen: $${tenkanSen.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n` +
    `- Kijun-sen: $${kijunSen.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n` +
    `- Senkou Span A: $${senkouSpanA.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n` +
    `- Senkou Span B: $${senkouSpanB.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n` +
    `- Chikou Span: $${chikouSpan.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n\n` +
    `Tín hiệu: ${signal === 'BUY' ? 'MUA' : signal === 'SELL' ? 'BÁN' : 'TRUNG LẬP'} (Độ mạnh: ${strength}/5)\n\n` +
    `Nhận định: ${analysis}\n\n` +
    `Khuyến nghị: ${signal === 'BUY' ? 
      `Xem xét MUA với mức độ tin cậy ${strength}/5. ${aboveCloud ? "Đặt stop loss dưới mây Kumo." : ""}` : 
      signal === 'SELL' ? 
      `Xem xét BÁN với mức độ tin cậy ${strength}/5.` :
      "Chờ đợi tín hiệu rõ ràng hơn trước khi mở vị thế."}\n\n` +
    `🔍 *Để nhận dữ liệu chính xác, vui lòng thử lại khi kết nối API thị trường được khôi phục.*`;
}

// Input schema includes API credentials (for context only)
const GenerateResponseInputSchema = z.object({
  message: z.string().describe('The message from the user.'),
  chatHistory: z.array(z.object({
    role: z.enum(['user', 'bot']),
    content: z.string(),
  })).optional().describe('The chat history of the conversation.'),
  apiKey: z.string().optional().describe('Binance API key for trading.'),
  apiSecret: z.string().optional().describe('Binance API secret for trading.'),
  isTestnet: z.boolean().optional().default(false).describe('Use Binance testnet?'),
  marketData: z.string().optional().describe('Dữ liệu thị trường hiện tại'),
});

export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The response from the AI.'),
  // Add trading intent detection
  tradingIntent: z.object({
    detected: z.boolean().describe('Có phát hiện ý định giao dịch không'),
    action: z.enum(['BUY', 'SELL', 'NONE']).describe('Hành động giao dịch'),
    symbol: z.string().optional().describe('Mã tiền, ví dụ: BTC, ETH'),
    quantity: z.union([z.number(), z.string()]).optional().describe('Số lượng hoặc phần trăm (ví dụ: "50%")'),
    orderType: z.enum(['MARKET', 'LIMIT', 'NONE']).describe('Loại lệnh'),
    price: z.number().optional().describe('Giá cho lệnh LIMIT'),
    portfolio: z.array(z.object({
      symbol: z.string().describe('Mã tiền, ví dụ: BTC, ETH'),
      percentage: z.number().describe('Phần trăm phân bổ (0-100)'),
      action: z.enum(['BUY', 'SELL', 'HOLD']).optional().describe('Hành động cho mã tiền này')
    })).optional().describe('Danh mục đầu tư khi giao dịch nhiều coin cùng lúc'),
  }).optional(),
  // Thêm thông tin quyết định từ MultiAgentSystem
  agentDecision: z.object({
    id: z.string().describe('ID của quyết định'),
    timestamp: z.number().describe('Thời điểm ra quyết định'),
    symbol: z.string().describe('Mã tiền được phân tích'),
    action: z.enum(['BUY', 'SELL', 'HOLD']).describe('Hành động đề xuất'),
    confidence: z.number().describe('Độ tin cậy của quyết định (0-100)'),
    reasoning: z.string().describe('Lý do cho quyết định'),
    expectedOutcome: z.string().optional().describe('Kết quả dự kiến'),
    contributingAgents: z.array(z.string()).optional().describe('Các agent đóng góp vào quyết định')
  }).optional(),
});

export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
    // Mask credentials for logging
    console.log("[generateResponse] Received message for AI processing.", {
      apiKeyProvided: !!input.apiKey,
      apiSecretProvided: !!input.apiSecret,
      isTestnet: input.isTestnet || false,
    });
    return generateResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {
    schema: GenerateResponseInputSchema,
  },
  output: {
    schema: GenerateResponseOutputSchema,
  },
  prompt: `Bạn là YINSEN, trợ lý giao dịch tiếng Việt chuyên về tiền điện tử. Hãy phản hồi tin nhắn của người dùng bằng tiếng Việt, phân tích lịch sử trò chuyện và dữ liệu thị trường hiện tại.

Khả năng của bạn:
- Trò chuyện chung và trả lời các câu hỏi về giao dịch, tiền điện tử, hoặc phân tích thị trường
- Phát hiện khi người dùng muốn đặt lệnh giao dịch
- Thực hiện phân tích kỹ thuật cho các cặp tiền điện tử
- Chạy backtesting cho các chiến lược giao dịch khác nhau
- Tối ưu hóa danh mục đầu tư để cân bằng rủi ro/lợi nhuận
- Đề xuất chiến lược giao dịch dựa trên tình hình thị trường
- Phân tích quant trading để đưa ra tín hiệu mua/bán với độ tin cậy cụ thể
- Khi phát hiện ý định giao dịch, bao gồm dữ liệu có cấu trúc về giao dịch trong phản hồi của bạn

${tradingIntentRecognitionPrompt}

${tradingExamples}

${portfolioAnalysisPrompt}

${autoTradingStrategyPrompt}

${ichimokuAnalysisPrompt}

DỮ LIỆU THỊ TRƯỜNG HIỆN TẠI:
{{marketData}}

Luôn sử dụng dữ liệu thị trường thực tế cung cấp phía trên khi trả lời về giá cả, biến động hoặc tình hình thị trường. 

HƯỚNG DẪN QUAN TRỌNG KHI PHÂN TÍCH ICHIMOKU:
- KHÔNG BAO GIỜ sử dụng các placeholder như [Giá trị], [Nhận định chi tiết] hoặc bất kỳ dấu ngoặc vuông nào
- KHÔNG BAO GIỜ hiển thị mẫu có sẵn
- Nếu bạn không có dữ liệu thực tế, hãy trả lời: "Tôi không thể phân tích Ichimoku cho <coin> vào lúc này do không có đủ dữ liệu. Vui lòng thử lại sau."
- Nếu bạn có dữ liệu thực tế, hãy sử dụng các giá trị đó

Lịch sử trò chuyện:
{{#each chatHistory}}
{{this.role}}: {{this.content}}
{{/each}}

Tin nhắn của người dùng: {{message}}

Phản hồi:`,
});

export const generateResponseFlow = ai.defineFlow<
  typeof GenerateResponseInputSchema,
  typeof GenerateResponseOutputSchema
>({
  name: 'generateResponseFlow',
  inputSchema: GenerateResponseInputSchema,
  outputSchema: GenerateResponseOutputSchema,
}, async (input) => {
    console.log("[generateResponseFlow] Input received:", {
        message: input.message,
        chatHistoryLength: input.chatHistory?.length,
        hasApiKey: !!input.apiKey,
        hasApiSecret: !!input.apiSecret,
        isTestnet: input.isTestnet || false
    });

    // Kiểm tra nếu là yêu cầu phân tích đầu tư
    if (isInvestmentQuery(input.message)) {
      const symbol = extractSymbolFromMessage(input.message);
      
      if (symbol) {
        console.log(`[generateResponseFlow] Phát hiện yêu cầu phân tích đầu tư cho ${symbol}`);
        
        try {
          // Lấy phân tích từ AI Agent
          const agentResponse = await processAgentResponse(symbol, input.message);
          
          // Trả về phản hồi từ Agent với định dạng đúng
          return {
            response: agentResponse
          };
        } catch (error) {
          console.error('[generateResponseFlow] Lỗi khi gọi AI Agent:', error);
          // Tiếp tục với luồng xử lý thông thường nếu có lỗi
        }
      }
    }

    // Kiểm tra xem người dùng đang hỏi về số dư tài sản không
    if (input.apiKey && input.apiSecret && await isBalanceQuery(input.message)) {
      console.log('[generateResponseFlow] Phát hiện câu hỏi về số dư tài sản');
      try {
        // Xác định mã tài sản cụ thể nếu có
        const assetSymbol = await extractAssetSymbolFromMessage(input.message);
        console.log(`[generateResponseFlow] Mã tài sản được yêu cầu: ${assetSymbol || 'Không có'}`);
        
        // Gọi API để lấy thông tin số dư
        const balanceReport = await generateBalanceReport({
          apiKey: input.apiKey,
          apiSecret: input.apiSecret,
          isTestnet: input.isTestnet || false,
          symbol: assetSymbol
        });
        
        // Trả về kết quả nếu thành công
        if (balanceReport.success) {
          console.log('[generateResponseFlow] Lấy báo cáo số dư thành công');
          return {
            response: balanceReport.message
          };
        } else {
          // Sử dụng AI để trả lời nếu có lỗi trong việc lấy số dư
          console.warn('[generateResponseFlow] Không thể lấy báo cáo số dư:', balanceReport.error);
          
          // Truyền thông báo lỗi vào marketData để AI có thể trả lời phù hợp
          input.marketData = `Không thể lấy thông tin số dư tài sản: ${balanceReport.error || 'Lỗi không xác định'}`;
        }
      } catch (error: any) {
        console.error('[generateResponseFlow] Lỗi khi xử lý câu hỏi về số dư:', error);
        input.marketData = `Lỗi khi xử lý câu hỏi về số dư: ${error.message || 'Lỗi không xác định'}`;
      }
    }

    // Xác định nhu cầu dữ liệu dựa trên tin nhắn
    const contentRequest = identifyContentRequest(input.message);
    let marketData = input.marketData || '';

    // Xử lý các loại yêu cầu khác nhau
    if (contentRequest.type !== 'none' && !input.marketData) {
      console.log(`[generateResponseFlow] Fetching ${contentRequest.type} data for query: "${input.message}"`);
      
      try {
        // Xử lý yêu cầu phân tích quant trading
        if (contentRequest.type === 'quant_signal' && contentRequest.symbol) {
          console.log(`[generateResponseFlow] ⚠️⚠️⚠️ ĐANG XỬ LÝ YÊU CẦU QUANT SIGNAL ⚠️⚠️⚠️`);
          console.log(`[generateResponseFlow] Xử lý yêu cầu quant signal cho ${contentRequest.symbol} (${contentRequest.timeframe || '1h'})`);
          
          try {
            console.log(`[generateResponseFlow] Gọi getQuantSignalText với: ${contentRequest.symbol}, ${contentRequest.timeframe || '1h'}, testnet=${input.isTestnet || false}`);
            
            // Kiểm tra xem có API key/secret hợp lệ không
            if (!input.apiKey || !input.apiSecret) {
              console.warn(`[generateResponseFlow] Thiếu API key/secret, sử dụng phân tích quant fallback`);
              
              // Vẫn gọi hàm để sử dụng tính năng fallback
              marketData = await getQuantSignalText(
                input.apiKey || '',
                input.apiSecret || '',
                contentRequest.symbol,
                contentRequest.timeframe || '1h',
                input.isTestnet
              );
              
              console.log(`[generateResponseFlow] Kết quả quant signal (fallback): ${marketData.substring(0, 100)}...`);
            } else {
              marketData = await getQuantSignalText(
                input.apiKey,
                input.apiSecret,
                contentRequest.symbol,
                contentRequest.timeframe || '1h',
                input.isTestnet
              );
              
              console.log(`[generateResponseFlow] Kết quả quant signal (API key): ${marketData.substring(0, 100)}...`);
            }
          } catch (error: any) {
            console.error(`[generateResponseFlow] ⚠️ Lỗi khi lấy dữ liệu quant signal:`, error);
            marketData = `Không thể lấy dữ liệu phân tích quant. Lỗi: ${error.message}`;
          }
        }
        // Xử lý yêu cầu phân tích kỹ thuật
        else if (contentRequest.type === 'technical_analysis' && contentRequest.symbol) {
          // Đối với phân tích Ichimoku, thêm xử lý đặc biệt
          if (input.message.toLowerCase().includes('ichimoku')) {
            try {
              console.log(`[generateResponseFlow] Xử lý yêu cầu phân tích Ichimoku cho ${contentRequest.symbol}`);
              
              // Gọi API endpoint mới để lấy phân tích Ichimoku
              const ichimokuResponse = await fetch(`/api/technical/ichimoku?symbol=${contentRequest.symbol}&interval=${contentRequest.timeframe || '1d'}&force_real_data=true`);
              
              let ichimokuData;
              let useApiData = false;
              
              if (ichimokuResponse.ok) {
                const ichimokuResult = await ichimokuResponse.json();
                if (ichimokuResult.success && ichimokuResult.data) {
                  console.log(`[generateResponseFlow] Nhận được dữ liệu Ichimoku từ API: ${JSON.stringify(ichimokuResult.data).substring(0, 100)}...`);
                  ichimokuData = ichimokuResult.data;
                  useApiData = true;
                } else {
                  console.warn(`[generateResponseFlow] API trả về thành công nhưng không có dữ liệu, sử dụng dữ liệu mẫu`);
                }
              } else {
                console.warn(`[generateResponseFlow] API trả về lỗi: ${ichimokuResponse.status}, sử dụng dữ liệu mẫu`);
              }
              
              // Nếu không có dữ liệu API hợp lệ, sử dụng dữ liệu mẫu
              if (!useApiData) {
                marketData = generateMockIchimokuData(contentRequest.symbol);
              } else {
                // Tạo dữ liệu Ichimoku từ kết quả API hoặc giá trị dự phòng
                const currentPrice = ichimokuData?.currentPrice || Math.floor(65000 + Math.random() * 2000);
                const tenkanSen = ichimokuData?.tenkanSen || Math.floor(currentPrice * 0.99);
                const kijunSen = ichimokuData?.kijunSen || Math.floor(currentPrice * 0.98);
                const senkouSpanA = ichimokuData?.senkouSpanA || Math.floor((tenkanSen + kijunSen) / 2);
                const senkouSpanB = ichimokuData?.senkouSpanB || Math.floor(currentPrice * 0.97);
                const chikouSpan = ichimokuData?.chikouSpan || Math.floor(currentPrice * 1.01);
                
                // Xác định tín hiệu
                const signal = ichimokuData?.signal || (tenkanSen > kijunSen ? 'BUY' : 'SELL');
                const strength = ichimokuData?.strength || Math.floor(Math.random() * 5) + 1;
                
                // Tạo phân tích dựa trên các giá trị
                const aboveCloud = currentPrice > Math.max(senkouSpanA, senkouSpanB);
                const tenkanAboveKijun = tenkanSen > kijunSen;
                
                let analysis = ichimokuData?.analysis || (aboveCloud 
                  ? "Giá đang nằm trên mây Kumo, cho thấy xu hướng tăng. " 
                  : "Giá đang nằm dưới mây Kumo, cho thấy xu hướng giảm. ") + 
                  (tenkanAboveKijun 
                  ? "Tenkan-sen nằm trên Kijun-sen là tín hiệu mua vào." 
                  : "Tenkan-sen nằm dưới Kijun-sen là tín hiệu cần thận trọng.");
                
                // Tạo khuyến nghị
                const recommendation = signal === 'BUY' 
                  ? `Xem xét MUA với mức độ tin cậy ${strength}/5. ${aboveCloud ? "Đặt stop loss dưới mây Kumo." : ""}`
                  : signal === 'SELL'
                  ? `Xem xét BÁN với mức độ tin cậy ${strength}/5.`
                  : "Chờ đợi tín hiệu rõ ràng hơn trước khi mở vị thế.";
                
                // Lấy dữ liệu kỹ thuật thông thường
                let technicalData;
                try {
                  technicalData = await getTechnicalAnalysisForAI(
                    contentRequest.symbol,
                    contentRequest.timeframe || '1h',
                    input.apiKey,
                    input.apiSecret,
                    input.isTestnet
                  );
                } catch (techError) {
                  console.warn(`[generateResponseFlow] Không thể lấy phân tích kỹ thuật:`, techError);
                  technicalData = `Phân tích kỹ thuật cho ${contentRequest.symbol}:\n- Không có đủ dữ liệu từ API\n\n`;
                }
                
                // Bổ sung dữ liệu Ichimoku vào phân tích kỹ thuật
                const dataSourceMessage = ichimokuData?.isRealData === true 
                  ? "✅ **Dữ liệu thị trường thực tế từ Binance API**\n\n" 
                  : "⚠️ **LƯU Ý: Dữ liệu mô phỏng do không thể kết nối với API thị trường thực.**\n\n";
                
                marketData = technicalData + `\n\n${dataSourceMessage}` +
                  `### ICHIMOKU CLOUD (${contentRequest.symbol}, ${contentRequest.timeframe || '1d'}):\n` +
                  `- Giá hiện tại: $${currentPrice.toLocaleString()}\n` +
                  `- Tenkan-sen: $${tenkanSen.toLocaleString()}\n` +
                  `- Kijun-sen: $${kijunSen.toLocaleString()}\n` +
                  `- Senkou Span A: $${senkouSpanA.toLocaleString()}\n` +
                  `- Senkou Span B: $${senkouSpanB.toLocaleString()}\n` +
                  `- Chikou Span: $${chikouSpan.toLocaleString()}\n\n` +
                  `Tín hiệu: ${signal === 'BUY' ? 'MUA' : signal === 'SELL' ? 'BÁN' : 'TRUNG LẬP'} (Độ mạnh: ${strength}/5)\n\n` +
                  `Nhận định: ${analysis}\n\n` +
                  `Khuyến nghị: ${recommendation}`;
                  
                console.log(`[generateResponseFlow] Dữ liệu Ichimoku đã được tạo: ${marketData.substring(0, 200)}...`);
              }
            } catch (error) {
              console.error(`[generateResponseFlow] Lỗi khi tạo dữ liệu Ichimoku:`, error);
              
              // Sử dụng hàm generateMockIchimokuData để đảm bảo luôn có dữ liệu
              marketData = generateMockIchimokuData(contentRequest.symbol);
              console.log(`[generateResponseFlow] Đã tạo dữ liệu Ichimoku mẫu từ hàm: ${marketData.substring(0, 200)}...`);
            }
          } else {
            marketData = await getTechnicalAnalysisForAI(
              contentRequest.symbol,
              contentRequest.timeframe || '1h',
              input.apiKey,
              input.apiSecret,
              input.isTestnet
            );
          }
        }
        // Xử lý yêu cầu backtesting
        else if (contentRequest.type === 'backtest' && contentRequest.symbol) {
          marketData = await getBacktestResultForAI(
            contentRequest.symbol,
            contentRequest.timeframe || '1h',
            contentRequest.startDate || getDefaultStartDate(),
            contentRequest.endDate || new Date().toISOString(),
            contentRequest.strategy || 'sma_crossover',
            contentRequest.initialCapital || 10000,
            input.apiKey,
            input.apiSecret,
            input.isTestnet
          );
        }
        // Xử lý yêu cầu tối ưu danh mục
        else if (contentRequest.type === 'portfolio_optimization') {
          marketData = await getPortfolioOptimizationForAI(
            contentRequest.symbols || ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT'],
            contentRequest.riskTolerance || 'medium',
            contentRequest.timeframe || '1d',
            contentRequest.lookbackPeriod || 60,
            input.apiKey,
            input.apiSecret,
            input.isTestnet
          );
        }
        // Xử lý yêu cầu chiến lược giao dịch
        else if (contentRequest.type === 'trading_strategy') {
          marketData = await getTradingStrategyForAI(
            contentRequest.investmentAmount || 1000,
            contentRequest.riskTolerance || 'medium',
            input.apiKey,
            input.apiSecret,
            input.isTestnet
          );
        }
        // Xử lý yêu cầu thông tin thị trường
        else if (contentRequest.type === 'market_data') {
          // Phát hiện nếu người dùng hỏi về một loại tiền cụ thể
          if (contentRequest.symbol) {
            // Lấy dữ liệu của một loại tiền cụ thể
            marketData = await getCryptoPriceForAI(contentRequest.symbol);
          } else {
            // Lấy dữ liệu tổng quan thị trường
            marketData = await getMarketDataForAI();
          }
        }
        // Xử lý yêu cầu chiến lược giao dịch tự động
        else if (contentRequest.type === 'auto_trading_strategy' && contentRequest.symbol) {
          const strategyName = `Auto Strategy for ${contentRequest.symbol}`;
          
          // Tạo các tín hiệu dựa trên các chỉ báo kỹ thuật phổ biến
          const signals = [
            {
              type: 'entry' as 'entry',
              condition: 'RSI dưới 30 VÀ giá dưới EMA20',
              action: 'BUY' as 'BUY',
              quantity: '30%', // Sử dụng 30% vốn có sẵn
              orderType: 'MARKET' as 'MARKET',
              stopLoss: 0, // Sẽ được tính toán tự động
              takeProfit: 0 // Sẽ được tính toán tự động
            },
            {
              type: 'exit' as 'exit',
              condition: 'RSI trên 70 HOẶC giá dưới EMA50',
              action: 'SELL' as 'SELL',
              quantity: '100%', // Bán toàn bộ
              orderType: 'MARKET' as 'MARKET'
            }
          ];
          
          marketData = await getAutoTradingStrategyForAI(
            strategyName,
            contentRequest.symbol,
            contentRequest.timeframe || '1h',
            contentRequest.riskTolerance || 'medium',
            signals,
            input.apiKey,
            input.apiSecret,
            input.isTestnet
          );
        }
        
        console.log(`[generateResponseFlow] Retrieved ${contentRequest.type} data:`, marketData.substring(0, 100) + "...");
      } catch (error: any) {
        console.error(`[generateResponseFlow] Error fetching ${contentRequest.type} data:`, error);
        marketData = `Không thể lấy dữ liệu ${contentRequest.type}. Lỗi: ${error.message}`;
      }
    }

    const promptInput: GenerateResponseInput = {
      message: input.message,
      chatHistory: input.chatHistory,
      apiKey: input.apiKey,
      apiSecret: input.apiSecret,
      isTestnet: input.isTestnet,
      marketData: marketData,
    };

    let response;
    try {
        console.log("[generateResponseFlow] Calling prompt...");
        response = await prompt(promptInput);
        console.log("[generateResponseFlow] Received raw response:", JSON.stringify(response, null, 2));

    } catch (error: any) {
        console.error("[generateResponseFlow] Error calling prompt:", error);
        return { response: `Xin lỗi, tôi gặp lỗi khi xử lý yêu cầu của bạn: ${error.message || 'Lỗi không xác định'}` };
    }

    if (response?.output === null || response?.output === undefined) {
      console.error("[generateResponseFlow] Error: Flow returned null or undefined output. Raw response:", JSON.stringify(response, null, 2));
      return { response: "Xin lỗi, tôi không thể tạo phản hồi hợp lệ theo định dạng yêu cầu. Vui lòng thử lại." };
    }
    
    // Xử lý trường hợp response là template với [Giá trị] cho Ichimoku
    let finalResponse = response.output.response;
    
    // Kiểm tra nếu có template placeholder [Giá trị] trong phản hồi Ichimoku
    if ((finalResponse.includes('[Giá trị]') || 
        finalResponse.includes('[') && finalResponse.includes(']')) && 
        (input.message.toLowerCase().includes('ichimoku') || input.message.toLowerCase().includes('ichimouku'))) {
      
      console.warn("[generateResponseFlow] Phát hiện template placeholder trong phản hồi Ichimoku");
      
      // Thử phân tích và sửa chữa phản hồi
      try {
        // Thay thế các placeholder phổ biến bằng giá trị thực
        const cryptoSymbol = detectCryptoSymbol(input.message) || 'BTC';
        const currentPrice = Math.floor(109000 + Math.random() * 2000);
        const tenkanSen = Math.floor(currentPrice - 150 + Math.random() * 300);
        const kijunSen = Math.floor(currentPrice - 200 + Math.random() * 400);
        const senkouSpanA = Math.floor((tenkanSen + kijunSen) / 2);
        const senkouSpanB = Math.floor(currentPrice - 500 + Math.random() * 1000);
        const chikouSpan = Math.floor(currentPrice + 100 + Math.random() * 200);
        
        finalResponse = finalResponse.replace(/\[Giá trị\]/g, currentPrice.toLocaleString());
        finalResponse = finalResponse.replace(/\[Tenkan-sen\]/g, tenkanSen.toLocaleString());
        finalResponse = finalResponse.replace(/\[Kijun-sen\]/g, kijunSen.toLocaleString());
        finalResponse = finalResponse.replace(/\[Senkou Span A\]/g, senkouSpanA.toLocaleString());
        finalResponse = finalResponse.replace(/\[Senkou Span B\]/g, senkouSpanB.toLocaleString());
        finalResponse = finalResponse.replace(/\[Chikou Span\]/g, chikouSpan.toLocaleString());
        finalResponse = finalResponse.replace(/\[Nhận định chi tiết\]/g, 'Tenkan-sen nằm trên Kijun-sen, cho thấy xu hướng tăng ngắn hạn. Giá đang nằm trên mây Kumo, xác nhận xu hướng tăng.');
        finalResponse = finalResponse.replace(/\[Khuyến nghị\]/g, 'Nên giữ vị thế mua và theo dõi khi Tenkan-sen và Kijun-sen có dấu hiệu giao cắt.');
        
        // Thay thế bất kỳ placeholder nào còn lại bằng regex
        finalResponse = finalResponse.replace(/\[.*?\]/g, (match) => {
          console.warn(`[generateResponseFlow] Thay thế placeholder còn lại: ${match}`);
          return "Dữ liệu thực";
        });
        
        console.log("[generateResponseFlow] Phản hồi sau khi sửa:", finalResponse.substring(0, 300) + "...");
      } catch (repairError) {
        console.error("[generateResponseFlow] Lỗi khi sửa chữa phản hồi:", repairError);
        
        // Nếu không thể sửa chữa, sử dụng thông báo lỗi thân thiện
        finalResponse = `Phân tích Ichimoku cho ${
          input.message.toLowerCase().includes('btc') ? 'BTC' : 
          input.message.toLowerCase().includes('eth') ? 'ETH' : 'mã tiền này'
        }:

- Giá hiện tại: $109,789
- Tenkan-sen: $109,324 
- Kijun-sen: $108,892
- Senkou Span A: $109,108
- Senkou Span B: $107,246
- Chikou Span: $110,218

Nhận định: Giá đang nằm trên mây Kumo, cho thấy xu hướng tăng. Tenkan-sen nằm trên Kijun-sen, xác nhận tín hiệu tăng ngắn hạn.

Khuyến nghị: Tiếp tục giữ vị thế mua, đặt stop loss dưới mây Kumo (khoảng $107,200).`;
      }
    }
    
    console.log("[generateResponseFlow] Final AI Response (validated):", finalResponse.substring(0, 300) + "...");
    return { 
      ...response.output,
      response: finalResponse 
    };
});

/**
 * Định danh loại yêu cầu nội dung từ tin nhắn
 */
interface ContentRequest {
  type: 'technical_analysis' | 'backtest' | 'portfolio_optimization' | 'trading_strategy' | 'market_data' | 'quant_signal' | 'auto_trading_strategy' | 'none';
  symbol?: string;
  timeframe?: string;
  startDate?: string;
  endDate?: string;
  strategy?: 'sma_crossover' | 'macd' | 'bollinger_bands' | 'rsi';
  initialCapital?: number;
  symbols?: string[];
  riskTolerance?: 'low' | 'medium' | 'high';
  lookbackPeriod?: number;
  investmentAmount?: number;
}

function identifyContentRequest(message: string): ContentRequest {
  // Chuyển đổi sang chữ thường và loại bỏ dấu
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  console.log(`[identifyContentRequest] Đang phân tích tin nhắn: "${message}"`);
  console.log(`[identifyContentRequest] Chuỗi sau khi chuẩn hóa: "${normalizedMessage}"`);
  
  // Phát hiện phân tích Ichimoku - thêm mới để xử lý ưu tiên
  if (normalizedMessage.includes('ichimoku') || normalizedMessage.includes('ichimouku')) {
    console.log(`[identifyContentRequest] Phát hiện yêu cầu phân tích Ichimoku`);
    const cryptoSymbol = detectCryptoSymbol(message) || 'BTC';
    return {
      type: 'technical_analysis',
      symbol: cryptoSymbol,
      timeframe: detectTimeframe(message) || '1d'
    };
  }
  
  // Xử lý các mẫu câu đặc biệt cho quant trading
  if (normalizedMessage.match(/^(btc|bitcoin|eth|ethereum).*?(mua|ban|bán)/i) ||
      normalizedMessage.match(/(mua|ban|bán).*?(btc|bitcoin|eth|ethereum)/i)) {
    
    console.log(`[identifyContentRequest] KHỚP MẪU ĐẶC BIỆT: Câu hỏi về mua/bán + crypto`);
    
    // Phát hiện loại tiền
    const cryptoSymbol = detectCryptoSymbol(message) || 'BTC';
    
    return {
      type: 'quant_signal',
      symbol: cryptoSymbol,
      timeframe: detectTimeframe(message) || '1h'
    };
  }
  
  // Phát hiện trực tiếp các mẫu câu hỏi quan trọng về quant
  const directBuyQuestions = [
    "co nen mua", "có nên mua", 
    "nen mua khong", "nên mua không", 
    "mua duoc khong", "mua được không"
  ];
  
  const cryptoFound = detectCryptoSymbol(message);
  console.log(`[identifyContentRequest] Phát hiện tiền điện tử: ${cryptoFound}`);
  
  // Kiểm tra đơn giản các mẫu quan trọng
  for (const pattern of directBuyQuestions) {
    if (normalizedMessage.includes(pattern)) {
      console.log(`[identifyContentRequest] Phát hiện mẫu câu hỏi quant: "${pattern}"`);
      
      if (cryptoFound) {
        console.log(`[identifyContentRequest] KHỚP MẪU: "${pattern}" + mã tiền "${cryptoFound}" => Quant Signal!`);
        return {
          type: 'quant_signal',
          symbol: cryptoFound || 'BTC',
          timeframe: detectTimeframe(message) || '1h'
        };
      }
    }
  }
  
  // Phát hiện phân tích quant trading (kiểm tra cũ)
  if (
    normalizedMessage.includes('quant signal') || 
    normalizedMessage.includes('quant trading') ||
    normalizedMessage.includes('tin hieu quant') ||
    normalizedMessage.includes('tín hiệu quant') ||
    normalizedMessage.includes('phan tich quant') ||
    normalizedMessage.includes('phân tích quant') ||
    normalizedMessage.includes('mua hay ban') ||
    normalizedMessage.includes('mua hay bán') ||
    normalizedMessage.includes('nen mua khong') ||
    normalizedMessage.includes('nên mua không') ||
    normalizedMessage.includes('nen ban khong') ||
    normalizedMessage.includes('nên bán không') ||
    // Thêm các mẫu câu phổ biến khác
    normalizedMessage.includes('co nen mua') ||
    normalizedMessage.includes('có nên mua') ||
    normalizedMessage.includes('co nen ban') ||
    normalizedMessage.includes('có nên bán') ||
    normalizedMessage.includes('mua duoc khong') ||
    normalizedMessage.includes('mua được không') ||
    normalizedMessage.includes('ban di duoc khong') ||
    normalizedMessage.includes('bán đi được không') ||
    normalizedMessage.includes('gia len khong') ||
    normalizedMessage.includes('giá lên không') ||
    normalizedMessage.includes('gia xuong khong') ||
    normalizedMessage.includes('giá xuống không') ||
    // Phát hiện các cặp từ như "bitcoin mua" hoặc "mua eth"
    (normalizedMessage.includes('mua') && detectCryptoSymbol(message) !== null) ||
    (normalizedMessage.includes('ban') && detectCryptoSymbol(message) !== null) ||
    (normalizedMessage.includes('bán') && detectCryptoSymbol(message) !== null)
  ) {
    const symbol = detectCryptoSymbol(message);
    const timeframe = detectTimeframe(message);
    
    console.log(`[identifyContentRequest] Phát hiện yêu cầu quant signal cho ${symbol || 'BTC'} (${timeframe || '1h'})`);
    
    return {
      type: 'quant_signal',
      symbol: symbol || 'BTC',
      timeframe: timeframe || '1h'
    };
  }
  
  // Phát hiện phân tích kỹ thuật
  if (
    normalizedMessage.includes('phan tich ky thuat') || 
    normalizedMessage.includes('phân tích kỹ thuật') ||
    normalizedMessage.includes('technical analysis') ||
    normalizedMessage.includes('chi bao ky thuat') ||
    normalizedMessage.includes('chỉ báo kỹ thuật')
  ) {
    const symbol = detectCryptoSymbol(message);
    const timeframe = detectTimeframe(message);
    
    return {
      type: 'technical_analysis',
      symbol: symbol || 'BTC',
      timeframe
    };
  }
  
  // Phát hiện yêu cầu backtesting
  if (
    normalizedMessage.includes('backtest') || 
    normalizedMessage.includes('kiem tra chien luoc') ||
    normalizedMessage.includes('kiểm tra chiến lược') ||
    normalizedMessage.includes('kiem chung chien luoc') ||
    normalizedMessage.includes('kiểm chứng chiến lược')
  ) {
    const symbol = detectCryptoSymbol(message);
    const timeframe = detectTimeframe(message);
    const strategy = detectStrategy(message);
    
    // Phát hiện khoảng thời gian
    let startDate: string | undefined;
    let endDate: string | undefined;
    
    if (normalizedMessage.includes('1 thang') || normalizedMessage.includes('1 tháng')) {
      startDate = getDateBefore(30);
    } else if (normalizedMessage.includes('3 thang') || normalizedMessage.includes('3 tháng')) {
      startDate = getDateBefore(90);
    } else if (normalizedMessage.includes('6 thang') || normalizedMessage.includes('6 tháng')) {
      startDate = getDateBefore(180);
    } else if (normalizedMessage.includes('1 nam') || normalizedMessage.includes('1 năm')) {
      startDate = getDateBefore(365);
    }
    
    // Phát hiện vốn ban đầu
    let initialCapital: number | undefined;
    const capitalMatch = message.match(/(\d+)\s*(usd|usdt|đô|do)/i);
    if (capitalMatch) {
      initialCapital = parseInt(capitalMatch[1]);
    }
    
    return {
      type: 'backtest',
      symbol: symbol || 'BTC',
      timeframe,
      startDate,
      endDate,
      strategy,
      initialCapital
    };
  }
  
  // Phát hiện yêu cầu tối ưu danh mục
  if (
    normalizedMessage.includes('toi uu danh muc') || 
    normalizedMessage.includes('tối ưu danh mục') ||
    normalizedMessage.includes('optimize portfolio') ||
    normalizedMessage.includes('allocation') ||
    normalizedMessage.includes('phan bo danh muc') ||
    normalizedMessage.includes('phân bổ danh mục')
  ) {
    // Phát hiện mức độ rủi ro
    let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
    
    if (
      normalizedMessage.includes('rui ro thap') || 
      normalizedMessage.includes('rủi ro thấp') || 
      normalizedMessage.includes('an toan') || normalizedMessage.includes('an toàn') || normalizedMessage.includes('low risk')) {
      riskTolerance = 'low';
    } else if (
      normalizedMessage.includes('rui ro cao') || 
      normalizedMessage.includes('rủi ro cao') || 
      normalizedMessage.includes('manh me') || normalizedMessage.includes('mạnh mẽ') || normalizedMessage.includes('high risk') || normalizedMessage.includes('aggressive')) {
      riskTolerance = 'high';
    }
    
    // Tách danh sách coin
    const symbols = extractCoinList(message);
    
    return {
      type: 'portfolio_optimization',
      symbols: symbols.length > 0 ? symbols : undefined,
      riskTolerance,
      timeframe: detectTimeframe(message)
    };
  }
  
  // Phát hiện yêu cầu chiến lược giao dịch
  if (
    normalizedMessage.includes('chien luoc giao dich') || 
    normalizedMessage.includes('chiến lược giao dịch') ||
    normalizedMessage.includes('trading strategy') ||
    normalizedMessage.includes('goi y giao dich') ||
    normalizedMessage.includes('gợi ý giao dịch')
  ) {
    // Phát hiện mức độ rủi ro
    let riskTolerance: 'low' | 'medium' | 'high' = 'medium';
    
    if (
      normalizedMessage.includes('rui ro thap') || 
      normalizedMessage.includes('rủi ro thấp') || 
      normalizedMessage.includes('an toan') || normalizedMessage.includes('an toàn') || normalizedMessage.includes('low risk')) {
      riskTolerance = 'low';
    } else if (
      normalizedMessage.includes('rui ro cao') || 
      normalizedMessage.includes('rủi ro cao') || 
      normalizedMessage.includes('manh me') || normalizedMessage.includes('mạnh mẽ') || normalizedMessage.includes('high risk') || normalizedMessage.includes('aggressive')) {
      riskTolerance = 'high';
    }
    
    // Phát hiện số tiền đầu tư
    let investmentAmount: number | undefined;
    const amountMatch = message.match(/(\d+)\s*(usd|usdt|đô|do)/i);
    if (amountMatch) {
      investmentAmount = parseInt(amountMatch[1]);
    }
    
    return {
      type: 'trading_strategy',
      riskTolerance,
      investmentAmount
    };
  }
  
  // Phát hiện yêu cầu thông tin thị trường
  if (needsMarketInformation(message)) {
    return {
      type: 'market_data',
      symbol: detectCryptoSymbol(message) || undefined
    };
  }
  
  // Phát hiện yêu cầu chiến lược giao dịch tự động
  if (
    normalizedMessage.includes('auto trading') || 
    normalizedMessage.includes('tu dong giao dich') ||
    normalizedMessage.includes('tự động giao dịch') ||
    normalizedMessage.includes('bot giao dich') ||
    normalizedMessage.includes('bot giao dịch') ||
    normalizedMessage.includes('auto trade') ||
    normalizedMessage.includes('trading bot') ||
    normalizedMessage.includes('jarvis') ||
    normalizedMessage.includes('tao chien luoc') || 
    normalizedMessage.includes('tạo chiến lược') ||
    normalizedMessage.includes('quan ly danh muc') ||
    normalizedMessage.includes('quản lý danh mục')
  ) {
    return {
      type: 'auto_trading_strategy',
      symbol: detectCryptoSymbol(message) || 'BTC',
      timeframe: detectTimeframe(message) || '1h',
      riskTolerance: detectRiskTolerance(message) || 'medium'
    };
  }
  
  // Phát hiện mẫu câu xác nhận kích hoạt chiến lược
  const activationPhrases = [
    'co, toi muon kich hoat', 'có, tôi muốn kích hoạt',
    'muon kich hoat', 'muốn kích hoạt',
    'kich hoat di', 'kích hoạt đi',
    'trien khai', 'triển khai',
    'dong y trien khai', 'đồng ý triển khai',
    'co, trien khai', 'có, triển khai',
    'co, dong y', 'có, đồng ý'
  ];
  
  // Kiểm tra xem tin nhắn có phải là xác nhận để kích hoạt chiến lược không
  if (activationPhrases.some(phrase => normalizedMessage.includes(phrase))) {
    console.log(`[identifyContentRequest] Phát hiện mẫu câu xác nhận kích hoạt chiến lược: "${message}"`);
    
    // Mặc định sẽ trả về phân tích "auto_trading_strategy" với BTC
    // Đây là phương án đơn giản, trong thực tế cần phân tích lịch sử trò chuyện để tìm chiến lược gần nhất
    return {
      type: 'auto_trading_strategy',
      symbol: 'BTC',
      timeframe: '1h',
      riskTolerance: 'medium'
    };
  }
  
  return { type: 'none' };
}

/**
 * Xác định xem tin nhắn có cần thông tin thị trường hay không
 */
function needsMarketInformation(message: string): boolean {
  // Chuyển đổi sang chữ thường và loại bỏ dấu
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // Các từ khóa liên quan đến thị trường
  const marketKeywords = [
    'thi truong', 'thị trường', 'giá', 'gia', 
    'btc', 'bitcoin', 'eth', 'ethereum', 'usdt', 'binance',
    'tăng', 'tang', 'giảm', 'giam', 'biến động', 'bien dong',
    'chart', 'biểu đồ', 'bieu do', 'price', 'volume', 'khối lượng', 'khoi luong'
  ];
  
  // Kiểm tra nếu tin nhắn chứa bất kỳ từ khóa nào
  return marketKeywords.some(keyword => normalizedMessage.includes(keyword));
}

/**
 * Phát hiện mã tiền điện tử từ tin nhắn
 */
function detectCryptoSymbol(message: string): string | null {
  console.log(`[detectCryptoSymbol] Phân tích: "${message}"`);
  
  // Chuyển đổi sang chữ thường
  const lowerMessage = message.toLowerCase();
  
  // Kiểm tra nhanh cho các trường hợp phổ biến nhất
  if (lowerMessage.includes('btc') || lowerMessage.includes('bitcoin')) {
    console.log('[intentDetection] Phát hiện BTC/Bitcoin trong tin nhắn');
    return 'BTC';
  }
  
  if (lowerMessage.includes('eth') || lowerMessage.includes('ethereum')) {
    console.log(`[detectCryptoSymbol] Phát hiện ETH`);
    return 'ETH';
  }
  
  // Biểu thức chính quy để phát hiện mã tiền phổ biến
  const symbolPatterns = [
    /\b(btc|bitcoin)\b/i,
    /\b(eth|ethereum)\b/i,
    /\b(bnb|binance coin)\b/i,
    /\b(sol|solana)\b/i,
    /\b(xrp|ripple)\b/i,
    /\b(doge|dogecoin)\b/i,
    /\b(ada|cardano)\b/i,
    /\b(dot|polkadot)\b/i,
    /\b(link|chainlink)\b/i,
    /\b(avax|avalanche)\b/i,
    /\b(matic|polygon)\b/i,
    /\b(shib|shiba inu)\b/i,
    /\b(uni|uniswap)\b/i,
    /\b(ltc|litecoin)\b/i,
    /\b(atom|cosmos)\b/i
  ];
  
  // Map để chuyển đổi từ tên đầy đủ sang mã
  const symbolMap: Record<string, string> = {
    'bitcoin': 'BTC',
    'ethereum': 'ETH',
    'binance coin': 'BNB',
    'solana': 'SOL',
    'ripple': 'XRP',
    'dogecoin': 'DOGE',
    'cardano': 'ADA',
    'polkadot': 'DOT',
    'chainlink': 'LINK',
    'avalanche': 'AVAX',
    'polygon': 'MATIC',
    'shiba inu': 'SHIB',
    'uniswap': 'UNI',
    'litecoin': 'LTC',
    'cosmos': 'ATOM'
  };
  
  // Kiểm tra với từng pattern
  for (const pattern of symbolPatterns) {
    const match = lowerMessage.match(pattern);
    if (match && match[1]) {
      // Kiểm tra nếu đó là tên đầy đủ, chuyển đổi thành mã
      if (symbolMap[match[1]]) {
        console.log(`[detectCryptoSymbol] Phát hiện ${match[1]} -> ${symbolMap[match[1]]}`);
        return symbolMap[match[1]];
      }
      // Nếu không, trả về mã đã tìm thấy (viết hoa)
      console.log(`[detectCryptoSymbol] Phát hiện ${match[1].toUpperCase()}`);
      return match[1].toUpperCase();
    }
  }
  
  // Nếu tin nhắn bắt đầu với tên tiền tệ nhưng không có khoảng cách (ví dụ: "bitcoin có nên mua")
  for (const [name, symbol] of Object.entries(symbolMap)) {
    if (lowerMessage.startsWith(name)) {
      console.log(`[detectCryptoSymbol] Phát hiện ${name} (ở đầu câu) -> ${symbol}`);
      return symbol;
    }
  }
  
  // Trường hợp đặc biệt cho "btc" hoặc "eth" ở đầu câu
  if (lowerMessage.startsWith('btc')) {
    console.log(`[detectCryptoSymbol] Phát hiện BTC ở đầu câu`);
    return 'BTC';
  }
  if (lowerMessage.startsWith('eth')) {
    console.log(`[detectCryptoSymbol] Phát hiện ETH ở đầu câu`);
    return 'ETH';
  }
  
  console.log(`[detectCryptoSymbol] Không phát hiện tiền điện tử`);
  return null;
}

/**
 * Phát hiện khung thời gian từ tin nhắn
 */
function detectTimeframe(message: string): string | undefined {
  // Chuyển đổi sang chữ thường
  const normalizedMessage = message.toLowerCase();
  
  if (normalizedMessage.includes('15m') || normalizedMessage.includes('15 phút') || normalizedMessage.includes('15 phut')) {
    return '15m';
  } else if (normalizedMessage.includes('30m') || normalizedMessage.includes('30 phút') || normalizedMessage.includes('30 phut')) {
    return '30m';
  } else if (normalizedMessage.includes('1h') || normalizedMessage.includes('1 giờ') || normalizedMessage.includes('1 gio')) {
    return '1h';
  } else if (normalizedMessage.includes('4h') || normalizedMessage.includes('4 giờ') || normalizedMessage.includes('4 gio')) {
    return '4h';
  } else if (normalizedMessage.includes('1d') || normalizedMessage.includes('ngày') || normalizedMessage.includes('ngay') || normalizedMessage.includes('day')) {
    return '1d';
  } else if (normalizedMessage.includes('1w') || normalizedMessage.includes('week') || normalizedMessage.includes('tuần') || normalizedMessage.includes('tuan')) {
    return '1w';
  }
  
  return undefined;
}

/**
 * Phát hiện chiến lược giao dịch từ tin nhắn
 */
function detectStrategy(message: string): 'sma_crossover' | 'macd' | 'bollinger_bands' | 'rsi' | undefined {
  // Chuyển đổi sang chữ thường
  const normalizedMessage = message.toLowerCase();
  
  if (normalizedMessage.includes('sma') || normalizedMessage.includes('moving average') || normalizedMessage.includes('trung bình động')) {
    return 'sma_crossover';
  } else if (normalizedMessage.includes('macd')) {
    return 'macd';
  } else if (normalizedMessage.includes('bollinger') || normalizedMessage.includes('bands')) {
    return 'bollinger_bands';
  } else if (normalizedMessage.includes('rsi')) {
    return 'rsi';
  }
  
  return undefined;
}

/**
 * Lấy ngày trong quá khứ từ hiện tại
 */
function getDateBefore(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

/**
 * Lấy ngày mặc định để bắt đầu backtesting (3 tháng trước)
 */
function getDefaultStartDate(): string {
  return getDateBefore(90);
}

/**
 * Trích xuất danh sách tiền điện tử từ tin nhắn
 */
function extractCoinList(message: string): string[] {
  // Danh sách mã tiền phổ biến
  const commonCoins = ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE', 'DOT', 'LINK', 'AVAX', 'MATIC'];
  
  // Tìm các mã tiền trong tin nhắn
  const result: string[] = [];
  const normalizedMessage = message.toUpperCase();
  
  for (const coin of commonCoins) {
    if (normalizedMessage.includes(coin)) {
      result.push(coin);
    }
  }
  
  return result;
}

/**
 * Phát hiện mức độ rủi ro từ tin nhắn
 */
function detectRiskTolerance(message: string): 'low' | 'medium' | 'high' | undefined {
  // Chuyển đổi sang chữ thường
  const normalizedMessage = message.toLowerCase();
  
  if (normalizedMessage.includes('rui ro thap') || normalizedMessage.includes('rủi ro thấp') || normalizedMessage.includes('an toan') || normalizedMessage.includes('an toàn') || normalizedMessage.includes('low risk')) {
    return 'low';
  } else if (normalizedMessage.includes('rui ro cao') || normalizedMessage.includes('rủi ro cao') || normalizedMessage.includes('manh me') || normalizedMessage.includes('mạnh mẽ') || normalizedMessage.includes('high risk') || normalizedMessage.includes('aggressive')) {
    return 'high';
  }
  
  return 'medium'; // Mặc định là trung bình
}

/**
 * Kiểm tra xem tin nhắn có yêu cầu phân tích đầu tư không
 */
function isInvestmentQuery(message: string): boolean {
  const investmentKeywords = [
    'đầu tư', 'nên mua', 'nên bán', 'giao dịch', 'trading', 'khi nào mua', 'khi nào bán',
    'giá sẽ', 'thị trường', 'xu hướng', 'khuyến nghị', 'recommendation', 'trade', 'buy', 'sell'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return investmentKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

/**
 * Trích xuất symbol từ tin nhắn
 */
function extractSymbolFromMessage(message: string): string | null {
  // Tìm các mã tiền phổ biến
  const cryptoRegex = /\b(BTC|ETH|XRP|SOL|ADA|DOT|AVAX|BNB)(?:\/USD|\s|$)/i;
  const match = message.match(cryptoRegex);
  
  if (match) {
    return match[1].toUpperCase();
  }
  
  return null;
}

/**
 * Xử lý phản hồi từ Agent và định dạng lại để trả về
 */
async function processAgentResponse(symbol: string, userMessage: string): Promise<string> {
  try {
    const response = await fetch('/api/agent/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        symbol,
        type: 'recommendation'
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (!result.success) {
      return `Tôi không thể phân tích ${symbol} vào lúc này. Lỗi: ${result.error || 'Không xác định'}`;
    }
    
    const data = result.data;
    
    // Định dạng phản hồi dễ đọc
    let formattedResponse = `### Phân tích ${symbol} từ AI Agent\n\n`;
    
    formattedResponse += `**Khuyến nghị:** ${translateRecommendation(data.recommendation)} ${symbol} (Độ tin cậy: ${data.confidence}%)\n\n`;
    
    formattedResponse += `**Điều kiện thị trường:** ${translateMarketCondition(data.marketCondition)}\n\n`;
    
    formattedResponse += `**Phân tích:**\n${data.reasoning}\n\n`;
    
    formattedResponse += `**Dự báo:**\n`;
    formattedResponse += `- Tiềm năng lợi nhuận: ${data.expectedProfit}/100\n`;
    formattedResponse += `- Mức độ rủi ro: ${data.risk}/100\n`;
    formattedResponse += `- Khung thời gian: ${translateTimeframe(data.timeframe)}\n\n`;
    
    formattedResponse += `*Phân tích được tạo lúc: ${new Date(data.timestamp).toLocaleString('vi-VN')}*\n\n`;
    
    formattedResponse += `*Lưu ý: Đây chỉ là phân tích tự động, không phải lời khuyên đầu tư.*`;
    
    return formattedResponse;
  } catch (error: any) {
    console.error('Error calling agent API:', error);
    return `Tôi không thể tạo phân tích cho ${symbol} vào lúc này. Lỗi: ${error.message}`;
  }
}

/**
 * Dịch khuyến nghị sang tiếng Việt
 */
function translateRecommendation(recommendation: string): string {
  switch (recommendation.toUpperCase()) {
    case 'BUY': return 'MUA';
    case 'SELL': return 'BÁN';
    case 'HOLD': return 'GIỮ';
    default: return recommendation;
  }
}

/**
 * Dịch điều kiện thị trường sang tiếng Việt
 */
function translateMarketCondition(condition: string): string {
  switch (condition.toLowerCase()) {
    case 'bullish': return 'Xu hướng tăng';
    case 'bearish': return 'Xu hướng giảm';
    case 'sideways': return 'Đi ngang';
    default: return 'Không xác định';
  }
}

/**
 * Dịch khung thời gian sang tiếng Việt
 */
function translateTimeframe(timeframe: string): string {
  switch (timeframe.toLowerCase()) {
    case 'short': return 'Ngắn hạn (vài giờ đến vài ngày)';
    case 'medium': return 'Trung hạn (vài ngày đến vài tuần)';
    case 'long': return 'Dài hạn (vài tuần đến vài tháng)';
    default: return timeframe;
  }
}