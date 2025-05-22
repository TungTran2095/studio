'use client';

import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

// Các loại cảnh báo
export enum AlertType {
  PRICE_THRESHOLD = 'price_threshold',
  PRICE_CHANGE = 'price_change',
  CANDLESTICK_PATTERN = 'candlestick_pattern',
  VOLUME_SPIKE = 'volume_spike',
  TECHNICAL_INDICATOR = 'technical_indicator',
}

// Các kênh thông báo
export enum NotificationChannel {
  IN_APP = 'in_app',
  EMAIL = 'email',
  TELEGRAM = 'telegram',
  WEBHOOK = 'webhook',
}

// Interface cho cảnh báo cơ bản
export interface Alert {
  id: string;
  type: AlertType;
  conditions: any;
  notifyVia: NotificationChannel[];
  isActive: boolean;
  createdAt: Date;
  lastTriggered?: Date;
}

// Interface cho thông báo
export interface Notification {
  id: string;
  alertId: string;
  message: string;
  createdAt: Date;
  read: boolean;
}

// Interface cho trạng thái thị trường
export interface MarketState {
  btcPrice: number;
  priceChange1h: number;
  priceChange24h: number;
  lastUpdated: Date;
}

// Service để giám sát giá và phát hiện các điều kiện kích hoạt cảnh báo
export class PriceMonitorService {
  private alerts: Alert[] = [];
  private notificationHistory: Notification[] = [];
  private marketState: MarketState = {
    btcPrice: 0,
    priceChange1h: 0,
    priceChange24h: 0,
    lastUpdated: new Date(),
  };
  private isMonitoring = false;
  private checkInterval: NodeJS.Timeout | null = null;
  private onNotification: ((notification: Notification) => void) | null = null;

  // Khởi tạo service
  constructor() {
    // Load dữ liệu từ localStorage nếu có
    this.loadFromStorage();
  }

  // Lưu dữ liệu vào localStorage
  private saveToStorage() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('yinsen_alerts', JSON.stringify(this.alerts));
      localStorage.setItem('yinsen_notifications', JSON.stringify(this.notificationHistory));
    }
  }

  // Load dữ liệu từ localStorage
  private loadFromStorage() {
    if (typeof window !== 'undefined') {
      const savedAlerts = localStorage.getItem('yinsen_alerts');
      const savedNotifications = localStorage.getItem('yinsen_notifications');

      if (savedAlerts) {
        try {
          this.alerts = JSON.parse(savedAlerts).map((alert: any) => ({
            ...alert,
            createdAt: new Date(alert.createdAt),
            lastTriggered: alert.lastTriggered ? new Date(alert.lastTriggered) : undefined,
          }));
        } catch (error) {
          console.error('Error parsing saved alerts:', error);
        }
      }

      if (savedNotifications) {
        try {
          this.notificationHistory = JSON.parse(savedNotifications).map((notification: any) => ({
            ...notification,
            createdAt: new Date(notification.createdAt),
          }));
        } catch (error) {
          console.error('Error parsing saved notifications:', error);
        }
      }
    }
  }

  // Bắt đầu quá trình giám sát giá
  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.checkAlerts(); // Kiểm tra ngay lập tức

    // Thiết lập interval để kiểm tra định kỳ
    this.checkInterval = setInterval(() => {
      this.checkAlerts();
    }, 30000); // Kiểm tra mỗi 30 giây

    return () => this.stopMonitoring();
  }

  // Dừng quá trình giám sát giá
  stopMonitoring() {
    if (!this.isMonitoring || !this.checkInterval) return;

    clearInterval(this.checkInterval);
    this.checkInterval = null;
    this.isMonitoring = false;
  }

  // Đăng ký callback khi có thông báo mới
  setNotificationCallback(callback: (notification: Notification) => void) {
    this.onNotification = callback;
  }

  // Lấy trạng thái thị trường hiện tại
  getMarketState(): MarketState {
    return this.marketState;
  }

  // Cập nhật trạng thái thị trường (sẽ được gọi từ API hoặc websocket)
  async updateMarketState() {
    try {
      // Truy cập Binance API để lấy dữ liệu
      const response = await fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT');
      const data = await response.json();

      // Cập nhật giá và % thay đổi
      this.marketState = {
        btcPrice: parseFloat(data.lastPrice),
        priceChange1h: 0, // Không có sẵn từ API, cần tính toán riêng
        priceChange24h: parseFloat(data.priceChangePercent),
        lastUpdated: new Date(),
      };

      // Cập nhật giá thay đổi trong 1h (có thể cần API riêng)
      await this.updateHourlyChange();

      return this.marketState;
    } catch (error) {
      console.error('Error updating market state:', error);
      return this.marketState;
    }
  }

  // Cập nhật % thay đổi giá trong 1h
  private async updateHourlyChange() {
    try {
      // Lấy dữ liệu candlestick cho 1h gần nhất
      const response = await fetch('https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=2');
      const data = await response.json();

      // Tính toán % thay đổi
      if (data && data.length >= 2) {
        const currentPrice = parseFloat(data[1][4]); // Close price of current candle
        const previousPrice = parseFloat(data[0][4]); // Close price of previous candle
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;

        this.marketState.priceChange1h = parseFloat(priceChange.toFixed(2));
      }
    } catch (error) {
      console.error('Error updating hourly change:', error);
    }
  }

  // Thêm cảnh báo ngưỡng giá
  addPriceThresholdAlert(price: number, direction: 'above' | 'below', notifyVia: NotificationChannel[]) {
    const alert: Alert = {
      id: uuidv4(),
      type: AlertType.PRICE_THRESHOLD,
      conditions: {
        type: 'threshold',
        price,
        direction,
        currency: 'USDT',
      },
      notifyVia,
      isActive: true,
      createdAt: new Date(),
    };

    this.alerts.push(alert);
    this.saveToStorage();
    return alert;
  }

  // Thêm cảnh báo biến động giá
  addPriceChangeAlert(
    percentage: number,
    direction: 'increase' | 'decrease',
    timeframe: '1h' | '24h',
    notifyVia: NotificationChannel[]
  ) {
    const alert: Alert = {
      id: uuidv4(),
      type: AlertType.PRICE_CHANGE,
      conditions: {
        type: 'change',
        percentage,
        direction,
        timeframe,
      },
      notifyVia,
      isActive: true,
      createdAt: new Date(),
    };

    this.alerts.push(alert);
    this.saveToStorage();
    return alert;
  }

  // Thêm cảnh báo mẫu hình nến
  addCandlestickPatternAlert(
    patterns: string[],
    timeframe: '1h' | '4h' | '1d',
    notifyVia: NotificationChannel[]
  ) {
    const alert: Alert = {
      id: uuidv4(),
      type: AlertType.CANDLESTICK_PATTERN,
      conditions: {
        type: 'pattern',
        patterns,
        timeframe,
      },
      notifyVia,
      isActive: true,
      createdAt: new Date(),
    };

    this.alerts.push(alert);
    this.saveToStorage();
    return alert;
  }

  // Xóa cảnh báo
  removeAlert(alertId: string) {
    this.alerts = this.alerts.filter((alert) => alert.id !== alertId);
    this.saveToStorage();
  }

  // Bật/tắt cảnh báo
  toggleAlert(alertId: string) {
    const alert = this.alerts.find((a) => a.id === alertId);
    if (alert) {
      alert.isActive = !alert.isActive;
      this.saveToStorage();
      return alert.isActive;
    }
    return false;
  }

  // Đánh dấu thông báo đã đọc
  markNotificationAsRead(notificationId: string) {
    const notification = this.notificationHistory.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveToStorage();
    }
  }

  // Lấy tất cả cảnh báo
  getAlerts() {
    return this.alerts;
  }

  // Lấy số cảnh báo đang hoạt động
  getActiveAlertsCount() {
    return this.alerts.filter((alert) => alert.isActive).length;
  }

  // Lấy lịch sử thông báo
  getNotificationHistory() {
    return this.notificationHistory;
  }

  // Lấy số thông báo chưa đọc
  getUnreadNotificationsCount() {
    return this.notificationHistory.filter((notification) => !notification.read).length;
  }

  // Kiểm tra các điều kiện cảnh báo
  async checkAlerts() {
    // Cập nhật trạng thái thị trường
    await this.updateMarketState();
    
    const activeAlerts = this.alerts.filter((alert) => alert.isActive);
    
    // Nếu không có cảnh báo nào đang hoạt động, không cần kiểm tra
    if (activeAlerts.length === 0) return;
    
    // Kiểm tra từng cảnh báo
    for (const alert of activeAlerts) {
      if (this.checkAlertCondition(alert)) {
        this.triggerAlert(alert);
      }
    }
  }

  // Kiểm tra điều kiện của một cảnh báo
  private checkAlertCondition(alert: Alert): boolean {
    const { conditions } = alert;
    const { btcPrice, priceChange1h, priceChange24h } = this.marketState;
    
    switch (alert.type) {
      case AlertType.PRICE_THRESHOLD:
        if (conditions.direction === 'above') {
          return btcPrice >= conditions.price;
        } else {
          return btcPrice <= conditions.price;
        }
      
      case AlertType.PRICE_CHANGE:
        const changeValue = conditions.timeframe === '1h' ? priceChange1h : priceChange24h;
        if (conditions.direction === 'increase') {
          return changeValue >= conditions.percentage;
        } else {
          return changeValue <= -conditions.percentage;
        }
      
      case AlertType.CANDLESTICK_PATTERN:
        // Phát hiện mẫu hình nến cần API phân tích kỹ thuật
        // Đây là code giả định, trong ứng dụng thực tế cần tích hợp với API phân tích kỹ thuật
        return this.detectCandlestickPatterns(conditions.patterns, conditions.timeframe);
      
      default:
        return false;
    }
  }

  // Phát hiện mẫu hình nến (code giả định)
  private detectCandlestickPatterns(patterns: string[], timeframe: string): boolean {
    // Trong thực tế, cần tích hợp với API phân tích kỹ thuật
    // Ví dụ: TradingView API, TaLib, hoặc các dịch vụ phân tích kỹ thuật khác
    
    // Code giả định: random để demo
    if (Math.random() < 0.05) { // 5% cơ hội phát hiện mẫu hình
      return true;
    }
    
    return false;
  }

  // Kích hoạt cảnh báo
  private triggerAlert(alert: Alert) {
    // Cập nhật thời gian kích hoạt gần nhất
    alert.lastTriggered = new Date();
    
    // Tạo thông báo dựa trên loại cảnh báo
    let message = '';
    
    switch (alert.type) {
      case AlertType.PRICE_THRESHOLD:
        message = `Giá BTC ${alert.conditions.direction === 'above' ? 'đã vượt trên' : 'đã giảm xuống dưới'} ${alert.conditions.price.toLocaleString()} ${alert.conditions.currency}`;
        break;
      
      case AlertType.PRICE_CHANGE:
        message = `BTC ${alert.conditions.direction === 'increase' ? 'đã tăng' : 'đã giảm'} ${alert.conditions.percentage}% trong ${alert.conditions.timeframe === '1h' ? '1 giờ' : '24 giờ'} qua`;
        break;
      
      case AlertType.CANDLESTICK_PATTERN:
        message = `Phát hiện mẫu hình nến ${alert.conditions.patterns[0].replace('_', ' ')} trên khung thời gian ${alert.conditions.timeframe}`;
        break;
      
      default:
        message = 'Cảnh báo kích hoạt';
    }
    
    // Thêm giá hiện tại vào thông báo
    message += `. Giá hiện tại: ${this.marketState.btcPrice.toLocaleString()} USDT`;
    
    // Tạo thông báo
    const notification: Notification = {
      id: uuidv4(),
      alertId: alert.id,
      message,
      createdAt: new Date(),
      read: false,
    };
    
    // Thêm vào lịch sử thông báo
    this.notificationHistory.unshift(notification);
    if (this.notificationHistory.length > 100) {
      // Giới hạn lịch sử thông báo
      this.notificationHistory = this.notificationHistory.slice(0, 100);
    }
    
    // Lưu vào storage
    this.saveToStorage();
    
    // Gọi callback nếu có
    if (this.onNotification) {
      this.onNotification(notification);
    }
    
    // Gửi thông báo qua các kênh khác
    this.sendNotificationToChannels(notification, alert.notifyVia);
  }

  // Gửi thông báo qua các kênh
  private sendNotificationToChannels(notification: Notification, channels: NotificationChannel[]) {
    // Gửi thông báo trong ứng dụng được xử lý riêng
    
    // Kiểm tra các kênh khác
    if (channels.includes(NotificationChannel.EMAIL)) {
      this.sendEmailNotification(notification);
    }
    
    if (channels.includes(NotificationChannel.TELEGRAM)) {
      this.sendTelegramNotification(notification);
    }
    
    if (channels.includes(NotificationChannel.WEBHOOK)) {
      this.sendWebhookNotification(notification);
    }
  }

  // Gửi thông báo qua email (giả định)
  private sendEmailNotification(notification: Notification) {
    console.log(`Sending email notification: ${notification.message}`);
    // Trong thực tế, cần tích hợp với API email như SendGrid, Mailchimp, ...
  }

  // Gửi thông báo qua Telegram (giả định)
  private sendTelegramNotification(notification: Notification) {
    console.log(`Sending Telegram notification: ${notification.message}`);
    // Trong thực tế, cần tích hợp với Telegram Bot API
  }

  // Gửi thông báo qua webhook (giả định)
  private sendWebhookNotification(notification: Notification) {
    console.log(`Sending webhook notification: ${notification.message}`);
    // Trong thực tế, cần gửi HTTP request đến URL được cấu hình
  }
}

// Singleton instance
export const priceMonitor = new PriceMonitorService(); 