"use client";

import { useState } from "react";
import { usePriceAlerts } from "../hooks/use-price-alerts";
import { BellOff, CheckCircle, Bell, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";

export function NotificationsPanel() {
  const { notificationHistory, markNotificationAsRead, markAllNotificationsAsRead } = usePriceAlerts();
  
  // Format timestamp tới thời gian tương đối
  const formatTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return formatDistanceToNow(dateObj, { addSuffix: true, locale: vi });
    } catch (error) {
      return "N/A";
    }
  };

  if (notificationHistory.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <BellOff className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
        <h3 className="text-lg font-medium">Không có thông báo nào</h3>
        <p className="text-muted-foreground mt-2">
          Các thông báo sẽ xuất hiện ở đây khi cảnh báo của bạn được kích hoạt.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Thông báo gần đây</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={markAllNotificationsAsRead}
          className="h-8"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Đánh dấu tất cả đã đọc
        </Button>
      </div>
      
      <div className="border rounded-md">
        <ScrollArea className="h-[400px]">
          <ul className="divide-y">
            {notificationHistory.map((notification) => (
              <li 
                key={notification.id} 
                className={`p-4 hover:bg-muted/50 transition-colors ${notification.read ? '' : 'bg-muted/20'}`}
                onClick={() => !notification.read && markNotificationAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm">{notification.message}</p>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{formatTime(notification.createdAt)}</span>
                      {!notification.read && (
                        <>
                          <Separator orientation="vertical" className="mx-2 h-3" />
                          <span className="flex items-center text-primary">
                            <Bell className="h-3 w-3 mr-1" />
                            Chưa đọc
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </ScrollArea>
      </div>
    </div>
  );
} 