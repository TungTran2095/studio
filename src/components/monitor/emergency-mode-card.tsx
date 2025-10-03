import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  Wifi, 
  WifiOff, 
  RefreshCw,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react';

interface EmergencyModeStatus {
  enabled: boolean;
  timestamp: string;
  reason: string;
  autoResetTime: string;
}

interface EmergencyModeCardProps {
  className?: string;
}

export function EmergencyModeCard({ className }: EmergencyModeCardProps) {
  const [emergencyStatus, setEmergencyStatus] = useState<EmergencyModeStatus | null>(null);
  const [timeUntilReset, setTimeUntilReset] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Check emergency mode status
  const checkEmergencyStatus = async () => {
    try {
      const response = await fetch('/api/monitor/emergency-status');
      if (response.ok) {
        const data = await response.json();
        setEmergencyStatus(data);
      } else {
        setEmergencyStatus(null);
      }
    } catch (error) {
      console.error('Failed to check emergency status:', error);
      setEmergencyStatus(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate time until reset
  useEffect(() => {
    if (!emergencyStatus?.autoResetTime) return;

    const updateTime = () => {
      const now = new Date();
      const resetTime = new Date(emergencyStatus.autoResetTime);
      const diff = resetTime.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeUntilReset('Đã reset');
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeUntilReset(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [emergencyStatus]);

  // Check status on mount and every 30 seconds
  useEffect(() => {
    checkEmergencyStatus();
    const interval = setInterval(checkEmergencyStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualReset = async () => {
    try {
      const response = await fetch('/api/monitor/emergency-reset', {
        method: 'POST'
      });
      
      if (response.ok) {
        await checkEmergencyStatus();
      }
    } catch (error) {
      console.error('Failed to reset emergency mode:', error);
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Đang kiểm tra trạng thái...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!emergencyStatus?.enabled) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Trạng thái API bình thường
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Hệ thống đang hoạt động bình thường. Không có giới hạn khẩn cấp nào được áp dụng.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} border-red-200 bg-red-50`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-700">
          <AlertTriangle className="h-5 w-5" />
          Chế độ khẩn cấp đang hoạt động
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-red-200 bg-red-100">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>Lý do:</strong> {emergencyStatus.reason}
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Thời gian kích hoạt:</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {new Date(emergencyStatus.timestamp).toLocaleString('vi-VN')}
            </Badge>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-gray-600" />
              <span className="text-sm font-medium">Tự động reset:</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {timeUntilReset}
            </Badge>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Các biện pháp đã áp dụng:</h4>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Tất cả API calls đến Binance đã bị chặn
            </li>
            <li className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-600" />
              Giới hạn rate limit giảm xuống mức cực thấp
            </li>
            <li className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 text-orange-600" />
              Polling intervals tăng lên 30-60 giây
            </li>
            <li className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-green-600" />
              WebSocket được ưu tiên sử dụng
            </li>
          </ul>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              <p>• Đợi IP ban tự động hết hạn</p>
              <p>• Sử dụng WebSocket thay vì REST API</p>
              <p>• Kiểm tra lại sau {timeUntilReset}</p>
            </div>
            
            <Button 
              onClick={handleManualReset}
              variant="outline"
              size="sm"
              className="text-red-600 border-red-300 hover:bg-red-50"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset thủ công
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
