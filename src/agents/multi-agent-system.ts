/**
 * Hệ thống đa tác nhân (Multi-Agent System)
 * - Điều phối hoạt động của các agent
 * - Xử lý truyền thông giữa các agent
 * - Quản lý quy trình ra quyết định
 */

import { AgentMemory } from '@/ai/memory/agent-memory';
import { ReinforcementLearningModel, State, Action } from '@/ai/models/reinforcement-learning';
import { MarketAnalysisAgent, MarketInsight } from './market-analysis-agent';

// Khai báo các type cần thiết
export interface SystemState {
  markets: Record<string, MarketInsight>;
  pendingActions: Action[];
  riskLevel: number;
  currentMode: AgentMode;
  lastDecision: Decision | null;
  timestamp: number;
}

export type AgentMode = 'auto' | 'assisted' | 'manual';

export interface Decision {
  id: string;
  timestamp: number;
  action: Action;
  reasoning: string;
  confidence: number;
  contributingAgents: string[];
  expectedOutcome: {
    profitPotential: number;
    risk: number;
    timeframe: string;
  };
}

export interface MASConfig {
  mode: AgentMode;
  enabledAgents: string[];
  humanApprovalRequired: boolean;
  confidenceThreshold: number;
  riskTolerance: number;
  performanceTracking: boolean;
}

export class MultiAgentSystem {
  private memory: AgentMemory;
  private config: MASConfig;
  private rlModel: ReinforcementLearningModel;
  private marketAnalysisAgent: MarketAnalysisAgent;
  private systemState: SystemState;
  
  constructor(
    memory: AgentMemory,
    marketAnalysisAgent: MarketAnalysisAgent,
    rlModel: ReinforcementLearningModel,
    config?: Partial<MASConfig>
  ) {
    this.memory = memory;
    this.marketAnalysisAgent = marketAnalysisAgent;
    this.rlModel = rlModel;
    
    // Cấu hình mặc định
    this.config = {
      mode: 'assisted',
      enabledAgents: ['marketAnalysis', 'riskManagement', 'execution'],
      humanApprovalRequired: true,
      confidenceThreshold: 75,
      riskTolerance: 50, // 0-100
      performanceTracking: true,
      ...config
    };
    
    // Khởi tạo trạng thái hệ thống
    this.systemState = {
      markets: {},
      pendingActions: [],
      riskLevel: 0,
      currentMode: this.config.mode,
      lastDecision: null,
      timestamp: Date.now()
    };
  }
  
  /**
   * Phân tích một mã tiền cụ thể và đưa ra quyết định
   */
  public async analyzeAndDecide(symbol: string): Promise<Decision> {
    console.log(`[MultiAgentSystem] Đang phân tích và đưa ra quyết định cho ${symbol}...`);
    
    try {
      // 1. Phân tích thị trường
      const marketInsight = await this.marketAnalysisAgent.analyzeMarket(symbol);
      
      // 2. Cập nhật trạng thái hệ thống
      this.systemState.markets[symbol] = marketInsight;
      this.systemState.timestamp = Date.now();
      
      // 3. Chuyển đổi insight thành state cho mô hình RL
      const state = this.marketAnalysisAgent.convertToState(marketInsight);
      
      // 4. Sử dụng mô hình RL để chọn hành động
      const action = this.rlModel.selectAction(state);
      
      // 5. Tính toán độ tin cậy cho quyết định
      const confidence = this.calculateDecisionConfidence(marketInsight, action);
      
      // 6. Tạo quyết định
      const decision: Decision = {
        id: `decision_${Date.now()}_${symbol}`,
        timestamp: Date.now(),
        action,
        reasoning: this.generateReasoning(marketInsight, action),
        confidence,
        contributingAgents: this.getContributingAgents(),
        expectedOutcome: this.calculateExpectedOutcome(state, action)
      };
      
      // 7. Cập nhật quyết định cuối cùng
      this.systemState.lastDecision = decision;
      
      // 8. Thêm vào hàng đợi hành động nếu tự động
      if (this.config.mode === 'auto' && confidence >= this.config.confidenceThreshold) {
        this.systemState.pendingActions.push(action);
      }
      
      // 9. Lưu kinh nghiệm vào bộ nhớ
      this.memory.addExperience({
        action: action.type,
        symbol: action.symbol,
        price: marketInsight.currentPrice,
        quantity: typeof action.amount === 'number' ? action.amount : '0',
        reasoning: decision.reasoning,
        metadata: {
          confidence,
          marketState: state,
          marketCondition: marketInsight.marketCondition,
          riskLevel: this.systemState.riskLevel
        }
      });
      
      return decision;
      
    } catch (error: any) {
      console.error(`[MultiAgentSystem] Lỗi khi phân tích và đưa ra quyết định:`, error);
      throw new Error(`Không thể đưa ra quyết định cho ${symbol}: ${error.message}`);
    }
  }
  
  /**
   * Thực hiện hành động dựa trên quyết định
   */
  public async executeDecision(decision: Decision): Promise<boolean> {
    // Trong thực tế, hàm này sẽ giao tiếp với execution agent để thực hiện giao dịch
    
    if (this.config.humanApprovalRequired && this.config.mode !== 'auto') {
      console.log(`[MultiAgentSystem] Cần phê duyệt của người dùng để thực hiện quyết định ${decision.id}`);
      return false;
    }
    
    if (decision.confidence < this.config.confidenceThreshold) {
      console.log(`[MultiAgentSystem] Quyết định ${decision.id} có độ tin cậy thấp (${decision.confidence}), không thực hiện`);
      return false;
    }
    
    console.log(`[MultiAgentSystem] Thực hiện quyết định ${decision.id}...`);
    
    // Giả lập thực hiện quyết định
    const success = Math.random() > 0.1; // 90% thành công
    
    if (success) {
      console.log(`[MultiAgentSystem] Đã thực hiện thành công quyết định ${decision.id}`);
      
      // Cập nhật trạng thái hệ thống
      this.systemState.pendingActions = this.systemState.pendingActions.filter(
        action => action !== decision.action
      );
      
      // Thêm thông tin vào bộ nhớ
      // Trong thực tế, bạn sẽ cập nhật kết quả khi có thông tin
      
    } else {
      console.error(`[MultiAgentSystem] Không thể thực hiện quyết định ${decision.id}`);
    }
    
    return success;
  }
  
  /**
   * Cập nhật kết quả cho một quyết định đã thực hiện
   */
  public updateDecisionResult(decisionId: string, result: { profitable: boolean; profitLoss: number }): void {
    // Tìm experienceId tương ứng với decisionId
    // Trong thực tế, bạn sẽ lưu trữ ánh xạ giữa decisionId và experienceId
    
    // Giả sử chúng ta có experienceId
    const experienceId = `exp_${decisionId}`;
    
    // Cập nhật kết quả
    this.memory.updateExperienceResult(experienceId, {
      profitable: result.profitable,
      profitLoss: result.profitLoss,
      holdingPeriod: 24 // giả sử 24 giờ
    });
    
    // Học từ kinh nghiệm này
    this.rlModel.trainFromExperiences();
  }
  
  /**
   * Lấy trạng thái hiện tại của hệ thống
   */
  public getSystemState(): SystemState {
    return { ...this.systemState };
  }
  
  /**
   * Cập nhật cấu hình hệ thống
   */
  public updateConfig(config: Partial<MASConfig>): void {
    this.config = {
      ...this.config,
      ...config
    };
    
    // Cập nhật mode
    this.systemState.currentMode = this.config.mode;
  }
  
  /**
   * Tính toán độ tin cậy cho quyết định
   */
  private calculateDecisionConfidence(insight: MarketInsight, action: Action): number {
    let confidence = insight.sentiment.confidence;
    
    // Điều chỉnh độ tin cậy dựa trên sự đồng thuận giữa xu hướng và hành động
    if (
      (insight.marketCondition === 'bullish' && action.type === 'BUY') ||
      (insight.marketCondition === 'bearish' && action.type === 'SELL')
    ) {
      confidence += 10; // Tăng độ tin cậy khi hành động phù hợp với xu hướng
    } else if (
      (insight.marketCondition === 'bullish' && action.type === 'SELL') ||
      (insight.marketCondition === 'bearish' && action.type === 'BUY')
    ) {
      confidence -= 20; // Giảm mạnh độ tin cậy khi hành động ngược với xu hướng
    }
    
    // Điều chỉnh theo tín hiệu kỹ thuật cơ bản (dựa trên MA50 so với MA200)
    const trendStrength = insight.indicators.ma50 > insight.indicators.ma200 ? 10 : insight.indicators.ma50 < insight.indicators.ma200 ? -10 : 0;
    confidence += trendStrength;
    
    // Giới hạn trong khoảng 0-100
    return Math.min(100, Math.max(0, confidence));
  }
  
  /**
   * Tạo lý do cho quyết định
   */
  private generateReasoning(insight: MarketInsight, action: Action): string {
    const { marketCondition, technicalAnalysis, fundamentalAnalysis, sentimentAnalysis } = insight;
    
    let reasoning = `Quyết định ${action.type} ${action.symbol} dựa trên các yếu tố sau:\n`;
    
    // Thêm thông tin về điều kiện thị trường
    reasoning += `- Điều kiện thị trường: ${this.translateMarketCondition(marketCondition)}\n`;
    
    // Thêm thông tin về xu hướng kỹ thuật
    reasoning += `- Phân tích kỹ thuật: Xu hướng ${this.translateTrend(technicalAnalysis.trend)} với độ mạnh ${technicalAnalysis.strength}/100\n`;
    
    // Thêm thông tin về các mẫu hình được phát hiện
    if (technicalAnalysis.patterns.length > 0) {
      reasoning += `- Mẫu hình được phát hiện: ${technicalAnalysis.patterns.map(p => p.name).join(', ')}\n`;
    }
    
    // Thêm thông tin về các mức hỗ trợ/kháng cự
    if (technicalAnalysis.keyLevels.support.length > 0) {
      reasoning += `- Mức hỗ trợ gần nhất: ${technicalAnalysis.keyLevels.support[0]}\n`;
    }
    if (technicalAnalysis.keyLevels.resistance.length > 0) {
      reasoning += `- Mức kháng cự gần nhất: ${technicalAnalysis.keyLevels.resistance[0]}\n`;
    }
    
    // Thêm thông tin về phân tích cơ bản
    if (fundamentalAnalysis) {
      reasoning += `- Phân tích cơ bản: Vốn hóa thị trường ${this.formatNumber(fundamentalAnalysis.marketCap)} USD, khối lượng 24h ${this.formatNumber(fundamentalAnalysis.volume24h)} USD\n`;
    }
    
    // Thêm thông tin về phân tích tâm lý
    if (sentimentAnalysis) {
      reasoning += `- Phân tích tâm lý: Tâm lý thị trường ${this.translateSentiment(sentimentAnalysis.overallSentiment)}, điểm cảm xúc ${sentimentAnalysis.sentimentScore.toFixed(1)}\n`;
    }
    
    // Thêm lý do cụ thể cho hành động
    if (action.type === 'BUY') {
      reasoning += `- Lý do mua: `;
      if (marketCondition === 'bullish') {
        reasoning += `Thị trường đang trong xu hướng tăng, có cơ hội tăng giá tiếp tục. `;
      } else if (marketCondition === 'sideways') {
        reasoning += `Thị trường đang tích lũy, có thể sắp bước vào xu hướng tăng. `;
      } else {
        reasoning += `Mặc dù thị trường đang trong xu hướng giảm, nhưng có dấu hiệu quá bán và có thể phục hồi. `;
      }
    } else if (action.type === 'SELL') {
      reasoning += `- Lý do bán: `;
      if (marketCondition === 'bearish') {
        reasoning += `Thị trường đang trong xu hướng giảm, có nguy cơ tiếp tục giảm giá. `;
      } else if (marketCondition === 'sideways') {
        reasoning += `Thị trường đang tích lũy, có thể sắp bước vào xu hướng giảm. `;
      } else {
        reasoning += `Mặc dù thị trường đang trong xu hướng tăng, nhưng có dấu hiệu quá mua và có thể điều chỉnh. `;
      }
    } else {
      reasoning += `- Lý do giữ: Chưa có tín hiệu rõ ràng để mua hoặc bán. Thị trường đang thiếu định hướng hoặc biến động quá mạnh.`;
    }
    
    return reasoning;
  }
  
  /**
   * Tính toán kết quả dự kiến
   */
  private calculateExpectedOutcome(state: State, action: Action): Decision['expectedOutcome'] {
    const profitPotential = this.calculateProfitPotential(state, action);
    const risk = this.calculateRisk(state, action);
    
    // Xác định khung thời gian dự kiến
    let timeframe: string;
    if (state.technicalIndicators.bollingerBands.width > 0.05) {
      timeframe = 'short'; // Biến động lớn, kết quả nhanh
    } else if (state.technicalIndicators.macd.histogram > 0 && state.technicalIndicators.macd.histogram < 0.01) {
      timeframe = 'long'; // MACD yếu, cần thời gian
    } else {
      timeframe = 'medium'; // Trường hợp mặc định
    }
    
    return {
      profitPotential,
      risk,
      timeframe
    };
  }
  
  /**
   * Tính toán tiềm năng lợi nhuận
   */
  private calculateProfitPotential(state: State, action: Action): number {
    // Đây là một ví dụ đơn giản, trong thực tế sẽ phức tạp hơn
    
    // Mặc định 0-100
    let potential = 50;
    
    if (action.type === 'BUY') {
      // Nếu RSI thấp, tiềm năng cao hơn (mua ở vùng quá bán)
      if (state.technicalIndicators.rsi < 30) {
        potential += 20;
      }
      
      // Nếu MACD cắt lên, tiềm năng cao hơn
      if (state.technicalIndicators.macd.histogram > 0 && state.technicalIndicators.macd.signal < state.technicalIndicators.macd.line) {
        potential += 15;
      }
      
      // Nếu giá gần mức hỗ trợ, tiềm năng cao hơn
      if (state.currentPrice < state.technicalIndicators.bollingerBands.lower * 1.01) {
        potential += 15;
      }
    } else if (action.type === 'SELL') {
      // Nếu RSI cao, tiềm năng cao hơn (bán ở vùng quá mua)
      if (state.technicalIndicators.rsi > 70) {
        potential += 20;
      }
      
      // Nếu MACD cắt xuống, tiềm năng cao hơn
      if (state.technicalIndicators.macd.histogram < 0 && state.technicalIndicators.macd.signal > state.technicalIndicators.macd.line) {
        potential += 15;
      }
      
      // Nếu giá gần mức kháng cự, tiềm năng cao hơn
      if (state.currentPrice > state.technicalIndicators.bollingerBands.upper * 0.99) {
        potential += 15;
      }
    }
    
    // Giới hạn trong khoảng 0-100
    return Math.min(100, Math.max(0, potential));
  }
  
  /**
   * Tính toán rủi ro
   */
  private calculateRisk(state: State, action: Action): number {
    // Đây là một ví dụ đơn giản, trong thực tế sẽ phức tạp hơn
    
    // Mặc định 0-100
    let risk = 50;
    
    // Rủi ro tăng theo biến động
    if (state.recentPriceAction.volatility > 0.05) {
      risk += 20;
    }
    
    if (action.type === 'BUY') {
      // Nếu RSI đã cao, rủi ro cao hơn
      if (state.technicalIndicators.rsi > 70) {
        risk += 15;
      }
      
      // Nếu xu hướng chung đang giảm, rủi ro cao hơn
      if (state.marketCondition === 'bearish') {
        risk += 20;
      }
    } else if (action.type === 'SELL') {
      // Nếu RSI đã thấp, rủi ro cao hơn
      if (state.technicalIndicators.rsi < 30) {
        risk += 15;
      }
      
      // Nếu xu hướng chung đang tăng, rủi ro cao hơn
      if (state.marketCondition === 'bullish') {
        risk += 20;
      }
    }
    
    // Rủi ro thấp hơn nếu có stop loss
    if (action.stopLoss) {
      risk -= 10;
    }
    
    // Giới hạn trong khoảng 0-100
    return Math.min(100, Math.max(0, risk));
  }
  
  /**
   * Lấy danh sách các agent đóng góp vào quyết định
   */
  private getContributingAgents(): string[] {
    return this.config.enabledAgents.filter(agent => {
      // Trong thực tế, bạn sẽ kiểm tra xem agent có đóng góp vào quyết định không
      return true;
    });
  }
  
  /**
   * Chuyển đổi trạng thái thị trường sang tiếng Việt
   */
  private translateMarketCondition(condition: 'bullish' | 'bearish' | 'sideways'): string {
    switch (condition) {
      case 'bullish': return 'tăng giá';
      case 'bearish': return 'giảm giá';
      case 'sideways': return 'đi ngang';
      default: return condition;
    }
  }
  
  /**
   * Chuyển đổi xu hướng sang tiếng Việt
   */
  private translateTrend(trend: 'bullish' | 'bearish' | 'neutral'): string {
    switch (trend) {
      case 'bullish': return 'tăng';
      case 'bearish': return 'giảm';
      case 'neutral': return 'trung tính';
      default: return trend;
    }
  }
  
  /**
   * Chuyển đổi tâm lý sang tiếng Việt
   */
  private translateSentiment(sentiment: 'positive' | 'negative' | 'neutral'): string {
    switch (sentiment) {
      case 'positive': return 'tích cực';
      case 'negative': return 'tiêu cực';
      case 'neutral': return 'trung tính';
      default: return sentiment;
    }
  }
  
  /**
   * Định dạng số
   */
  private formatNumber(num: number): string {
    if (num >= 1e9) {
      return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
      return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
      return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toFixed(2);
  }
} 