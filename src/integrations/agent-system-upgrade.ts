/**
 * Agent System Upgrade
 * 
 * File này tích hợp tất cả các cải tiến agent mới vào hệ thống Yinsen,
 * bao gồm SCD, MCP, và các chức năng khác.
 */

import { createYinsenMcpServer } from '@/mcp/server';
import { A2AProtocolHandler } from '@/a2a/protocol';
import { ToolSelector } from '@/agent/orchestration/selector';
import { ToolCaller } from '@/agent/orchestration/caller';
import { ResultDescriber } from '@/agent/orchestration/describer';
import { MarketDataRetriever } from '@/ai/rag/market-data-retriever';
import { Tool, AgentContext } from '@/agent/types';

/**
 * Cấu hình nâng cấp agent
 */
export interface AgentUpgradeConfig {
  enableMCP: boolean;
  enableA2A: boolean;
  enableSCD: boolean;
  enableRealTimeMarketData: boolean;
  agentId: string;
}

/**
 * Quản lý việc nâng cấp hệ thống agent
 */
export class AgentSystemUpgrade {
  private config: AgentUpgradeConfig;
  private mcpServer: any;
  private a2aHandler: A2AProtocolHandler | null = null;
  private toolSelector: ToolSelector | null = null;
  private toolCaller: ToolCaller | null = null;
  private resultDescriber: ResultDescriber | null = null;
  private marketDataRetriever: MarketDataRetriever | null = null;
  
  constructor(tools: Map<string, Tool>, config?: Partial<AgentUpgradeConfig>) {
    // Cấu hình mặc định
    this.config = {
      enableMCP: true,
      enableA2A: true,
      enableSCD: true,
      enableRealTimeMarketData: true,
      agentId: 'yinsen',
      ...config
    };
    
    console.log(`[AgentSystemUpgrade] Khởi tạo hệ thống nâng cấp với cấu hình:`, this.config);
    
    // Khởi tạo các component
    if (this.config.enableMCP) {
      this.initializeMCP();
    }
    
    if (this.config.enableA2A) {
      this.initializeA2A();
    }
    
    if (this.config.enableSCD) {
      this.initializeSCD(tools);
    }
    
    if (this.config.enableRealTimeMarketData) {
      this.initializeRealTimeMarketData();
    }
  }
  
  /**
   * Khởi tạo MCP Server
   */
  private initializeMCP(): void {
    console.log(`[AgentSystemUpgrade] Khởi tạo MCP Server...`);
    
    try {
      this.mcpServer = createYinsenMcpServer();
      console.log(`[AgentSystemUpgrade] MCP Server đã sẵn sàng`);
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi khởi tạo MCP Server:`, error);
    }
  }
  
  /**
   * Khởi tạo A2A Protocol Handler
   */
  private initializeA2A(): void {
    console.log(`[AgentSystemUpgrade] Khởi tạo A2A Protocol Handler...`);
    
    try {
      this.a2aHandler = new A2AProtocolHandler(this.config.agentId);
      
      // Đăng ký các khả năng cơ bản
      this.a2aHandler.registerCapabilities([
        'market_analysis',
        'technical_indicators',
        'trading',
        'portfolio_management',
        'market_news'
      ]);
      
      console.log(`[AgentSystemUpgrade] A2A Protocol Handler đã sẵn sàng`);
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi khởi tạo A2A Protocol Handler:`, error);
    }
  }
  
  /**
   * Khởi tạo hệ thống SCD (Selector-Caller-Describer)
   */
  private initializeSCD(tools: Map<string, Tool>): void {
    console.log(`[AgentSystemUpgrade] Khởi tạo hệ thống SCD...`);
    
    try {
      this.toolSelector = new ToolSelector(tools);
      this.toolCaller = new ToolCaller(tools);
      this.resultDescriber = new ResultDescriber();
      
      console.log(`[AgentSystemUpgrade] Hệ thống SCD đã sẵn sàng`);
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi khởi tạo hệ thống SCD:`, error);
    }
  }
  
  /**
   * Khởi tạo MarketDataRetriever cho dữ liệu thời gian thực
   */
  private initializeRealTimeMarketData(): void {
    console.log(`[AgentSystemUpgrade] Khởi tạo MarketDataRetriever...`);
    
    try {
      this.marketDataRetriever = new MarketDataRetriever();
      console.log(`[AgentSystemUpgrade] MarketDataRetriever đã sẵn sàng`);
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi khởi tạo MarketDataRetriever:`, error);
    }
  }
  
  /**
   * Khởi động MCP server
   */
  public async startMCP(port: number = 3001): Promise<boolean> {
    if (!this.mcpServer) {
      console.error(`[AgentSystemUpgrade] MCP Server chưa được khởi tạo`);
      return false;
    }
    
    try {
      await this.mcpServer.listen(port);
      console.log(`[AgentSystemUpgrade] MCP Server đang lắng nghe trên cổng ${port}`);
      return true;
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi khởi động MCP Server:`, error);
      return false;
    }
  }
  
  /**
   * Xử lý truy vấn người dùng thông qua hệ thống SCD
   */
  public async processUserQuery(
    message: string,
    context: AgentContext
  ): Promise<{ result: any; tools: string[]; format: string }> {
    console.log(`[AgentSystemUpgrade] Xử lý truy vấn người dùng: "${message}"`);
    
    // Kiểm tra các thành phần cần thiết
    if (!this.toolSelector || !this.toolCaller || !this.resultDescriber) {
      throw new Error('Hệ thống SCD chưa được khởi tạo');
    }
    
    try {
      // 1. Chọn công cụ phù hợp với truy vấn
      const selectionResult = await this.toolSelector.selectCandidateTools(message);
      
      if (selectionResult.tools.length === 0) {
        return {
          result: 'Không tìm thấy công cụ phù hợp để xử lý truy vấn của bạn.',
          tools: [],
          format: 'plain'
        };
      }
      
      console.log(`[AgentSystemUpgrade] Đã chọn các công cụ: ${selectionResult.tools.join(', ')}`);
      
      // 2. Gọi các công cụ đã chọn
      const toolResults = [];
      for (const toolName of selectionResult.tools) {
        try {
          // Tạo tham số đơn giản cho công cụ
          // Trong triển khai thực tế, đây sẽ phức tạp hơn và sử dụng NLP/LLM
          const args = this.buildToolArgs(toolName, message);
          
          // Gọi công cụ
          const result = await this.toolCaller.callTool(toolName, args, context);
          
          if (result.success) {
            toolResults.push({
              toolName,
              result: result.result
            });
          } else if (result.validationErrors) {
            // Nếu có lỗi xác thực, thử sửa tham số
            const correctedArgs = await this.toolCaller.correctArgs(
              toolName,
              args,
              result.validationErrors
            );
            
            // Thử lại với tham số đã sửa
            const retryResult = await this.toolCaller.callTool(toolName, correctedArgs, context);
            
            if (retryResult.success) {
              toolResults.push({
                toolName,
                result: retryResult.result
              });
            }
          }
        } catch (error: any) {
          console.error(`[AgentSystemUpgrade] Lỗi khi gọi công cụ ${toolName}:`, error);
        }
      }
      
      // 3. Định dạng kết quả
      const formattedResults = toolResults.map(tr => {
        return this.resultDescriber!.formatResult(tr.toolName, tr.result, 'markdown');
      });
      
      return {
        result: formattedResults.join('\n\n'),
        tools: selectionResult.tools,
        format: 'markdown'
      };
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi xử lý truy vấn:`, error);
      
      return {
        result: `Đã xảy ra lỗi khi xử lý truy vấn của bạn: ${error.message}`,
        tools: [],
        format: 'plain'
      };
    }
  }
  
  /**
   * Tạo tham số cho công cụ dựa trên truy vấn người dùng
   */
  private buildToolArgs(toolName: string, message: string): any {
    // Định dạng tham số cho các công cụ khác nhau
    // Trong triển khai thực tế, đây sẽ sử dụng NLP/LLM để phân tích truy vấn
    
    const lowerMessage = message.toLowerCase();
    
    switch (toolName) {
      case 'technicalAnalysisTool': {
        // Trích xuất symbol từ tin nhắn
        let symbol = 'BTCUSDT'; // Mặc định
        let timeframe = '1d';    // Mặc định
        
        // Tìm symbol
        const symbolPatterns = [
          /\b(btc|eth|sol|bnb|xrp|dot|ada|avax)(?:usdt)?\b/i,
          /\b([a-z0-9]{2,10})(?:usdt)?\b/i
        ];
        
        for (const pattern of symbolPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            symbol = match[1].toUpperCase();
            break;
          }
        }
        
        // Tìm timeframe
        if (lowerMessage.includes('1m') || lowerMessage.includes('1 phút')) {
          timeframe = '1m';
        } else if (lowerMessage.includes('5m') || lowerMessage.includes('5 phút')) {
          timeframe = '5m';
        } else if (lowerMessage.includes('15m') || lowerMessage.includes('15 phút')) {
          timeframe = '15m';
        } else if (lowerMessage.includes('30m') || lowerMessage.includes('30 phút')) {
          timeframe = '30m';
        } else if (lowerMessage.includes('1h') || lowerMessage.includes('1 giờ')) {
          timeframe = '1h';
        } else if (lowerMessage.includes('4h') || lowerMessage.includes('4 giờ')) {
          timeframe = '4h';
        } else if (lowerMessage.includes('1d') || lowerMessage.includes('ngày')) {
          timeframe = '1d';
        } else if (lowerMessage.includes('1w') || lowerMessage.includes('tuần')) {
          timeframe = '1w';
        }
        
        return {
          symbol,
          timeframe
        };
      }
      
      case 'marketDataTool': {
        // Trích xuất symbol từ tin nhắn tương tự như ở trên
        let symbol = 'BTCUSDT'; // Mặc định
        
        const symbolPatterns = [
          /\b(btc|eth|sol|bnb|xrp|dot|ada|avax)(?:usdt)?\b/i,
          /\b([a-z0-9]{2,10})(?:usdt)?\b/i
        ];
        
        for (const pattern of symbolPatterns) {
          const match = message.match(pattern);
          if (match && match[1]) {
            symbol = match[1].toUpperCase();
            break;
          }
        }
        
        return {
          symbol,
          includeNews: lowerMessage.includes('tin') || lowerMessage.includes('news')
        };
      }
      
      case 'balanceCheckTool': {
        return {};
      }
      
      case 'tradingTool': {
        // Tham số mặc định cho công cụ giao dịch
        // Đây chỉ là mẫu, không nên sử dụng trong thực tế vì rủi ro
        return {
          action: 'check',
          tradingIntent: null
        };
      }
      
      default:
        return {};
    }
  }
  
  /**
   * Xử lý kết quả công cụ và định dạng lại
   */
  public formatToolResult(toolName: string, result: any, format: string = 'markdown'): string {
    if (!this.resultDescriber) {
      console.error(`[AgentSystemUpgrade] ResultDescriber chưa được khởi tạo`);
      return JSON.stringify(result);
    }
    
    return this.resultDescriber.formatResult(toolName, result, format as any);
  }
  
  /**
   * Lấy dữ liệu thị trường thời gian thực
   */
  public async getRealTimeMarketData(symbol: string, interval: string = '1d'): Promise<any> {
    if (!this.marketDataRetriever) {
      console.error(`[AgentSystemUpgrade] MarketDataRetriever chưa được khởi tạo`);
      return null;
    }
    
    try {
      const [marketInfo, rsi, ma50, ma200] = await Promise.all([
        this.marketDataRetriever.getMarketInfo(symbol),
        this.marketDataRetriever.getRSI(symbol, interval),
        this.marketDataRetriever.getMA(symbol, interval, 50),
        this.marketDataRetriever.getMA(symbol, interval, 200)
      ]);
      
      return {
        success: true,
        marketInfo,
        indicators: {
          RSI: rsi,
          MA50: ma50,
          MA200: ma200,
          currentPrice: marketInfo?.price
        },
        timestamp: Date.now()
      };
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi lấy dữ liệu thị trường thời gian thực:`, error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định'
      };
    }
  }
  
  /**
   * Ủy thác nhiệm vụ cho một agent khác qua A2A
   */
  public async delegateTask(agentId: string, task: any): Promise<any> {
    if (!this.a2aHandler) {
      console.error(`[AgentSystemUpgrade] A2A Protocol Handler chưa được khởi tạo`);
      return {
        success: false,
        error: 'A2A Protocol Handler chưa được khởi tạo'
      };
    }
    
    try {
      const result = await this.a2aHandler.delegateTask(agentId, task);
      return {
        success: true,
        result
      };
    } catch (error: any) {
      console.error(`[AgentSystemUpgrade] Lỗi khi ủy thác nhiệm vụ cho agent ${agentId}:`, error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định'
      };
    }
  }
  
  /**
   * Đóng các kết nối và tài nguyên
   */
  public async shutdown(): Promise<void> {
    console.log(`[AgentSystemUpgrade] Đang đóng hệ thống...`);
    
    if (this.mcpServer) {
      await this.mcpServer.close();
    }
    
    console.log(`[AgentSystemUpgrade] Hệ thống đã đóng thành công`);
  }
} 