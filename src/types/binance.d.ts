/**
 * Khai báo kiểu cho thư viện @binance/connector
 */
declare module '@binance/connector' {
  export class Spot {
    constructor(apiKey?: string, apiSecret?: string, options?: any);
    
    /**
     * Lấy dữ liệu nến (Klines/Candlesticks)
     */
    klines(
      symbol: string, 
      interval: string, 
      options?: any, 
      config?: any
    ): Promise<{
      data: any[];
      status: number;
      statusText: string;
      headers: any;
    }>;
    
    /**
     * Lấy thông tin tài khoản
     */
    account(options?: any): Promise<any>;
    
    /**
     * Lấy thông tin số dư
     */
    balance(options?: any): Promise<any>;
    
    /**
     * Lấy thông tin sàn
     */
    exchangeInfo(options?: any): Promise<any>;
    
    /**
     * Đặt lệnh thực thi
     */
    newOrder(
      symbol: string, 
      side: string, 
      type: string, 
      options?: any
    ): Promise<any>;
  }
} 