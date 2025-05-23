"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  ExternalLink, 
  X,
  Key
} from 'lucide-react';

interface ApiSetupNoticeProps {
  onDismiss?: () => void;
  showOnlyOnError?: boolean;
}

export function ApiSetupNotice({ onDismiss, showOnlyOnError = true }: ApiSetupNoticeProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    coinmarketcap: boolean;
    supabase: boolean;
  }>({ coinmarketcap: true, supabase: true }); // Mặc định là OK

  useEffect(() => {
    // Kiểm tra API status thực tế thông qua API calls
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      // Test CoinMarketCap thông qua endpoint có sẵn
      const response = await fetch('/api/market-data/collect?action=test_coinmarketcap');
      const data = await response.json();
      
      console.log('CoinMarketCap API test response:', data);
      
      setApiStatus(prev => ({
        ...prev,
        coinmarketcap: data.success === true
      }));
    } catch (error) {
      console.error('API status check failed:', error);
      setApiStatus(prev => ({
        ...prev,
        coinmarketcap: false
      }));
    }
  };

  const hasIssues = !apiStatus.coinmarketcap || !apiStatus.supabase;

  // Nếu showOnlyOnError = true và không có issues thì không hiển thị
  if (showOnlyOnError && !hasIssues) {
    return null;
  }

  if (isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-2">
          <Key className="h-5 w-5 text-amber-600" />
          <CardTitle className="text-lg text-amber-800">Cấu hình API Keys</CardTitle>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-amber-600 hover:text-amber-800"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <CardDescription className="text-amber-700">
          Kiểm tra trạng thái kết nối API các dịch vụ
        </CardDescription>

        <div className="space-y-3">
          {/* Supabase Status */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="font-medium">Supabase Database</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <CheckCircle className="h-3 w-3 mr-1" />
              Kết nối
            </Badge>
          </div>

          {/* CoinMarketCap Status */}
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border">
            <div className="flex items-center gap-2">
              <div className={`h-2 w-2 rounded-full ${apiStatus.coinmarketcap ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="font-medium">CoinMarketCap API</span>
            </div>
            {apiStatus.coinmarketcap ? (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                <CheckCircle className="h-3 w-3 mr-1" />
                Hoạt động
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertCircle className="h-3 w-3 mr-1" />
                Cần kiểm tra
              </Badge>
            )}
          </div>
        </div>

        {!apiStatus.coinmarketcap && (
          <Alert className="border-amber-200 bg-amber-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-amber-800">
              <strong>CoinMarketCap API Key</strong> có thể chưa được cấu hình đúng.
              <br />
              Kiểm tra file <code>.env</code> có dòng: <code>COINMARKETCAP_API_KEY=your_api_key</code>
            </AlertDescription>
          </Alert>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkApiStatus}
            className="text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            <Settings className="h-4 w-4 mr-1" />
            Kiểm tra lại
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
            className="text-amber-700 border-amber-300 hover:bg-amber-100"
          >
            <a href="/SETUP.md" target="_blank">
              <ExternalLink className="h-4 w-4 mr-1" />
              Hướng dẫn setup
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
} 