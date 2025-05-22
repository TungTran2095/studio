/**
 * Tool Selector
 * 
 * Component này chọn các công cụ phù hợp với yêu cầu của người dùng,
 * giảm thiểu vấn đề hallucination khi có quá nhiều công cụ.
 */

import { Tool } from '../types';

/**
 * Kết quả chọn công cụ
 */
export interface ToolSelectionResult {
  tools: string[];
  reasons: Record<string, string>;
}

/**
 * ToolSelector quản lý việc chọn công cụ phù hợp cho một truy vấn
 */
export class ToolSelector {
  private tools: Map<string, Tool>;
  
  constructor(tools: Map<string, Tool>) {
    this.tools = tools;
  }
  
  /**
   * Chọn các công cụ phù hợp dựa trên truy vấn của người dùng
   */
  public async selectCandidateTools(userQuery: string): Promise<ToolSelectionResult> {
    console.log(`[ToolSelector] Đang phân tích truy vấn: "${userQuery}"`);
    
    // Truy vấn ngắn gọn để LLM phân tích
    const toolNames = Array.from(this.tools.keys());
    
    // Đơn giản hóa trong demo: phân tích truy vấn bằng các từ khóa
    const result: ToolSelectionResult = {
      tools: [],
      reasons: {}
    };
    
    // Phân tích dựa trên từ khóa
    const lowerQuery = userQuery.toLowerCase();
    
    // Chọn marketDataTool nếu truy vấn liên quan đến giá, thị trường
    if (
      lowerQuery.includes('giá') || 
      lowerQuery.includes('thị trường') || 
      lowerQuery.includes('giá trị')
    ) {
      const toolName = 'marketDataTool';
      if (this.tools.has(toolName)) {
        result.tools.push(toolName);
        result.reasons[toolName] = 'Truy vấn liên quan đến thông tin giá/thị trường';
      }
    }
    
    // Chọn technicalAnalysisTool nếu truy vấn liên quan đến phân tích kỹ thuật
    if (
      lowerQuery.includes('phân tích') || 
      lowerQuery.includes('chỉ báo') || 
      lowerQuery.includes('rsi') || 
      lowerQuery.includes('macd') || 
      lowerQuery.includes('ma') || 
      lowerQuery.includes('trung bình động') ||
      lowerQuery.includes('ichimoku')
    ) {
      const toolName = 'technicalAnalysisTool';
      if (this.tools.has(toolName)) {
        result.tools.push(toolName);
        result.reasons[toolName] = 'Truy vấn liên quan đến phân tích kỹ thuật';
      }
    }
    
    // Chọn balanceCheckTool nếu truy vấn liên quan đến số dư
    if (
      lowerQuery.includes('số dư') || 
      lowerQuery.includes('tài khoản') || 
      lowerQuery.includes('ví')
    ) {
      const toolName = 'balanceCheckTool';
      if (this.tools.has(toolName)) {
        result.tools.push(toolName);
        result.reasons[toolName] = 'Truy vấn liên quan đến số dư tài khoản';
      }
    }
    
    // Chọn tradingTool nếu truy vấn liên quan đến giao dịch
    if (
      lowerQuery.includes('mua') || 
      lowerQuery.includes('bán') || 
      lowerQuery.includes('đặt lệnh') || 
      lowerQuery.includes('giao dịch') ||
      lowerQuery.includes('trade')
    ) {
      const toolName = 'tradingTool';
      if (this.tools.has(toolName)) {
        result.tools.push(toolName);
        result.reasons[toolName] = 'Truy vấn liên quan đến giao dịch';
      }
    }
    
    // Nếu không có công cụ nào được chọn, sử dụng marketDataTool làm mặc định
    if (result.tools.length === 0 && this.tools.has('marketDataTool')) {
      result.tools.push('marketDataTool');
      result.reasons['marketDataTool'] = 'Công cụ mặc định cung cấp thông tin thị trường';
    }
    
    console.log(`[ToolSelector] Đã chọn ${result.tools.length} công cụ: ${result.tools.join(', ')}`);
    return result;
  }
  
  /**
   * Hàm này sẽ được nâng cấp để sử dụng LLM để chọn công cụ
   */
  public async selectWithLLM(userQuery: string): Promise<ToolSelectionResult> {
    // Trong triển khai thực tế, đây sẽ gọi đến LLM để phân tích
    
    // Mẫu prompt sẽ sử dụng:
    const prompt = `
      Dựa trên yêu cầu của người dùng: "${userQuery}"
      Chọn các công cụ phù hợp nhất từ danh sách sau:
      ${this.formatToolsForPrompt()}
      
      Chỉ chọn các công cụ cần thiết. Với mỗi công cụ được chọn, giải thích ngắn gọn lý do.
    `;
    
    console.log(`[ToolSelector] LLM selection sẽ được triển khai trong phiên bản tiếp theo`);
    
    // Tạm thời sử dụng phương pháp từ khóa
    return this.selectCandidateTools(userQuery);
  }
  
  /**
   * Định dạng danh sách công cụ cho prompt
   */
  private formatToolsForPrompt(): string {
    let result = '';
    this.tools.forEach((tool, name) => {
      result += `- ${name}: ${tool.description}\n`;
    });
    return result;
  }
}

/**
 * Phân tích phản hồi từ LLM để lấy danh sách công cụ và lý do
 * Hàm này sẽ được triển khai đầy đủ khi có LLM integration
 */
function parseToolSelectionFromLLM(llmResponse: string): ToolSelectionResult {
  // Phân tích phản hồi LLM
  // Trong triển khai thực tế, đây sẽ phân tích phản hồi text từ LLM
  
  return {
    tools: [],
    reasons: {}
  };
} 