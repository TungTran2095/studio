/**
 * Tiện ích đồng bộ thời gian với Binance API để tránh lỗi timestamp
 */

export class TimeSync {
  // Đặt hiệu số cực thấp (-20000ms) để đảm bảo timestamp luôn nhỏ hơn thời gian server nhiều
  private static timeOffset: number = -20000; // Tăng từ -10000ms lên -20000ms
  private static isSynced: boolean = false;
  private static lastSyncTime: number = 0;
  private static readonly SYNC_INTERVAL_MS: number = 5 * 60 * 1000; // 5 phút
  private static lastServerTime: number = 0;
  private static retryCount: number = 0; // Đếm số lần thử lại kết nối
  private static readonly MAX_RETRY: number = 3; // Số lần thử lại tối đa

  /**
   * Đồng bộ thời gian với server Binance
   * @returns Promise<void>
   */
  static async syncWithServer(): Promise<void> {
    try {
      // Nếu đã đồng bộ gần đây, không cần đồng bộ lại
      const now = Date.now();
      if (this.isSynced && (now - this.lastSyncTime) < this.SYNC_INTERVAL_MS) {
        console.log(`[TimeSync] Đồng bộ thời gian gần đây (${Math.round((now - this.lastSyncTime) / 1000)}s trước), bỏ qua.`);
        return;
      }

      console.log('[TimeSync] Đang đồng bộ thời gian với Binance...');
      
      // Sử dụng nhiều endpoint thay thế và thêm error handling tốt hơn
      const endpoints = [
        'https://api.binance.com/api/v3/time',
        'https://api1.binance.com/api/v3/time',
        'https://api2.binance.com/api/v3/time',
        'https://api3.binance.com/api/v3/time',
        'https://testnet.binance.vision/api/v3/time' // Testnet endpoint
      ];

      let lastError: Error | null = null;
      
      for (const endpoint of endpoints) {
        try {
          // Không thêm parameter nào cho endpoint /time
          const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(5000), // Tăng timeout lên 5 giây
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          }
          
          const data = await response.json();
          
          if (!data || typeof data.serverTime !== 'number') {
            throw new Error('Phản hồi API không hợp lệ: thiếu serverTime');
          }
          
          // Tính hiệu số giữa thời gian server và thời gian local
          const serverTime = data.serverTime;
          this.lastServerTime = serverTime;
          const localTime = Date.now();
          
          // Điều chỉnh hiệu số: luôn đảm bảo timestamp sẽ sớm hơn 20000ms so với thời gian server
          this.timeOffset = serverTime - localTime - 20000;
          this.isSynced = true;
          this.lastSyncTime = now;
          this.retryCount = 0; // Reset số lần thử lại
          
          console.log(`[TimeSync] Đồng bộ thành công với ${endpoint}. Hiệu số: ${this.timeOffset}ms`);
          return; // Thoát nếu thành công
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`[TimeSync] Lỗi với ${endpoint}:`, error);
          continue; // Thử endpoint tiếp theo
        }
      }
      
      // Nếu tất cả endpoints đều thất bại, thử sử dụng World Time API
      try {
        console.log('[TimeSync] Thử sử dụng World Time API làm fallback...');
        const worldTimeResponse = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC', {
          signal: AbortSignal.timeout(3000)
        });
        
        if (worldTimeResponse.ok) {
          const worldTimeData = await worldTimeResponse.json();
          const worldTime = new Date(worldTimeData.datetime).getTime();
          const localTime = Date.now();
          
          this.timeOffset = worldTime - localTime - 20000;
          this.isSynced = true;
          this.lastSyncTime = now;
          this.retryCount = 0;
          
          console.log(`[TimeSync] Đồng bộ thành công với World Time API. Hiệu số: ${this.timeOffset}ms`);
          return;
        }
      } catch (worldTimeError) {
        console.warn('[TimeSync] World Time API cũng thất bại:', worldTimeError);
      }
      
      // Nếu tất cả endpoints đều thất bại
      throw lastError || new Error('Không thể kết nối với bất kỳ endpoint nào');
      
    } catch (error) {
      console.error('[TimeSync] Lỗi đồng bộ thời gian:', error);
      // Tăng số lần thử lại
      this.retryCount++;
      
      if (this.retryCount <= this.MAX_RETRY) {
        // Tự động thử lại sau 2 giây
        console.log(`[TimeSync] Thử lại lần ${this.retryCount}/${this.MAX_RETRY} sau 2 giây...`);
        setTimeout(() => this.syncWithServer(), 2000);
      } else {
        console.error(`[TimeSync] Đã thử lại ${this.MAX_RETRY} lần không thành công. Sử dụng offset mặc định.`);
        // Nếu không thể đồng bộ, sử dụng offset mặc định an toàn
        this.timeOffset = -300000; // 5 phút trước
        this.isSynced = false;
        this.retryCount = 0; // Reset counter
      }
    }
  }

  /**
   * Điều chỉnh hiệu số thời gian thủ công
   * @param offsetAdjustment Giá trị cần điều chỉnh (dương hoặc âm)
   */
  static adjustOffset(offsetAdjustment: number): void {
    const oldOffset = this.timeOffset;
    this.timeOffset += offsetAdjustment;
    console.log(`[TimeSync] Điều chỉnh thủ công timeOffset: ${oldOffset}ms -> ${this.timeOffset}ms (điều chỉnh ${offsetAdjustment}ms)`);
  }

  /**
   * Đặt hiệu số thời gian trực tiếp
   * @param newOffset Giá trị hiệu số mới
   */
  static setOffset(newOffset: number): void {
    const oldOffset = this.timeOffset;
    this.timeOffset = newOffset;
    console.log(`[TimeSync] Đặt timeOffset: ${oldOffset}ms -> ${this.timeOffset}ms`);
  }

  /**
   * Lấy hiệu số thời gian hiện tại
   */
  static getOffset(): number {
    return this.timeOffset;
  }

  /**
   * Lấy timestamp đã được hiệu chỉnh để sử dụng với Binance API
   * @returns number Timestamp đã hiệu chỉnh
   */
  static getTimestamp(): number {
    // Trả về thời gian hiện tại trừ đi một khoảng lớn để đảm bảo luôn nhỏ hơn server time
    return Date.now() - 300000; // Tăng từ 180000ms lên 300000ms (5 phút)
  }

  /**
   * Lấy thời gian thực tế của server Binance
   * Nếu chưa đồng bộ, sẽ đồng bộ trước
   * @returns Promise<number> Thời gian của server Binance
   */
  static async getActualServerTime(): Promise<number> {
    try {
      // Sử dụng cùng logic với syncWithServer để có độ tin cậy cao hơn
      const endpoints = [
        'https://api.binance.com/api/v3/time',
        'https://api1.binance.com/api/v3/time',
        'https://api2.binance.com/api/v3/time',
        'https://api3.binance.com/api/v3/time'
      ];

      for (const endpoint of endpoints) {
        try {
          // Không thêm parameter nào cho endpoint /time
          const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(5000),
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'Unknown error');
            throw new Error(`HTTP ${response.status}: ${response.statusText} - ${errorText}`);
          }
          
          const data = await response.json();
          
          if (!data || typeof data.serverTime !== 'number') {
            throw new Error('Phản hồi API không hợp lệ: thiếu serverTime');
          }
          
          this.lastServerTime = data.serverTime;
          return data.serverTime;
          
        } catch (error) {
          console.warn(`[TimeSync] Lỗi với ${endpoint}:`, error);
          continue;
        }
      }
      
      // Fallback to World Time API
      try {
        const worldTimeResponse = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC', {
          signal: AbortSignal.timeout(3000)
        });
        
        if (worldTimeResponse.ok) {
          const worldTimeData = await worldTimeResponse.json();
          const worldTime = new Date(worldTimeData.datetime).getTime();
          this.lastServerTime = worldTime;
          return worldTime;
        }
      } catch (worldTimeError) {
        console.warn('[TimeSync] World Time API cũng thất bại:', worldTimeError);
      }
      
      throw new Error('Không thể lấy thời gian server từ bất kỳ endpoint nào');
      
    } catch (error) {
      console.error('[TimeSync] Lỗi khi lấy thời gian server:', error);
      // Nếu không thể lấy thời gian server, trả về thời gian ước tính
      return this.lastServerTime > 0 ? this.lastServerTime : Date.now() - 240000;
    }
  }

  /**
   * Lấy timestamp đã được hiệu chỉnh đặc biệt cho Binance API
   * Luôn trả về timestamp nhỏ hơn thời gian thực ít nhất 2 giây
   * @returns number Timestamp an toàn cho Binance
   */
  static getSafeTimestamp(): number {
    // Timestamp tối thiểu sẽ nhỏ hơn thời gian hiện tại 
    return Date.now() - 10000; // Tăng từ 5000ms lên 10000ms
  }

  /**
   * Kiểm tra xem đã đồng bộ thời gian chưa
   */
  static get isSynchronized(): boolean {
    return this.isSynced;
  }

  /**
   * Lấy recvWindow tối ưu dựa trên độ trễ mạng
   * @param baseWindow Giá trị cơ bản (mặc định: 5000ms)
   * @returns number Giá trị recvWindow được điều chỉnh
   */
  static getOptimalRecvWindow(baseWindow: number = 5000): number {
    // Giảm giới hạn xuống 59000ms để đảm bảo dưới 60000ms theo yêu cầu của Binance API
    return Math.min(Math.max(baseWindow, 10000), 59000);
  }

  /**
   * Lấy timestamp cho giao dịch với độ an toàn cao hơn
   * Sử dụng cho các hoạt động giao dịch quan trọng
   * @returns number Timestamp cực kỳ an toàn
   */
  static getSafeTimestampForTrading(): number {
    // Trả về thời gian còn thấp hơn nữa cho các giao dịch quan trọng
    return Date.now() - 400000; // Tăng từ 200000ms lên 400000ms (6.6 phút)
  }
} 