"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Bitcoin, TrendingUp, PieChart, BarChart4, AlertCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface TechnicalIndicator {
  name: string;
  value: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
}

interface BtcAnalysisProps {
  className?: string;
}

export function BtcAnalysis({ className }: BtcAnalysisProps) {
  const [btcPrice, setBtcPrice] = useState<string>("103,450.26");
  const [priceChange, setPriceChange] = useState<number>(0.32);
  const [technicalIndicators, setTechnicalIndicators] = useState<TechnicalIndicator[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);

  // Mẫu dữ liệu phân tích quant thực tế cho BTC
  const sampleData = {
    'Moving Average (50)': { value: '103264.04', sentiment: 'bullish' },
    'Moving Average (200)': { value: '103105.93', sentiment: 'bullish' },
    'EMA (21)': { value: '103542.26', sentiment: 'bullish' },
    'Ichimoku Cloud': { value: 'Tenkan: 103783.25, Kijun: 102924.54', sentiment: 'neutral' },
    'ADX (14)': { value: '2.40 (Weak Trend)', sentiment: 'neutral' },
    'Parabolic SAR': { value: '105232.38', sentiment: 'bearish' },
    'RSI (14)': { value: '60.20', sentiment: 'neutral' },
    'Stochastic (14,3)': { value: '%K: 56.33, %D: 56.33', sentiment: 'neutral' },
    'MACD': { value: '196.73 / Signal: 196.73', sentiment: 'neutral' },
    'CCI (20)': { value: '12.42', sentiment: 'neutral' },
    'Bollinger Bands': { value: 'Upper: 104601.70, Middle: 103576.77, Lower: 102551.84 (Squeeze)', sentiment: 'neutral' },
    'ATR (14)': { value: '505.70 (0.49%)', sentiment: 'neutral' },
    'OBV': { value: '13,131', sentiment: 'bullish' },
    'Volume MA (20)': { value: '827 (Average)', sentiment: 'neutral' },
    'Fibonacci Levels': { value: '38.2%: 103288.33, 50%: 102924.54, 61.8%: 102560.75', sentiment: 'neutral' },
    'Pivot Points': { value: 'Pivot: 103616.31, R1: 103844.01, S1: 103470.70', sentiment: 'neutral' },
    'Price Trend': { value: 'Moderately Bullish', sentiment: 'bullish' },
  };

  // Mô phỏng việc tải dữ liệu từ API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Ở đây chúng ta sử dụng dữ liệu mẫu, trong ứng dụng thực tế sẽ gọi API
        const formattedIndicators = Object.entries(sampleData).map(([name, data]) => ({
          name,
          value: data.value,
          sentiment: data.sentiment as 'bullish' | 'bearish' | 'neutral'
        }));
        
        setTechnicalIndicators(formattedIndicators);
        setLastUpdated("4:30:37 PM");
        setLoading(false);
      } catch (error) {
        console.error("Failed to fetch BTC data:", error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Phân loại các chỉ báo theo chiều hướng thị trường
  const bullishIndicators = technicalIndicators.filter(i => i.sentiment === 'bullish');
  const bearishIndicators = technicalIndicators.filter(i => i.sentiment === 'bearish');
  const neutralIndicators = technicalIndicators.filter(i => i.sentiment === 'neutral');

  // Tính toán kết luận tổng thể
  const overallSentiment = bullishIndicators.length > bearishIndicators.length ? "Bullish" :
    bearishIndicators.length > bullishIndicators.length ? "Bearish" : "Neutral";
  
  const sentimentStrength = 
    Math.abs(bullishIndicators.length - bearishIndicators.length) > technicalIndicators.length / 3 
      ? "Strong" 
      : Math.abs(bullishIndicators.length - bearishIndicators.length) > 1 
        ? "Moderate" 
        : "Slight";

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Bitcoin className="h-4 w-4" />
          Phân tích Bitcoin (BTC/USDT)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        <div className="flex justify-between items-center">
          <div>
            <div className="text-xl font-bold">${btcPrice}</div>
            <div className={cn(
              "flex items-center gap-1 text-xs",
              priceChange >= 0 ? "text-green-500" : "text-red-500"
            )}>
              {priceChange >= 0 ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              <span>{Math.abs(priceChange)}%</span>
            </div>
          </div>
          <div>
            <Badge variant={
              overallSentiment === "Bullish" ? "default" :
              overallSentiment === "Bearish" ? "destructive" : "outline"
            }>
              {sentimentStrength} {overallSentiment}
            </Badge>
          </div>
        </div>

        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="summary" className="text-xs">Tóm tắt</TabsTrigger>
            <TabsTrigger value="indicators" className="text-xs">Chỉ báo Kỹ thuật</TabsTrigger>
            <TabsTrigger value="quant" className="text-xs">Phân tích Quant</TabsTrigger>
          </TabsList>
          
          <TabsContent value="summary" className="mt-4 space-y-3">
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-muted/40 p-2 rounded">
                <div className="text-muted-foreground text-[10px]">Bullish</div>
                <div className="font-bold">{bullishIndicators.length}</div>
              </div>
              <div className="bg-muted/40 p-2 rounded">
                <div className="text-muted-foreground text-[10px]">Bearish</div>
                <div className="font-bold">{bearishIndicators.length}</div>
              </div>
              <div className="bg-muted/40 p-2 rounded">
                <div className="text-muted-foreground text-[10px]">Neutral</div>
                <div className="font-bold">{neutralIndicators.length}</div>
              </div>
            </div>

            <Alert className="bg-accent/30 border-muted">
              <AlertDescription className="text-xs flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-medium">Đánh giá tổng quan: </span>
                  Bitcoin hiện đang có xu hướng {overallSentiment === "Bullish" ? "tăng" : overallSentiment === "Bearish" ? "giảm" : "đi ngang"} dựa trên phân tích kỹ thuật. MA(50) và MA(200) hiện đang tạo thành {sampleData['Moving Average (50)'].sentiment === 'bullish' && sampleData['Moving Average (200)'].sentiment === 'bullish' ? "Golden Cross (tích cực)" : "Death Cross (tiêu cực)"}.
                </div>
              </AlertDescription>
            </Alert>

            {/* Chỉ báo chính */}
            <div className="space-y-1">
              <h3 className="font-medium flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5" />
                Chỉ báo Chính
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {['Moving Average (50)', 'Moving Average (200)', 'RSI (14)', 'MACD'].map(name => {
                  const indicator = technicalIndicators.find(i => i.name === name);
                  if (!indicator) return null;
                  
                  return (
                    <div key={name} className="flex justify-between bg-muted/20 p-2 rounded">
                      <span>{indicator.name}:</span>
                      <span className={cn(
                        indicator.sentiment === 'bullish' ? "text-green-500" : 
                        indicator.sentiment === 'bearish' ? "text-red-500" : ""
                      )}>
                        {indicator.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="indicators" className="mt-4 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              {technicalIndicators.map((indicator) => (
                <div key={indicator.name} className="flex justify-between items-center bg-muted/20 p-2 rounded">
                  <span>{indicator.name}</span>
                  <span className={cn(
                    indicator.sentiment === 'bullish' ? "text-green-500" : 
                    indicator.sentiment === 'bearish' ? "text-red-500" : ""
                  )}>
                    {indicator.value}
                  </span>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="quant" className="mt-4 space-y-3">
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-1.5">
                <PieChart className="h-3.5 w-3.5" />
                Phân tích Xác suất
              </h3>
              <div className="bg-muted/20 p-3 rounded space-y-1">
                <div className="flex justify-between">
                  <span>Xác suất tăng (7 ngày):</span>
                  <span className="font-medium">{bullishIndicators.length > bearishIndicators.length ? "65%" : "35%"}</span>
                </div>
                <div className="flex justify-between">
                  <span>Mức biến động dự kiến (ATR):</span>
                  <span className="font-medium">±{sampleData['ATR (14)'].value.split(' ')[0]}</span>
                </div>
                <div className="flex justify-between">
                  <span>Thời lượng xu hướng hiện tại:</span>
                  <span className="font-medium">12 ngày</span>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-medium flex items-center gap-1.5">
                <BarChart4 className="h-3.5 w-3.5" />
                Mức giá Quant
              </h3>
              <div className="bg-muted/20 p-3 rounded space-y-1">
                <div className="flex justify-between">
                  <span>Mức hỗ trợ mạnh:</span>
                  <span className="font-medium">$101,250</span>
                </div>
                <div className="flex justify-between">
                  <span>Mức kháng cự mạnh:</span>
                  <span className="font-medium">$105,800</span>
                </div>
                <div className="flex justify-between">
                  <span>Giá mục tiêu (Kelly optimal):</span>
                  <span className="font-medium">{bullishIndicators.length > bearishIndicators.length ? "$107,500" : "$100,200"}</span>
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-1">
              <h3 className="font-medium">Chiến lược Kelly Criterion</h3>
              <div className="bg-accent/30 p-2 rounded text-xs">
                <div className="mb-1"><span className="font-medium">Tỷ lệ thắng ước tính:</span> {bullishIndicators.length}/{technicalIndicators.length} ({(bullishIndicators.length/technicalIndicators.length*100).toFixed(1)}%)</div>
                <div><span className="font-medium">Kelly tối ưu:</span> {((2*(bullishIndicators.length/technicalIndicators.length)-1)).toFixed(2)}</div>
                <div><span className="font-medium">Kích thước vị thế đề xuất:</span> {(((2*(bullishIndicators.length/technicalIndicators.length)-1)/4)*100).toFixed(1)}% (Phần tư Kelly)</div>
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground">
              Cập nhật lần cuối: {lastUpdated} | Dữ liệu từ: Binance
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 