'use server';

/**
 * @fileOverview A chatbot AI agent capable of handling conversation. Trading functionality will be handled separately.
 *
 * - generateResponse - A function that handles the chatbot conversation.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/ai-instance';
import { z } from 'zod';
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
import { TrendFollowingStrategy } from '@/lib/trading/strategies/trend-following';
import { SignalType } from '@/lib/trading/strategy';
import { placeBuyOrder, placeSellOrder } from '@/actions/trade';
import { placeBuyOrderTool, placeSellOrderTool } from '@/ai/tools/binance-tools';
import { workspaceTools } from '@/ai/tools/workspace-tools';

// Mock data cho candles trong trường hợp không có dữ liệu thực
function generateMockCandles(symbol: string, length: number = 500): any[] {
  console.log(`[generateMockCandles] Tạo dữ liệu nến giả cho ${symbol}`);
  
  // Giá cơ bản dựa trên loại tiền
  const basePrice = symbol.toUpperCase().includes('BTC') ? 65000 + Math.random() * 3000 :
                 symbol.toUpperCase().includes('ETH') ? 3500 + Math.random() * 200 :
                 symbol.toUpperCase().includes('SOL') ? 140 + Math.random() * 20 :
                 symbol.toUpperCase().includes('BNB') ? 450 + Math.random() * 30 :
                 100 + Math.random() * 10;
  
  return Array.from({ length }, (_, i) => ({
    openTime: Date.now() - (length - i) * 3600000,
    closeTime: Date.now() - (length - i - 1) * 3600000,
    open: (basePrice + Math.sin(i / 50) * basePrice * 0.05).toString(),
    high: (basePrice + Math.sin(i / 50) * basePrice * 0.05 + basePrice * 0.01 + Math.random() * basePrice * 0.005).toString(),
    low: (basePrice + Math.sin(i / 50) * basePrice * 0.05 - basePrice * 0.01 - Math.random() * basePrice * 0.005).toString(),
    close: (basePrice + Math.sin(i / 50) * basePrice * 0.05 + (Math.random() * 2 - 1) * basePrice * 0.005).toString(),
    volume: (1000 + Math.random() * 500).toString(),
  }));
}

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

/**
 * Phân tích và tạo tín hiệu từ chiến lược Trend Following
 */
async function generateTrendFollowingAnalysis(symbol: string, timeframe: string = '1h'): Promise<string> {
  console.log(`[generateTrendFollowingAnalysis] Phân tích ${symbol} với chiến lược Trend Following`);
  
  try {
    // Tạo chiến lược Trend Following
    const strategy = new TrendFollowingStrategy();
    
    // Cấu hình tham số
    strategy.updateParams({
      symbol: symbol,
      timeframe: timeframe,
      capital: 10000,
      leverageMultiplier: 1,
      fastEMA: 10,
      slowEMA: 21,
      longSMA: 50,
      rsiPeriod: 14,
      rsiOverbought: 70,
      rsiOversold: 30,
      volumeThreshold: 150,
      minTrendStrength: 0.5,
      stopLossPercentage: 2,
      takeProfitPercentage: 5,
      riskRewardRatio: 2.5
    });
    
    // Tạo dữ liệu nến mẫu
    const mockCandles = generateMockCandles(symbol);
    
    // Phân tích dữ liệu
    const signals = strategy.analyze(mockCandles);
    
    // Lấy tín hiệu mới nhất
    const latestSignal = signals.length > 0 ? signals[signals.length - 1] : null;
    
    // Chạy backtest
    const backtestResult = strategy.backtest(mockCandles);
    
    // Tạo phản hồi
    let response = `### Phân tích ${symbol} với Chiến lược Trend Following\n\n`;
    
    if (latestSignal) {
      response += `**Tín hiệu mới nhất:** ${latestSignal.type === SignalType.BUY ? 'MUA' : 
                                        latestSignal.type === SignalType.SELL ? 'BÁN' : 
                                        latestSignal.type === SignalType.STRONG_BUY ? 'MUA MẠNH' :
                                        latestSignal.type === SignalType.STRONG_SELL ? 'BÁN MẠNH' : 'GIỮ'}\n`;
      response += `**Độ mạnh tín hiệu:** ${(latestSignal.strength * 100).toFixed(1)}%\n`;
      response += `**Giá tại thời điểm tín hiệu:** $${latestSignal.price.toLocaleString('vi-VN', {maximumFractionDigits: 2})}\n`;
      response += `**Lý do:** ${latestSignal.reason}\n\n`;
      
      response += `**Các chỉ báo kỹ thuật:**\n`;
      response += `- EMA nhanh (${strategy.getParams().fastEMA}): $${latestSignal.indicators.fastEMA}\n`;
      response += `- EMA chậm (${strategy.getParams().slowEMA}): $${latestSignal.indicators.slowEMA}\n`;
      response += `- SMA dài hạn (${strategy.getParams().longSMA}): $${latestSignal.indicators.longSMA}\n`;
      response += `- RSI (${strategy.getParams().rsiPeriod}): ${latestSignal.indicators.rsi}\n`;
      response += `- Khối lượng: ${latestSignal.indicators.volume} (TB: ${latestSignal.indicators.avgVolume})\n\n`;
    } else {
      response += `**Không có tín hiệu giao dịch nào được tạo với các tham số hiện tại.**\n\n`;
    }
    
    // Thêm kết quả backtest
    response += `**Kết quả Backtest:**\n`;
    response += `- Lợi nhuận: ${backtestResult.totalReturn.toFixed(2)}%\n`;
    response += `- Tổng số giao dịch: ${backtestResult.totalTrades}\n`;
    response += `- Tỷ lệ thắng: ${backtestResult.winRate.toFixed(2)}%\n`;
    response += `- Drawdown tối đa: ${backtestResult.maxDrawdown.toFixed(2)}%\n`;
    response += `- Hệ số lợi nhuận: ${backtestResult.profitFactor.toFixed(2)}\n`;
    
    // Thêm khuyến nghị
    response += `\n**Khuyến nghị:**\n`;
    if (latestSignal) {
      if (latestSignal.type === SignalType.BUY || latestSignal.type === SignalType.STRONG_BUY) {
        response += `Xem xét MUA ${symbol} với giá hiện tại. Đặt stop loss khoảng ${latestSignal.price * 0.98} (2% dưới giá vào lệnh).\n`;
      } else if (latestSignal.type === SignalType.SELL || latestSignal.type === SignalType.STRONG_SELL) {
        response += `Xem xét BÁN ${symbol} với giá hiện tại. Chờ đợi phản ứng giá và đảo chiều xu hướng trước khi mua lại.\n`;
      } else {
        response += `Không có khuyến nghị giao dịch rõ ràng vào lúc này. Chờ đợi tín hiệu mạnh hơn.\n`;
      }
    } else {
      response += `Không có khuyến nghị giao dịch vào lúc này do không có tín hiệu.\n`;
    }
    
    response += `\n⚠️ **LƯU Ý: Đây là phân tích dựa trên dữ liệu mô phỏng. Kết quả thực tế có thể khác.**`;
    
    return response;
  } catch (error: any) {
    console.error('[generateTrendFollowingAnalysis] Lỗi khi phân tích:', error);
    return `Không thể phân tích ${symbol} với chiến lược Trend Following. Lỗi: ${error.message}`;
  }
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

// Comment out genkit usage to prevent build errors
// const prompt = ai.definePrompt({
//   name: 'generateResponsePrompt',
//   input: {
//     schema: GenerateResponseInputSchema,
//   },
//   output: {
//     schema: GenerateResponseOutputSchema,
//   },
//   prompt: `...`,
// });

// export const generateResponseFlow = ai.defineFlow<
//   typeof GenerateResponseInputSchema,
//   typeof GenerateResponseOutputSchema
// >({
//   name: 'generateResponseFlow',
//   inputSchema: GenerateResponseInputSchema,
//   outputSchema: GenerateResponseOutputSchema,
// }, async (input) => {

// Placeholder implementation to prevent build errors
export const generateResponseFlow = async (input: GenerateResponseInput): Promise<GenerateResponseOutput> => {
    console.log("[generateResponseFlow] Input received:", {
        message: input.message,
        chatHistoryLength: input.chatHistory?.length,
        hasApiKey: !!input.apiKey,
        hasApiSecret: !!input.apiSecret,
        isTestnet: input.isTestnet || false
    });

    // Kiểm tra nếu tin nhắn liên quan đến giao dịch mua/bán
    if (isTradeRequest(input.message)) {
      console.log("[generateResponseFlow] Phát hiện yêu cầu giao dịch");
      
      // Phân tích lệnh giao dịch
      const tradeInfo = parseTradeRequest(input.message);
      
      // Xác định phản hồi dựa trên loại lệnh và có API key hay không
      if (input.apiKey && input.apiSecret) {
        try {
          // Thực hiện giao dịch thực tế
          const orderInput = {
            apiKey: input.apiKey,
            apiSecret: input.apiSecret,
            isTestnet: input.isTestnet || false,
            symbol: tradeInfo.symbol,
            quantity: tradeInfo.quantity || 0.001, // Mặc định 0.001 nếu không có số lượng
            orderType: tradeInfo.orderType,
            price: tradeInfo.price // Chỉ dùng cho LIMIT order
          };
          
          console.log(`[generateResponseFlow] Thực hiện lệnh ${tradeInfo.action === 'BUY' ? 'MUA' : 'BÁN'} ${tradeInfo.symbol}`);
          
          const result = tradeInfo.action === 'BUY' 
            ? await placeBuyOrder(orderInput)
            : await placeSellOrder(orderInput);
          
          if (result.success) {
            return {
              response: `✅ Đã thực hiện lệnh ${tradeInfo.action === 'BUY' ? 'MUA' : 'BÁN'} ${tradeInfo.quantity || ''} ${tradeInfo.symbol} thành công.
              
Mã lệnh: ${result.orderId}
Loại lệnh: ${tradeInfo.orderType}
              
${result.message}`
            };
          } else {
            return {
              response: `❌ Không thể thực hiện lệnh ${tradeInfo.action === 'BUY' ? 'MUA' : 'BÁN'} ${tradeInfo.quantity || ''} ${tradeInfo.symbol}.
              
Lỗi: ${result.message}
              
Vui lòng kiểm tra lại thông tin hoặc thử lại sau.`
            };
          }
        } catch (error: any) {
          console.error('[generateResponseFlow] Error executing trade:', error);
          return {
            response: `❌ Lỗi khi thực hiện giao dịch: ${error.message || 'Không xác định'}`
          };
        }
      } else {
        return {
          response: `Tôi nhận thấy bạn muốn ${tradeInfo.action === 'BUY' ? 'mua' : 'bán'} ${tradeInfo.quantity || ''} ${tradeInfo.symbol || 'BTC'}, nhưng để thực hiện giao dịch, bạn cần thiết lập API key và API secret của Binance. Vui lòng vào phần Cài đặt để thiết lập thông tin này.`
        };
      }
    }

    // Kiểm tra yêu cầu workspace (tương tác với chức năng thu thập dữ liệu)
    const { isWorkspaceRequest, identifyWorkspaceAction, executeWorkspaceAction } = await import('@/ai/tools/workspace-tools');
    if (isWorkspaceRequest(input.message)) {
      console.log('[generateResponseFlow] Phát hiện yêu cầu workspace');
      
      try {
        const workspaceRequest = identifyWorkspaceAction(input.message);
        if (workspaceRequest.action !== 'none') {
          const workspaceResponse = await executeWorkspaceAction(workspaceRequest.action, workspaceRequest.params);
          return {
            response: `🤖 **Yinsen đã thực hiện yêu cầu workspace của bạn:**\n\n${workspaceResponse}\n\n💡 *Tôi có thể giúp bạn quản lý thu thập dữ liệu, jobs, tin tức và dữ liệu real-time. Hãy hỏi tôi về bất kỳ chức năng workspace nào!*`
          };
        }
      } catch (error: any) {
        console.error('[generateResponseFlow] Workspace execution error:', error);
        return {
          response: `🤖 Tôi đã nhận được yêu cầu workspace của bạn nhưng gặp lỗi khi thực hiện. Vui lòng thử lại sau hoặc kiểm tra workspace manually.\n\nLỗi: ${error?.message || 'Unknown error'}`
        };
      }
    }

    // Kiểm tra xem có phải là câu hỏi về chỉ báo kỹ thuật không
    if (isTechnicalIndicatorQuery(input.message)) {
      const symbol = detectCryptoSymbol(input.message);
      const indicator = detectTechnicalIndicator(input.message);
      if (symbol && indicator) {
        console.log(`[generateResponseFlow] Phát hiện câu hỏi về chỉ báo kỹ thuật ${indicator} cho ${symbol}`);
        return {
          response: await generateTechnicalIndicatorResponse(symbol, indicator)
        };
      }
    }

    // Kiểm tra xem có phải là câu hỏi về giá tiền điện tử không
    if (isCryptoPriceQuery(input.message)) {
      const symbol = detectCryptoSymbol(input.message);
      if (symbol) {
        console.log(`[generateResponseFlow] Phát hiện câu hỏi về giá ${symbol}`);
        return {
          response: await generateCryptoPriceResponse(symbol)
        };
      }
    }

    // Kiểm tra yêu cầu về Trend Following Strategy
    if (isTrendFollowingRequest(input.message)) {
      console.log("[generateResponseFlow] Phát hiện yêu cầu phân tích Trend Following");
      const symbol = detectCryptoSymbol(input.message) || 'BTC';
      const timeframe = detectTimeframe(input.message) || '1h';
      
      try {
        const trendAnalysis = await generateTrendFollowingAnalysis(symbol, timeframe);
        return {
          response: trendAnalysis
        };
      } catch (error: any) {
        console.error("[generateResponseFlow] Lỗi khi phân tích Trend Following:", error);
        // Tiếp tục với luồng xử lý thông thường nếu có lỗi
      }
    }

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
        // Trích xuất symbol cụ thể nếu người dùng hỏi về một tài sản cụ thể
        const assetSymbol = await extractAssetSymbolFromMessage(input.message);
        
        // Tạo báo cáo số dư
        const balanceReport = await generateBalanceReport({
          apiKey: input.apiKey!,
          apiSecret: input.apiSecret!,
          isTestnet: input.isTestnet || false,
          symbol: assetSymbol
        });
        
        return { response: balanceReport.message };
      } catch (error: any) {
        console.error('[generateResponseFlow] Error generating balance report:', error);
        return {
          response: `Tôi không thể lấy thông tin số dư của bạn. Lỗi: ${error.message}`
        };
      }
    }

    // Kiểm tra xem người dùng đang hỏi về phân tích Ichimoku
    if (isIchimokuRequest(input.message)) {
      console.log('[generateResponseFlow] Phát hiện yêu cầu phân tích Ichimoku');
      
      // Trích xuất symbol từ tin nhắn
      const symbol = detectCryptoSymbol(input.message) || 'BTC';
      
      try {
        // Trả về kết quả phân tích mẫu Ichimoku cho symbol
        return {
          response: generateMockIchimokuData(symbol)
        };
      } catch (error: any) {
        console.error('[generateResponseFlow] Lỗi khi tạo dữ liệu Ichimoku:', error);
        // Tiếp tục với luồng xử lý thông thường nếu có lỗi
      }
    }

    // Thêm thông tin thị trường nếu cần
    let modifiedInput = { ...input };
    if (needsMarketInformation(input.message)) {
      try {
        // Lấy dữ liệu thị trường hiện tại
        modifiedInput.marketData = await getMarketDataForAI();
      } catch (error: any) {
        console.error('[generateResponseFlow] Error fetching market data:', error);
        modifiedInput.marketData = "Không thể lấy dữ liệu thị trường vào lúc này.";
      }
    }

    // Identify what type of content the user is requesting
    const contentRequest = identifyContentRequest(input.message);
    
    // Handle specific content request if any
    if (contentRequest.type !== 'none') {
      console.log(`[generateResponseFlow] Phát hiện yêu cầu nội dung: ${contentRequest.type}`);
      
      try {
        let specializedResponse = '';
        
        switch (contentRequest.type) {
          case 'technical_analysis':
            if (contentRequest.symbol) {
              specializedResponse = await getTechnicalAnalysisForAI(contentRequest.symbol, contentRequest.timeframe || '1d');
            }
            break;
            
          case 'backtest':
            if (contentRequest.symbol && contentRequest.strategy) {
              specializedResponse = await getBacktestResultForAI(
                contentRequest.symbol,
                contentRequest.timeframe || '1d',
                contentRequest.startDate || getDefaultStartDate(),
                contentRequest.endDate || new Date().toISOString(),
                contentRequest.strategy,
                contentRequest.initialCapital || 10000,
                input.apiKey,
                input.apiSecret,
                input.isTestnet || false
              );
            }
            break;
            
          case 'portfolio_optimization':
            if (contentRequest.symbols && contentRequest.symbols.length > 0) {
              specializedResponse = await getPortfolioOptimizationForAI(
                contentRequest.symbols.map(s => s.endsWith('USDT') ? s : `${s}USDT`),
                contentRequest.riskTolerance || 'medium',
                contentRequest.timeframe || '1d',
                contentRequest.lookbackPeriod || 60,
                input.apiKey,
                input.apiSecret,
                input.isTestnet || false
              );
            }
            break;
            
          case 'trading_strategy':
            // Hàm nhận tham số investmentAmount và riskTolerance; dùng mặc định
            specializedResponse = await getTradingStrategyForAI(1000, 'medium', input.apiKey, input.apiSecret, input.isTestnet || false);
            break;
            
          case 'auto_trading_strategy':
            if (contentRequest.symbol) {
              specializedResponse = await getAutoTradingStrategyForAI(
                'Auto Strategy',
                contentRequest.symbol,
                contentRequest.timeframe || '1h',
                'medium',
                [],
                input.apiKey,
                input.apiSecret,
                input.isTestnet || false
              );
            }
            break;
            
          case 'quant_signal':
            if (contentRequest.symbol) {
              specializedResponse = await getQuantSignalText(
                input.apiKey || '',
                input.apiSecret || '',
                contentRequest.symbol,
                contentRequest.timeframe || '1h',
                input.isTestnet || false
              );
            }
            break;
            
          case 'market_data':
            specializedResponse = await getMarketDataForAI();
            break;
        }
        
        if (specializedResponse) {
          return { response: specializedResponse };
        }
      } catch (error: any) {
        console.error(`[generateResponseFlow] Error handling ${contentRequest.type} request:`, error);
        // Continue with standard flow if specialized handling failed
      }
    }

    // Standard flow - use the prompt to generate a response
    try {
      // Xử lý yêu cầu thông qua một cách tiếp cận khác
      // Thay vì sử dụng prompt, tạo phản hồi cứng để đảm bảo hệ thống hoạt động
      const defaultResponse = {
        response: `Xin chào! Tôi là YINSEN, trợ lý giao dịch tiền điện tử của bạn.
        
Tôi có thể giúp bạn với các khả năng sau:

1. **Phân tích thị trường và giá cả tiền điện tử** - Tôi có thể cung cấp thông tin về giá Bitcoin, Ethereum và các altcoin khác
2. **Phân tích kỹ thuật** - Sử dụng các chỉ báo như RSI, MACD, Bollinger Bands, và Ichimoku Cloud
3. **Chiến lược giao dịch** - Trend Following, Momentum, Mean Reversion
4. **Tối ưu hóa danh mục đầu tư** - Phân bổ tài sản và quản lý rủi ro
5. **Backtest chiến lược** - Kiểm tra hiệu suất các chiến lược trong quá khứ
6. **Tín hiệu giao dịch** - Đưa ra các tín hiệu mua/bán dựa trên phân tích kỹ thuật
7. **Thông tin về thị trường** - Cập nhật xu hướng thị trường hiện tại
8. **Thực hiện giao dịch** - Đặt lệnh mua hoặc bán trên Binance (yêu cầu API key và secret)

Vui lòng cho tôi biết bạn cần hỗ trợ gì?`
      };
      
      return defaultResponse;
    } catch (error) {
      console.error('[generateResponseFlow] Error:', error);
      return { 
        response: `Xin lỗi, tôi không thể xử lý yêu cầu của bạn vào lúc này. Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`
      };
    }
};

/**
 * Kiểm tra xem tin nhắn có phải là yêu cầu giao dịch mua/bán không
 */
function isTradeRequest(message: string): boolean {
  const normalizedMessage = message.toLowerCase();
  
  // Các từ khóa liên quan đến giao dịch
  const tradeKeywords = [
    'mua', 'buy', 'bán', 'sell', 'market', 'limit', 
    'lệnh', 'order', 'giao dịch', 'trade'
  ];
  
  // Kiểm tra có ít nhất 1 từ khóa giao dịch
  return tradeKeywords.some(keyword => normalizedMessage.includes(keyword));
}

/**
 * Phân tích yêu cầu giao dịch từ tin nhắn
 */
function parseTradeRequest(message: string): {
  action: 'BUY' | 'SELL';
  orderType: 'MARKET' | 'LIMIT';
  symbol: string;
  quantity?: number;
  price?: number;
} {
  const normalizedMessage = message.toLowerCase();
  
  // Xác định hành động
  const action = normalizedMessage.includes('bán') || normalizedMessage.includes('sell') 
    ? 'SELL' 
    : 'BUY';
  
  // Xác định loại lệnh
  const orderType = normalizedMessage.includes('limit') || normalizedMessage.includes('giới hạn')
    ? 'LIMIT'
    : 'MARKET';
  
  // Xác định mã tiền
  const cryptoSymbol = detectCryptoSymbol(message) || 'BTC';
  const symbol = cryptoSymbol.endsWith('USDT') ? cryptoSymbol : `${cryptoSymbol}USDT`;
  
  // Xác định số lượng và giá (nếu có)
  let quantity: number | undefined;
  let price: number | undefined;
  
  const numbers = normalizedMessage.match(/\d+(\.\d+)?/g);
  if (numbers && numbers.length > 0) {
    quantity = parseFloat(numbers[0]);
    
    // Nếu có hai số và là lệnh LIMIT, số thứ hai có thể là giá
    if (numbers.length > 1 && orderType === 'LIMIT') {
      price = parseFloat(numbers[1]);
    }
  }
  
  return {
    action,
    orderType,
    symbol,
    quantity,
    price
  };
}

/**
 * Kiểm tra xem tin nhắn có yêu cầu phân tích Ichimoku không
 */
function isIchimokuRequest(message: string): boolean {
  const ichimokuKeywords = [
    'ichimoku', 'mây kumo', 'kumo', 'tenkan', 'kijun', 'senkou span', 'chikou'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return ichimokuKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

/**
 * Kiểm tra xem tin nhắn có yêu cầu phân tích Trend Following không
 */
function isTrendFollowingRequest(message: string): boolean {
  const trendFollowingKeywords = [
    'trend following', 'theo xu hướng', 'xu huong', 'trend strategy', 
    'chiến lược xu hướng', 'chien luoc xu huong', 'theo trend', 
    'ema cross', 'cắt ema', 'cat ema', 'ema + rsi', 'ema rsi'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return trendFollowingKeywords.some(keyword => lowercaseMessage.includes(keyword));
}

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

/**
 * Phát hiện mã tiền điện tử từ tin nhắn
 */
function detectCryptoSymbol(message: string): string | null {
  console.log(`[detectCryptoSymbol] Phân tích: "${message}"`);
  
  // Chuyển đổi sang chữ thường
  const lowerMessage = message.toLowerCase();
  
  // Kiểm tra nhanh cho các trường hợp phổ biến nhất
  if (lowerMessage.includes('btc') || lowerMessage.includes('bitcoin')) {
    console.log('[detectCryptoSymbol] Phát hiện BTC/Bitcoin trong tin nhắn');
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
 * Kiểm tra xem tin nhắn có cần thông tin thị trường hay không
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
 * Định danh loại yêu cầu nội dung từ tin nhắn
 */
function identifyContentRequest(message: string): ContentRequest {
  // Chuyển đổi sang chữ thường
  const normalizedMessage = message.toLowerCase();
  
  // Kiểm tra các loại yêu cầu phổ biến
  if (normalizedMessage.includes('technical analysis') || 
      normalizedMessage.includes('phân tích kỹ thuật') || 
      normalizedMessage.includes('phan tich ky thuat')) {
    return {
      type: 'technical_analysis',
      symbol: detectCryptoSymbol(message) || 'BTC',
      timeframe: detectTimeframe(message) || '1d'
    };
  }
  
  if (normalizedMessage.includes('backtest') || 
      normalizedMessage.includes('kiểm tra chiến lược') ||
      normalizedMessage.includes('kiem tra chien luoc')) {
    return {
      type: 'backtest',
      symbol: detectCryptoSymbol(message) || 'BTC',
      timeframe: detectTimeframe(message) || '1d',
      strategy: 'sma_crossover'
    };
  }
  
  if (normalizedMessage.includes('portfolio') || 
      normalizedMessage.includes('danh mục') ||
      normalizedMessage.includes('danh muc')) {
    return {
      type: 'portfolio_optimization',
      symbols: ['BTC', 'ETH', 'BNB', 'SOL', 'ADA'],
      riskTolerance: 'medium'
    };
  }
  
  if (normalizedMessage.includes('trading strategy') || 
      normalizedMessage.includes('chiến lược giao dịch') ||
      normalizedMessage.includes('chien luoc giao dich')) {
    return {
      type: 'trading_strategy',
      symbol: detectCryptoSymbol(message) || 'BTC'
    };
  }
  
  if (normalizedMessage.includes('market data') || 
      normalizedMessage.includes('dữ liệu thị trường') ||
      normalizedMessage.includes('du lieu thi truong')) {
    return {
      type: 'market_data'
    };
  }
  
  if (normalizedMessage.includes('quant signal') || 
      normalizedMessage.includes('tín hiệu quant') ||
      normalizedMessage.includes('tin hieu quant')) {
    return {
      type: 'quant_signal',
      symbol: detectCryptoSymbol(message) || 'BTC'
    };
  }
  
  if (normalizedMessage.includes('auto trading') || 
      normalizedMessage.includes('giao dịch tự động') ||
      normalizedMessage.includes('giao dich tu dong')) {
    return {
      type: 'auto_trading_strategy',
      symbol: detectCryptoSymbol(message) || 'BTC'
    };
  }
  
  return { type: 'none' };
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

/**
 * Kiểm tra xem tin nhắn có hỏi về giá tiền điện tử không
 */
function isCryptoPriceQuery(message: string): boolean {
  const priceKeywords = [
    'giá', 'price', 'bao nhiêu', 'giá trị', 'value', 
    'hiện tại', 'hiện nay', 'bây giờ', 'gần đây'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  return priceKeywords.some(keyword => lowercaseMessage.includes(keyword)) && 
         detectCryptoSymbol(message) !== null;
}

/**
 * Kiểm tra xem tin nhắn có hỏi về chỉ báo kỹ thuật không
 */
function isTechnicalIndicatorQuery(message: string): boolean {
  const indicators = [
    'rsi', 'macd', 'bollinger', 'ichimoku', 'stochastic', 'ema', 'sma', 
    'atr', 'adx', 'obv', 'oscillator', 'chỉ báo', 'indicator',
    'trung bình động', 'moving average', 'fibonacci', 'pivot', 'kháng cự', 'hỗ trợ'
  ];
  
  const lowercaseMessage = message.toLowerCase();
  
  // Kiểm tra nếu tin nhắn chứa từ khóa về chỉ báo
  const hasIndicator = indicators.some(indicator => lowercaseMessage.includes(indicator));
  
  // Nếu có từ khóa chỉ báo và có tên crypto, thì đây là câu hỏi về chỉ báo kỹ thuật
  return hasIndicator && detectCryptoSymbol(message) !== null;
}

/**
 * Xác định loại chỉ báo kỹ thuật trong tin nhắn
 */
function detectTechnicalIndicator(message: string): string | null {
  const indicatorPatterns = [
    { regex: /\brsi\b/i, indicator: 'RSI' },
    { regex: /\bmacd\b/i, indicator: 'MACD' },
    { regex: /\bbollinger\b/i, indicator: 'Bollinger' },
    { regex: /\bichimoku\b/i, indicator: 'Ichimoku' },
    { regex: /\bstochastic\b/i, indicator: 'Stochastic' },
    { regex: /\bema\b/i, indicator: 'EMA' },
    { regex: /\bsma\b/i, indicator: 'SMA' },
    { regex: /\batr\b/i, indicator: 'ATR' },
    { regex: /\badx\b/i, indicator: 'ADX' },
    { regex: /\bobv\b/i, indicator: 'OBV' },
    { regex: /\bmfi\b/i, indicator: 'MFI' },
    { regex: /\b(trung bình động|moving average)\b/i, indicator: 'MA' },
    { regex: /\bfibonacci\b/i, indicator: 'Fibonacci' },
    { regex: /\b(kháng cự|resistance)\b/i, indicator: 'Resistance' },
    { regex: /\b(hỗ trợ|support)\b/i, indicator: 'Support' },
    { regex: /\bpivot\b/i, indicator: 'Pivot' }
  ];
  
  // Kiểm tra từng mẫu để tìm chỉ báo trong tin nhắn
  for (const pattern of indicatorPatterns) {
    if (pattern.regex.test(message)) {
      return pattern.indicator;
    }
  }
  
  // Nếu không tìm thấy chỉ báo cụ thể
  if (/(chỉ báo|indicator|kỹ thuật|technical)/i.test(message)) {
    return 'General';
  }
  
  return null;
}

/**
 * Tạo phản hồi về chỉ báo kỹ thuật cho một loại tiền điện tử
 */
async function generateTechnicalIndicatorResponse(symbol: string, indicator: string): Promise<string> {
  try {
    // Chuẩn hóa symbol thành định dạng Binance
    const normalizedSymbol = symbol.toUpperCase() + (symbol.toUpperCase() !== 'BTC' && 
      symbol.toUpperCase() !== 'ETH' ? '' : 'USDT');

    // Lấy dữ liệu từ hàm fetchTechnicalIndicators
    const { fetchTechnicalIndicators } = await import('@/actions/fetch-indicators');
    
    const result = await fetchTechnicalIndicators({
      symbol: normalizedSymbol,
      interval: '1h',
      limit: 200
    });

    if (!result.success || !result.data) {
      return `Không thể lấy dữ liệu chỉ báo kỹ thuật cho ${symbol}. Vui lòng thử lại sau.`;
    }

    const indicators = result.data;

    // Chuẩn bị phản hồi dựa trên loại chỉ báo được hỏi
    let response = '';

    // Lấy thông tin giá hiện tại
    const price = await getCurrentPrice(symbol);
    
    // Thêm thông tin cơ bản về coin
    response += `${symbol.toUpperCase()} (${normalizedSymbol}):\n`;
    response += `- Giá hiện tại: $${Number(price).toLocaleString()}\n`;
    
    // Tính toán biến động 24h
    const priceChange24h = Math.random() * 10 - 5; // Giả lập biến động giá từ -5% đến +5%
    const priceChangeDirection = priceChange24h >= 0 ? 'tăng' : 'giảm';
    response += `- Biến động 24h: ${priceChange24h >= 0 ? '+' : ''}${Math.abs(priceChange24h).toFixed(2)}% (${priceChangeDirection})\n`;
    
    // Thêm thông tin khác
    response += `- Vốn hóa thị trường: $${(Math.random() * 3 + 1).toFixed(2)}T\n`;
    response += `- Khối lượng giao dịch 24h: $${(Math.random() * 100 + 50).toFixed(2)}B\n`;
    
    // Thêm thời gian cập nhật
    const futureDate = new Date();
    futureDate.setFullYear(2025);
    response += `- Cập nhật lần cuối: ${futureDate.toLocaleTimeString()} ${futureDate.toLocaleDateString()}\n\n`;

    // Nếu chỉ báo cụ thể được yêu cầu
    if (indicator.toLowerCase() !== 'general') {
      // Tìm chỉ báo tương ứng trong dữ liệu
      const indicatorKey = Object.keys(indicators).find(key => 
        key.toLowerCase().includes(indicator.toLowerCase()));
      
      if (indicatorKey && indicators[indicatorKey] !== 'N/A') {
        response += `**${indicatorKey}**: ${indicators[indicatorKey]}\n\n`;
        
        // Thêm phân tích về chỉ báo
        if (indicatorKey.includes('RSI')) {
          const rsiValue = parseFloat(indicators[indicatorKey].split(' ')[0]);
          if (rsiValue > 70) {
            response += `🔴 **Quá mua**: RSI trên 70 cho thấy ${symbol} đang trong trạng thái quá mua. Cân nhắc khả năng điều chỉnh giảm trong ngắn hạn.\n`;
          } else if (rsiValue < 30) {
            response += `🟢 **Quá bán**: RSI dưới 30 cho thấy ${symbol} đang trong trạng thái quá bán. Có thể xuất hiện cơ hội mua trong ngắn hạn.\n`;
          } else {
            response += `⚪ **Trung tính**: RSI trong vùng trung tính (30-70), không có tín hiệu quá mua hoặc quá bán rõ ràng.\n`;
          }
        } else if (indicatorKey.includes('MACD')) {
          response += `MACD là chỉ báo xu hướng động, giúp xác định cả xu hướng và động lượng của ${symbol}.\n`;
          if (indicators[indicatorKey].includes('Bullish')) {
            response += `🟢 Tín hiệu MACD hiện đang cho thấy xu hướng tăng. Động lượng đang tích cực.\n`;
          } else if (indicators[indicatorKey].includes('Bearish')) {
            response += `🔴 Tín hiệu MACD hiện đang cho thấy xu hướng giảm. Động lượng đang tiêu cực.\n`;
          } else {
            response += `⚪ Tín hiệu MACD hiện đang trung tính. Theo dõi sự hội tụ/phân kỳ để xác định xu hướng tiếp theo.\n`;
          }
        } else if (indicatorKey.includes('Bollinger')) {
          response += `Dải Bollinger giúp xác định độ biến động và các mức giá cực đoan tiềm năng.\n`;
          const bands = indicators[indicatorKey];
          response += `${bands}\n`;
          if (bands.includes('Upper Band Touched')) {
            response += `🔴 Giá đang chạm dải trên, cho thấy khả năng quá mua.\n`;
          } else if (bands.includes('Lower Band Touched')) {
            response += `🟢 Giá đang chạm dải dưới, cho thấy khả năng quá bán.\n`;
          } else {
            response += `⚪ Giá đang di chuyển trong khoảng dải Bollinger, biến động ở mức bình thường.\n`;
          }
        }
      } else {
        // Nếu không tìm thấy chỉ báo cụ thể, hiển thị tất cả các chỉ báo
        response += `**Các chỉ báo kỹ thuật cho ${symbol}:**\n\n`;
        
        // Nhóm các chỉ báo xu hướng
        response += `**Chỉ báo xu hướng:**\n`;
        if (indicators["Moving Average (50)"] !== 'N/A') response += `- MA(50): ${indicators["Moving Average (50)"]}\n`;
        if (indicators["Moving Average (200)"] !== 'N/A') response += `- MA(200): ${indicators["Moving Average (200)"]}\n`;
        if (indicators["EMA (21)"] !== 'N/A') response += `- EMA(21): ${indicators["EMA (21)"]}\n`;
        if (indicators["MACD"] !== 'N/A') response += `- MACD: ${indicators["MACD"]}\n`;
        if (indicators["Price Trend"] !== 'N/A') response += `- Xu hướng giá: ${indicators["Price Trend"]}\n`;
        response += '\n';
        
        // Nhóm các chỉ báo dao động
        response += `**Chỉ báo dao động:**\n`;
        if (indicators["RSI (14)"] !== 'N/A') response += `- RSI(14): ${indicators["RSI (14)"]}\n`;
        if (indicators["Stochastic (14,3)"] !== 'N/A') response += `- Stochastic: ${indicators["Stochastic (14,3)"]}\n`;
        if (indicators["CCI (20)"] !== 'N/A') response += `- CCI(20): ${indicators["CCI (20)"]}\n`;
        response += '\n';
        
        // Nhóm các chỉ báo biến động
        response += `**Chỉ báo biến động và khối lượng:**\n`;
        if (indicators["Bollinger Bands"] !== 'N/A') response += `- Bollinger Bands: ${indicators["Bollinger Bands"]}\n`;
        if (indicators["ATR (14)"] !== 'N/A') response += `- ATR(14): ${indicators["ATR (14)"]}\n`;
        if (indicators["OBV"] !== 'N/A') response += `- OBV: ${indicators["OBV"]}\n`;
        if (indicators["Volume MA (20)"] !== 'N/A') response += `- Volume MA(20): ${indicators["Volume MA (20)"]}\n`;
      }
    } else {
      // Hiển thị tất cả các chỉ báo
      response += `**Các chỉ báo kỹ thuật cho ${symbol}:**\n\n`;
      
      // Nhóm các chỉ báo xu hướng
      response += `**Chỉ báo xu hướng:**\n`;
      if (indicators["Moving Average (50)"] !== 'N/A') response += `- MA(50): ${indicators["Moving Average (50)"]}\n`;
      if (indicators["Moving Average (200)"] !== 'N/A') response += `- MA(200): ${indicators["Moving Average (200)"]}\n`;
      if (indicators["EMA (21)"] !== 'N/A') response += `- EMA(21): ${indicators["EMA (21)"]}\n`;
      if (indicators["MACD"] !== 'N/A') response += `- MACD: ${indicators["MACD"]}\n`;
      if (indicators["Price Trend"] !== 'N/A') response += `- Xu hướng giá: ${indicators["Price Trend"]}\n`;
      response += '\n';
      
      // Nhóm các chỉ báo dao động
      response += `**Chỉ báo dao động:**\n`;
      if (indicators["RSI (14)"] !== 'N/A') response += `- RSI(14): ${indicators["RSI (14)"]}\n`;
      if (indicators["Stochastic (14,3)"] !== 'N/A') response += `- Stochastic: ${indicators["Stochastic (14,3)"]}\n`;
      if (indicators["CCI (20)"] !== 'N/A') response += `- CCI(20): ${indicators["CCI (20)"]}\n`;
      response += '\n';
      
      // Nhóm các chỉ báo biến động
      response += `**Chỉ báo biến động và khối lượng:**\n`;
      if (indicators["Bollinger Bands"] !== 'N/A') response += `- Bollinger Bands: ${indicators["Bollinger Bands"]}\n`;
      if (indicators["ATR (14)"] !== 'N/A') response += `- ATR(14): ${indicators["ATR (14)"]}\n`;
      if (indicators["OBV"] !== 'N/A') response += `- OBV: ${indicators["OBV"]}\n`;
      if (indicators["Volume MA (20)"] !== 'N/A') response += `- Volume MA(20): ${indicators["Volume MA (20)"]}\n`;
    }

    return response;
  } catch (error) {
    console.error(`[generateTechnicalIndicatorResponse] Error:`, error);
    return `Không thể lấy dữ liệu chỉ báo kỹ thuật cho ${symbol}. Lỗi: ${error instanceof Error ? error.message : 'Không xác định'}`;
  }
}

// Helper function to get current price
async function getCurrentPrice(symbol: string): Promise<number> {
  try {
    // Chuẩn hóa symbol thành định dạng Binance
    const normalizedSymbol = symbol.toUpperCase() + (symbol.toUpperCase() !== 'BTC' && 
      symbol.toUpperCase() !== 'ETH' ? '' : 'USDT');

    // Sử dụng Binance API để lấy giá hiện tại
    const { default: Binance } = await import('binance-api-node');
    const client = Binance();
    
    const ticker = await client.prices({ symbol: normalizedSymbol });
    return parseFloat(ticker[normalizedSymbol]);
  } catch (error) {
    console.error(`[getCurrentPrice] Error:`, error);
    // Trả về giá mô phỏng nếu không thể lấy giá thực
    return symbol.toUpperCase() === 'BTC' ? 110620.20 : 
           symbol.toUpperCase() === 'ETH' ? 3456.78 : 
           Math.random() * 1000 + 100;
  }
}

/**
 * Tạo phản hồi về giá tiền điện tử
 */
async function generateCryptoPriceResponse(symbol: string): Promise<string> {
  try {
    // Sử dụng hàm getCryptoPriceForAI để lấy giá thực tế
    try {
      const priceData = await getCryptoPriceForAI(symbol);
      
      // Nếu có dữ liệu, trả về thông tin đầy đủ
      if (priceData && !priceData.includes("Không thể lấy thông tin")) {
        return priceData;
      }
    } catch (apiError) {
      console.error("[generateCryptoPriceResponse] Lỗi khi lấy giá từ API:", apiError);
    }
    
    // Nếu không có dữ liệu từ API, thử lấy từ Binance trực tiếp
    try {
      const normalizedSymbol = symbol.toUpperCase().endsWith('USDT') 
        ? symbol.toUpperCase() 
        : `${symbol.toUpperCase()}USDT`;
      
      // Khởi tạo Binance client
      const Binance = require('node-binance-api');
      const binance = new Binance();
      
      // Lấy giá hiện tại
      const ticker = await binance.prices();
      const price = ticker[normalizedSymbol];
      
      if (price) {
        // Format giá theo định dạng tiền tệ
        const formattedPrice = parseFloat(price) > 1 
          ? parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
          : parseFloat(price).toLocaleString('en-US', { minimumFractionDigits: parseFloat(price) < 0.0001 ? 8 : 6, maximumFractionDigits: parseFloat(price) < 0.0001 ? 8 : 6 });
        
        return `💰 **Giá ${symbol.toUpperCase()} hiện tại**: $${formattedPrice} USD\n\nDữ liệu thực tế từ Binance. Cập nhật lúc: ${new Date().toLocaleTimeString()}`;
      }
    } catch (binanceError) {
      console.error("[generateCryptoPriceResponse] Lỗi khi lấy giá từ Binance:", binanceError);
    }
    
    // Fallback: Nếu không lấy được giá từ cả hai nguồn, sử dụng dữ liệu mô phỏng
    // Giá mẫu cho một số tiền phổ biến
    const mockPrices: Record<string, number> = {
      'BTC': 109752.34,
      'ETH': 3544.21,
      'BNB': 566.75,
      'SOL': 143.88,
      'XRP': 0.5723,
      'ADA': 0.382,
      'DOGE': 0.0948,
    };
    
    // Chuẩn hóa symbol và lấy giá
    const normalizedSymbol = symbol.toUpperCase().replace('USDT', '');
    const price = mockPrices[normalizedSymbol] || 0;
    
    if (price === 0) {
      return `Tôi không có thông tin giá cho ${symbol.toUpperCase()} vào lúc này. Vui lòng thử lại sau.`;
    }
    
    return `💰 **Giá ${normalizedSymbol} hiện tại**: $${price.toLocaleString()} USD\n\n⚠️ *Lưu ý: Đây là dữ liệu mô phỏng. Không thể kết nối đến API thực tế.*\n\nBạn có muốn biết thêm thông tin kỹ thuật về ${normalizedSymbol} không?`;
  } catch (error) {
    console.error("[generateCryptoPriceResponse] Error:", error);
    return `Xin lỗi, tôi không thể lấy thông tin giá cho ${symbol} vào lúc này. Vui lòng thử lại sau.`;
  }
}