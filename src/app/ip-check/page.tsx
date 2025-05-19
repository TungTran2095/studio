'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { ClipboardCopy, NetworkIcon, RefreshCw } from 'lucide-react';

export default function IPCheckPage() {
  const [ipInfo, setIpInfo] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Tải thông tin IP khi trang được tải
  useEffect(() => {
    fetchIPInfo();
  }, []);

  // Hàm lấy thông tin IP
  const fetchIPInfo = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);

    try {
      const response = await fetch('/api/ip-check');
      if (!response.ok) {
        throw new Error('Failed to fetch IP information');
      }
      const data = await response.json();
      setIpInfo(data);
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Sao chép IP vào clipboard
  const copyIP = () => {
    if (ipInfo?.ip) {
      navigator.clipboard.writeText(ipInfo.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Kiểm Tra IP Cho Binance API</h1>
      
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <NetworkIcon className="mr-2" /> 
            Thông Tin IP Của Bạn
          </CardTitle>
          <CardDescription>
            Sử dụng địa chỉ IP này để thêm vào whitelist cho Binance API
          </CardDescription>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertTitle>Lỗi</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={fetchIPInfo}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Thử lại
              </Button>
            </Alert>
          ) : (
            <>
              <div className="bg-muted p-4 rounded-md mb-4 flex justify-between items-center">
                <span className="font-mono text-xl">{ipInfo?.ip || 'Unknown'}</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={copyIP}
                >
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  {copied ? 'Đã sao chép!' : 'Sao chép'}
                </Button>
              </div>

              <Separator className="my-4" />
              
              <h3 className="font-semibold text-lg mb-2">Hướng dẫn:</h3>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Sao chép địa chỉ IP của bạn từ phía trên</li>
                <li>Đăng nhập vào tài khoản Binance của bạn</li>
                <li>Vào phần API Management</li>
                <li>Chọn "Edit restrictions" cho API key của bạn</li>
                <li>Thêm IP của bạn vào danh sách cho phép (restrict access only to trusted IPs)</li>
                <li>Đối với Binance Testnet, truy cập <a href="https://testnet.binance.vision" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">testnet.binance.vision</a> và đăng ký IP của bạn</li>
              </ol>

              {ipInfo?.geo && (
                <>
                  <Separator className="my-4" />
                  <h3 className="font-semibold text-lg mb-2">Thông tin bổ sung:</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>Quốc gia:</div>
                    <div>{ipInfo.geo.country_name || 'Unknown'}</div>
                    <div>Thành phố:</div>
                    <div>{ipInfo.geo.city || 'Unknown'}</div>
                    <div>Nhà cung cấp:</div>
                    <div>{ipInfo.geo.org || 'Unknown'}</div>
                  </div>
                </>
              )}
              
              <Button 
                className="w-full mt-6" 
                onClick={fetchIPInfo}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Làm mới
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 