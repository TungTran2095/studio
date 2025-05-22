import { useState, useEffect } from 'react';

// Các từ khóa trigger cho từng loại chức năng
const KEYWORDS = {
  price: ['giá', 'price', 'value', 'bao nhiêu', 'hiện tại'],
  technicalAnalysis: ['phân tích', 'kỹ thuật', 'technical', 'analysis', 'indicator', 'chỉ báo', 'rsi', 'macd', 'ichimoku', 'bollinger'],
  strategy: ['chiến lược', 'strategy', 'trend', 'following', 'momentum', 'mean', 'reversion', 'giao dịch'],
  portfolio: ['danh mục', 'portfolio', 'tối ưu', 'optimize', 'allocation', 'phân bổ'],
  backtest: ['backtest', 'kiểm định', 'test', 'historical', 'lịch sử'],
  signals: ['tín hiệu', 'signal', 'alert', 'cảnh báo', 'vào lệnh', 'thoát lệnh', 'entry', 'exit'],
  market: ['thị trường', 'market', 'trend', 'xu hướng', 'sentiment', 'cảm xúc'],
  trading: ['giao dịch', 'trade', 'mua', 'bán', 'buy', 'sell', 'order', 'lệnh']
};

// Các gợi ý prompt cho từng loại chức năng
const SUGGESTIONS = {
  price: [
    'Giá BTC hiện tại là bao nhiêu?',
    'Giá ETH so với hôm qua thay đổi như thế nào?',
    'So sánh giá BTC và ETH trong tuần qua'
  ],
  technicalAnalysis: [
    'Phân tích kỹ thuật cho BTC',
    'Phân tích Ichimoku Cloud cho ETH',
    'Chỉ báo RSI của BTC hiện tại'
  ],
  strategy: [
    'Tạo chiến lược Trend Following cho BTC',
    'Đề xuất chiến lược giao dịch cho thị trường hiện tại',
    'Chiến lược Mean Reversion có phù hợp với BTC không?'
  ],
  portfolio: [
    'Tối ưu hóa danh mục đầu tư với BTC, ETH và SOL',
    'Phân bổ 1000$ vào các crypto hiện tại',
    'Đánh giá rủi ro danh mục của tôi'
  ],
  backtest: [
    'Backtest chiến lược Moving Average cho BTC',
    'So sánh hiệu suất các chiến lược giao dịch',
    'Backtest với dữ liệu 6 tháng qua'
  ],
  signals: [
    'Có tín hiệu giao dịch nào cho BTC hôm nay không?',
    'Điểm vào tốt nhất cho ETH là khi nào?',
    'Thiết lập stop loss và take profit cho BTC'
  ],
  market: [
    'Xu hướng thị trường crypto hiện tại',
    'Top 5 altcoin tiềm năng nhất',
    'Phân tích on-chain cho BTC'
  ],
  trading: [
    'Mua 0.01 BTC',
    'Bán 50% ETH của tôi',
    'Đặt lệnh limit mua BTC ở giá 60000'
  ]
};

export function usePromptSuggestions(input: string) {
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (!input || input.length < 3) {
      setSuggestions([]);
      return;
    }

    const lowerInput = input.toLowerCase();
    const matchedCategories: string[] = [];

    // Kiểm tra xem input có match với từ khóa nào không
    Object.entries(KEYWORDS).forEach(([category, keywords]) => {
      const hasMatch = keywords.some(keyword => lowerInput.includes(keyword));
      if (hasMatch) {
        matchedCategories.push(category);
      }
    });

    // Nếu có match, lấy gợi ý từ các danh mục đó
    if (matchedCategories.length > 0) {
      const matchedSuggestions: string[] = [];
      matchedCategories.forEach(category => {
        const categorySuggestions = SUGGESTIONS[category as keyof typeof SUGGESTIONS];
        if (categorySuggestions) {
          matchedSuggestions.push(...categorySuggestions);
        }
      });

      // Lấy tối đa 5 gợi ý
      setSuggestions(matchedSuggestions.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [input]);

  return suggestions;
} 