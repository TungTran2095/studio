"use client";

import { usePriceAlerts } from "../hooks/use-price-alerts";
import { AlertType, NotificationChannel } from "../services/price-monitor";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Trash2, Bell, AlertTriangle, Activity, Percent, BarChart4 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function AlertsManager() {
  const { alerts, toggleAlert, removeAlert } = usePriceAlerts();

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Không có cảnh báo nào</h3>
        <p className="text-muted-foreground mt-2 mb-6">
          Bạn chưa thiết lập bất kỳ cảnh báo nào.
        </p>
        <Button variant="outline">Tạo cảnh báo mới</Button>
      </div>
    );
  }

  const formatTime = (date?: Date) => {
    if (!date) return "Chưa kích hoạt";
    return formatDistanceToNow(date, { addSuffix: true, locale: vi });
  };

  const getAlertIcon = (type: AlertType) => {
    switch (type) {
      case AlertType.PRICE_THRESHOLD:
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case AlertType.PRICE_CHANGE:
        return <Percent className="h-4 w-4 text-blue-500" />;
      case AlertType.CANDLESTICK_PATTERN:
        return <BarChart4 className="h-4 w-4 text-purple-500" />;
      case AlertType.VOLUME_SPIKE:
        return <Activity className="h-4 w-4 text-green-500" />;
      default:
        return <Bell className="h-4 w-4 text-primary" />;
    }
  };

  const getAlertTypeText = (type: AlertType) => {
    switch (type) {
      case AlertType.PRICE_THRESHOLD:
        return "Ngưỡng giá";
      case AlertType.PRICE_CHANGE:
        return "Biến động giá";
      case AlertType.CANDLESTICK_PATTERN:
        return "Mẫu hình nến";
      case AlertType.VOLUME_SPIKE:
        return "Đột biến khối lượng";
      default:
        return "Khác";
    }
  };
  
  const getAlertConditionText = (alert: any) => {
    try {
      const { conditions, type } = alert;
      
      switch (type) {
        case AlertType.PRICE_THRESHOLD:
          return `${conditions.direction === 'above' ? 'Vượt' : 'Giảm dưới'} ${conditions.price.toLocaleString()} ${conditions.currency}`;
          
        case AlertType.PRICE_CHANGE:
          return `${conditions.direction === 'increase' ? 'Tăng' : 'Giảm'} ${conditions.percentage}% trong ${conditions.timeframe === '1h' ? '1 giờ' : '24 giờ'}`;
          
        case AlertType.CANDLESTICK_PATTERN:
          return `Mẫu ${conditions.patterns.join(', ')} (${conditions.timeframe})`;
          
        default:
          return "Điều kiện tùy chỉnh";
      }
    } catch (error) {
      return "Không thể hiển thị điều kiện";
    }
  };

  const getNotificationChannels = (channels: NotificationChannel[]) => {
    const channelLabels: Record<NotificationChannel, string> = {
      [NotificationChannel.IN_APP]: "Trong ứng dụng",
      [NotificationChannel.EMAIL]: "Email",
      [NotificationChannel.TELEGRAM]: "Telegram",
      [NotificationChannel.WEBHOOK]: "Webhook",
    };
    
    return channels.map(channel => channelLabels[channel]).join(", ");
  };

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">Trạng thái</TableHead>
            <TableHead className="w-[110px]">Loại</TableHead>
            <TableHead>Điều kiện</TableHead>
            <TableHead className="w-[140px]">Kích hoạt cuối</TableHead>
            <TableHead className="w-[150px]">Thông báo qua</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <ScrollArea className="max-h-[400px]">
            {alerts.map((alert) => (
              <TableRow key={alert.id}>
                <TableCell>
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={() => toggleAlert(alert.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getAlertIcon(alert.type)}
                    <span className="text-sm">{getAlertTypeText(alert.type)}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{getAlertConditionText(alert)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {formatTime(alert.lastTriggered)}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {getNotificationChannels(alert.notifyVia)}
                  </span>
                </TableCell>
                <TableCell>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeAlert(alert.id)}
                          className="h-7 w-7"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Xóa cảnh báo</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </TableCell>
              </TableRow>
            ))}
          </ScrollArea>
        </TableBody>
      </Table>
    </div>
  );
} 