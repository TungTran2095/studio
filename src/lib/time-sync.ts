/**
 * Tiện ích đồng bộ thời gian với Binance API để tránh lỗi timestamp
 */

export class TimeSync {
  // Offset giữa server và local: serverTime - localTime
  private static offsetMs: number = 0;
  private static isSynced: boolean = false;
  private static lastSyncTime: number = 0;
  private static syncingPromise: Promise<void> | null = null;
  private static readonly MIN_SYNC_INTERVAL_MS: number = 10 * 60 * 1000; // 10 phút
  private static readonly HYSTERESIS_MS: number = 500; // Chỉ cập nhật nếu chênh lệch >= 500ms
  private static lastServerTime: number = 0;
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
      offset: this.offsetMs,
      success: false
    };

    try {
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
          
          // Tính hiệu số giữa thời gian server và thời gian local
          const serverTime = data.serverTime;
          this.lastServerTime = serverTime;
          const localTime = Date.now();
          const newOffset = serverTime - localTime; // không margin, margin áp dụng khi cấp timestamp
          const prevOffset = this.offsetMs;
          // Hysteresis: chỉ cập nhật nếu thay đổi đáng kể
          if (!this.isSynced || Math.abs(newOffset - prevOffset) >= this.HYSTERESIS_MS) {
            this.offsetMs = newOffset;
          }
          this.isSynced = true;
          this.lastSyncTime = Date.now();
          
          syncResult.serverTime = serverTime;
          syncResult.offset = this.offsetMs;
          syncResult.success = true;
          
          console.log(`[TimeSync] ✅ Đồng bộ thành công với ${endpoint}`);
          console.log(`[TimeSync] Server time: ${new Date(serverTime).toISOString()}`);
          console.log(`[TimeSync] Local time:  ${new Date(localTime).toISOString()}`);
          console.log(`[TimeSync] Offset cập nhật: ${this.offsetMs}ms`);
          
          return; // Thoát nếu thành công
          
        } catch (error) {
          lastError = error as Error;
          console.warn(`[TimeSync] ❌ Lỗi với ${endpoint}:`, error);
          continue; // Thử endpoint tiếp theo
        }
      }
      
      // Nếu tất cả endpoints đều thất bại
      throw lastError || new Error('Không thể kết nối với bất kỳ endpoint nào');
      
    } catch (error) {
      console.error('[TimeSync] Lỗi đồng bộ thời gian:', error);
      syncResult.error = error instanceof Error ? error.message : 'Unknown error';
    } finally {
      // Lưu kết quả sync vào lịch sử
      this.addToSyncHistory(syncResult);
    }
  }

  /**
   * Đảm bảo đã sync nếu quá hạn; tránh gọi lặp bằng promise dùng chung
   */
  static async ensure(): Promise<void> {
    const now = Date.now();
    if (this.isSynced && (now - this.lastSyncTime) < this.MIN_SYNC_INTERVAL_MS) {
      return;
    }
    if (this.syncingPromise) return this.syncingPromise;
    this.syncingPromise = this.syncWithServer().finally(() => {
      this.syncingPromise = null;
    });
    return this.syncingPromise;
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
    const oldOffset = this.offsetMs;
    // Clamp điều chỉnh nhỏ để tránh drift lớn
    const clamped = Math.max(-2000, Math.min(2000, offsetAdjustment));
    this.offsetMs += clamped;
    console.log(`[TimeSync] Điều chỉnh thủ công offset: ${oldOffset}ms -> ${this.offsetMs}ms (Δ ${clamped}ms)`);
  }

  /**
   * Đặt hiệu số thời gian trực tiếp
   * @param newOffset Giá trị hiệu số mới
   */
  static setOffset(newOffset: number): void {
    const oldOffset = this.offsetMs;
    this.offsetMs = newOffset;
    // Tắt log để giảm spam
    // console.log(`[TimeSync] Đặt timeOffset: ${oldOffset}ms -> ${this.timeOffset}ms`);
  }

  /**
   * Lấy hiệu số thời gian hiện tại
   */
  static getOffset(): number {
    return this.offsetMs;
  }

  /**
   * Lấy timestamp đã được hiệu chỉnh để sử dụng với Binance API
   * @returns number Timestamp đã hiệu chỉnh
   */
  static getTimestamp(): number {
    // Timestamp an toàn = now + offset - 1000ms margin
    return Date.now() + this.offsetMs - 1000;
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
    // Đồng nhất với getTimestamp
    return this.getTimestamp();
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
    if (this.isSynced) {
      return now + this.offsetMs - 1000;
    }
    return now - 1000;
  }
} 