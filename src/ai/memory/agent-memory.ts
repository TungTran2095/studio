/**
 * Hệ thống bộ nhớ cho AI Agent
 * - Lưu trữ kinh nghiệm giao dịch
 * - Hỗ trợ bộ nhớ ngắn hạn và dài hạn
 * - Cung cấp khả năng truy xuất thông minh
 */

import { v4 as uuidv4 } from 'uuid';

export interface MemoryConfig {
  experienceCapacity: number;
  longTermMemoryEnabled: boolean;
  maxConversationHistoryLength?: number;
}

export interface ExperienceRecord {
  id: string;
  timestamp: number;
  action: 'BUY' | 'SELL' | 'HOLD';
  symbol: string;
  price: number;
  quantity: number | string;
  reasoning: string;
  result?: {
    profitable: boolean;
    profitLoss?: number;
    holdingPeriod?: number;
  };
  metadata?: Record<string, any>;
}

export interface ConversationRecord {
  id: string;
  timestamp: number;
  userQuery: string;
  agentResponse: string;
  intents: string[];
  entities: Record<string, any>;
  context?: Record<string, any>;
}

export class AgentMemory {
  private config: MemoryConfig;
  private shortTermExperiences: ExperienceRecord[] = [];
  private longTermExperiences: ExperienceRecord[] = [];
  private conversationHistory: ConversationRecord[] = [];
  private symbolSpecificMemory: Record<string, ExperienceRecord[]> = {};

  constructor(config: Partial<MemoryConfig> = {}) {
    const defaults: MemoryConfig = {
      experienceCapacity: 1000,
      longTermMemoryEnabled: true,
      maxConversationHistoryLength: 50
    };
    this.config = Object.assign({}, defaults, config);
  }

  /**
   * Thêm một kinh nghiệm giao dịch mới vào bộ nhớ
   */
  public addExperience(experience: Omit<ExperienceRecord, 'id' | 'timestamp'>): string {
    const id = uuidv4();
    const record: ExperienceRecord = {
      id,
      timestamp: Date.now(),
      ...experience
    };

    // Thêm vào bộ nhớ ngắn hạn
    this.shortTermExperiences.unshift(record);
    
    // Giới hạn kích thước bộ nhớ ngắn hạn
    if (this.shortTermExperiences.length > this.config.experienceCapacity) {
      const oldest = this.shortTermExperiences.pop();
      
      // Chuyển kinh nghiệm có giá trị vào bộ nhớ dài hạn
      if (oldest && this.config.longTermMemoryEnabled && this.isValuableExperience(oldest)) {
        this.longTermExperiences.push(oldest);
      }
    }

    // Thêm vào bộ nhớ theo symbol
    if (!this.symbolSpecificMemory[experience.symbol]) {
      this.symbolSpecificMemory[experience.symbol] = [];
    }
    this.symbolSpecificMemory[experience.symbol].push(record);

    return id;
  }

  /**
   * Thêm bản ghi hội thoại vào lịch sử
   */
  public addConversation(conversation: Omit<ConversationRecord, 'id' | 'timestamp'>): string {
    const id = uuidv4();
    const record: ConversationRecord = {
      id,
      timestamp: Date.now(),
      ...conversation
    };

    this.conversationHistory.unshift(record);
    
    // Giới hạn kích thước lịch sử hội thoại
    if (this.conversationHistory.length > (this.config.maxConversationHistoryLength || 50)) {
      this.conversationHistory.pop();
    }

    return id;
  }

  /**
   * Cập nhật kết quả cho một kinh nghiệm giao dịch
   */
  public updateExperienceResult(id: string, result: ExperienceRecord['result']): boolean {
    // Tìm trong bộ nhớ ngắn hạn
    const shortTermIndex = this.shortTermExperiences.findIndex(e => e.id === id);
    if (shortTermIndex !== -1) {
      this.shortTermExperiences[shortTermIndex].result = result;
      return true;
    }

    // Tìm trong bộ nhớ dài hạn
    const longTermIndex = this.longTermExperiences.findIndex(e => e.id === id);
    if (longTermIndex !== -1) {
      this.longTermExperiences[longTermIndex].result = result;
      return true;
    }

    return false;
  }

  /**
   * Lấy kinh nghiệm giao dịch tương tự
   */
  public getSimilarExperiences(symbol: string, action: 'BUY' | 'SELL' | 'HOLD', limit: number = 5): ExperienceRecord[] {
    const symbolExperiences = this.symbolSpecificMemory[symbol] || [];
    const actionExperiences = symbolExperiences.filter(e => e.action === action);
    
    // Sắp xếp theo thời gian gần đây nhất
    return actionExperiences
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Lấy lịch sử hội thoại gần đây
   */
  public getRecentConversations(limit: number = 10): ConversationRecord[] {
    return this.conversationHistory.slice(0, limit);
  }

  /**
   * Lấy thống kê hiệu suất giao dịch
   */
  public getPerformanceStats(symbol?: string): {
    totalTrades: number;
    profitableTrades: number;
    winRate: number;
    averageProfitLoss: number;
  } {
    const experiences = symbol 
      ? (this.symbolSpecificMemory[symbol] || [])
      : [...this.shortTermExperiences, ...this.longTermExperiences];
    
    const completedTrades = experiences.filter(e => e.result);
    const profitableTrades = completedTrades.filter(e => e.result?.profitable);
    
    const totalProfitLoss = completedTrades.reduce((sum, e) => 
      sum + (e.result?.profitLoss || 0), 0);
    
    return {
      totalTrades: completedTrades.length,
      profitableTrades: profitableTrades.length,
      winRate: completedTrades.length > 0 
        ? profitableTrades.length / completedTrades.length 
        : 0,
      averageProfitLoss: completedTrades.length > 0 
        ? totalProfitLoss / completedTrades.length 
        : 0
    };
  }

  /**
   * Kiểm tra xem một kinh nghiệm có giá trị để lưu lâu dài không
   */
  private isValuableExperience(experience: ExperienceRecord): boolean {
    // Các tiêu chí để xem xét một kinh nghiệm có giá trị:
    // 1. Có kết quả (đã hoàn thành giao dịch)
    if (!experience.result) return false;
    
    // 2. Lợi nhuận/lỗ đáng kể
    const significantProfitLoss = Math.abs(experience.result.profitLoss || 0) > 
      (experience.price * 0.05); // >5% giá trị
    
    // 3. Giao dịch đặc biệt hoặc hiếm gặp
    const isSpecialTrade = experience.metadata?.isSpecialMarketCondition || 
                           experience.metadata?.isRareTradingPattern;
    
    return significantProfitLoss || isSpecialTrade || experience.result.profitable;
  }

  /**
   * Xóa tất cả dữ liệu trong bộ nhớ
   */
  public clearMemory(): void {
    this.shortTermExperiences = [];
    this.longTermExperiences = [];
    this.conversationHistory = [];
    this.symbolSpecificMemory = {};
  }
} 