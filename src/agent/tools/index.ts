import { Tool } from '../types';
import { marketDataTool } from './market-data-tool';
import { balanceCheckTool } from './balance-check-tool';
import { tradingTool } from './trading-tool';
import { technicalAnalysisTool } from './technical-analysis-tool';

/**
 * Quản lý các công cụ cho AI Agent
 */
class ToolManager {
  private tools: Map<string, Tool> = new Map();
  private scenarioToolMap: Map<string, string[]> = new Map();
  
  constructor() {
    this.registerDefaultTools();
    this.setupScenarioToolMappings();
  }
  
  /**
   * Đăng ký các công cụ mặc định
   */
  private registerDefaultTools(): void {
    // Đăng ký tất cả công cụ có sẵn
    const availableTools: Tool[] = [
      marketDataTool,
      balanceCheckTool,
      tradingTool,
      technicalAnalysisTool
    ];
    
    // Thêm vào map
    for (const tool of availableTools) {
      this.registerTool(tool);
    }
  }
  
  /**
   * Thiết lập ánh xạ giữa kịch bản và công cụ
   */
  private setupScenarioToolMappings(): void {
    // Ánh xạ kịch bản vào danh sách công cụ cần thiết
    this.scenarioToolMap.set('general_chat', ['marketDataTool']);
    this.scenarioToolMap.set('balance_inquiry', ['balanceCheckTool', 'marketDataTool']);
    this.scenarioToolMap.set('trading', ['tradingTool', 'marketDataTool', 'technicalAnalysisTool']);
    this.scenarioToolMap.set('market_analysis', ['marketDataTool', 'technicalAnalysisTool']);
    this.scenarioToolMap.set('portfolio_analysis', ['balanceCheckTool', 'marketDataTool']);
  }
  
  /**
   * Đăng ký một công cụ mới
   */
  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }
  
  /**
   * Lấy một công cụ theo tên
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }
  
  /**
   * Lấy danh sách công cụ cho một kịch bản
   */
  getToolsForScenario(scenarioId: string): string[] {
    return this.scenarioToolMap.get(scenarioId) || [];
  }
  
  /**
   * Lấy tất cả công cụ đã đăng ký
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }
}

// Khởi tạo singleton
export const toolManager = new ToolManager(); 