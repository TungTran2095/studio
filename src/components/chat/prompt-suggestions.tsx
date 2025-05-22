"use client";

import { FC, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Lightbulb } from "lucide-react";

interface PromptSuggestionsProps {
  onSelectPrompt: (prompt: string) => void;
  isVisible: boolean;
}

// Danh sách các gợi ý prompt cho từng chức năng
const PROMPT_CATEGORIES = [
  {
    name: "Phân tích thị trường và giá cả",
    prompts: [
      "Giá BTC hiện tại là bao nhiêu?",
      "Phân tích kỹ thuật cho ETH trong 24h qua",
      "So sánh biểu đồ giá BTC và ETH",
      "Xu hướng thị trường crypto hôm nay như thế nào?",
      "Phân tích Ichimoku Cloud cho BTC"
    ]
  },
  {
    name: "Phân tích kỹ thuật",
    prompts: [
      "Phân tích RSI cho BTC",
      "Chỉ báo MACD của ETH hiện tại",
      "Đường Bollinger Bands của SOL cho thấy gì?",
      "Phân tích Ichimoku Cloud cho BNB",
      "Volume profile của BTC trong tuần qua"
    ]
  },
  {
    name: "Chiến lược giao dịch",
    prompts: [
      "Tạo chiến lược Trend Following cho BTC",
      "Đề xuất chiến lược Momentum cho ETH",
      "Chiến lược Mean Reversion có phù hợp với thị trường hiện tại không?",
      "Backtest chiến lược SMA crossover cho BTC",
      "Tối ưu hóa tham số cho chiến lược RSI"
    ]
  },
  {
    name: "Tối ưu hóa danh mục",
    prompts: [
      "Tối ưu hóa danh mục đầu tư với BTC, ETH và SOL",
      "Phân bổ danh mục đầu tư 1000$ với mức độ rủi ro trung bình",
      "Chiến lược đa dạng hóa danh mục trong thị trường giảm giá",
      "Tỷ lệ phân bổ tối ưu giữa BTC và Stablecoin",
      "Đánh giá rủi ro danh mục hiện tại của tôi"
    ]
  },
  {
    name: "Backtest chiến lược",
    prompts: [
      "Backtest chiến lược Moving Average cho BTC trong 3 tháng qua",
      "So sánh hiệu suất của RSI và MACD trên ETH",
      "Backtest chiến lược Bollinger Bands cho SOL",
      "Chiến lược nào hiệu quả nhất cho BTC trong thị trường giảm giá?",
      "Tối ưu hóa tham số cho backtest"
    ]
  },
  {
    name: "Tín hiệu giao dịch",
    prompts: [
      "Có tín hiệu giao dịch nào cho BTC hôm nay không?",
      "Phát hiện điểm vào cho ETH",
      "Phân tích điểm ra tối ưu cho vị thế BTC hiện tại",
      "Thiết lập stop loss và take profit cho ETH",
      "Chiến lược trailing stop cho altcoin"
    ]
  },
  {
    name: "Thông tin thị trường",
    prompts: [
      "Top 5 altcoin có tiềm năng tăng trưởng cao nhất",
      "Sự kiện quan trọng trong tuần này ảnh hưởng đến crypto",
      "Phân tích on-chain cho BTC",
      "So sánh khối lượng giao dịch các sàn",
      "Phân tích sentiment thị trường hiện tại"
    ]
  },
  {
    name: "Giao dịch",
    prompts: [
      "Mua 0.01 BTC",
      "Bán 50% ETH của tôi",
      "Đặt lệnh limit mua BTC ở giá 60000",
      "Đặt stop loss cho vị thế SOL",
      "Lịch sử giao dịch của tôi"
    ]
  }
];

export const PromptSuggestions: FC<PromptSuggestionsProps> = ({
  onSelectPrompt,
  isVisible
}) => {
  const [activeCategory, setActiveCategory] = useState<number>(0);

  if (!isVisible) return null;

  return (
    <div className="w-full bg-card border rounded-md shadow-sm mb-2 animate-in fade-in duration-300">
      <div className="p-2 flex items-center border-b text-sm text-muted-foreground">
        <Lightbulb className="h-4 w-4 mr-2" />
        <span>Gợi ý prompt</span>
      </div>
      
      <div className="flex">
        {/* Danh mục */}
        <div className="w-1/3 border-r">
          <ScrollArea className="h-[200px]">
            {PROMPT_CATEGORIES.map((category, index) => (
              <Button
                key={index}
                variant={activeCategory === index ? "secondary" : "ghost"}
                className="w-full justify-start rounded-none text-sm font-normal h-auto py-2"
                onClick={() => setActiveCategory(index)}
              >
                {category.name}
              </Button>
            ))}
          </ScrollArea>
        </div>
        
        {/* Danh sách gợi ý */}
        <div className="w-2/3">
          <ScrollArea className="h-[200px] p-2">
            <div className="grid grid-cols-1 gap-1">
              {PROMPT_CATEGORIES[activeCategory].prompts.map((prompt, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  className="w-full justify-start text-sm h-auto py-2 px-3 font-normal text-left"
                  onClick={() => onSelectPrompt(prompt)}
                >
                  {prompt}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}; 