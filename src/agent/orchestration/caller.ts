/**
 * Tool Caller
 * 
 * Component này gọi các công cụ với xác thực tham số và cung cấp
 * phản hồi khi có lỗi xác thực để cải thiện độ chính xác.
 */

import { Tool, AgentContext } from '../types';

/**
 * Kết quả xác thực tham số
 */
interface ValidationResult {
  hasErrors: boolean;
  errorMessage: string | null;
  validatedArgs?: any;
}

/**
 * Kết quả gọi công cụ
 */
export interface ToolCallResult {
  success: boolean;
  result?: any;
  validationErrors?: string;
  error?: string;
  toolName: string;
}

/**
 * ToolCaller quản lý việc gọi công cụ với xác thực tham số
 */
export class ToolCaller {
  private tools: Map<string, Tool>;
  private validationAttempts: Map<string, number> = new Map();
  private MAX_VALIDATION_ATTEMPTS = 3;
  
  constructor(tools: Map<string, Tool>) {
    this.tools = tools;
  }
  
  /**
   * Gọi một công cụ với tham số và context
   */
  public async callTool(
    toolName: string, 
    args: any, 
    context: AgentContext
  ): Promise<ToolCallResult> {
    console.log(`[ToolCaller] Gọi công cụ "${toolName}"`);
    
    const tool = this.tools.get(toolName);
    if (!tool) {
      console.error(`[ToolCaller] Công cụ "${toolName}" không tồn tại`);
      return {
        success: false,
        error: `Công cụ "${toolName}" không tồn tại`,
        toolName
      };
    }
    
    // Xác thực tham số trước khi gọi
    const validationResult = this.validateArgs(toolName, args);
    if (validationResult.hasErrors) {
      // Ghi nhận số lần thử xác thực
      const attempts = (this.validationAttempts.get(toolName) || 0) + 1;
      this.validationAttempts.set(toolName, attempts);
      
      console.warn(`[ToolCaller] Lỗi xác thực tham số (lần ${attempts}/${this.MAX_VALIDATION_ATTEMPTS}): ${validationResult.errorMessage}`);
      
      if (attempts >= this.MAX_VALIDATION_ATTEMPTS) {
        console.error(`[ToolCaller] Đã vượt quá số lần thử xác thực cho ${toolName}`);
        this.validationAttempts.delete(toolName);
        
        // Nếu quá số lần thử, sử dụng tham số mặc định
        return {
          success: false,
          validationErrors: `Đã vượt quá số lần thử xác thực (${this.MAX_VALIDATION_ATTEMPTS}). Lỗi cuối cùng: ${validationResult.errorMessage}`,
          toolName
        };
      }
      
      return {
        success: false,
        validationErrors: validationResult.errorMessage || 'Lỗi xác thực không xác định',
        toolName
      };
    }
    
    // Xóa bộ đếm thử xác thực nếu thành công
    this.validationAttempts.delete(toolName);
    
    // Gọi công cụ với tham số đã xác thực
    try {
      console.log(`[ToolCaller] Đang thực thi công cụ "${toolName}" với tham số:`, args);
      const result = await tool.execute(JSON.stringify(args), context);
      
      return {
        success: true,
        result,
        toolName
      };
    } catch (error: any) {
      console.error(`[ToolCaller] Lỗi khi gọi công cụ ${toolName}:`, error);
      return {
        success: false,
        error: error.message || 'Lỗi không xác định khi gọi công cụ',
        toolName
      };
    }
  }
  
  /**
   * Xác thực tham số cho một công cụ
   */
  private validateArgs(toolName: string, args: any): ValidationResult {
    console.log(`[ToolCaller] Xác thực tham số cho "${toolName}":`, args);
    
    // Trong triển khai thực tế, đây sẽ xác thực tham số dựa trên schema
    // Hiện tại chỉ kiểm tra một số quy tắc đơn giản
    
    if (!args) {
      return {
        hasErrors: true,
        errorMessage: 'Tham số không được để trống'
      };
    }
    
    // Kiểm tra cụ thể cho từng công cụ
    switch (toolName) {
      case 'marketDataTool':
        return this.validateMarketDataArgs(args);
      
      case 'technicalAnalysisTool':
        return this.validateTechnicalAnalysisArgs(args);
      
      case 'tradingTool':
        return this.validateTradingArgs(args);
      
      case 'balanceCheckTool':
        return this.validateBalanceCheckArgs(args);
      
      default:
        // Không có xác thực cụ thể, chấp nhận
        return { hasErrors: false, errorMessage: null };
    }
  }
  
  /**
   * Xác thực tham số cho công cụ marketDataTool
   */
  private validateMarketDataArgs(args: any): ValidationResult {
    // Không có yêu cầu đặc biệt, chấp nhận hầu hết các tham số
    return { hasErrors: false, errorMessage: null };
  }
  
  /**
   * Xác thực tham số cho công cụ technicalAnalysisTool
   */
  private validateTechnicalAnalysisArgs(args: any): ValidationResult {
    if (args.symbol) {
      // Đảm bảo symbol là một chuỗi và chuyển đổi sang chữ hoa
      args.symbol = args.symbol.toString().toUpperCase();
      
      // Thêm USDT nếu chưa có đuôi cặp tiền tệ
      if (!args.symbol.includes('USDT') && !args.symbol.includes('/')) {
        args.symbol = `${args.symbol}USDT`;
      }
    } else {
      return {
        hasErrors: true,
        errorMessage: 'Thiếu tham số bắt buộc "symbol" cho phân tích kỹ thuật'
      };
    }
    
    // Xác thực timeframe
    const validTimeframes = ['1m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '12h', '1d', '3d', '1w', '1M'];
    if (args.timeframe && !validTimeframes.includes(args.timeframe)) {
      return {
        hasErrors: true,
        errorMessage: `Timeframe "${args.timeframe}" không hợp lệ. Các giá trị hợp lệ: ${validTimeframes.join(', ')}`
      };
    }
    
    return { 
      hasErrors: false, 
      errorMessage: null,
      validatedArgs: args
    };
  }
  
  /**
   * Xác thực tham số cho công cụ tradingTool
   */
  private validateTradingArgs(args: any): ValidationResult {
    if (!args.tradingIntent) {
      return {
        hasErrors: true,
        errorMessage: 'Thiếu thông tin giao dịch (tradingIntent)'
      };
    }
    
    const { symbol, action, quantity, price, orderType } = args.tradingIntent;
    
    // Kiểm tra symbol
    if (!symbol) {
      return {
        hasErrors: true,
        errorMessage: 'Thiếu tham số bắt buộc "symbol" cho giao dịch'
      };
    }
    
    // Kiểm tra action
    if (!action || !['BUY', 'SELL'].includes(action.toUpperCase())) {
      return {
        hasErrors: true,
        errorMessage: 'Hành động giao dịch (action) phải là "BUY" hoặc "SELL"'
      };
    }
    
    // Kiểm tra orderType
    if (!orderType || !['MARKET', 'LIMIT'].includes(orderType.toUpperCase())) {
      return {
        hasErrors: true,
        errorMessage: 'Loại lệnh (orderType) phải là "MARKET" hoặc "LIMIT"'
      };
    }
    
    // Kiểm tra quantity
    if (!quantity || isNaN(parseFloat(quantity)) || parseFloat(quantity) <= 0) {
      return {
        hasErrors: true,
        errorMessage: 'Số lượng (quantity) phải là số dương'
      };
    }
    
    // Kiểm tra price cho lệnh LIMIT
    if (orderType.toUpperCase() === 'LIMIT' && (!price || isNaN(parseFloat(price)) || parseFloat(price) <= 0)) {
      return {
        hasErrors: true,
        errorMessage: 'Giá (price) phải được cung cấp và là số dương cho lệnh LIMIT'
      };
    }
    
    return { 
      hasErrors: false, 
      errorMessage: null,
      validatedArgs: args
    };
  }
  
  /**
   * Xác thực tham số cho công cụ balanceCheckTool
   */
  private validateBalanceCheckArgs(args: any): ValidationResult {
    // Không có yêu cầu đặc biệt, chấp nhận hầu hết các tham số
    return { hasErrors: false, errorMessage: null };
  }
  
  /**
   * Sửa chữa tham số dựa trên lỗi
   * Hàm này sẽ được cải thiện với LLM trong tương lai
   */
  public async correctArgs(
    toolName: string,
    args: any,
    validationError: string
  ): Promise<any> {
    console.log(`[ToolCaller] Đang sửa chữa tham số cho "${toolName}" dựa trên lỗi: ${validationError}`);
    
    // Logic sửa chữa đơn giản
    // Trong triển khai thực tế, đây sẽ sử dụng LLM để sửa tham số
    
    // Một số sửa chữa cơ bản dựa trên lỗi
    if (validationError.includes('symbol') && toolName === 'technicalAnalysisTool') {
      args.symbol = 'BTCUSDT'; // Giá trị mặc định an toàn
    }
    
    if (validationError.includes('timeframe') && toolName === 'technicalAnalysisTool') {
      args.timeframe = '1h'; // Giá trị mặc định an toàn
    }
    
    if (validationError.includes('tradingIntent') && toolName === 'tradingTool') {
      args.tradingIntent = {
        symbol: 'BTCUSDT',
        action: 'BUY',
        orderType: 'MARKET',
        quantity: '0.001'
      };
    }
    
    return args;
  }
} 