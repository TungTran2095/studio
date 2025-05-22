'use server';

import { AgentContext } from './types';
import { toolManager } from './tools';
import { detectIntent } from './intents';
import { generateResponseFromTemplate } from './templates';
import { MultiAgentSystem } from '@/agents/multi-agent-system';
import { AgentMemory } from '@/ai/memory/agent-memory';
import { MarketAnalysisAgent } from '@/agents/market-analysis-agent';
import { ReinforcementLearningModel } from '@/ai/models/reinforcement-learning';

/**
 * Lớp AI Agent chính của Yinsen
 * Quản lý tất cả các khả năng và công cụ của hệ thống
 */
export class YinsenAgent {
  private context: AgentContext;
  private multiAgentSystem: MultiAgentSystem | null = null;
  
  constructor(initialContext?: Partial<AgentContext>) {
    // Khởi tạo context với các giá trị mặc định và ghi đè nếu có
    this.context = {
      userName: initialContext?.userName || 'khách',
      apiKey: initialContext?.apiKey || '',
      apiSecret: initialContext?.apiSecret || '',
      isTestnet: initialContext?.isTestnet || true,
      lastUpdated: new Date(),
      memory: initialContext?.memory || [],
      skillsEnabled: initialContext?.skillsEnabled || {
        trading: true,
        marketAnalysis: true,
        portfolioAnalysis: true,
        balanceCheck: true,
        technicalAnalysis: true,
        backtesting: true
      },
      conversationContext: initialContext?.conversationContext || {},
      activeScenarioId: initialContext?.activeScenarioId || null
    };
    
    // Khởi tạo MultiAgentSystem nếu các kỹ năng liên quan được bật
    if (this.context.skillsEnabled.marketAnalysis || 
        this.context.skillsEnabled.trading || 
        this.context.skillsEnabled.portfolioAnalysis) {
      this.initializeMultiAgentSystem();
    }
  }

  /**
   * Khởi tạo hệ thống đa tác nhân
   */
  private initializeMultiAgentSystem(): void {
    try {
      // Khởi tạo các thành phần cần thiết
      const memory = new AgentMemory({
        experienceCapacity: 1000,
        longTermMemoryEnabled: true,
        maxConversationHistoryLength: 50
      });
      
      // Khởi tạo MarketAnalysisAgent với tham chiếu đến AgentMemory
      const marketAnalysisAgent = new MarketAnalysisAgent(memory, {
        timeframes: ['1h', '4h', '1d'],
        indicatorsToAnalyze: ['RSI', 'MACD', 'Bollinger Bands', 'Moving Averages', 'Ichimoku Cloud']
      });
      
      // Khởi tạo mô hình học tăng cường
      const rlModel = new ReinforcementLearningModel(memory);
      
      // Khởi tạo MultiAgentSystem
      this.multiAgentSystem = new MultiAgentSystem(
        memory,
        marketAnalysisAgent,
        rlModel,
        {
          mode: 'assisted', // Mặc định chế độ có sự hỗ trợ
          enabledAgents: ['marketAnalysis', 'riskManagement'],
          humanApprovalRequired: true,
          confidenceThreshold: 75
        }
      );
      
      console.log('[YinsenAgent] Đã khởi tạo thành công MultiAgentSystem');
    } catch (error: any) {
      console.error('[YinsenAgent] Lỗi khi khởi tạo MultiAgentSystem:', error);
      this.multiAgentSystem = null;
    }
  }

  /**
   * Xử lý tin nhắn người dùng và tạo phản hồi
   */
  async processMessage(message: string): Promise<{
    response: string;
    actions?: Array<{
      type: string;
      data: any;
    }>;
  }> {
    console.log('[YinsenAgent] Xử lý tin nhắn:', message);
    
    try {
      // Cập nhật bộ nhớ
      this.context.memory.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      // Kiểm tra nếu có thể sử dụng MultiAgentSystem
      if (this.multiAgentSystem && this.shouldUseMultiAgentSystem(message)) {
        return await this.processWithMultiAgentSystem(message);
      }
      
      // Xử lý với quy trình truyền thống nếu không dùng MultiAgentSystem
      // 1. Phát hiện ý định và nhận dạng kịch bản
      const { scenarioId, confidence, entities } = await detectIntent(message);
      
      // 2. Ghi nhận kịch bản active
      this.context.activeScenarioId = scenarioId;
      
      // 3. Chuẩn bị các công cụ cần thiết dựa trên kịch bản
      const tools = toolManager.getToolsForScenario(scenarioId);
      
      // 4. Thu thập dữ liệu từ các công cụ
      const toolResults = await this.collectDataFromTools(tools, message, entities);
      
      // 5. Tạo phản hồi dựa trên kịch bản và dữ liệu thu được
      const responseText = generateResponseFromTemplate(scenarioId, {
        entities,
        toolResults,
        context: this.context,
        message
      });
      
      // 6. Cập nhật bộ nhớ với phản hồi
      this.context.memory.push({
        role: 'bot',
        content: responseText,
        timestamp: new Date()
      });
      
      // 7. Trả về kết quả
      return {
        response: responseText,
        actions: this.extractActionsFromToolResults(toolResults)
      };
    } catch (error: any) {
      console.error('[YinsenAgent] Lỗi khi xử lý tin nhắn:', error);
      return {
        response: `Xin lỗi, tôi gặp vấn đề khi xử lý yêu cầu của bạn: ${error.message || 'Lỗi không xác định'}`
      };
    }
  }
  
  /**
   * Xác định xem có nên sử dụng MultiAgentSystem không
   */
  private shouldUseMultiAgentSystem(message: string): boolean {
    // Kiểm tra xem tin nhắn có liên quan đến phân tích thị trường, giao dịch hoặc danh mục không
    const marketKeywords = ['phân tích', 'thị trường', 'giá', 'xu hướng', 'chart', 'biểu đồ'];
    const tradingKeywords = ['mua', 'bán', 'giao dịch', 'lệnh', 'đặt lệnh', 'trade'];
    const portfolioKeywords = ['danh mục', 'portfolio', 'phân bổ', 'tài sản'];
    
    const lowerMessage = message.toLowerCase();
    
    // Nếu tin nhắn chứa bất kỳ từ khóa nào
    return marketKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           tradingKeywords.some(keyword => lowerMessage.includes(keyword)) ||
           portfolioKeywords.some(keyword => lowerMessage.includes(keyword));
  }
  
  /**
   * Xử lý tin nhắn bằng MultiAgentSystem
   */
  private async processWithMultiAgentSystem(message: string): Promise<{
    response: string;
    actions?: Array<{
      type: string;
      data: any;
    }>;
  }> {
    if (!this.multiAgentSystem) {
      throw new Error('MultiAgentSystem chưa được khởi tạo');
    }
    
    console.log('[YinsenAgent] Đang xử lý tin nhắn bằng MultiAgentSystem');
    
    try {
      // Trích xuất symbol từ tin nhắn (đơn giản hóa)
      const symbolMatch = message.match(/\b(btc|eth|xrp|sol|bnb|doge|shib|ada|dot|ltc)\b/i);
      const symbol = symbolMatch ? symbolMatch[0].toUpperCase() : 'BTC';
      
      // Phân tích và đưa ra quyết định
      const decision = await this.multiAgentSystem.analyzeAndDecide(symbol);
      
      // Tạo phản hồi dựa trên quyết định
      const response = this.formatDecisionResponse(decision, symbol);
      
      // Cập nhật bộ nhớ với phản hồi
      this.context.memory.push({
        role: 'bot',
        content: response,
        timestamp: new Date()
      });
      
      // Trả về kết quả và hành động
      return {
        response,
        actions: [{
          type: 'market_analysis',
          data: decision
        }]
      };
    } catch (error: any) {
      console.error('[YinsenAgent] Lỗi khi xử lý tin nhắn với MultiAgentSystem:', error);
      
      // Fallback về phương pháp xử lý truyền thống
      console.log('[YinsenAgent] Chuyển về phương pháp xử lý truyền thống');
      
      // Xóa tin nhắn người dùng cuối cùng để tránh xử lý lại
      this.context.memory.pop();
      
      // Gọi lại hàm processMessage với fallback = true để tránh vòng lặp vô hạn
      return this.processMessageFallback(message);
    }
  }
  
  /**
   * Phương thức xử lý tin nhắn dự phòng khi MultiAgentSystem gặp lỗi
   */
  private async processMessageFallback(message: string): Promise<{
    response: string;
    actions?: Array<{
      type: string;
      data: any;
    }>;
  }> {
    // Cập nhật bộ nhớ
    this.context.memory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // 1. Phát hiện ý định và nhận dạng kịch bản
    const { scenarioId, confidence, entities } = await detectIntent(message);
    
    // 2. Ghi nhận kịch bản active
    this.context.activeScenarioId = scenarioId;
    
    // 3. Chuẩn bị các công cụ cần thiết dựa trên kịch bản
    const tools = toolManager.getToolsForScenario(scenarioId);
    
    // 4. Thu thập dữ liệu từ các công cụ
    const toolResults = await this.collectDataFromTools(tools, message, entities);
    
    // 5. Tạo phản hồi dựa trên kịch bản và dữ liệu thu được
    const responseText = generateResponseFromTemplate(scenarioId, {
      entities,
      toolResults,
      context: this.context,
      message
    });
    
    // 6. Cập nhật bộ nhớ với phản hồi
    this.context.memory.push({
      role: 'bot',
      content: responseText,
      timestamp: new Date()
    });
    
    // 7. Trả về kết quả
    return {
      response: responseText,
      actions: this.extractActionsFromToolResults(toolResults)
    };
  }
  
  /**
   * Định dạng phản hồi từ quyết định của MultiAgentSystem
   */
  private formatDecisionResponse(decision: any, symbol: string): string {
    // Tạo phản hồi dựa trên quyết định
    return `Dựa trên phân tích của hệ thống đa tác nhân (Multi-Agent System) cho ${symbol}:
    
- Hành động đề xuất: ${this.getActionText(decision.action)}
- Độ tin cậy: ${decision.confidence}%
- Lý do: ${decision.reasoning}

${decision.confidence >= 75 ? 'Đề xuất này có độ tin cậy cao.' : 'Đề xuất này có độ tin cậy vừa phải, bạn nên cân nhắc thêm thông tin khác.'}

Kết quả dự kiến: ${decision.expectedOutcome}`;
  }
  
  /**
   * Chuyển đổi mã hành động thành văn bản
   */
  private getActionText(action: string): string {
    switch (action) {
      case 'BUY': return 'MUA';
      case 'SELL': return 'BÁN';
      case 'HOLD': return 'GIỮ';
      default: return action;
    }
  }
  
  /**
   * Thu thập dữ liệu từ các công cụ
   */
  private async collectDataFromTools(
    tools: string[],
    message: string,
    entities: Record<string, any>
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};
    
    for (const toolName of tools) {
      try {
        const tool = toolManager.getTool(toolName);
        if (tool) {
          results[toolName] = await tool.execute(message, this.context, entities);
        }
      } catch (error: any) {
        console.error(`[YinsenAgent] Lỗi khi sử dụng công cụ ${toolName}:`, error);
        results[toolName] = { success: false, error: error.message || 'Lỗi không xác định' };
      }
    }
    
    return results;
  }
  
  /**
   * Trích xuất các hành động từ kết quả công cụ
   */
  private extractActionsFromToolResults(toolResults: Record<string, any>): Array<{
    type: string;
    data: any;
  }> {
    const actions: Array<{ type: string; data: any }> = [];
    
    // Kiểm tra có giao dịch nào thành công không
    if (toolResults.tradingTool?.success) {
      actions.push({
        type: 'trade_executed',
        data: toolResults.tradingTool
      });
    }
    
    // Thêm các hành động khác nếu cần
    
    return actions;
  }
  
  /**
   * Cập nhật context
   */
  updateContext(newContext: Partial<AgentContext>): void {
    this.context = {
      ...this.context,
      ...newContext,
      lastUpdated: new Date()
    };
  }
  
  /**
   * Cập nhật phản hồi người dùng về quyết định
   * - Sử dụng để cải thiện mô hình học tăng cường
   */
  async updateDecisionFeedback(decisionId: string, feedback: { profitable: boolean; profitLoss?: number; holdingPeriod?: number }): Promise<boolean> {
    if (!this.multiAgentSystem) {
      console.warn('[YinsenAgent] Không thể cập nhật phản hồi vì MultiAgentSystem chưa được khởi tạo');
      return false;
    }
    
    try {
      // Đảm bảo profitLoss luôn có giá trị
      const normalizedFeedback = {
        profitable: feedback.profitable,
        profitLoss: feedback.profitLoss || 0, // Nếu không có giá trị, gán bằng 0
        holdingPeriod: feedback.holdingPeriod
      };
      
      // Chuyển phản hồi đến MultiAgentSystem
      this.multiAgentSystem.updateDecisionResult(decisionId, normalizedFeedback);
      console.log(`[YinsenAgent] Đã cập nhật phản hồi cho quyết định ${decisionId}`);
      return true;
    } catch (error: any) {
      console.error(`[YinsenAgent] Lỗi khi cập nhật phản hồi cho quyết định ${decisionId}:`, error);
      return false;
    }
  }
} 