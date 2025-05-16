"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleDot, Info, Lightbulb, TrendingUp, LineChart, Scale, RefreshCw } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { fetchTechnicalIndicators } from "@/actions/fetch-indicators";
import { IndicatorsData } from "@/types/indicators";
import { Button } from "@/components/ui/button";

interface MarketTheoryAnalysisProps {
  className?: string;
  btcPrice?: string;
  priceChange?: number;
  volatility?: string;
  volume?: string;
  indicators?: IndicatorsData;
}

export function MarketTheoryAnalysis({ 
  className, 
  btcPrice = "103,450.26", 
  priceChange = 0.32,
  volatility = "0.49%",
  volume = "835",
  indicators
}: MarketTheoryAnalysisProps) {
  // Các chỉ số thị trường
  const [emhScore, setEmhScore] = useState<number>(65);
  const [behavioralSignals, setBehavioralSignals] = useState<{signal: string, strength: number, explanation: string}[]>([]);
  const [marketEfficiency, setMarketEfficiency] = useState<'yếu' | 'trung bình' | 'mạnh'>('yếu');
  const [randomWalkDeviation, setRandomWalkDeviation] = useState<number>(12);
  const [sharpeRatio, setSharpeRatio] = useState<number>(1.25);
  const [marketData, setMarketData] = useState<IndicatorsData | null>(null);
  
  // Tải dữ liệu thị trường nếu chưa được cung cấp qua props
  useEffect(() => {
    const loadMarketData = async () => {
      if (indicators) {
        setMarketData(indicators);
        return;
      }
      
      try {
        const result = await fetchTechnicalIndicators({ 
          symbol: 'BTCUSDT', 
          interval: '1h', 
          limit: 200 
        });
        
        if (result.success && result.data) {
          setMarketData(result.data);
        }
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu thị trường:", error);
      }
    };
    
    loadMarketData();
  }, [indicators]);
  
  // Phân tích dữ liệu thực tế để tạo ra các đánh giá lý thuyết
  useEffect(() => {
    if (!marketData) return;
    
    // Phát hiện các tín hiệu hành vi từ dữ liệu thị trường
    const behavioralAnalysis = analyzeBehavioralSignals(marketData);
    setBehavioralSignals(behavioralAnalysis);
    
    // Phân tích hiệu quả thị trường
    const efficiencyAnalysis = analyzeMarketEfficiency(marketData);
    setEmhScore(efficiencyAnalysis.score);
    setMarketEfficiency(efficiencyAnalysis.level);
    
    // Phân tích Random Walk
    const rwDeviation = analyzeRandomWalk(marketData);
    setRandomWalkDeviation(rwDeviation);
    
    // Phân tích MPT và tính Sharpe Ratio
    const volatilityValue = extractVolatility(marketData);
    const sharpRatioCalculated = calculateSharpeRatio(priceChange, volatilityValue);
    setSharpeRatio(sharpRatioCalculated);
    
  }, [marketData, priceChange]);

  // Trích xuất độ biến động từ ATR
  const extractVolatility = (data: IndicatorsData): number => {
    try {
      const atrString = data["ATR (14)"];
      // Trích xuất phần trăm từ chuỗi như "506.33 (Low Volatility, 0.49%)"
      const percentMatch = atrString.match(/(\d+\.\d+)%/);
      if (percentMatch && percentMatch[1]) {
        return parseFloat(percentMatch[1]);
      }
    } catch (e) {
      console.error("Lỗi khi trích xuất độ biến động:", e);
    }
    return parseFloat(volatility.replace('%', ''));
  };
  
  // Đánh giá tâm lý thị trường
  const analyzeBehavioralSignals = (data: IndicatorsData) => {
    const signals = [];
    
    // FOMO signal - dựa trên OBV và Price Trend
    const obvSignal = data["OBV"] || "";
    const priceTrend = data["Price Trend"] || "";
    const fomoStrength = obvSignal.includes("Bullish") && priceTrend.includes("Bullish") ? 65 : 
                        obvSignal.includes("Bearish") && priceTrend.includes("Bearish") ? 30 : 45;
    
    signals.push({
      signal: "FOMO (Fear of Missing Out)",
      strength: fomoStrength,
      explanation: "Khối lượng giao dịch tăng mạnh khi giá đang trong xu hướng tăng, thể hiện tâm lý sợ bỏ lỡ cơ hội."
    });
    
    // Tâm lý đám đông - dựa trên RSI và các MA
    const rsiValue = parseFloat(data["RSI (14)"]?.split(' ')[0] || "50");
    const herdStrength = rsiValue > 70 ? 75 : rsiValue < 30 ? 70 : rsiValue > 60 ? 58 : 40;
    
    signals.push({
      signal: "Tâm lý đám đông",
      strength: herdStrength,
      explanation: "Giao dịch theo xu hướng gia tăng, đặc biệt trên các mạng xã hội và diễn đàn crypto."
    });
    
    // Thiên kiến xác nhận - dựa trên độ chênh lệch giữa các chỉ báo
    let confirmationBias = 50;
    if (data["Moving Average (50)"]?.includes("Bullish") && 
        data["Moving Average (200)"]?.includes("Bullish") && 
        data["EMA (21)"]?.includes("Bullish")) {
      confirmationBias = 72; // Thiên kiến xác nhận cao khi tất cả đều bullish
    } else if (data["Moving Average (50)"]?.includes("Bearish") && 
               data["Moving Average (200)"]?.includes("Bearish") && 
               data["EMA (21)"]?.includes("Bearish")) {
      confirmationBias = 68; // Thiên kiến xác nhận cao khi tất cả đều bearish  
    }
    
    signals.push({
      signal: "Thiên kiến xác nhận",
      strength: confirmationBias,
      explanation: "Trader chỉ tập trung vào thông tin hỗ trợ quan điểm hiện tại, bỏ qua các chỉ báo trái chiều."
    });
    
    return signals;
  };
  
  // Phân tích hiệu quả thị trường theo EMH
  const analyzeMarketEfficiency = (data: IndicatorsData) => {
    // Đánh giá dựa trên các chỉ báo và đặc điểm thị trường
    let score = 50; // Điểm cơ sở
    
    // 1. Đánh giá dựa trên xu hướng giá và độ biến động
    const priceTrend = data["Price Trend"] || "";
    const volatilityInfo = data["ATR (14)"] || "";
    
    if (volatilityInfo.includes("Low Volatility")) {
      score += 15; // Thị trường ít biến động thường hiệu quả hơn
    } else if (volatilityInfo.includes("High Volatility")) {
      score -= 15; // Biến động cao thường là dấu hiệu của thị trường kém hiệu quả
    }
    
    // 2. Đánh giá dựa trên Bollinger Bands
    const bbInfo = data["Bollinger Bands"] || "";
    if (bbInfo.includes("Squeeze")) {
      score += 10; // Vùng Squeeze thường xuất hiện trong thị trường hiệu quả
    }
    
    // 3. Đánh giá dựa trên RSI
    const rsiValue = parseFloat(data["RSI (14)"]?.split(' ')[0] || "50");
    if (rsiValue > 30 && rsiValue < 70) {
      score += 10; // RSI trong vùng trung bình thường xuất hiện trong thị trường hiệu quả
    } else {
      score -= 10; // RSI quá cao hoặc quá thấp cho thấy thị trường có thể không hiệu quả
    }
    
    // Xác định mức độ hiệu quả
    let level: 'yếu' | 'trung bình' | 'mạnh' = 'trung bình';
    if (score < 45) level = 'yếu';
    else if (score > 70) level = 'mạnh';
    
    return { score, level };
  };
  
  // Phân tích Random Walk
  const analyzeRandomWalk = (data: IndicatorsData): number => {
    // Đánh giá mức độ tuân theo Random Walk
    let deviation = 15; // Điểm cơ sở - giá trị càng cao, càng ít tuân theo Random Walk
    
    // 1. Đánh giá dựa trên ADX - chỉ báo xu hướng
    const adxInfo = data["ADX (14)"] || "";
    const adxMatch = adxInfo.match(/(\d+\.\d+)/);
    const adxValue = adxMatch ? parseFloat(adxMatch[1]) : 25;
    
    if (adxValue > 25) {
      deviation += 10; // Xu hướng mạnh - ít tuân theo Random Walk
    } else if (adxValue < 15) {
      deviation -= 5; // Không có xu hướng rõ ràng - gần với Random Walk
    }
    
    // 2. Đánh giá dựa trên RSI
    const rsiValue = parseFloat(data["RSI (14)"]?.split(' ')[0] || "50");
    if (rsiValue > 70 || rsiValue < 30) {
      deviation += 8; // Quá mua/quá bán - ít tuân theo Random Walk
    } else if (rsiValue > 45 && rsiValue < 55) {
      deviation -= 5; // Gần vùng cân bằng - gần với Random Walk
    }
    
    // 3. Đánh giá dựa trên Bollinger Bands
    const bbInfo = data["Bollinger Bands"] || "";
    if (bbInfo.includes("Squeeze") || bbInfo.includes("Low Volatility")) {
      deviation -= 3; // Vùng Squeeze hoặc biến động thấp - gần với Random Walk
    }
    
    // Giới hạn trong khoảng 5-35
    return Math.min(Math.max(deviation, 5), 35);
  };
  
  // Tính Sharpe Ratio
  const calculateSharpeRatio = (priceChangePercent: number, volatilityPercent: number): number => {
    const riskFreeRate = 3.5; // Lãi suất phi rủi ro (%)
    const expectedReturn = Math.abs(priceChangePercent) * 365; // Lợi nhuận kỳ vọng hàng năm
    const annualizedVolatility = volatilityPercent * 16; // Biến động hàng năm (đơn giản hóa)
    
    if (annualizedVolatility === 0) return 0;
    
    const sharpeRatio = (expectedReturn - riskFreeRate) / annualizedVolatility;
    return parseFloat(sharpeRatio.toFixed(2));
  };

  // Phân tích hiệu quả thị trường dựa trên EMH
  const getEmhAnalysis = () => {
    if (emhScore > 70) {
      return "Thị trường BTC đang gần với dạng hiệu quả, giá có xu hướng phản ánh đầy đủ thông tin. Các chiến lược giao dịch thường có hiệu quả thấp.";
    } else if (emhScore > 40) {
      return "Thị trường BTC đang ở trạng thái hiệu quả trung bình, có cơ hội cho các chiến lược giao dịch dựa trên phân tích kỹ thuật và cơ bản.";
    } else {
      return "Thị trường BTC đang ở trạng thái kém hiệu quả, tạo nhiều cơ hội cho các chiến lược giao dịch bất đối xứng thông tin.";
    }
  };
  
  // Phân tích lý thuyết Random Walk
  const getRandomWalkAnalysis = () => {
    if (randomWalkDeviation < 10) {
      return "Giá BTC di chuyển gần với mô hình Random Walk, rất khó dự đoán dựa trên dữ liệu quá khứ.";
    } else if (randomWalkDeviation < 20) {
      return "Giá BTC có độ lệch vừa phải so với Random Walk, có thể áp dụng một số phương pháp dự đoán có điều kiện.";
    } else {
      return "Giá BTC đang có độ lệch đáng kể so với Random Walk, cho thấy có các mô hình lặp lại đang hình thành.";
    }
  };
  
  // Phân tích MPT
  const getMptAnalysis = () => {
    if (sharpeRatio < 0.5) {
      return "BTC đang mang lại lợi nhuận điều chỉnh rủi ro kém. Cân nhắc giảm tỷ trọng trong danh mục.";
    } else if (sharpeRatio < 1) {
      return "BTC đang có hiệu suất điều chỉnh rủi ro trung bình. Tỷ trọng hợp lý trong danh mục đa dạng hóa.";
    } else if (sharpeRatio < 2) {
      return "BTC đang mang lại hiệu suất điều chỉnh rủi ro tốt. Có thể tăng tỷ trọng một cách thận trọng.";
    } else {
      return "BTC đang có hiệu suất điều chỉnh rủi ro xuất sắc. Đáng giá cho tỷ trọng cao hơn trong danh mục.";
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <LineChart className="h-4 w-4" />
          Phân tích BTC/USDT dựa trên Lý thuyết Thị trường
          <div className="ml-auto">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6"
              onClick={async () => {
                try {
                  const result = await fetchTechnicalIndicators({ 
                    symbol: 'BTCUSDT', 
                    interval: '1h', 
                    limit: 200 
                  });
                  
                  if (result.success && result.data) {
                    setMarketData(result.data);
                  }
                } catch (error) {
                  console.error("Lỗi khi tải dữ liệu thị trường:", error);
                }
              }}
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <Tabs defaultValue="emh" className="w-full">
          <TabsList className="w-full mb-2">
            <TabsTrigger value="emh" className="text-xs">EMH</TabsTrigger>
            <TabsTrigger value="random-walk" className="text-xs">Random Walk</TabsTrigger>
            <TabsTrigger value="mpt" className="text-xs">MPT</TabsTrigger>
            <TabsTrigger value="behavioral" className="text-xs">Tâm lý học</TabsTrigger>
          </TabsList>
          
          {/* EMH - Giả thuyết thị trường hiệu quả */}
          <TabsContent value="emh" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info className="h-4 w-4 text-primary" />
                <span className="font-medium">Hiệu quả thị trường BTC</span>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                Dạng {marketEfficiency}
              </span>
            </div>
            
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span>Điểm EMH:</span>
                <span className="font-medium">{emhScore}/100</span>
              </div>
              <Progress value={emhScore} className="h-2" />
            </div>
            
            <Alert className="bg-accent/30 py-2">
              <AlertDescription className="text-xs">
                {getEmhAnalysis()}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-1.5">
              <span className="font-medium">Áp dụng vào BTC/USDT hiện tại:</span>
              <div className="bg-muted/30 p-2 rounded space-y-1">
                {emhScore > 60 ? (
                  <>
                    <p>• Phản ứng giá nhanh với tin tức quan trọng (trong vòng 1-3 phút)</p>
                    <p>• Độ chênh lệch thấp giữa các sàn giao dịch lớn</p>
                    <p>• Alpha thấp cho hầu hết các chiến lược giao dịch ngắn hạn</p>
                  </>
                ) : (
                  <>
                    <p>• Phản ứng giá chậm với một số tin tức (5-15 phút)</p>
                    <p>• Chênh lệch giá đáng kể giữa các sàn giao dịch nhỏ</p>
                    <p>• Cơ hội arbitrage và thiết lập chiến lược giao dịch dựa trên biểu đồ</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground italic">
              *EMH = Efficient Market Hypothesis (Giả thuyết thị trường hiệu quả)
            </div>
          </TabsContent>
          
          {/* Random Walk */}
          <TabsContent value="random-walk" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <span className="font-medium">Phân tích Random Walk</span>
              </div>
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">
                Độ lệch: {randomWalkDeviation}%
              </span>
            </div>
            
            <Alert className="bg-accent/30 py-2">
              <AlertDescription className="text-xs">
                {getRandomWalkAnalysis()}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-1.5">
              <span className="font-medium">Biểu hiện trên BTC/USDT:</span>
              <div className="bg-muted/30 p-2 rounded space-y-1">
                {randomWalkDeviation < 15 ? (
                  <>
                    <p>• Độ tự tương quan thấp giữa các chu kỳ giá</p>
                    <p>• Hồi quy về giá trung bình không rõ ràng</p>
                    <p>• Phân phối lợi nhuận gần với phân phối chuẩn</p>
                  </>
                ) : (
                  <>
                    <p>• Độ tự tương quan đáng kể trong chuỗi lợi nhuận</p>
                    <p>• Hiện tượng momentum xuất hiện trong ngắn-trung hạn</p>
                    <p>• Phân phối lợi nhuận có đuôi dày hơn phân phối chuẩn</p>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex justify-between items-center bg-muted/20 p-2 rounded">
              <span>Tỷ lệ dự đoán xu hướng:</span>
              <span className="font-medium">{50 + randomWalkDeviation/2}%</span>
            </div>
            
            <div className="text-[10px] text-muted-foreground italic">
              *Giá càng gần Random Walk, độ lệch càng thấp và khả năng dự báo càng kém
            </div>
          </TabsContent>
          
          {/* MPT - Modern Portfolio Theory */}
          <TabsContent value="mpt" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <span className="font-medium">Phân tích MPT</span>
              </div>
              <span className={cn(
                "px-2 py-0.5 rounded text-xs",
                sharpeRatio < 0.5 ? "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" :
                sharpeRatio < 1 ? "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" :
                "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
              )}>
                Sharpe: {sharpeRatio}
              </span>
            </div>
            
            <Alert className="bg-accent/30 py-2">
              <AlertDescription className="text-xs">
                {getMptAnalysis()}
              </AlertDescription>
            </Alert>
            
            <div className="space-y-1.5">
              <span className="font-medium">Phân tích hiệu quả danh mục:</span>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/30 p-2 rounded space-y-1">
                  <p className="font-medium">Lợi nhuận kỳ vọng:</p>
                  <p className="text-right">{Math.abs(priceChange) * 365}%/năm</p>
                </div>
                <div className="bg-muted/30 p-2 rounded space-y-1">
                  <p className="font-medium">Biến động (Rủi ro):</p>
                  <p className="text-right">{marketData ? extractVolatility(marketData) * 16 : parseFloat(volatility) * 16}%/năm</p>
                </div>
                <div className="bg-muted/30 p-2 rounded space-y-1">
                  <p className="font-medium">Lãi suất phi rủi ro:</p>
                  <p className="text-right">3.5%/năm</p>
                </div>
                <div className="bg-muted/30 p-2 rounded space-y-1">
                  <p className="font-medium">Tỷ trọng tối ưu:</p>
                  <p className="text-right">
                    {sharpeRatio < 0.5 ? "5-10%" : 
                     sharpeRatio < 1 ? "10-15%" : 
                     sharpeRatio < 2 ? "15-25%" : "25-35%"}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="text-[10px] text-muted-foreground italic">
              *MPT = Modern Portfolio Theory (Lý thuyết danh mục đầu tư hiện đại)
            </div>
          </TabsContent>
          
          {/* Behavioral Finance */}
          <TabsContent value="behavioral" className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-primary" />
                <span className="font-medium">Phân tích Tâm lý học Tài chính</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {behavioralSignals.map((signal, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium flex items-center gap-1">
                      <CircleDot className="h-3 w-3" /> {signal.signal}
                    </span>
                    <span>{signal.strength}%</span>
                  </div>
                  <Progress value={signal.strength} className="h-1.5" />
                  <p className="text-[10px] text-muted-foreground pl-4">{signal.explanation}</p>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-1.5">
              <span className="font-medium">Ảnh hưởng đến giá BTC/USDT:</span>
              <div className="bg-muted/30 p-2 rounded space-y-1">
                <p>• Xu hướng nhiều khả năng sẽ mạnh hơn dự kiến do tâm lý FOMO</p>
                <p>• Biên độ dao động có thể bị phóng đại bởi phản ứng quá mức của nhà đầu tư</p>
                <p>• Vùng hỗ trợ và kháng cự tâm lý mạnh tại các mức số tròn (100K, 105K)</p>
              </div>
            </div>
            
            <Alert className="bg-accent/30 py-2">
              <AlertDescription className="text-xs">
                Tâm lý thị trường hiện tại nghiêng về {behavioralSignals[0]?.strength > 60 ? "tham lam" : "sợ hãi"}, 
                tạo ra cơ hội giao dịch ngược dòng cho các nhà đầu tư có kỷ luật.
              </AlertDescription>
            </Alert>
            
            <div className="text-[10px] text-muted-foreground italic">
              *Behavioral Finance nghiên cứu ảnh hưởng của tâm lý đến hành vi thị trường
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 