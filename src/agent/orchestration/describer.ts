/**
 * Result Describer
 * 
 * Component này định dạng kết quả của công cụ để hiển thị cho người dùng
 * theo các định dạng khác nhau (markdown, plain text, etc.)
 */

/**
 * Định dạng đầu ra được hỗ trợ
 */
export type OutputFormat = 'markdown' | 'plain' | 'json';

/**
 * ResultDescriber quản lý việc định dạng kết quả của công cụ
 */
export class ResultDescriber {
  /**
   * Định dạng kết quả của công cụ thành chuỗi
   */
  public formatResult(
    toolName: string, 
    result: any, 
    format: OutputFormat = 'markdown'
  ): string {
    console.log(`[ResultDescriber] Định dạng kết quả của công cụ "${toolName}" (${format})`);
    
    // Kiểm tra kết quả hợp lệ
    if (!result) {
      return this.formatError('Không nhận được kết quả từ công cụ', format);
    }
    
    // Kiểm tra lỗi
    if (result.error || !result.success) {
      return this.formatError(result.error || 'Công cụ trả về lỗi', format);
    }
    
    // Định dạng kết quả dựa trên loại công cụ
    switch (toolName) {
      case 'marketDataTool':
        return this.formatMarketData(result, format);
      
      case 'technicalAnalysisTool':
        return this.formatTechnicalAnalysis(result, format);
      
      case 'tradingTool':
        return this.formatTradingResult(result, format);
      
      case 'balanceCheckTool':
        return this.formatBalanceCheck(result, format);
      
      default:
        // Định dạng chung cho các công cụ khác
        return this.formatGeneric(result, format);
    }
  }
  
  /**
   * Định dạng lỗi
   */
  private formatError(errorMessage: string, format: OutputFormat): string {
    switch (format) {
      case 'markdown':
        return `**Lỗi:** ${errorMessage}`;
      
      case 'plain':
        return `Lỗi: ${errorMessage}`;
      
      case 'json':
        return JSON.stringify({ error: errorMessage });
      
      default:
        return errorMessage;
    }
  }
  
  /**
   * Định dạng kết quả dữ liệu thị trường
   */
  private formatMarketData(result: any, format: OutputFormat): string {
    const data = result.data || result;
    
    // Kiểm tra cấu trúc dữ liệu
    if (data.marketData) {
      // Đây là dữ liệu tổng quan thị trường
      return this.formatMarketOverview(data.marketData, format);
    } else if (data.priceData) {
      // Đây là dữ liệu giá của một mã tiền cụ thể
      return this.formatPriceData(data.priceData, format);
    }
    
    // Định dạng chung
    return this.formatGeneric(data, format);
  }
  
  /**
   * Định dạng tổng quan thị trường
   */
  private formatMarketOverview(marketData: any, format: OutputFormat): string {
    if (format === 'json') {
      return JSON.stringify(marketData, null, 2);
    }
    
    if (!marketData || typeof marketData !== 'string') {
      return 'Không có dữ liệu thị trường';
    }
    
    if (format === 'markdown') {
      return `## Tổng quan thị trường\n\n${marketData}`;
    } else {
      return `Tổng quan thị trường:\n${marketData}`;
    }
  }
  
  /**
   * Định dạng dữ liệu giá
   */
  private formatPriceData(priceData: any, format: OutputFormat): string {
    if (format === 'json') {
      return JSON.stringify(priceData, null, 2);
    }
    
    if (!priceData || !priceData.symbol) {
      return 'Không có dữ liệu giá';
    }
    
    const { symbol, price, change24h } = priceData;
    const changeText = change24h >= 0 ? `+${change24h}%` : `${change24h}%`;
    const changeEmoji = change24h >= 0 ? '📈' : '📉';
    
    if (format === 'markdown') {
      return `## Giá ${symbol}\n\n**Giá hiện tại:** $${price}\n**Thay đổi 24h:** ${changeText} ${changeEmoji}`;
    } else {
      return `Giá ${symbol}:\nGiá hiện tại: $${price}\nThay đổi 24h: ${changeText}`;
    }
  }
  
  /**
   * Định dạng kết quả phân tích kỹ thuật
   */
  private formatTechnicalAnalysis(result: any, format: OutputFormat): string {
    const data = result.data || result;
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    if (!data || !data.indicators) {
      return 'Không có dữ liệu phân tích kỹ thuật';
    }
    
    const { symbol, timeframe, indicators, summary } = data;
    
    // Định dạng Ichimoku Cloud nếu có
    let ichimokuText = '';
    if (indicators.ichimokuCloud) {
      const ic = indicators.ichimokuCloud;
      ichimokuText = format === 'markdown' 
        ? `\n\n### Ichimoku Cloud\n\n- Tenkan-sen: ${ic.tenkanSen}\n- Kijun-sen: ${ic.kijunSen}\n- Senkou Span A: ${ic.senkouSpanA}\n- Senkou Span B: ${ic.senkouSpanB}\n- Chikou Span: ${ic.chikouSpan}\n- Tín hiệu: ${ic.signal}\n- Phân tích: ${ic.analysis}`
        : `\n\nIchimoku Cloud:\n- Tenkan-sen: ${ic.tenkanSen}\n- Kijun-sen: ${ic.kijunSen}\n- Senkou Span A: ${ic.senkouSpanA}\n- Senkou Span B: ${ic.senkouSpanB}\n- Chikou Span: ${ic.chikouSpan}\n- Tín hiệu: ${ic.signal}\n- Phân tích: ${ic.analysis}`;
    }
    
    // Định dạng RSI nếu có
    let rsiText = '';
    if (indicators.RSI) {
      const rsiValue = indicators.RSI;
      let rsiSignal = 'Trung tính';
      if (rsiValue > 70) rsiSignal = 'Quá mua';
      else if (rsiValue < 30) rsiSignal = 'Quá bán';
      
      rsiText = format === 'markdown'
        ? `\n\n### RSI\n\n- Giá trị: ${rsiValue}\n- Tín hiệu: ${rsiSignal}`
        : `\n\nRSI:\n- Giá trị: ${rsiValue}\n- Tín hiệu: ${rsiSignal}`;
    }
    
    // Định dạng MACD nếu có
    let macdText = '';
    if (indicators.MACD) {
      const macd = indicators.MACD;
      const signal = macd.histogram > 0 ? 'Tín hiệu tăng' : 'Tín hiệu giảm';
      
      macdText = format === 'markdown'
        ? `\n\n### MACD\n\n- Đường MACD: ${macd.MACD}\n- Đường tín hiệu: ${macd.signal}\n- Histogram: ${macd.histogram}\n- Tín hiệu: ${signal}`
        : `\n\nMACD:\n- Đường MACD: ${macd.MACD}\n- Đường tín hiệu: ${macd.signal}\n- Histogram: ${macd.histogram}\n- Tín hiệu: ${signal}`;
    }
    
    // Định dạng trung bình động nếu có
    let maText = '';
    if (indicators.MA50 || indicators.ma50) {
      const ma50 = indicators.MA50 || indicators.ma50;
      const ma200 = indicators.MA200 || indicators.ma200;
      const currentPrice = indicators.currentPrice;
      
      let signal = 'Trung tính';
      if (currentPrice > ma50 && ma50 > ma200) {
        signal = 'Xu hướng tăng mạnh';
      } else if (currentPrice > ma50) {
        signal = 'Xu hướng tăng ngắn hạn';
      } else if (currentPrice < ma50 && ma50 < ma200) {
        signal = 'Xu hướng giảm mạnh';
      } else if (currentPrice < ma50) {
        signal = 'Xu hướng giảm ngắn hạn';
      }
      
      maText = format === 'markdown'
        ? `\n\n### Trung bình động\n\n- MA50: ${ma50}\n- MA200: ${ma200}\n- Giá hiện tại: ${currentPrice}\n- Tín hiệu: ${signal}`
        : `\n\nTrung bình động:\n- MA50: ${ma50}\n- MA200: ${ma200}\n- Giá hiện tại: ${currentPrice}\n- Tín hiệu: ${signal}`;
    }
    
    // Định dạng kết quả chung
    if (format === 'markdown') {
      return `## Phân tích kỹ thuật ${symbol} (${timeframe})\n\n${summary || ''}${ichimokuText}${rsiText}${macdText}${maText}`;
    } else {
      return `Phân tích kỹ thuật ${symbol} (${timeframe}):\n${summary || ''}${ichimokuText}${rsiText}${macdText}${maText}`;
    }
  }
  
  /**
   * Định dạng kết quả giao dịch
   */
  private formatTradingResult(result: any, format: OutputFormat): string {
    const data = result.data || result;
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    if (!data) {
      return 'Không có dữ liệu giao dịch';
    }
    
    if (data.orderResult) {
      // Kết quả đặt lệnh
      const { symbol, side, type, quantity, price, orderId, status } = data.orderResult;
      
      if (format === 'markdown') {
        return `## Đặt lệnh thành công\n\n- Symbol: ${symbol}\n- Loại: ${type}\n- Hướng: ${side}\n- Số lượng: ${quantity}\n- Giá: ${price || 'Thị trường'}\n- ID lệnh: ${orderId}\n- Trạng thái: ${status}`;
      } else {
        return `Đặt lệnh thành công:\n- Symbol: ${symbol}\n- Loại: ${type}\n- Hướng: ${side}\n- Số lượng: ${quantity}\n- Giá: ${price || 'Thị trường'}\n- ID lệnh: ${orderId}\n- Trạng thái: ${status}`;
      }
    }
    
    // Định dạng chung
    return this.formatGeneric(data, format);
  }
  
  /**
   * Định dạng kết quả kiểm tra số dư
   */
  private formatBalanceCheck(result: any, format: OutputFormat): string {
    const data = result.data || result;
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    if (!data || !data.balances) {
      return 'Không có dữ liệu số dư';
    }
    
    const { balances, totalValue } = data;
    
    // Danh sách các số dư
    let balanceItems = '';
    for (const [asset, info] of Object.entries(balances)) {
      const { free, locked, usdValue } = info as any;
      
      if (format === 'markdown') {
        balanceItems += `- **${asset}**: ${free} (có thể giao dịch), ${locked} (đang khóa), ~$${usdValue}\n`;
      } else {
        balanceItems += `- ${asset}: ${free} (có thể giao dịch), ${locked} (đang khóa), ~$${usdValue}\n`;
      }
    }
    
    if (format === 'markdown') {
      return `## Số dư tài khoản\n\n${balanceItems}\n**Tổng giá trị**: ~$${totalValue}`;
    } else {
      return `Số dư tài khoản:\n${balanceItems}\nTổng giá trị: ~$${totalValue}`;
    }
  }
  
  /**
   * Định dạng kết quả chung
   */
  private formatGeneric(data: any, format: OutputFormat): string {
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    }
    
    if (typeof data === 'string') {
      return data;
    }
    
    // Cố gắng định dạng dữ liệu thành văn bản có ý nghĩa
    let result = '';
    
    if (Array.isArray(data)) {
      for (const item of data) {
        result += `- ${this.formatSimpleValue(item)}\n`;
      }
    } else if (typeof data === 'object' && data !== null) {
      for (const [key, value] of Object.entries(data)) {
        const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1');
        result += `${formattedKey}: ${this.formatSimpleValue(value)}\n`;
      }
    } else {
      result = this.formatSimpleValue(data);
    }
    
    return result;
  }
  
  /**
   * Định dạng giá trị đơn giản
   */
  private formatSimpleValue(value: any): string {
    if (value === null || value === undefined) {
      return 'Không có dữ liệu';
    }
    
    if (typeof value === 'object') {
      return JSON.stringify(value);
    }
    
    return String(value);
  }
} 