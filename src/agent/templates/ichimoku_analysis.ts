import { TemplateInput } from './index';

/**
 * Template phản hồi cho phân tích Ichimoku
 */
export function renderIchimokuAnalysisTemplate(input: TemplateInput): string {
  const { entities, toolResults } = input;
  
  // Xác định symbol cần phân tích, mặc định là BTC
  const symbol = entities?.symbol || entities?.ichimoku?.symbol || 'BTC';
  
  // Tạo phản hồi
  let response = `## Phân tích Ichimoku cho ${symbol}\n\n`;
  
  // Thêm thông tin giá nếu có
  if (toolResults.marketDataTool?.success) {
    const priceData = toolResults.marketDataTool.priceData || toolResults.marketDataTool.data;
    if (priceData?.price) {
      response += `**Giá hiện tại**: $${formatNumber(priceData.price)}\n`;
      
      if (priceData.change24h) {
        const changePrefix = parseFloat(priceData.change24h) >= 0 ? '+' : '';
        response += `**Thay đổi 24h**: ${changePrefix}${priceData.change24h}%\n`;
      }
      
      response += '\n';
    }
  }
  
  // Thêm phân tích kỹ thuật nếu có
  if (toolResults.technicalAnalysisTool?.success) {
    const data = toolResults.technicalAnalysisTool.data;
    
    // Thêm Ichimoku Cloud nếu có
    if (data.indicators?.ichimokuCloud) {
      const ichimoku = data.indicators.ichimokuCloud;
      
      // Kiểm tra nếu có lỗi
      if (ichimoku.error) {
        response += `⚠️ **Lỗi khi tính toán Ichimoku**: ${ichimoku.error}\n\n`;
        response += `*Vui lòng thử lại sau hoặc thử với cặp tiền tệ khác.*\n`;
      } else {
        // Hiển thị các thành phần Ichimoku
        response += `### Các thành phần Ichimoku Cloud\n\n`;
        response += `**Tenkan-sen (Đường chuyển đổi)**: $${formatNumber(ichimoku.tenkanSen)}\n`;
        response += `**Kijun-sen (Đường cơ sở)**: $${formatNumber(ichimoku.kijunSen)}\n`;
        response += `**Senkou Span A (Đường dẫn đầu A)**: $${formatNumber(ichimoku.senkouSpanA)}\n`;
        response += `**Senkou Span B (Đường dẫn đầu B)**: $${formatNumber(ichimoku.senkouSpanB)}\n`;
        response += `**Chikou Span (Đường trễ)**: $${formatNumber(ichimoku.chikouSpan)}\n\n`;
        
        // Hiển thị phân tích
        response += `### Phân tích\n\n`;
        response += `${ichimoku.analysis || 'Không có phân tích chi tiết.'}\n\n`;
        
        // Hiển thị tín hiệu
        const signalText = translateSignal(ichimoku.signal || 'NEUTRAL');
        response += `**Tín hiệu**: ${signalText} (Độ tin cậy: ${ichimoku.strength || 0}/5)\n`;
      }
    } else {
      response += `*Không có dữ liệu Ichimoku. Đang thu thập thêm thông tin...*\n`;
    }
  } else if (toolResults.technicalAnalysisTool?.error) {
    response += `⚠️ **Lỗi khi phân tích kỹ thuật**: ${toolResults.technicalAnalysisTool.error}\n`;
  } else {
    response += `*Đang phân tích dữ liệu Ichimoku, vui lòng chờ trong giây lát...*\n`;
  }
  
  return response;
}

/**
 * Định dạng số với dấu phân cách hàng nghìn
 */
function formatNumber(value: any, decimals: number = 2): string {
  if (typeof value !== 'number') {
    value = parseFloat(value);
  }
  
  if (isNaN(value)) {
    return 'N/A';
  }
  
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

/**
 * Dịch tín hiệu sang tiếng Việt
 */
function translateSignal(signal: string): string {
  switch (signal.toUpperCase()) {
    case 'BUY':
      return 'MUA';
    case 'SELL':
      return 'BÁN';
    case 'NEUTRAL':
      return 'TRUNG LẬP';
    default:
      return signal;
  }
} 