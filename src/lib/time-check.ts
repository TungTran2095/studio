/**
 * Tiện ích kiểm tra thời gian hệ thống so với các máy chủ chuẩn
 * Giúp phát hiện và khắc phục vấn đề về timestamp
 */

export class TimeCheck {
  /**
   * Lấy thời gian từ Binance server
   * @returns Promise<number> Thời gian từ server (milliseconds)
   */
  static async getBinanceTime(): Promise<number> {
    try {
      const response = await fetch('https://api.binance.com/api/v3/time');
      if (!response.ok) {
        throw new Error(`HTTP error: ${response.status}`);
      }
      const data = await response.json();
      return data.serverTime;
    } catch (error) {
      console.error('Lỗi lấy thời gian Binance:', error);
      throw error;
    }
  }

  /**
   * Kiểm tra độ chênh lệch thời gian giữa hệ thống local và Binance server
   * @returns Promise<{localTime: number, serverTime: number, diffMs: number}>
   */
  static async checkTimeDrift(): Promise<{
    localTime: number;
    serverTime: number;
    diffMs: number;
    diffFormatted: string;
  }> {
    const localTime = Date.now();
    const serverTime = await this.getBinanceTime();
    const diffMs = serverTime - localTime;
    
    // Định dạng chênh lệch dễ đọc
    const diffFormatted = this.formatTimeDiff(diffMs);
    
    return {
      localTime,
      serverTime,
      diffMs,
      diffFormatted
    };
  }

  /**
   * Phân tích mức độ chênh lệch và đưa ra khuyến nghị
   * @param diffMs Chênh lệch thời gian tính bằng milliseconds
   * @returns Promise<{severity: 'OK' | 'WARNING' | 'CRITICAL', message: string}>
   */
  static analyzeDrift(diffMs: number): {
    severity: 'OK' | 'WARNING' | 'CRITICAL';
    message: string;
  } {
    const absDiff = Math.abs(diffMs);
    
    if (absDiff < 500) {
      return {
        severity: 'OK',
        message: 'Đồng hồ hệ thống đồng bộ tốt với Binance server.'
      };
    } else if (absDiff < 2000) {
      return {
        severity: 'WARNING',
        message: 'Đồng hồ hệ thống có chênh lệch nhỏ với Binance server. Có thể sử dụng offset để điều chỉnh.'
      };
    } else {
      return {
        severity: 'CRITICAL',
        message: 'Đồng hồ hệ thống chênh lệch lớn với Binance server. Cần đồng bộ hóa đồng hồ hệ thống với máy chủ NTP.'
      };
    }
  }
  
  /**
   * Định dạng chênh lệch thời gian thành chuỗi dễ đọc
   * @param diffMs Số milliseconds chênh lệch
   * @returns string Chuỗi định dạng
   */
  static formatTimeDiff(diffMs: number): string {
    if (diffMs === 0) {
      return 'Không có chênh lệch';
    }
    
    const abs = Math.abs(diffMs);
    const sign = diffMs > 0 ? 'trước' : 'sau';
    
    if (abs < 1000) {
      return `${abs}ms ${sign} Binance server`;
    } else if (abs < 60000) {
      return `${(abs / 1000).toFixed(2)} giây ${sign} Binance server`;
    } else {
      return `${(abs / 60000).toFixed(2)} phút ${sign} Binance server`;
    }
  }
  
  /**
   * Tạo báo cáo đầy đủ về tình trạng thời gian hệ thống
   * @returns Promise<string> Báo cáo chi tiết
   */
  static async generateReport(): Promise<string> {
    try {
      const driftResult = await this.checkTimeDrift();
      const analysis = this.analyzeDrift(driftResult.diffMs);
      
      let report = `=== BÁO CÁO ĐỒNG BỘ THỜI GIAN ===\n`;
      report += `Thời gian máy local: ${new Date(driftResult.localTime).toISOString()}\n`;
      report += `Thời gian Binance:   ${new Date(driftResult.serverTime).toISOString()}\n`;
      report += `Chênh lệch: ${driftResult.diffFormatted} (${driftResult.diffMs}ms)\n`;
      report += `Đánh giá: ${analysis.severity} - ${analysis.message}\n`;
      
      if (analysis.severity !== 'OK') {
        report += `\nKHUYẾN NGHỊ:\n`;
        report += `1. Đặt offset = ${-driftResult.diffMs - 5000}ms trong TimeSync\n`;
        report += `2. Đồng bộ hóa đồng hồ hệ thống với máy chủ NTP\n`;
        report += `   Windows: Start > Settings > Time & Language > Date & time > Sync now\n`;
        report += `   Linux: sudo ntpdate pool.ntp.org\n`;
      }
      
      return report;
    } catch (error) {
      return `Lỗi tạo báo cáo: ${error}`;
    }
  }
  
  /**
   * Gợi ý giá trị offset phù hợp dựa trên chênh lệch thời gian
   * @returns Promise<number> Giá trị offset được đề xuất (milliseconds)
   */
  static async suggestOffset(): Promise<number> {
    try {
      const driftResult = await this.checkTimeDrift();
      
      // Đề xuất offset = chênh lệch - 5000ms (biên an toàn)
      // Nếu đồng hồ local nhanh hơn server (diffMs < 0), giá trị sẽ âm hơn
      // Nếu đồng hồ local chậm hơn server (diffMs > 0), offset sẽ nhỏ hơn
      const suggestedOffset = -driftResult.diffMs - 5000;
      
      console.log(`[TimeCheck] Đề xuất offset: ${suggestedOffset}ms (chênh lệch ${driftResult.diffMs}ms - 5000ms biên an toàn)`);
      
      return suggestedOffset;
    } catch (error) {
      console.error('Lỗi đề xuất offset:', error);
      // Trả về một giá trị offset an toàn mặc định nếu có lỗi
      return -60000;
    }
  }
} 