'use client';

import { useState, useEffect, useCallback } from 'react';
import { priceMonitor, Alert, type Notification as AlertNotification, AlertType, NotificationChannel, MarketState } from '../services/price-monitor';

export function usePriceAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<AlertNotification[]>([]);
  const [marketState, setMarketState] = useState<MarketState>(priceMonitor.getMarketState());
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Cập nhật state khi có thông báo mới
  const handleNewNotification = useCallback((notification: AlertNotification) => {
    setNotificationHistory((prev) => [notification, ...prev]);
    setUnreadCount((prev) => prev + 1);
    
    // Hiển thị thông báo nền nếu browser hỗ trợ
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification('Yinsen AI', {
          body: notification.message,
          icon: '/logo.png'
        });
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  }, []);

  // Khởi tạo và cập nhật trạng thái
  useEffect(() => {
    // Cập nhật state ban đầu
    setAlerts(priceMonitor.getAlerts());
    setNotificationHistory(priceMonitor.getNotificationHistory());
    setUnreadCount(priceMonitor.getUnreadNotificationsCount());
    
    // Đăng ký callback cho thông báo mới
    priceMonitor.setNotificationCallback(handleNewNotification);
    
    // Bắt đầu giám sát
    const cleanup = priceMonitor.startMonitoring();
    
    // Yêu cầu quyền thông báo nếu browser hỗ trợ
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    
    // Cập nhật state thị trường định kỳ
    const intervalId = setInterval(() => {
      setMarketState(priceMonitor.getMarketState());
    }, 10000);
    
    return () => {
      if (cleanup) cleanup();
      clearInterval(intervalId);
    };
  }, [handleNewNotification]);

  // Thêm cảnh báo ngưỡng giá
  const addPriceThresholdAlert = useCallback(
    (price: number, direction: 'above' | 'below', notifyVia: NotificationChannel[] = [NotificationChannel.IN_APP]) => {
      setIsLoading(true);
      
      try {
        const newAlert = priceMonitor.addPriceThresholdAlert(price, direction, notifyVia);
        setAlerts((prev) => [...prev, newAlert]);
        
        setIsLoading(false);
        return newAlert;
      } catch (error) {
        console.error('Error adding price threshold alert:', error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  // Thêm cảnh báo biến động giá
  const addPriceChangeAlert = useCallback(
    (
      percentage: number,
      direction: 'increase' | 'decrease',
      timeframe: '1h' | '24h',
      notifyVia: NotificationChannel[] = [NotificationChannel.IN_APP]
    ) => {
      setIsLoading(true);
      
      try {
        const newAlert = priceMonitor.addPriceChangeAlert(percentage, direction, timeframe, notifyVia);
        setAlerts((prev) => [...prev, newAlert]);
        
        setIsLoading(false);
        return newAlert;
      } catch (error) {
        console.error('Error adding price change alert:', error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  // Thêm cảnh báo mẫu hình nến
  const addCandlestickPatternAlert = useCallback(
    (
      patterns: string[],
      timeframe: '1h' | '4h' | '1d',
      notifyVia: NotificationChannel[] = [NotificationChannel.IN_APP]
    ) => {
      setIsLoading(true);
      
      try {
        const newAlert = priceMonitor.addCandlestickPatternAlert(patterns, timeframe, notifyVia);
        setAlerts((prev) => [...prev, newAlert]);
        
        setIsLoading(false);
        return newAlert;
      } catch (error) {
        console.error('Error adding candlestick pattern alert:', error);
        setIsLoading(false);
        throw error;
      }
    },
    []
  );

  // Xóa cảnh báo
  const removeAlert = useCallback((alertId: string) => {
    priceMonitor.removeAlert(alertId);
    setAlerts((prev) => prev.filter((alert) => alert.id !== alertId));
  }, []);

  // Bật/tắt cảnh báo
  const toggleAlert = useCallback((alertId: string) => {
    const isActive = priceMonitor.toggleAlert(alertId);
    setAlerts((prev) =>
      prev.map((alert) => (alert.id === alertId ? { ...alert, isActive } : alert))
    );
    return isActive;
  }, []);

  // Đánh dấu thông báo đã đọc
  const markNotificationAsRead = useCallback((notificationId: string) => {
    priceMonitor.markNotificationAsRead(notificationId);
    setNotificationHistory((prev) =>
      prev.map((notification) =>
        notification.id === notificationId ? { ...notification, read: true } : notification
      )
    );
    setUnreadCount(priceMonitor.getUnreadNotificationsCount());
  }, []);

  // Đánh dấu tất cả thông báo đã đọc
  const markAllNotificationsAsRead = useCallback(() => {
    const updatedHistory = notificationHistory.map((notification) => ({
      ...notification,
      read: true,
    }));
    
    // Cập nhật lại từng thông báo trong service
    for (const notification of updatedHistory) {
      if (!notification.read) {
        priceMonitor.markNotificationAsRead(notification.id);
      }
    }
    
    setNotificationHistory(updatedHistory);
    setUnreadCount(0);
  }, [notificationHistory]);

  // Kiểm tra thủ công các điều kiện cảnh báo
  const checkAlertsManually = useCallback(async () => {
    setIsLoading(true);
    try {
      await priceMonitor.checkAlerts();
      setIsLoading(false);
      return true;
    } catch (error) {
      console.error('Error checking alerts manually:', error);
      setIsLoading(false);
      return false;
    }
  }, []);

  return {
    // Dữ liệu
    alerts,
    notificationHistory,
    marketState,
    unreadCount,
    
    // Các actions cho alerts
    addPriceThresholdAlert,
    addPriceChangeAlert,
    addCandlestickPatternAlert,
    removeAlert,
    toggleAlert,
    
    // Các actions cho notifications
    markNotificationAsRead,
    markAllNotificationsAsRead,
    
    // Thêm các thông tin khác
    isLoading,
    checkAlertsManually,
    
    // Số lượng cảnh báo đang active
    activeAlertsCount: alerts.filter(alert => alert.isActive).length,
  };
} 