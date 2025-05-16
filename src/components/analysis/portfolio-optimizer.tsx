"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Briefcase, Plus, Minus, Percent, TrendingUp, LineChart } from "lucide-react";
import { cn } from "@/lib/utils";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PortfolioOptimizerProps {
  className?: string;
}

interface Asset {
  id: string;
  name: string;
  expectedReturn: string;
  volatility: string;
  weight: string;
}

export function PortfolioOptimizer({ className }: PortfolioOptimizerProps) {
  const [assets, setAssets] = useState<Asset[]>([
    { id: "1", name: "Cổ phiếu A", expectedReturn: "12", volatility: "20", weight: "25" },
    { id: "2", name: "Cổ phiếu B", expectedReturn: "8", volatility: "15", weight: "25" },
    { id: "3", name: "Cổ phiếu C", expectedReturn: "15", volatility: "25", weight: "25" },
    { id: "4", name: "Cổ phiếu D", expectedReturn: "6", volatility: "10", weight: "25" },
  ]);
  
  const [riskFreeRate, setRiskFreeRate] = useState<string>("3.5");
  const [correlationMatrix, setCorrelationMatrix] = useState<number[][]>([
    [1.0, 0.3, 0.2, 0.1],
    [0.3, 1.0, 0.4, 0.2],
    [0.2, 0.4, 1.0, 0.3],
    [0.1, 0.2, 0.3, 1.0],
  ]);
  
  const [portfolioReturn, setPortfolioReturn] = useState<string | null>(null);
  const [portfolioVolatility, setPortfolioVolatility] = useState<string | null>(null);
  const [sharpeRatio, setSharpeRatio] = useState<string | null>(null);
  const [optimizedWeights, setOptimizedWeights] = useState<number[] | null>(null);

  // Add a new asset
  const addAsset = () => {
    const newId = (assets.length + 1).toString();
    setAssets([
      ...assets,
      { id: newId, name: `Cổ phiếu ${newId}`, expectedReturn: "10", volatility: "15", weight: "0" }
    ]);
    
    // Update correlation matrix to add a new row and column of default values (0.2)
    const newMatrix = [...correlationMatrix];
    
    // Add a new row
    newMatrix.push(Array(correlationMatrix.length).fill(0.2));
    
    // Add a new element to each existing row
    for (let i = 0; i < newMatrix.length - 1; i++) {
      newMatrix[i] = [...newMatrix[i], 0.2];
    }
    
    // Set diagonal elements to 1.0
    newMatrix[newMatrix.length - 1][newMatrix.length - 1] = 1.0;
    
    setCorrelationMatrix(newMatrix);
  };

  // Remove an asset
  const removeAsset = (idToRemove: string) => {
    if (assets.length <= 2) {
      return; // Keep at least 2 assets
    }
    
    // Find the index of the asset to remove
    const indexToRemove = assets.findIndex(asset => asset.id === idToRemove);
    if (indexToRemove === -1) return;
    
    // Remove the asset
    const newAssets = assets.filter(asset => asset.id !== idToRemove);
    setAssets(newAssets);
    
    // Update correlation matrix by removing the corresponding row and column
    const newMatrix = correlationMatrix.filter((_, i) => i !== indexToRemove)
      .map(row => row.filter((_, j) => j !== indexToRemove));
    
    setCorrelationMatrix(newMatrix);
  };

  // Helper to recalculate weights after any modification
  const recalculateEqualWeights = () => {
    const equalWeight = (100 / assets.length).toFixed(2);
    setAssets(assets.map(asset => ({
      ...asset,
      weight: equalWeight
    })));
  };

  // Update asset property
  const updateAsset = (id: string, field: keyof Asset, value: string) => {
    setAssets(assets.map(asset => 
      asset.id === id ? { ...asset, [field]: value } : asset
    ));
  };

  // Calculate portfolio metrics
  const calculatePortfolio = () => {
    // Convert string inputs to numbers
    const returns = assets.map(asset => parseFloat(asset.expectedReturn) / 100);
    const vols = assets.map(asset => parseFloat(asset.volatility) / 100);
    const weights = assets.map(asset => parseFloat(asset.weight) / 100);
    
    // Validate inputs
    if (returns.some(isNaN) || vols.some(isNaN) || weights.some(isNaN)) {
      setPortfolioReturn("Lỗi: Giá trị không hợp lệ");
      setPortfolioVolatility("Lỗi: Giá trị không hợp lệ");
      setSharpeRatio("Lỗi: Giá trị không hợp lệ");
      return;
    }
    
    // Normalize weights to sum to 1
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    const normalizedWeights = weights.map(w => w / sumWeights);
    
    // Calculate portfolio return
    const portReturn = normalizedWeights.reduce((sum, weight, i) => sum + weight * returns[i], 0);
    
    // Calculate portfolio volatility using correlation matrix
    let portVariance = 0;
    for (let i = 0; i < assets.length; i++) {
      for (let j = 0; j < assets.length; j++) {
        portVariance += normalizedWeights[i] * normalizedWeights[j] * vols[i] * vols[j] * correlationMatrix[i][j];
      }
    }
    const portVol = Math.sqrt(portVariance);
    
    // Calculate Sharpe ratio
    const riskFree = parseFloat(riskFreeRate) / 100;
    const sharp = (portReturn - riskFree) / portVol;
    
    // Set results
    setPortfolioReturn((portReturn * 100).toFixed(2) + "%");
    setPortfolioVolatility((portVol * 100).toFixed(2) + "%");
    setSharpeRatio(sharp.toFixed(3));
  };

  // Simple optimization (equal risk contribution)
  const optimizePortfolio = () => {
    // First calculate current metrics as a reference
    calculatePortfolio();
    
    // Convert string inputs to numbers
    const returns = assets.map(asset => parseFloat(asset.expectedReturn) / 100);
    const vols = assets.map(asset => parseFloat(asset.volatility) / 100);
    
    // Calculate inverse volatility weighting (a simple heuristic optimization)
    const inverseVols = vols.map(vol => 1 / vol);
    const sumInverseVols = inverseVols.reduce((a, b) => a + b, 0);
    const newWeights = inverseVols.map(iv => (iv / sumInverseVols) * 100);
    
    // Update weights in assets
    setAssets(assets.map((asset, i) => ({
      ...asset,
      weight: newWeights[i].toFixed(1)
    })));
    
    // Save weights for display
    setOptimizedWeights(newWeights);
    
    // Calculate metrics with new weights
    setTimeout(calculatePortfolio, 100); // slight delay to ensure state is updated
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Briefcase className="h-4 w-4" />
          Tối ưu hóa Danh mục Đầu tư
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-xs">
        {/* Asset Input */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h3 className="font-medium">Tài sản</h3>
            <div className="flex gap-1">
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 w-6 p-0" 
                onClick={addAsset}
              >
                <Plus className="h-3 w-3" />
                <span className="sr-only">Thêm tài sản</span>
              </Button>
              <Button 
                size="sm" 
                variant="outline" 
                className="h-6 w-6 p-0" 
                onClick={recalculateEqualWeights}
              >
                <Percent className="h-3 w-3" />
                <span className="sr-only">Cân bằng tỷ trọng</span>
              </Button>
            </div>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-medium w-[30%]">Tên</TableHead>
                <TableHead className="text-xs font-medium w-[20%]">Lợi nhuận (%)</TableHead>
                <TableHead className="text-xs font-medium w-[20%]">Độ biến động (%)</TableHead>
                <TableHead className="text-xs font-medium w-[20%]">Tỷ trọng (%)</TableHead>
                <TableHead className="text-xs font-medium w-[10%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="py-1 px-2">
                    <Input 
                      value={asset.name} 
                      onChange={(e) => updateAsset(asset.id, "name", e.target.value)}
                      className="h-6 text-xs" 
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Input 
                      value={asset.expectedReturn} 
                      onChange={(e) => updateAsset(asset.id, "expectedReturn", e.target.value)}
                      className="h-6 text-xs" 
                      type="number"
                      min="0"
                      step="0.1"
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Input 
                      value={asset.volatility} 
                      onChange={(e) => updateAsset(asset.id, "volatility", e.target.value)}
                      className="h-6 text-xs" 
                      type="number"
                      min="0.1"
                      step="0.1"
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2">
                    <Input 
                      value={asset.weight} 
                      onChange={(e) => updateAsset(asset.id, "weight", e.target.value)}
                      className="h-6 text-xs" 
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                    />
                  </TableCell>
                  <TableCell className="py-1 px-2 text-center">
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      className="h-6 w-6 p-0 text-destructive hover:text-destructive hover:bg-destructive/10" 
                      onClick={() => removeAsset(asset.id)}
                    >
                      <Minus className="h-3 w-3" />
                      <span className="sr-only">Xóa</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="risk-free-rate">Lãi suất phi rủi ro (%)</Label>
            <Input 
              id="risk-free-rate" 
              value={riskFreeRate} 
              onChange={(e) => setRiskFreeRate(e.target.value)}
              className="h-7"
              type="number"
              min="0"
              step="0.1"
            />
          </div>
          <div>
            <Alert className="bg-accent/30 border-muted h-[42px] flex items-center py-1 mt-6">
              <AlertDescription className="text-[10px]">
                Mức tối ưu tính dựa trên tỷ lệ rủi ro/lợi nhuận.
              </AlertDescription>
            </Alert>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Button 
            size="sm" 
            className="h-7 text-xs"
            onClick={calculatePortfolio}
          >
            <LineChart className="h-3 w-3 mr-1" />
            Tính toán Danh mục
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-7 text-xs"
            onClick={optimizePortfolio}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Tối ưu hóa Danh mục
          </Button>
        </div>
        
        {portfolioReturn && portfolioVolatility && sharpeRatio && (
          <>
            <Separator />
            <div className="space-y-1">
              <h3 className="font-medium mb-2">Kết quả</h3>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <div className="bg-accent/30 p-2 rounded">
                  <span className="font-medium">Lợi nhuận dự kiến: </span>
                  {portfolioReturn}
                </div>
                <div className="bg-accent/30 p-2 rounded">
                  <span className="font-medium">Độ biến động: </span>
                  {portfolioVolatility}
                </div>
                <div className="bg-accent/30 p-2 rounded">
                  <span className="font-medium">Sharpe Ratio: </span>
                  {sharpeRatio}
                </div>
              </div>
            </div>
          </>
        )}
        
        {optimizedWeights && (
          <div className="space-y-1">
            <span className="text-muted-foreground">* Tỷ trọng được tối ưu để cân bằng rủi ro/lợi nhuận</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 