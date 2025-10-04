/**
 * Tiện ích đồng bộ thời gian với Binance API để tránh lỗi timestamp
 */

export class TimeSync {
  // Đặt hiệu số cực thấp (-20000ms) để đảm bảo timestamp luôn nhỏ hơn thời gian server nhiều
  private static timeOffset: number = -20000; // Tăng từ -10000ms lên -20000ms
  private static isSynced: boolean = false;
  private static lastSyncTime: number = 0;
  private static readonly SYNC_INTERVAL_MS: number = 2 * 60 * 1000; // Giảm từ 5 phút xuống 2 phút để sync thường xuyên hơn
  private static lastServerTime: number = 0;
  private static retryCount: number = 0; // Đếm số lần thử lại kết nối
  private static readonly MAX_RETRY: number = 3; // Số lần thử lại tối đa
  private static syncHistory: Array<{
    timestamp: number;
    serverTime: number;
    offset: number;
    success: boolean;
    error?: string;
  }> = []; // Lưu lịch sử sync để phân tích
  private static readonly MAX_HISTORY: number = 10; // Lưu tối đa 10 lần sync gần nhất

  /**
   * Đồng bộ thời gian với server Binance
   * @returns Promise<void>
   */
  static async syncWithServer(): Promise<void> {
    const startTime = Date.now();
    let syncResult: any = {
      timestamp: startTime,
      serverTime: 0,
      offset: this.timeOffset,
      success: false
    };

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
          console.log(`[TimeSync] Thử kết nối với ${endpoint}...`);
          
          // Không thêm parameter nào cho endpoint /time
          const response = await fetch(endpoint, {
            method: 'GET',
            signal: AbortSignal.timeout(8000), // Tăng timeout lên 8 giây
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
          const timeDiff = localTime - serverTime;
          
          // Điều chỉnh hiệu số thông minh hơn
          // Nếu local time nhanh hơn server, cần offset âm lớn hơn
          // Nếu local time chậm hơn server, cần offset dương nhỏ hơn
          let optimalMargin = 30000; // Margin mặc định 30 giây
          
          if (Math.abs(timeDiff) > 10000) {
            // Nếu chênh lệch lớn, tăng margin an toàn
            optimalMargin = Math.max(60000, Math.abs(timeDiff) * 2);
            console.log(`[TimeSync] Chênh lệch thời gian lớn (${timeDiff}ms), tăng margin lên ${optimalMargin}ms`);
          }
          
          this.timeOffset = serverTime - localTime - optimalMargin;
          this.isSynced = true;
          this.lastSyncTime = now;
          this.retryCount = 0; // Reset số lần thử lại
          
          syncResult.serverTime = serverTime;
          syncResult.offset = this.timeOffset;
          syncResult.success = true;
          
          console.log(`[TimeSync] ✅ Đồng bộ thành công với ${endpoint}`);
          console.log(`[TimeSync] Server time: ${new Date(serverTime).toISOString()}`);
          console.log(`[TimeSync] Local time:  ${new Date(localTime).toISOString()}`);
          console.log(`[TimeSync] Time diff:   ${timeDiff}ms (${timeDiff > 0 ? 'local nhanh hơn' : 'local chậm hơn'})`);
          console.log(`[TimeSync] New offset:  ${this.timeOffset}ms (margin: ${optimalMargin}ms)`);
          
          return; // Thoát nếu thành công
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`[TimeSync] ❌ Lỗi với ${endpoint}:`, error);
          continue; // Thử endpoint tiếp theo
        }
      }
      
      // Nếu tất cả endpoints đều thất bại, thử sử dụng World Time API
      try {
        console.log('[TimeSync] Thử sử dụng World Time API làm fallback...');
        const worldTimeResponse = await fetch('http://worldtimeapi.org/api/timezone/Etc/UTC', {
          signal: AbortSignal.timeout(5000)
        });
        
        if (worldTimeResponse.ok) {
          const worldTimeData = await worldTimeResponse.json();
          const worldTime = new Date(worldTimeData.datetime).getTime();
          const localTime = Date.now();
          
          this.timeOffset = worldTime - localTime - 30000; // Tăng margin cho World Time API
          this.isSynced = true;
          this.lastSyncTime = now;
          this.retryCount = 0;
          
          syncResult.serverTime = worldTime;
          syncResult.offset = this.timeOffset;
          syncResult.success = true;
          
          console.log(`[TimeSync] ✅ Đồng bộ thành công với World Time API. Hiệu số: ${this.timeOffset}ms`);
          return;
        }
      } catch (worldTimeError) {
        console.warn('[TimeSync] World Time API cũng thất bại:', worldTimeError);
      }
      
      // Nếu tất cả endpoints đều thất bại
      throw lastError || new Error('Không thể kết nối với bất kỳ endpoint nào');
      
    } catch (error) {
      console.error('[TimeSync] Lỗi đồng bộ thời gian:', error);
      
      syncResult.error = error instanceof Error ? error.message : 'Unknown error';
      
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
    } finally {
      // Lưu kết quả sync vào lịch sử
      this.addToSyncHistory(syncResult);
    }
  }

  /**
   * Thêm kết quả sync vào lịch sử
   * @param syncResult Kết quả sync
   */
  private static addToSyncHistory(syncResult: any): void {
    this.syncHistory.unshift(syncResult);
    
    // Giới hạn số lượng lịch sử
    if (this.syncHistory.length > this.MAX_HISTORY) {
      this.syncHistory = this.syncHistory.slice(0, this.MAX_HISTORY);
    }
  }

  /**
   * Lấy lịch sử sync gần nhất
   * @returns Array lịch sử sync
   */
  static getSyncHistory(): Array<any> {
    return [...this.syncHistory];
  }

  /**
   * Lấy thống kê sync
   * @returns Object chứa thống kê
   */
  static getSyncStats(): any {
    if (this.syncHistory.length === 0) {
      return {
        totalSyncs: 0,
        successRate: 0,
        avgOffset: 0,
        lastSyncTime: null
      };
    }

    const successfulSyncs = this.syncHistory.filter(s => s.success);
    const avgOffset = successfulSyncs.reduce((sum, s) => sum + s.offset, 0) / successfulSyncs.length;

    return {
      totalSyncs: this.syncHistory.length,
      successfulSyncs: successfulSyncs.length,
      successRate: (successfulSyncs.length / this.syncHistory.length) * 100,
      avgOffset: Math.round(avgOffset),
      lastSyncTime: this.lastSyncTime,
      lastSyncFormatted: new Date(this.lastSyncTime).toISOString()
    };
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
    // Tắt log để giảm spam
    // console.log(`[TimeSync] Đặt timeOffset: ${oldOffset}ms -> ${this.timeOffset}ms`);
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
    // FIXED: Reduced offset from 5 minutes to 5 seconds to prevent timestamp rejection
    return Date.now() - 5000; // Reduced from 300000ms (5 minutes) to 5000ms (5 seconds)
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
          // console.warn(`[TimeSync] Lỗi với ${endpoint}:`, error);
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
        // console.warn('[TimeSync] World Time API cũng thất bại:', worldTimeError);
      }
      
      throw new Error('Không thể lấy thời gian server từ bất kỳ endpoint nào');
      
    } catch (error) {
      // console.error('[TimeSync] Lỗi khi lấy thời gian server:', error);
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
    // FIXED: Reduced offset to prevent timestamp rejection
    return Date.now() - 2000; // Reduced from 10000ms to 2000ms (2 seconds)
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
    // Lấy thời gian hiện tại
    const now = Date.now();
    
    // Nếu đã sync với server, sử dụng offset đã tính toán
    if (this.isSynced && this.lastServerTime > 0) {
      // Tính timestamp an toàn dựa trên server time
      const safeOffset = 5000; // Reduced from 30000ms to 5000ms (5 seconds)
      const safeTimestamp = this.lastServerTime - safeOffset;
      
      // Đảm bảo timestamp không quá cũ (không quá 1 phút trước)
      const minTimestamp = now - 60000; // Reduced from 300000ms to 60000ms (1 minute)
      return Math.max(safeTimestamp, minTimestamp);
    }
    
    // Fallback: trả về thời gian còn thấp hơn nữa cho các giao dịch quan trọng
    return now - 10000; // Reduced from 60000ms to 10000ms (10 seconds)
  }
} 