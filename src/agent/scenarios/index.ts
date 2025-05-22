import { Scenario } from '../types';

/**
 * Danh sách các kịch bản cho AI Agent
 */
export const scenarios: Scenario[] = [
  // Kịch bản chat tổng quát
  {
    id: 'general_chat',
    name: 'Trò chuyện tổng quát',
    description: 'Xử lý các cuộc trò chuyện tổng quát không thuộc các kịch bản khác',
    triggers: [
      'xin chào',
      'chào bạn',
      'help',
      'giúp đỡ',
      'làm được gì',
      'chức năng',
      'ai là',
      'bạn là',
      'kể cho'
    ],
    requiredEntities: [],
    requiredTools: ['marketDataTool'],
    responseTemplate: `Xin chào! Tôi là Yinsen, trợ lý giao dịch tiền điện tử bằng tiếng Việt. 
    
    {{#if toolResults.marketDataTool.success}}
    Tình hình thị trường hiện tại:
    {{toolResults.marketDataTool.marketData}}
    {{/if}}
    
    Tôi có thể giúp bạn:
    - Kiểm tra số dư tài khoản Binance
    - Xem giá cả tiền điện tử
    - Thực hiện phân tích kỹ thuật
    - Đặt lệnh giao dịch
    - Tối ưu hóa danh mục đầu tư
    - Chạy backtesting các chiến lược
    
    Bạn cần tôi giúp gì không?`,
    examples: [
      {
        input: 'Xin chào',
        output: 'Xin chào! Tôi là Yinsen, trợ lý giao dịch tiền điện tử bằng tiếng Việt. Tôi có thể giúp bạn kiểm tra số dư, xem giá, phân tích kỹ thuật và thực hiện giao dịch. Hôm nay bạn cần tôi giúp gì?'
      },
      {
        input: 'Bạn có thể làm gì?',
        output: 'Tôi có thể giúp bạn: \n- Kiểm tra số dư tài khoản Binance\n- Xem giá cả tiền điện tử\n- Thực hiện phân tích kỹ thuật\n- Đặt lệnh giao dịch\n- Tối ưu hóa danh mục đầu tư\n- Chạy backtesting các chiến lược\n\nBạn muốn tôi giúp việc gì?'
      }
    ]
  },
  
  // Kịch bản truy vấn số dư
  {
    id: 'balance_inquiry',
    name: 'Truy vấn số dư',
    description: 'Xử lý các yêu cầu kiểm tra số dư tài khoản',
    triggers: [
      'số dư',
      'tài sản',
      'có bao nhiêu',
      'có gì',
      'hiện có',
      'kiểm tra',
      'balance',
      'báo cáo'
    ],
    requiredEntities: [],
    requiredTools: ['balanceCheckTool'],
    responseTemplate: `{{#if toolResults.balanceCheckTool.success}}
    {{toolResults.balanceCheckTool.message}}
    {{else}}
    Tôi không thể kiểm tra số dư tài khoản của bạn. Lỗi: {{toolResults.balanceCheckTool.error}}
    {{/if}}`,
    examples: [
      {
        input: 'Tôi có bao nhiêu Bitcoin?',
        output: 'Bạn hiện có 0.5 BTC, tương đương $20,125.50.'
      },
      {
        input: 'Kiểm tra số dư tài khoản giúp tôi',
        output: 'Tổng giá trị tài sản: $45,678.90. Bạn có 12 loại tài sản khác nhau. Top 5 tài sản giá trị nhất: BTC (0.5), ETH (3.2), BNB (15), ADA (2000), SOL (25).'
      },
      {
        input: 'Tôi đang có những tài sản nào?',
        output: 'Tổng giá trị tài sản: $45,678.90. Bạn có 12 loại tài sản khác nhau. Top 5 tài sản giá trị nhất: BTC (0.5), ETH (3.2), BNB (15), ADA (2000), SOL (25).'
      }
    ]
  },
  
  // Kịch bản giao dịch
  {
    id: 'trading',
    name: 'Giao dịch',
    description: 'Xử lý các yêu cầu giao dịch tiền điện tử',
    triggers: [
      'mua',
      'bán',
      'giao dịch',
      'đặt lệnh',
      'trade',
      'buy',
      'sell',
      'order'
    ],
    requiredEntities: ['tradingIntent'],
    requiredTools: ['tradingTool', 'marketDataTool'],
    responseTemplate: `{{#if toolResults.marketDataTool.success}}
    Giá {{entities.tradingIntent.symbol}} hiện tại: {{toolResults.marketDataTool.priceData.price}}
    {{/if}}
    
    {{#if toolResults.tradingTool.success}}
    {{toolResults.tradingTool.message}}
    {{else}}
    Không thể thực hiện giao dịch: {{toolResults.tradingTool.error}}
    {{/if}}`,
    examples: [
      {
        input: 'Mua 0.1 BTC',
        output: 'Giá BTC hiện tại: $40,251.00\n\nĐã đặt lệnh mua 0.1 BTC thành công. Chi tiết giao dịch:\n- Mã lệnh: 123456\n- Giá thực hiện: $40,250.25\n- Tổng giá trị: $4,025.03'
      },
      {
        input: 'Bán 50% số ETH tôi đang có',
        output: 'Giá ETH hiện tại: $2,351.75\n\nĐã đặt lệnh bán 1.6 ETH (50% số dư hiện tại) thành công. Chi tiết giao dịch:\n- Mã lệnh: 123457\n- Giá thực hiện: $2,350.50\n- Tổng giá trị: $3,760.80'
      }
    ]
  },
  
  // Kịch bản phân tích thị trường
  {
    id: 'market_analysis',
    name: 'Phân tích thị trường',
    description: 'Xử lý các yêu cầu phân tích thị trường tiền điện tử',
    triggers: [
      'phân tích',
      'nhận định',
      'thị trường',
      'giá',
      'dự đoán',
      'xu hướng',
      'analysis',
      'trend',
      'ichimoku'
    ],
    requiredEntities: [],
    requiredTools: ['marketDataTool', 'technicalAnalysisTool'],
    responseTemplate: `{{#if entities.symbol}}
    ## Phân tích {{entities.symbol}}
    
    {{#if toolResults.marketDataTool.success}}
    **Giá hiện tại**: {{toolResults.marketDataTool.priceData.price}}
    **Thay đổi 24h**: {{toolResults.marketDataTool.priceData.change24h}}
    {{/if}}
    
    {{#if toolResults.technicalAnalysisTool.success}}
    **Phân tích kỹ thuật**:
    {{toolResults.technicalAnalysisTool.data.summary}}
    
    {{#if toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud}}
    ## Phân tích Ichimoku Cloud
    
    {{#if toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.error}}
    Không thể tính toán Ichimoku: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.error}}
    {{else}}
    **Tenkan-sen (Đường chuyển đổi)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.tenkanSen 2}}
    **Kijun-sen (Đường cơ sở)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.kijunSen 2}}
    **Senkou Span A (Đường dẫn đầu A)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.senkouSpanA 2}}
    **Senkou Span B (Đường dẫn đầu B)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.senkouSpanB 2}}
    **Chikou Span (Đường trễ)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.chikouSpan 2}}
    
    **Nhận định**: 
    {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.analysis}}
    
    **Tín hiệu**: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.signal}} (Độ tin cậy: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.strength}}/5)
    {{/if}}
    {{/if}}
    
    {{/if}}
    {{else}}
    ## Tổng quan thị trường
    
    {{#if toolResults.marketDataTool.success}}
    {{toolResults.marketDataTool.marketData}}
    {{/if}}
    {{/if}}`,
    examples: [
      {
        input: 'Phân tích BTC',
        output: '## Phân tích BTC\n\n**Giá hiện tại**: $40,251.00\n**Thay đổi 24h**: +2.5%\n\n**Phân tích kỹ thuật**:\nXu hướng giá: Tăng nhẹ. RSI: 58.5 (Trung tính). MACD: Tín hiệu mua yếu. Bollinger Bands: Biến động thấp. MA(50): Đang tăng.'
      },
      {
        input: 'Phân tích Ichimoku cho BTC',
        output: '## Phân tích BTC\n\n**Giá hiện tại**: $40,251.00\n**Thay đổi 24h**: +2.5%\n\n**Phân tích kỹ thuật**:\nXu hướng giá: Tăng nhẹ. RSI: 58.5 (Trung tính).\n\n## Phân tích Ichimoku Cloud\n\n**Tenkan-sen (Đường chuyển đổi)**: 40,150.25\n**Kijun-sen (Đường cơ sở)**: 39,875.50\n**Senkou Span A (Đường dẫn đầu A)**: 40,012.88\n**Senkou Span B (Đường dẫn đầu B)**: 38,950.75\n**Chikou Span (Đường trễ)**: 40,251.00\n\n**Nhận định**: Giá đang nằm trên mây Kumo (tín hiệu tăng). Tenkan-sen nằm trên Kijun-sen (tín hiệu tăng). Senkou Span A nằm trên Senkou Span B (mây tăng giá).\n\n**Tín hiệu**: BUY (Độ tin cậy: 3/5)'
      },
      {
        input: 'Thị trường hôm nay thế nào?',
        output: '## Tổng quan thị trường\n\nTổng vốn hóa: $1.84T (+1.2% trong 24h)\nVolume giao dịch: $75.2B (+5.4% trong 24h)\nChỉ số thống trị BTC: 48.2%\n\nTop tăng giá: SOL (+8.2%), ADA (+5.3%), DOT (+4.7%)\nTop giảm giá: XRP (-2.1%), DOGE (-1.5%), LTC (-0.8%)\n\nTâm lý thị trường: Tích cực nhẹ (62/100)'
      }
    ]
  },
  
  // Thêm kịch bản phân tích Ichimoku chuyên biệt
  {
    id: 'ichimoku_analysis',
    name: 'Phân tích Ichimoku',
    description: 'Xử lý các yêu cầu phân tích Ichimoku Cloud',
    triggers: [
      'ichimoku',
      'cloud',
      'đám mây',
      'tenkan',
      'kijun',
      'chikou'
    ],
    requiredEntities: [],
    requiredTools: ['marketDataTool', 'technicalAnalysisTool'],
    responseTemplate: `## Phân tích Ichimoku cho {{entities.symbol || 'BTC'}}
    
    {{#if toolResults.marketDataTool.success}}
    **Giá hiện tại**: {{toolResults.marketDataTool.priceData.price}}
    **Thay đổi 24h**: {{toolResults.marketDataTool.priceData.change24h}}
    {{else}}
    *Đang lấy thông tin giá hiện tại...*
    {{/if}}
    
    {{#if toolResults.technicalAnalysisTool.success}}
    {{#if toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud}}
    {{#if toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.error}}
    ⚠️ **Lỗi khi tính toán Ichimoku**: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.error}}

    *Vui lòng thử lại sau hoặc thử với cặp tiền tệ khác. Hệ thống đang liên tục cải thiện kết nối dữ liệu.*
    {{else}}
    **Các thành phần Ichimoku Cloud:**
    
    **Tenkan-sen (Đường chuyển đổi, 9 nến)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.tenkanSen 2}}
    **Kijun-sen (Đường cơ sở, 26 nến)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.kijunSen 2}}
    **Senkou Span A (Đường dẫn đầu A)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.senkouSpanA 2}}
    **Senkou Span B (Đường dẫn đầu B, 52 nến)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.senkouSpanB 2}}
    **Chikou Span (Đường trễ, 26 nến)**: {{formatNumber toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.chikouSpan 2}}
    
    **Phân tích chi tiết:**
    
    {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.analysis}}
    
    **Tín hiệu mua/bán**: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.signal}} (Độ tin cậy: {{toolResults.technicalAnalysisTool.data.indicators.ichimokuCloud.strength}}/5)
    {{/if}}
    {{else}}
    **⌛ Đang phân tích dữ liệu Ichimoku...**

    Hệ thống đang tính toán chỉ báo Ichimoku. Vui lòng thử lại sau vài giây.
    {{/if}}
    {{else}}
    ❌ **Không thể lấy dữ liệu phân tích kỹ thuật**

    Lỗi: {{toolResults.technicalAnalysisTool.error}}

    Hệ thống đang gặp vấn đề khi kết nối với nguồn dữ liệu thị trường. Vui lòng thử lại sau.
    {{/if}}`,
    examples: [
      {
        input: 'Phân tích ichimoku cho BTC',
        output: '## Phân tích Ichimoku cho BTC\n\n**Giá hiện tại**: $40,251.00\n**Thay đổi 24h**: +2.5%\n\n**Các thành phần Ichimoku Cloud:**\n\n**Tenkan-sen (Đường chuyển đổi, 9 nến)**: 40,150.25\n**Kijun-sen (Đường cơ sở, 26 nến)**: 39,875.50\n**Senkou Span A (Đường dẫn đầu A)**: 40,012.88\n**Senkou Span B (Đường dẫn đầu B, 52 nến)**: 38,950.75\n**Chikou Span (Đường trễ, 26 nến)**: 40,251.00\n\n**Phân tích chi tiết:**\n\nGiá đang nằm trên mây Kumo (tín hiệu tăng). Tenkan-sen nằm trên Kijun-sen (tín hiệu tăng). Senkou Span A nằm trên Senkou Span B (mây tăng giá).\n\n**Tín hiệu mua/bán**: BUY (Độ tin cậy: 3/5)'
      },
      {
        input: 'Ichimoku ETH theo khung 1h',
        output: '## Phân tích Ichimoku cho ETH\n\n**Giá hiện tại**: $2,351.75\n**Thay đổi 24h**: +1.8%\n\n**Các thành phần Ichimoku Cloud:**\n\n**Tenkan-sen (Đường chuyển đổi, 9 nến)**: 2,345.50\n**Kijun-sen (Đường cơ sở, 26 nến)**: 2,330.25\n**Senkou Span A (Đường dẫn đầu A)**: 2,337.88\n**Senkou Span B (Đường dẫn đầu B, 52 nến)**: 2,315.40\n**Chikou Span (Đường trễ, 26 nến)**: 2,351.75\n\n**Phân tích chi tiết:**\n\nGiá đang nằm trên mây Kumo (tín hiệu tăng). Tenkan-sen nằm trên Kijun-sen (tín hiệu tăng). Giao cắt tăng giá gần đây giữa Tenkan-sen và Kijun-sen.\n\n**Tín hiệu mua/bán**: BUY (Độ tin cậy: 4/5)'
      },
      {
        input: 'Xem ichimoku theo timeframe 1h',
        output: '## Phân tích Ichimoku cho BTC\n\n**Giá hiện tại**: $40,251.00\n**Thay đổi 24h**: +2.5%\n\n**Các thành phần Ichimoku Cloud:**\n\n**Tenkan-sen (Đường chuyển đổi, 9 nến)**: 40,150.25\n**Kijun-sen (Đường cơ sở, 26 nến)**: 39,875.50\n**Senkou Span A (Đường dẫn đầu A)**: 40,012.88\n**Senkou Span B (Đường dẫn đầu B, 52 nến)**: 38,950.75\n**Chikou Span (Đường trễ, 26 nến)**: 40,251.00\n\n**Phân tích chi tiết:**\n\nGiá đang nằm trên mây Kumo (tín hiệu tăng). Tenkan-sen nằm trên Kijun-sen (tín hiệu tăng). Senkou Span A nằm trên Senkou Span B (mây tăng giá).\n\n**Tín hiệu mua/bán**: BUY (Độ tin cậy: 3/5)'
      }
    ]
  }
];

/**
 * Hàm lấy tất cả kịch bản
 */
export function getAllScenarios(): Scenario[] {
  return scenarios;
}

/**
 * Hàm lấy kịch bản theo ID
 */
export function getScenarioById(id: string): Scenario | undefined {
  return scenarios.find(scenario => scenario.id === id);
}

/**
 * Hàm lấy các kịch bản dựa trên từ khóa kích hoạt
 */
export function getScenariosByTrigger(message: string): Scenario[] {
  const normalizedMessage = message.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  return scenarios.filter(scenario => 
    scenario.triggers.some(trigger => 
      normalizedMessage.includes(trigger.toLowerCase())
    )
  );
} 