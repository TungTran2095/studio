/**
 * Định nghĩa kiểu dữ liệu cho hệ thống AI Agent của Yinsen
 */

/**
 * Kiểu dữ liệu cho tin nhắn trong bộ nhớ
 */
export interface MemoryItem {
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * Cấu hình kỹ năng được bật
 */
export interface SkillsConfig {
  trading: boolean;
  marketAnalysis: boolean;
  portfolioAnalysis: boolean;
  balanceCheck: boolean;
  technicalAnalysis: boolean;
  backtesting: boolean;
}

/**
 * Các loại dữ liệu cần thiết cho agent
 */

/**
 * Context của agent
 */
export interface AgentContext {
  messages?: { role: string; content: string }[];
  userId?: string;
  [key: string]: any;
}

/**
 * Định nghĩa công cụ
 */
export interface Tool {
  name: string;
  description: string;
  execute: (args: string, context: AgentContext) => Promise<any>;
  schema?: Record<string, any>;
  examples?: string[];
}

/**
 * Định nghĩa kết quả thực thi công cụ
 */
export interface ToolExecutionResult {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Định nghĩa loại chức năng
 */
export enum ToolType {
  MarketData = 'marketData',
  TechnicalAnalysis = 'technicalAnalysis',
  Trading = 'trading',
  BalanceCheck = 'balanceCheck',
  PortfolioAnalysis = 'portfolioAnalysis',
  News = 'news'
}

/**
 * Định nghĩa memory entry
 */
export interface MemoryEntry {
  type: 'conversation' | 'action' | 'result' | 'feedback';
  content: any;
  timestamp: number;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Định nghĩa memory search results
 */
export interface MemorySearchResult {
  entries: MemoryEntry[];
  relevanceScores: number[];
}

/**
 * Định nghĩa learning event
 */
export interface LearningEvent {
  type: 'success' | 'failure' | 'feedback';
  action: string;
  context: Record<string, any>;
  result: any;
  timestamp: number;
  userId?: string;
}

/**
 * Định nghĩa action history
 */
export interface ActionHistory {
  action: string;
  result: any;
  timestamp: number;
  successful: boolean;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Kết quả phát hiện ý định
 */
export interface IntentDetectionResult {
  scenarioId: string;
  confidence: number;
  entities: Record<string, any>;
}

/**
 * Cấu trúc kịch bản
 */
export interface Scenario {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  requiredEntities: string[];
  requiredTools: string[];
  responseTemplate: string;
  examples: {
    input: string;
    output: string;
  }[];
} 