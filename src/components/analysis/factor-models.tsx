"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  AreaChart, 
  PieChart,
  TrendingUp, 
  Cpu, 
  LineChart,
  Layers,
  Activity,
  BarChart,
  RefreshCw 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchTechnicalIndicators } from "@/actions/fetch-indicators";

interface FactorModelsProps {
  className?: string;
  onRefresh?: () => void;
}

interface FactorData {
  name: string;
  beta: number;
  tStat: number;
  significance: 'high' | 'medium' | 'low' | 'none';
  impact: 'positive' | 'negative' | 'neutral';
}

interface ModelRSquared {
  model: string;
  rSquared: number;
  adjustedRSquared: number;
}

export function FactorModels({ className, onRefresh }: FactorModelsProps) {
  const [activeModel, setActiveModel] = useState<string>("custom");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string>("10:45:23 AM");
  
  // Dữ liệu cho các mô hình yếu tố khác nhau
  const [capmFactors, setCapmFactors] = useState<FactorData[]>([
    {
      name: "Market Beta",
      beta: 1.35,
      tStat: 4.82,
      significance: 'high',
      impact: 'positive'
    }
  ]);
  
  const [famaFrenchFactors, setFamaFrenchFactors] = useState<FactorData[]>([
    {
      name: "Market Beta",
      beta: 1.28,
      tStat: 4.62,
      significance: 'high',
      impact: 'positive'
    },
    {
      name: "SMB (Size)",
      beta: 0.14,
      tStat: 0.76,
      significance: 'low',
      impact: 'positive'
    },
    {
      name: "HML (Value)",
      beta: -0.22,
      tStat: 1.05,
      significance: 'low',
      impact: 'negative'
    }
  ]);
  
  const [carhartFactors, setCarhartFactors] = useState<FactorData[]>([
    {
      name: "Market Beta",
      beta: 1.23,
      tStat: 4.58,
      significance: 'high',
      impact: 'positive'
    },
    {
      name: "SMB (Size)",
      beta: 0.11,
      tStat: 0.68,
      significance: 'low',
      impact: 'positive'
    },
    {
      name: "HML (Value)",
      beta: -0.24,
      tStat: 1.12,
      significance: 'low',
      impact: 'negative'
    },
    {
      name: "MOM (Momentum)",
      beta: 0.28,
      tStat: 2.35,
      significance: 'medium',
      impact: 'positive'
    }
  ]);
  
  const [cryptoFactors, setCryptoFactors] = useState<FactorData[]>([
    {
      name: "Market Beta",
      beta: 1.18,
      tStat: 4.22,
      significance: 'high',
      impact: 'positive'
    },
    {
      name: "Momentum",
      beta: 0.32,
      tStat: 2.65,
      significance: 'medium',
      impact: 'positive'
    },
    {
      name: "Volatility",
      beta: 0.54,
      tStat: 3.21,
      significance: 'high',
      impact: 'positive'
    },
    {
      name: "Liquidity",
      beta: 0.65,
      tStat: 3.85,
      significance: 'high',
      impact: 'positive'
    },
    {
      name: "Network Value",
      beta: 0.45,
      tStat: 2.18,
      significance: 'medium',
      impact: 'positive'
    },
    {
      name: "Hash Rate",
      beta: 0.18,
      tStat: 1.42,
      significance: 'low',
      impact: 'positive'
    },
    {
      name: "Sentiment",
      beta: 0.41,
      tStat: 2.78,
      significance: 'medium',
      impact: 'positive'
    }
  ]);
  
  const [modelRSquared, setModelRSquared] = useState<ModelRSquared[]>([
    { model: "CAPM", rSquared: 0.46, adjustedRSquared: 0.45 },
    { model: "Fama-French 3-Factor", rSquared: 0.52, adjustedRSquared: 0.49 },
    { model: "Carhart 4-Factor", rSquared: 0.58, adjustedRSquared: 0.55 },
    { model: "Crypto-Specific 7-Factor", rSquared: 0.72, adjustedRSquared: 0.68 }
  ]);
  
  // Thêm state cho việc hiển thị biểu đồ so sánh
  const [showComparison, setShowComparison] = useState<boolean>(false);
  
  const refreshFactorAnalysis = async () => {
    setIsLoading(true);
    
    try {
      // Mô phỏng tải dữ liệu từ API
      // Trong triển khai thực tế, bạn sẽ gọi API hoặc dịch vụ phân tích
      const indicators = await fetchTechnicalIndicators({
        symbol: 'BTCUSDT',
        interval: '1h',
        limit: 200
      });
      
      if (indicators.success && indicators.data) {
        // Cập nhật thời gian
        setLastUpdated(new Date().toLocaleTimeString());
        
        // Mô phỏng việc cập nhật dữ liệu yếu tố dựa trên chỉ báo kỹ thuật
        // Trong thực tế, bạn sẽ tính toán các hệ số beta dựa trên dữ liệu thị trường
        
        // Cập nhật yếu tố momentum dựa trên xu hướng giá
        const priceTrend = indicators.data["Price Trend"] || "";
        const momentumBeta = priceTrend.includes("Strong Bullish") ? 0.45 :
                           priceTrend.includes("Moderately Bullish") ? 0.32 :
                           priceTrend.includes("Strong Bearish") ? -0.38 :
                           priceTrend.includes("Moderately Bearish") ? -0.28 : 0.15;
        
        // Cập nhật crypto factors
        setCryptoFactors(prev => {
          const updated = [...prev];
          const momentumIndex = updated.findIndex(f => f.name === "Momentum");
          if (momentumIndex >= 0) {
            updated[momentumIndex] = {
              ...updated[momentumIndex],
              beta: parseFloat(momentumBeta.toFixed(2)),
              impact: momentumBeta > 0 ? 'positive' : 'negative'
            };
          }
          
          // Cập nhật yếu tố biến động dựa trên ATR
          if (indicators.data && indicators.data["ATR (14)"]) {
            const volatilityInfo = indicators.data["ATR (14)"];
            const volatilityMatch = volatilityInfo.match(/(\d+\.\d+)%/);
            if (volatilityMatch) {
              const volatilityValue = parseFloat(volatilityMatch[1]);
              const volatilityBeta = volatilityValue > 1.5 ? 0.85 :
                                  volatilityValue > 1.0 ? 0.65 :
                                  volatilityValue > 0.5 ? 0.45 : 0.25;
              
              const volatilityIndex = updated.findIndex(f => f.name === "Volatility");
              if (volatilityIndex >= 0) {
                updated[volatilityIndex] = {
                  ...updated[volatilityIndex],
                  beta: parseFloat(volatilityBeta.toFixed(2))
                };
              }
            }
          }
          
          return updated;
        });
        
        // Cập nhật yếu tố momentum trong mô hình Carhart
        setCarhartFactors(prev => {
          const updated = [...prev];
          const momentumIndex = updated.findIndex(f => f.name === "MOM (Momentum)");
          if (momentumIndex >= 0) {
            updated[momentumIndex] = {
              ...updated[momentumIndex],
              beta: parseFloat((momentumBeta * 0.85).toFixed(2)), // Điều chỉnh giá trị
              impact: momentumBeta > 0 ? 'positive' : 'negative'
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Lỗi khi cập nhật phân tích yếu tố:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    // Tải dữ liệu ban đầu
    refreshFactorAnalysis();
  }, []);
  
  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Phân tích Mô hình Yếu tố BTC/USDT
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="h-6 text-xs"
              onClick={() => setShowComparison(!showComparison)}
            >
              <BarChart className="h-3 w-3 mr-1" />
              {showComparison ? "Ẩn so sánh" : "So sánh mô hình"}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="h-6 w-6"
              disabled={isLoading}
              onClick={refreshFactorAnalysis}
            >
              <RefreshCw className={cn("h-3 w-3", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
        <CardDescription className="text-xs text-muted-foreground">
          Các yếu tố ảnh hưởng đến biến động giá BTC {isLoading ? "(Đang cập nhật...)" : `(Cập nhật: ${lastUpdated})`}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="p-0">
        {showComparison && (
          <div className="px-6 py-4 border-b">
            <div className="space-y-1.5 mb-3">
              <div className="text-sm font-medium">So sánh khả năng giải thích của các mô hình</div>
              <p className="text-xs text-muted-foreground">Chỉ số R-squared của các mô hình factor khác nhau</p>
            </div>
            
            <div className="space-y-3">
              {modelRSquared.map((model, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{model.model}</span>
                    <span className="text-xs font-medium">{(model.rSquared * 100).toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={model.rSquared * 100} 
                    className={cn(
                      "h-2",
                      index === 0 ? "bg-blue-100 text-blue-500" :
                      index === 1 ? "bg-green-100 text-green-500" :
                      index === 2 ? "bg-amber-100 text-amber-500" :
                      "bg-purple-100 text-purple-500"
                    )} 
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      Adjusted R²: {(model.adjustedRSquared * 100).toFixed(1)}%
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {index === 3 ? "🔥 Highest explanatory power" : 
                       index === 0 ? "⚠️ Limited explanation" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="bg-yellow-500/10 p-2 rounded-md text-xs mt-4">
              <p><strong>Hiểu về R-squared:</strong> R-squared (R²) là chỉ số từ 0-1 thể hiện % biến động giá BTC/USDT được giải thích bởi mô hình. Mô hình Crypto-Specific có khả năng giải thích cao nhất (72%) so với CAPM cơ bản (46%).</p>
            </div>
          </div>
        )}
        
        <Tabs defaultValue="custom" value={activeModel} onValueChange={setActiveModel} className="w-full">
          <div className="border-b px-6">
            <TabsList className="w-full justify-start gap-3 p-0 h-auto">
              <TabsTrigger 
                value="capm" 
                className="text-xs py-2 px-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:rounded-none data-[state=active]:shadow-none"
              >
                CAPM
              </TabsTrigger>
              <TabsTrigger 
                value="fama-french" 
                className="text-xs py-2 px-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:rounded-none data-[state=active]:shadow-none"
              >
                Fama-French
              </TabsTrigger>
              <TabsTrigger 
                value="carhart" 
                className="text-xs py-2 px-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:rounded-none data-[state=active]:shadow-none"
              >
                Carhart
              </TabsTrigger>
              <TabsTrigger 
                value="custom" 
                className="text-xs py-2 px-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:rounded-none data-[state=active]:shadow-none"
              >
                Crypto Factors
              </TabsTrigger>
            </TabsList>
          </div>
          
          {/* CAPM */}
          <TabsContent value="capm" className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Capital Asset Pricing Model (CAPM)</div>
              <p className="text-xs text-muted-foreground">Mô tả mối quan hệ giữa rủi ro hệ thống (beta) và lợi nhuận kỳ vọng</p>
            </div>
            
            <div className="bg-muted/30 p-2 rounded-md">
              <div className="text-xs font-medium mb-1">Công thức:</div>
              <p className="bg-muted p-2 text-sm font-mono text-center">
                E(R<sub>BTC</sub>) = R<sub>f</sub> + β<sub>BTC</sub> × (E(R<sub>m</sub>) - R<sub>f</sub>)
              </p>
            </div>
            
            <div className="space-y-3">
              {capmFactors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{factor.name}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      factor.impact === 'positive' ? "text-green-500" :
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )}>
                      β = {factor.beta > 0 ? "+" : ""}{factor.beta}
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(factor.beta) * 50} 
                    className={cn(
                      "h-1.5",
                      factor.impact === 'positive' ? "bg-muted/50" : "bg-muted/50",
                      factor.impact === 'positive' ? "text-green-500" : 
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )} 
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      t-statistic: {factor.tStat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {factor.significance === 'high' ? "Significant (p<0.01)" :
                       factor.significance === 'medium' ? "Significant (p<0.05)" :
                       factor.significance === 'low' ? "Weakly significant (p<0.1)" : "Not significant"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-xs font-medium">Model Fit</div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "CAPM")?.rSquared.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">Adjusted R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "CAPM")?.adjustedRSquared.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-yellow-500/10 p-2 rounded-md text-xs">
              <p><strong>Phân tích:</strong> Beta của BTC so với thị trường crypto cao (1.35), chỉ ra rằng BTC biến động hơn 35% so với thị trường chung. Mô hình này giải thích được 45% biến động giá BTC/USDT.</p>
            </div>
          </TabsContent>
          
          {/* Fama-French */}
          <TabsContent value="fama-french" className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Fama-French 3-Factor Model</div>
              <p className="text-xs text-muted-foreground">Mở rộng CAPM bằng cách thêm yếu tố quy mô (SMB) và giá trị (HML)</p>
            </div>
            
            <div className="bg-muted/30 p-2 rounded-md">
              <div className="text-xs font-medium mb-1">Công thức:</div>
              <p className="bg-muted p-2 text-sm font-mono text-center">
                R<sub>BTC</sub> - R<sub>f</sub> = α + β<sub>m</sub>(R<sub>m</sub> - R<sub>f</sub>) + β<sub>smb</sub>SMB + β<sub>hml</sub>HML + ε
              </p>
            </div>
            
            <div className="space-y-3">
              {famaFrenchFactors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{factor.name}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      factor.impact === 'positive' ? "text-green-500" :
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )}>
                      β = {factor.beta > 0 ? "+" : ""}{factor.beta}
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(factor.beta) * 50} 
                    className={cn(
                      "h-1.5",
                      factor.impact === 'positive' ? "text-green-500" : 
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )} 
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      t-statistic: {factor.tStat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {factor.significance === 'high' ? "Significant (p<0.01)" :
                       factor.significance === 'medium' ? "Significant (p<0.05)" :
                       factor.significance === 'low' ? "Weakly significant (p<0.1)" : "Not significant"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-xs font-medium">Model Fit</div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Fama-French 3-Factor")?.rSquared.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">Adjusted R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Fama-French 3-Factor")?.adjustedRSquared.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-yellow-500/10 p-2 rounded-md text-xs">
              <p><strong>Phân tích:</strong> Mô hình Fama-French cải thiện khả năng giải thích lên 49%. Yếu tố HML có tác động âm, nghĩa là BTC không hoạt động như một tài sản "giá trị" truyền thống.</p>
            </div>
          </TabsContent>
          
          {/* Carhart */}
          <TabsContent value="carhart" className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Carhart 4-Factor Model</div>
              <p className="text-xs text-muted-foreground">Thêm yếu tố đà (momentum) vào mô hình Fama-French 3-Factor</p>
            </div>
            
            <div className="bg-muted/30 p-2 rounded-md">
              <div className="text-xs font-medium mb-1">Công thức:</div>
              <p className="bg-muted p-2 text-sm font-mono text-center">
                R<sub>BTC</sub> - R<sub>f</sub> = α + β<sub>m</sub>(R<sub>m</sub> - R<sub>f</sub>) + β<sub>smb</sub>SMB + β<sub>hml</sub>HML + β<sub>mom</sub>MOM + ε
              </p>
            </div>
            
            <div className="space-y-3">
              {carhartFactors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{factor.name}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      factor.impact === 'positive' ? "text-green-500" :
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )}>
                      β = {factor.beta > 0 ? "+" : ""}{factor.beta}
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(factor.beta) * 50} 
                    className={cn(
                      "h-1.5",
                      factor.impact === 'positive' ? "text-green-500" : 
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )} 
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      t-statistic: {factor.tStat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {factor.significance === 'high' ? "Significant (p<0.01)" :
                       factor.significance === 'medium' ? "Significant (p<0.05)" :
                       factor.significance === 'low' ? "Weakly significant (p<0.1)" : "Not significant"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-xs font-medium">Model Fit</div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Carhart 4-Factor")?.rSquared.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">Adjusted R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Carhart 4-Factor")?.adjustedRSquared.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-yellow-500/10 p-2 rounded-md text-xs">
              <p><strong>Phân tích:</strong> Thêm yếu tố đà (MOM) cải thiện đáng kể mô hình lên 55%. Beta của momentum dương (+0.28) thể hiện BTC có xu hướng được hưởng lợi từ hiệu ứng đà trên thị trường.</p>
            </div>
          </TabsContent>
          
          {/* Crypto Factors */}
          <TabsContent value="custom" className="px-6 py-4 space-y-4">
            <div className="space-y-1.5">
              <div className="text-sm font-medium">Crypto-Specific Factor Model</div>
              <p className="text-xs text-muted-foreground">Mô hình đa yếu tố đặc thù cho thị trường crypto</p>
            </div>
            
            <div className="bg-muted/30 p-2 rounded-md">
              <div className="text-xs font-medium mb-1">Công thức:</div>
              <p className="bg-muted p-2 text-xs font-mono text-center">
                R<sub>BTC</sub> = α + β<sub>Market</sub> + β<sub>Momentum</sub> + β<sub>Volatility</sub> + β<sub>Liquidity</sub> + β<sub>NetworkValue</sub> + β<sub>HashRate</sub> + β<sub>Sentiment</sub> + ε
              </p>
            </div>
            
            <div className="space-y-3">
              {cryptoFactors.map((factor, index) => (
                <div key={index} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-medium">{factor.name}</span>
                    <span className={cn(
                      "text-xs font-medium",
                      factor.impact === 'positive' ? "text-green-500" :
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )}>
                      β = {factor.beta > 0 ? "+" : ""}{factor.beta}
                    </span>
                  </div>
                  <Progress 
                    value={Math.abs(factor.beta) * 50} 
                    className={cn(
                      "h-1.5",
                      factor.impact === 'positive' ? "text-green-500" : 
                      factor.impact === 'negative' ? "text-red-500" : ""
                    )} 
                  />
                  <div className="flex justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      t-statistic: {factor.tStat}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {factor.significance === 'high' ? "Significant (p<0.01)" :
                       factor.significance === 'medium' ? "Significant (p<0.05)" :
                       factor.significance === 'low' ? "Weakly significant (p<0.1)" : "Not significant"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <div className="text-xs font-medium">Model Fit</div>
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Crypto-Specific 7-Factor")?.rSquared.toFixed(2)}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="py-1 text-xs font-medium">Adjusted R-squared</TableCell>
                    <TableCell className="py-1 text-xs text-right">{modelRSquared.find(m => m.model === "Crypto-Specific 7-Factor")?.adjustedRSquared.toFixed(2)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
            
            <div className="bg-yellow-500/10 p-2 rounded-md text-xs">
              <p><strong>Phân tích:</strong> Mô hình đa yếu tố đặc thù giải thích được 68% biến động giá BTC/USDT. Các yếu tố thanh khoản và biến động có tác động mạnh nhất, theo sau là yếu tố mạng lưới và tâm lý thị trường.</p>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
} 