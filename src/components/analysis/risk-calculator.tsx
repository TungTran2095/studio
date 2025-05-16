"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Calculator, AlertCircle, BadgePercent, BarChart } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

interface RiskCalculatorProps {
  className?: string;
}

export function RiskCalculator({ className }: RiskCalculatorProps) {
  // State for VaR calculation
  const [varPrice, setVarPrice] = useState<string>("100");
  const [varPositionSize, setVarPositionSize] = useState<string>("1000");
  const [varVolatility, setVarVolatility] = useState<string>("2.5");
  const [varConfidenceLevel, setVarConfidenceLevel] = useState<string>("95");
  const [varTimeHorizon, setVarTimeHorizon] = useState<string>("1");
  const [varResult, setVarResult] = useState<string | null>(null);

  // State for Kelly Criterion
  const [kellyWinRate, setKellyWinRate] = useState<string>("55");
  const [kellyWinLossRatio, setKellyWinLossRatio] = useState<string>("1.2");
  const [kellyResult, setKellyResult] = useState<string | null>(null);

  // State for Sharpe Ratio
  const [sharpeReturn, setSharpeReturn] = useState<string>("12");
  const [sharpeRiskFree, setSharpeRiskFree] = useState<string>("3.5");
  const [sharpeVolatility, setSharpeVolatility] = useState<string>("15");
  const [sharpeResult, setSharpeResult] = useState<string | null>(null);

  // State for drawdown analysis
  const [drawdownPercentage, setDrawdownPercentage] = useState<string>("20");
  const [drawdownRecovery, setDrawdownRecovery] = useState<string | null>(null);

  // Calculate Value at Risk (VaR)
  const calculateVaR = () => {
    try {
      const price = parseFloat(varPrice);
      const positionSize = parseFloat(varPositionSize);
      const volatility = parseFloat(varVolatility) / 100; // Convert to decimal
      const confidenceLevel = parseFloat(varConfidenceLevel) / 100; // Convert to decimal
      const timeHorizon = parseFloat(varTimeHorizon);
      
      if (isNaN(price) || isNaN(positionSize) || isNaN(volatility) || isNaN(confidenceLevel) || isNaN(timeHorizon)) {
        setVarResult("Hãy nhập tất cả các giá trị hợp lệ");
        return;
      }
      
      // Z-score for confidence level (normal distribution)
      const zScore = calculateZScore(confidenceLevel);
      
      // Calculate VaR as a percentage of the position
      const varPercentage = zScore * volatility * Math.sqrt(timeHorizon);
      
      // Calculate VaR in currency value
      const varValue = positionSize * varPercentage;
      
      setVarResult(`${varPercentage.toFixed(2)}% (${varValue.toFixed(2)} đơn vị)`);
    } catch (error) {
      setVarResult("Lỗi khi tính toán VaR");
    }
  };

  // Calculate Kelly Criterion
  const calculateKelly = () => {
    try {
      const winRate = parseFloat(kellyWinRate) / 100; // Convert to decimal
      const winLossRatio = parseFloat(kellyWinLossRatio);
      
      if (isNaN(winRate) || isNaN(winLossRatio)) {
        setKellyResult("Hãy nhập tất cả các giá trị hợp lệ");
        return;
      }
      
      // Kelly formula: f* = (p * b - q) / b
      // where p = win probability, q = 1 - p (loss probability), b = win/loss ratio
      const lossRate = 1 - winRate;
      const kellyPercentage = (winRate * winLossRatio - lossRate) / winLossRatio;
      
      if (kellyPercentage <= 0) {
        setKellyResult("Negative edge! Không nên giao dịch.");
      } else {
        // Calculate half-Kelly and quarter-Kelly for more conservative position sizing
        const halfKelly = kellyPercentage / 2;
        const quarterKelly = kellyPercentage / 4;
        
        setKellyResult(`Đầy đủ: ${(kellyPercentage * 100).toFixed(2)}%, Nửa: ${(halfKelly * 100).toFixed(2)}%, Phần tư: ${(quarterKelly * 100).toFixed(2)}%`);
      }
    } catch (error) {
      setKellyResult("Lỗi khi tính toán Kelly");
    }
  };

  // Calculate Sharpe Ratio
  const calculateSharpe = () => {
    try {
      const portfolioReturn = parseFloat(sharpeReturn) / 100; // Convert to decimal
      const riskFreeRate = parseFloat(sharpeRiskFree) / 100; // Convert to decimal
      const portfolioVolatility = parseFloat(sharpeVolatility) / 100; // Convert to decimal
      
      if (isNaN(portfolioReturn) || isNaN(riskFreeRate) || isNaN(portfolioVolatility)) {
        setSharpeResult("Hãy nhập tất cả các giá trị hợp lệ");
        return;
      }
      
      // Sharpe Ratio = (Expected Portfolio Return - Risk Free Rate) / Portfolio Standard Deviation
      const sharpeRatio = (portfolioReturn - riskFreeRate) / portfolioVolatility;
      
      let interpretation = "";
      if (sharpeRatio < 0) {
        interpretation = "Kém (Lợi nhuận dưới lãi suất phi rủi ro)";
      } else if (sharpeRatio < 0.5) {
        interpretation = "Không tốt";
      } else if (sharpeRatio < 1) {
        interpretation = "Chấp nhận được";
      } else if (sharpeRatio < 2) {
        interpretation = "Tốt";
      } else {
        interpretation = "Xuất sắc";
      }
      
      setSharpeResult(`${sharpeRatio.toFixed(2)} (${interpretation})`);
    } catch (error) {
      setSharpeResult("Lỗi khi tính toán Sharpe");
    }
  };

  // Calculate Recovery Needed
  const calculateRecovery = () => {
    try {
      const drawdown = parseFloat(drawdownPercentage) / 100; // Convert to decimal
      
      if (isNaN(drawdown)) {
        setDrawdownRecovery("Hãy nhập giá trị hợp lệ");
        return;
      }
      
      // Formula: Recovery % = (1 / (1 - Drawdown)) - 1
      const recoveryRate = (1 / (1 - drawdown)) - 1;
      
      setDrawdownRecovery(`${(recoveryRate * 100).toFixed(2)}%`);
    } catch (error) {
      setDrawdownRecovery("Lỗi khi tính toán");
    }
  };

  // Helper function to calculate Z-Score for normal distribution
  const calculateZScore = (confidenceLevel: number): number => {
    // Approximation for standard normal quantile function
    // For common confidence levels:
    if (confidenceLevel === 0.95) return 1.645;
    if (confidenceLevel === 0.99) return 2.326;
    if (confidenceLevel === 0.975) return 1.96;
    if (confidenceLevel === 0.9) return 1.282;
    
    // For other confidence levels, use a simple approximation
    // Note: This is a simplified estimation - not as accurate as statistical libraries
    return 1.645; // Default to 95% confidence level
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Calculator className="h-4 w-4" />
          Công cụ tính toán rủi ro
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Value at Risk (VaR) Calculator */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-1.5">
            <AlertCircle className="h-3.5 w-3.5" />
            Value at Risk (VaR)
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="var-price">Giá tài sản</Label>
              <Input 
                id="var-price" 
                value={varPrice} 
                onChange={(e) => setVarPrice(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-position-size">Kích thước vị thế</Label>
              <Input 
                id="var-position-size" 
                value={varPositionSize} 
                onChange={(e) => setVarPositionSize(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-volatility">Độ biến động (%)</Label>
              <Input 
                id="var-volatility" 
                value={varVolatility} 
                onChange={(e) => setVarVolatility(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-confidence">Mức độ tin cậy (%)</Label>
              <Select 
                value={varConfidenceLevel} 
                onValueChange={setVarConfidenceLevel}
              >
                <SelectTrigger id="var-confidence" className="h-7">
                  <SelectValue placeholder="Chọn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="90">90%</SelectItem>
                  <SelectItem value="95">95%</SelectItem>
                  <SelectItem value="99">99%</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="var-time">Khung thời gian (ngày)</Label>
              <Input 
                id="var-time" 
                value={varTimeHorizon} 
                onChange={(e) => setVarTimeHorizon(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="pt-4">
              <Button 
                size="sm" 
                className="h-7 w-full text-xs" 
                onClick={calculateVaR}
              >
                Tính VaR
              </Button>
            </div>
          </div>
          {varResult && (
            <div className="mt-2 p-2 bg-accent/30 rounded text-xs">
              <span className="font-medium">Kết quả VaR: </span>{varResult}
            </div>
          )}
        </div>

        <Separator />

        {/* Kelly Criterion Calculator */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-1.5">
            <BadgePercent className="h-3.5 w-3.5" />
            Kelly Criterion
          </h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="kelly-win-rate">Tỷ lệ thắng (%)</Label>
              <Input 
                id="kelly-win-rate" 
                value={kellyWinRate} 
                onChange={(e) => setKellyWinRate(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="kelly-win-loss">Tỷ lệ thắng/thua</Label>
              <Input 
                id="kelly-win-loss" 
                value={kellyWinLossRatio} 
                onChange={(e) => setKellyWinLossRatio(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="col-span-2 pt-2">
              <Button 
                size="sm" 
                className="h-7 w-full text-xs" 
                onClick={calculateKelly}
              >
                Tính Kelly Criterion
              </Button>
            </div>
          </div>
          {kellyResult && (
            <div className="mt-2 p-2 bg-accent/30 rounded text-xs">
              <span className="font-medium">Kết quả Kelly: </span>{kellyResult}
            </div>
          )}
          <Alert variant="default" className="text-xs py-2 mt-2">
            <AlertDescription>
              Phần tư Kelly là cách phân bổ kích thước vị thế an toàn hơn cho hầu hết traders.
            </AlertDescription>
          </Alert>
        </div>

        <Separator />

        {/* Sharpe Ratio Calculator */}
        <div className="space-y-2">
          <h3 className="font-medium flex items-center gap-1.5">
            <BarChart className="h-3.5 w-3.5" />
            Sharpe Ratio
          </h3>
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label htmlFor="sharpe-return">Lợi nhuận (%)</Label>
              <Input 
                id="sharpe-return" 
                value={sharpeReturn} 
                onChange={(e) => setSharpeReturn(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sharpe-risk-free">Lãi suất phi rủi ro (%)</Label>
              <Input 
                id="sharpe-risk-free" 
                value={sharpeRiskFree} 
                onChange={(e) => setSharpeRiskFree(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="sharpe-volatility">Độ biến động (%)</Label>
              <Input 
                id="sharpe-volatility" 
                value={sharpeVolatility} 
                onChange={(e) => setSharpeVolatility(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="col-span-3 pt-2">
              <Button 
                size="sm" 
                className="h-7 w-full text-xs" 
                onClick={calculateSharpe}
              >
                Tính Sharpe Ratio
              </Button>
            </div>
          </div>
          {sharpeResult && (
            <div className="mt-2 p-2 bg-accent/30 rounded text-xs">
              <span className="font-medium">Kết quả Sharpe: </span>{sharpeResult}
            </div>
          )}
        </div>

        <Separator />

        {/* Drawdown Recovery Calculator */}
        <div className="space-y-2">
          <h3 className="font-medium">Phân tích Drawdown</h3>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="drawdown-percentage">Drawdown (%)</Label>
              <Input 
                id="drawdown-percentage" 
                value={drawdownPercentage} 
                onChange={(e) => setDrawdownPercentage(e.target.value)}
                className="h-7"
              />
            </div>
            <div className="pt-4">
              <Button 
                size="sm" 
                className="h-7 w-full text-xs" 
                onClick={calculateRecovery}
              >
                Tính mức phục hồi cần thiết
              </Button>
            </div>
          </div>
          {drawdownRecovery && (
            <div className="mt-2 p-2 bg-accent/30 rounded text-xs">
              <span className="font-medium">Mức lợi nhuận cần thiết để phục hồi: </span>{drawdownRecovery}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 