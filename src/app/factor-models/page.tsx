import React from "react";
import { FactorModels } from "@/components/analysis/factor-models";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export default function FactorModelsPage() {
  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-4">Phân tích Mô hình Yếu tố Bitcoin</h1>
      <p className="text-muted-foreground mb-6">
        Trang này hiển thị phân tích chi tiết về các mô hình yếu tố (factor models) ảnh hưởng đến giá BTC/USDT.
      </p>
      
      <Alert className="mb-6 bg-muted/50">
        <Info className="h-4 w-4 mr-2" />
        <AlertDescription>
          Phân tích sử dụng dữ liệu thời gian thực từ thị trường để tính toán các hệ số beta và hiển thị mối quan hệ giữa các yếu tố khác nhau với giá Bitcoin.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="p-4 border rounded-md">
          <h3 className="text-sm font-medium mb-2">Phiên bản cơ bản: CAPM</h3>
          <p className="text-xs text-muted-foreground">
            Mô hình định giá tài sản vốn chỉ sử dụng Beta thị trường để đo lường rủi ro hệ thống.
          </p>
        </div>
        
        <div className="p-4 border rounded-md">
          <h3 className="text-sm font-medium mb-2">Mô hình mở rộng: Fama-French &amp; Carhart</h3>
          <p className="text-xs text-muted-foreground">
            Mở rộng CAPM bằng cách thêm các yếu tố quy mô, giá trị và momentum để cải thiện độ chính xác.
          </p>
        </div>
        
        <div className="p-4 border rounded-md">
          <h3 className="text-sm font-medium mb-2">Mô hình đặc thù: Crypto Factors</h3>
          <p className="text-xs text-muted-foreground">
            Phân tích toàn diện với 7 yếu tố đặc thù của tiền điện tử bao gồm tính thanh khoản, biến động và dữ liệu mạng.
          </p>
        </div>
      </div>
      
      <Separator className="my-6" />
      
      <FactorModels />
      
      <div className="mt-8 text-sm">
        <h3 className="font-medium mb-2">Cách đọc hiểu dữ liệu:</h3>
        <ul className="list-disc pl-5 space-y-1 text-xs text-muted-foreground">
          <li><strong>Beta (β)</strong>: Hệ số ảnh hưởng của yếu tố đến giá BTC. Giá trị dương nghĩa là có tương quan thuận, âm là tương quan nghịch.</li>
          <li><strong>t-statistic</strong>: Đo lường độ tin cậy thống kê của hệ số beta. Giá trị tuyệt đối càng cao càng đáng tin cậy.</li>
          <li><strong>R-squared</strong>: Phần trăm biến động giá BTC được giải thích bởi mô hình. Càng cao càng tốt.</li>
          <li><strong>Significance</strong>: Mức độ ý nghĩa thống kê (p-value). &quot;High&quot; tương đương p&lt;0.01, &quot;Medium&quot; là p&lt;0.05.</li>
        </ul>
      </div>
    </div>
  );
} 