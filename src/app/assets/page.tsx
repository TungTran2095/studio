"use client";

import { AssetSummary } from "@/components/assets/asset-summary";
import PortfolioAnalysis from "@/components/portfolio/portfolio-analysis";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Asset } from "@/actions/binance";

export default function AssetsPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Quản lý tài sản</h1>
      
      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="summary">Tổng quan tài sản</TabsTrigger>
          <TabsTrigger value="analysis">Phân tích danh mục</TabsTrigger>
        </TabsList>
        
        <TabsContent value="summary">
          <AssetSummaryContainer />
        </TabsContent>
        
        <TabsContent value="analysis">
          <PortfolioAnalysisWrapper />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Container cho AssetSummary với các props cần thiết
function AssetSummaryContainer() {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const handleToggle = () => {
    setIsExpanded(!isExpanded);
  };
  
  return <AssetSummary isExpanded={isExpanded} onToggle={handleToggle} />;
}

// Wrapper component để truyền credentials và assets từ AssetSummary sang PortfolioAnalysis
function PortfolioAnalysisWrapper() {
  // Trong thực tế, bạn sẽ sử dụng một state manager như Redux hoặc Context API
  // để chia sẻ dữ liệu giữa các component, nhưng chúng ta sẽ sử dụng cách đơn giản
  // bằng cách lấy dữ liệu từ localStorage
  
  return (
    <div className="w-full">
      <div className="mb-4 text-sm text-muted-foreground">
        <p>
          Sử dụng dữ liệu từ tài khoản Binance đã kết nối ở tab Tổng quan để phân tích danh mục đầu tư.
        </p>
      </div>
      
      <ClientSideAnalysis />
    </div>
  );
}

function ClientSideAnalysis() {
  const [credentials, setCredentials] = useState({
    apiKey: "",
    apiSecret: "",
    isTestnet: true,
    useDefault: false
  });
  
  const [assets, setAssets] = useState<Asset[]>([]);
  
  // Lấy thông tin đăng nhập và tài sản từ localStorage khi component được mount
  useEffect(() => {
    // Thử đọc credentials từ localStorage
    try {
      const storedCredentials = localStorage.getItem("binance_credentials");
      if (storedCredentials) {
        setCredentials(JSON.parse(storedCredentials));
      }
    } catch (error) {
      console.error("Lỗi khi đọc thông tin đăng nhập từ localStorage:", error);
    }
    
    // Thử đọc assets từ localStorage
    try {
      const storedAssets = localStorage.getItem("binance_assets");
      if (storedAssets) {
        setAssets(JSON.parse(storedAssets));
      }
    } catch (error) {
      console.error("Lỗi khi đọc dữ liệu tài sản từ localStorage:", error);
    }
  }, []);
  
  // Kiểm tra xem có dữ liệu để phân tích không
  if (!credentials.apiKey || !credentials.apiSecret || assets.length === 0) {
    return (
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm p-6">
        <div className="text-center py-8">
          <h3 className="text-lg font-medium">Chưa có dữ liệu để phân tích</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Vui lòng kết nối tài khoản Binance ở tab Tổng quan và đảm bảo rằng dữ liệu tài sản đã được tải.
          </p>
        </div>
      </div>
    );
  }
  
  // Nếu có dữ liệu, hiển thị component phân tích
  return <PortfolioAnalysis credentials={credentials} assets={assets} />;
} 