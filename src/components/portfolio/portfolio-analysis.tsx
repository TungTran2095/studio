"use client";

import { useState, useEffect } from "react";
import { Asset } from "@/actions/binance";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Loader2, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

interface PortfolioAnalysisProps {
  credentials: {
    apiKey: string;
    apiSecret: string;
    isTestnet: boolean;
    useDefault: boolean;
  };
  assets: Asset[];
}

interface AnalysisResult {
  riskMetrics: {
    volatility: number;
    valueAtRisk: number;
    maxDrawdown: number;
    sharpeRatio: number;
    sortinoRatio: number;
    downsideDeviation: number;
    betaToMarket: number;
  };
  correlationMatrix: Record<string, Record<string, number>>;
  marketTrend: 'uptrend' | 'downtrend' | 'sideways';
  optimizedPortfolio: {
    weights: number[];
    expectedReturn: number;
    volatility: number;
    sharpeRatio: number;
    assets: {
      symbol: string;
      currentValue: number;
      currentWeight: number;
      targetWeight: number;
    }[];
  };
  rebalancePlan: {
    asset: string;
    currentWeight: number;
    targetWeight: number;
    action: 'buy' | 'sell' | 'hold';
    amount: number;
  }[];
}

export default function PortfolioAnalysis({ credentials, assets }: PortfolioAnalysisProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();

  const performAnalysis = async () => {
    if (!credentials.apiKey || !credentials.apiSecret) {
      toast({
        title: "Thiếu thông tin đăng nhập",
        description: "Vui lòng cung cấp API key và API secret của Binance.",
        variant: "destructive",
      });
      return;
    }

    if (!assets || assets.length === 0) {
      toast({
        title: "Không có tài sản",
        description: "Vui lòng kết nối tài khoản Binance để phân tích danh mục.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/portfolio/analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          credentials,
          assets,
          options: {
            timeframe: "1d",
            period: 30,
            riskFreeRate: 0.02,
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Lỗi không xác định khi phân tích danh mục");
      }

      const result = await response.json();
      setAnalysis(result);
      setActiveTab("overview");
    } catch (error) {
      console.error("Lỗi khi phân tích danh mục:", error);
      toast({
        title: "Lỗi phân tích",
        description: error instanceof Error ? error.message : "Lỗi không xác định khi phân tích danh mục",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format số thành phần trăm
  const formatPercent = (value: number) => {
    return (value * 100).toFixed(2) + "%";
  };

  // Format số thành USD
  const formatUSD = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Biểu tượng xu hướng
  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === "uptrend") return <TrendingUp className="text-green-500" />;
    if (trend === "downtrend") return <TrendingDown className="text-red-500" />;
    return <Minus className="text-gray-500" />;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Phân tích danh mục đầu tư</h2>
        <Button 
          onClick={performAnalysis} 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Đang phân tích...
            </>
          ) : (
            "Phân tích danh mục"
          )}
        </Button>
      </div>

      {analysis && (
        <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="risk">Phân tích rủi ro</TabsTrigger>
            <TabsTrigger value="optimization">Tối ưu hóa</TabsTrigger>
            <TabsTrigger value="rebalance">Tái cân bằng</TabsTrigger>
          </TabsList>

          {/* Tab tổng quan */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Xu hướng thị trường</CardTitle>
                  <CardDescription>Dựa trên dữ liệu BTC trong 30 ngày qua</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-2">
                    <TrendIcon trend={analysis.marketTrend} />
                    <span className="text-xl font-semibold">
                      {analysis.marketTrend === "uptrend" && "Xu hướng tăng"}
                      {analysis.marketTrend === "downtrend" && "Xu hướng giảm"}
                      {analysis.marketTrend === "sideways" && "Đi ngang"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {analysis.marketTrend === "uptrend" && "Thị trường đang trong xu hướng tăng. Ưu tiên các tài sản tăng trưởng."}
                    {analysis.marketTrend === "downtrend" && "Thị trường đang trong xu hướng giảm. Nên thận trọng và phân bổ vào các tài sản ít biến động."}
                    {analysis.marketTrend === "sideways" && "Thị trường đang đi ngang. Nên cân bằng rủi ro trong danh mục."}
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Chỉ số danh mục hiện tại</CardTitle>
                  <CardDescription>Các chỉ số quan trọng của danh mục</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Sharpe Ratio:</span>
                      <span className={analysis.riskMetrics.sharpeRatio > 1 ? "text-green-500" : "text-red-500"}>
                        {analysis.riskMetrics.sharpeRatio.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Độ biến động:</span>
                      <span>{formatPercent(analysis.riskMetrics.volatility)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Value at Risk (95%):</span>
                      <span>{formatPercent(analysis.riskMetrics.valueAtRisk)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Drawdown tối đa:</span>
                      <span>{formatPercent(analysis.riskMetrics.maxDrawdown)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Beta so với thị trường:</span>
                      <span>{analysis.riskMetrics.betaToMarket.toFixed(2)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab phân tích rủi ro */}
          <TabsContent value="risk">
            <Card>
              <CardHeader>
                <CardTitle>Ma trận tương quan</CardTitle>
                <CardDescription>Mức độ tương quan giữa các tài sản trong danh mục</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tài sản</TableHead>
                        {Object.keys(analysis.correlationMatrix).map((symbol) => (
                          <TableHead key={symbol}>{symbol}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.entries(analysis.correlationMatrix).map(([symbol, correlations]) => (
                        <TableRow key={symbol}>
                          <TableCell className="font-medium">{symbol}</TableCell>
                          {Object.entries(correlations).map(([corSymbol, value]) => (
                            <TableCell 
                              key={`${symbol}-${corSymbol}`}
                              className={
                                value > 0.7 ? "bg-red-100" : 
                                value < 0.3 ? "bg-green-100" : ""
                              }
                            >
                              {value.toFixed(2)}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <div className="mt-4 text-sm text-muted-foreground">
                  <p><span className="inline-block w-3 h-3 bg-red-100 mr-2"></span> Tương quan cao (&gt; 0.7): Ít lợi ích đa dạng hóa</p>
                  <p><span className="inline-block w-3 h-3 bg-green-100 mr-2"></span> Tương quan thấp (&lt; 0.3): Đa dạng hóa tốt</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab tối ưu hóa */}
          <TabsContent value="optimization">
            <Card>
              <CardHeader>
                <CardTitle>Danh mục tối ưu</CardTitle>
                <CardDescription>
                  Phân bổ tối ưu dựa trên {
                    analysis.marketTrend === "uptrend" ? "xu hướng tăng" :
                    analysis.marketTrend === "downtrend" ? "xu hướng giảm" : 
                    "thị trường đi ngang"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Lợi nhuận kỳ vọng:</p>
                    <p className="text-xl font-bold">{formatPercent(analysis.optimizedPortfolio.expectedReturn)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Độ biến động:</p>
                    <p className="text-xl font-bold">{formatPercent(analysis.optimizedPortfolio.volatility)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Sharpe Ratio:</p>
                    <p className="text-xl font-bold">{analysis.optimizedPortfolio.sharpeRatio.toFixed(2)}</p>
                  </div>
                </div>

                <Table>
                  <TableCaption>Phân bổ tối ưu cho danh mục</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tài sản</TableHead>
                      <TableHead>Trọng số hiện tại</TableHead>
                      <TableHead>Trọng số tối ưu</TableHead>
                      <TableHead>Thay đổi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.optimizedPortfolio.assets.map((asset) => (
                      <TableRow key={asset.symbol}>
                        <TableCell className="font-medium">{asset.symbol}</TableCell>
                        <TableCell>{formatPercent(asset.currentWeight)}</TableCell>
                        <TableCell>{formatPercent(asset.targetWeight)}</TableCell>
                        <TableCell className={
                          asset.targetWeight - asset.currentWeight > 0.01 ? "text-green-500" :
                          asset.targetWeight - asset.currentWeight < -0.01 ? "text-red-500" :
                          "text-gray-500"
                        }>
                          {formatPercent(asset.targetWeight - asset.currentWeight)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab tái cân bằng */}
          <TabsContent value="rebalance">
            <Card>
              <CardHeader>
                <CardTitle>Kế hoạch tái cân bằng</CardTitle>
                <CardDescription>Các thay đổi cần thực hiện để tối ưu hóa danh mục</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tài sản</TableHead>
                      <TableHead>Hành động</TableHead>
                      <TableHead>Số tiền</TableHead>
                      <TableHead>Trọng số hiện tại</TableHead>
                      <TableHead>Trọng số mục tiêu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.rebalancePlan.map((plan) => (
                      <TableRow key={plan.asset}>
                        <TableCell className="font-medium">{plan.asset}</TableCell>
                        <TableCell className={
                          plan.action === "buy" ? "text-green-500" :
                          plan.action === "sell" ? "text-red-500" :
                          "text-gray-500"
                        }>
                          {plan.action === "buy" && "Mua thêm"}
                          {plan.action === "sell" && "Bán bớt"}
                          {plan.action === "hold" && "Giữ nguyên"}
                        </TableCell>
                        <TableCell>{formatUSD(plan.amount)}</TableCell>
                        <TableCell>{formatPercent(plan.currentWeight)}</TableCell>
                        <TableCell>{formatPercent(plan.targetWeight)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {!analysis && !isLoading && (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Nhấn nút "Phân tích danh mục" để bắt đầu phân tích chi tiết.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 