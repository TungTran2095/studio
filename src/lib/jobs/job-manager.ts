import * as cron from 'node-cron';
import { binanceDataCollector } from './binance-data-collector';

export interface RealDataCollectionJob {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'completed' | 'scheduled';
  progress: number;
  lastRun: Date;
  nextRun: Date | null;
  recordsCollected: number;
  source: string;
  frequency: string;
  cronExpression: string;
  config: {
    symbol?: string;
    interval?: string;
    rateLimit?: number;
    autoStart?: boolean;
    // Job scheduling - Khi nào job sẽ bắt đầu chạy
    startDate?: string;
    startTime?: string;
    // Data collection period - Thời gian thu thập dữ liệu thực tế
    dataStartDate?: string;
    dataEndDate?: string;
    dataEndTime?: string;
    // Target destination - Nơi lưu dữ liệu
    targetDatabase?: string;
    targetTable?: string;
    // Timeframe collection - Khung thời gian thu thập
    timeframe?: string;
    lookback?: number; // số lượng records
  };
  // Cron task instance
  task?: cron.ScheduledTask;
  // Timeout for delayed start
  startTimeout?: NodeJS.Timeout;
}

export class JobManager {
  private jobs: Map<string, RealDataCollectionJob> = new Map();
  private isServerEnvironment: boolean;

  constructor() {
    // Check if running in server environment
    this.isServerEnvironment = typeof window === 'undefined';
    
    // Initialize with default jobs if in server environment
    if (this.isServerEnvironment) {
      this.initializeDefaultJobs();
    }
  }

  /**
   * Khởi tạo các jobs mặc định
   */
  private initializeDefaultJobs() {
    const defaultJobs: Omit<RealDataCollectionJob, 'task'>[] = [
      {
        id: 'btc-realtime',
        name: 'BTC Real-time Data',
        description: 'Thu thập dữ liệu BTC/USDT real-time từ Binance',
        status: 'stopped',
        progress: 0,
        lastRun: new Date(Date.now() - 5 * 60 * 1000),
        nextRun: null,
        recordsCollected: 0,
        source: 'Binance API',
        frequency: 'Mỗi 1 phút',
        cronExpression: '*/1 * * * *', // Every minute
        config: {
          symbol: 'BTCUSDT',
          interval: '1m',
          rateLimit: 1200,
          autoStart: false
        }
      },
      {
        id: 'eth-realtime',
        name: 'ETH Real-time Data',
        description: 'Thu thập dữ liệu ETH/USDT real-time từ Binance',
        status: 'stopped',
        progress: 0,
        lastRun: new Date(Date.now() - 3 * 60 * 1000),
        nextRun: null,
        recordsCollected: 0,
        source: 'Binance API',
        frequency: 'Mỗi 5 phút',
        cronExpression: '*/5 * * * *', // Every 5 minutes
        config: {
          symbol: 'ETHUSDT',
          interval: '1m',
          rateLimit: 1200,
          autoStart: false
        }
      }
    ];

    defaultJobs.forEach(jobData => {
      this.jobs.set(jobData.id, { ...jobData, task: undefined });
    });

    console.log(`✅ [JobManager] Initialized ${defaultJobs.length} default jobs`);
  }

  /**
   * Tạo job mới
   */
  createJob(jobData: {
    name: string;
    description: string;
    source: string;
    frequency: string;
    config: {
      symbol?: string;
      interval?: string;
      rateLimit?: number;
      autoStart?: boolean;
      startDate?: string;
      startTime?: string;
      dataStartDate?: string;
      dataEndDate?: string;
      dataEndTime?: string;
      targetDatabase?: string;
      targetTable?: string;
      timeframe?: string;
      lookback?: number;
    };
  }): RealDataCollectionJob {
    const jobId = `job-${Date.now()}`;
    
    // Convert frequency to cron expression
    const cronExpression = this.frequencyToCron(jobData.frequency);
    
    // Calculate scheduled start time if provided
    let scheduledStartTime: Date | null = null;
    let initialStatus: RealDataCollectionJob['status'] = 'stopped';
    
    if (jobData.config.startDate && jobData.config.startTime) {
      scheduledStartTime = new Date(`${jobData.config.startDate}T${jobData.config.startTime}:00`);
      const now = new Date();
      
      if (scheduledStartTime > now) {
        initialStatus = 'scheduled';
      }
    }

    // Validate data collection period
    if (jobData.config.dataStartDate && jobData.config.dataEndDate) {
      const dataStart = new Date(jobData.config.dataStartDate);
      const dataEndDateTime = `${jobData.config.dataEndDate}T${jobData.config.dataEndTime || '23:59'}:59`;
      const dataEnd = new Date(dataEndDateTime);
      
      if (dataEnd <= dataStart) {
        throw new Error('Ngày kết thúc thu thập dữ liệu phải sau ngày bắt đầu');
      }
      
      // If current time is past the data collection end time, mark as completed
      const now = new Date();
      if (now > dataEnd && initialStatus !== 'scheduled') {
        initialStatus = 'completed';
      }
    }
    
    const newJob: RealDataCollectionJob = {
      id: jobId,
      name: jobData.name,
      description: jobData.description,
      status: initialStatus,
      progress: 0,
      lastRun: new Date(),
      nextRun: scheduledStartTime || null,
      recordsCollected: 0,
      source: jobData.source,
      frequency: jobData.frequency,
      cronExpression,
      config: jobData.config
    };

    this.jobs.set(jobId, newJob);
    
    // Handle scheduled start or auto start
    if (this.isServerEnvironment) {
      if (scheduledStartTime && scheduledStartTime > new Date()) {
        // Schedule job to start later
        this.scheduleDelayedStart(jobId, scheduledStartTime);
      } else if (jobData.config.autoStart && initialStatus !== 'completed') {
        // Start immediately if not already completed
        this.startJob(jobId);
      }
    }

    console.log(`✅ [JobManager] Created new job: ${newJob.name} (${jobId})`);
    if (jobData.config.dataStartDate && jobData.config.dataEndDate) {
      console.log(`📅 [JobManager] Data collection period: ${jobData.config.dataStartDate} to ${jobData.config.dataEndDate}`);
    }
    return newJob;
  }

  /**
   * Chuyển đổi frequency thành cron expression
   */
  private frequencyToCron(frequency: string): string {
    switch (frequency) {
      case 'Mỗi 1 phút':
        return '*/1 * * * *';
      case 'Mỗi 5 phút':
        return '*/5 * * * *';
      case 'Mỗi 15 phút':
        return '*/15 * * * *';
      case 'Mỗi 1 giờ':
        return '0 * * * *';
      case 'Mỗi 24 giờ':
        return '0 0 * * *';
      default:
        return '*/5 * * * *'; // Default to 5 minutes
    }
  }

  /**
   * Bắt đầu job
   */
  startJob(jobId: string): boolean {
    if (!this.isServerEnvironment) {
      console.warn('⚠️ [JobManager] Cannot start jobs in client environment');
      return false;
    }

    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`❌ [JobManager] Job not found: ${jobId}`);
      return false;
    }

    if (job.status === 'running') {
      console.warn(`⚠️ [JobManager] Job already running: ${job.name}`);
      return false;
    }

    try {
      // Create cron task
      const task = cron.schedule(job.cronExpression, async () => {
        await this.executeJob(jobId);
      });

      // Update job
      job.task = task;
      job.status = 'running';
      job.nextRun = this.getNextRunTime(job.cronExpression);
      
      // Start the task
      task.start();

      this.jobs.set(jobId, job);
      
      console.log(`🚀 [JobManager] Started job: ${job.name} (${job.cronExpression})`);
      return true;

    } catch (error) {
      console.error(`❌ [JobManager] Failed to start job ${job.name}:`, error);
      job.status = 'error';
      this.jobs.set(jobId, job);
      return false;
    }
  }

  /**
   * Dừng job
   */
  stopJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`❌ [JobManager] Job not found: ${jobId}`);
      return false;
    }

    try {
      // Stop cron task if running
      if (job.task) {
        job.task.stop();
        job.task = undefined;
      }

      // Clear scheduled start timeout if exists
      if (job.startTimeout) {
        clearTimeout(job.startTimeout);
        job.startTimeout = undefined;
      }

      job.status = 'stopped';
      job.nextRun = null;
      
      this.jobs.set(jobId, job);
      
      console.log(`⏹️ [JobManager] Stopped job: ${job.name}`);
      return true;

    } catch (error) {
      console.error(`❌ [JobManager] Failed to stop job ${job.name}:`, error);
      return false;
    }
  }

  /**
   * Xóa job
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) {
      console.error(`❌ [JobManager] Job not found: ${jobId}`);
      return false;
    }

    try {
      // Stop job first
      this.stopJob(jobId);
      
      // Remove from jobs map
      this.jobs.delete(jobId);
      
      console.log(`🗑️ [JobManager] Deleted job: ${job.name}`);
      return true;

    } catch (error) {
      console.error(`❌ [JobManager] Failed to delete job ${job.name}:`, error);
      return false;
    }
  }

  /**
   * Thực thi job
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    console.log(`⚡ [JobManager] Executing job: ${job.name}`);
    
    // DEBUG: Log job config để kiểm tra
    console.log(`🔍 [JobManager] DEBUG - Job config:`, {
      dataStartDate: job.config.dataStartDate,
      dataEndDate: job.config.dataEndDate,
      symbol: job.config.symbol,
      timeframe: job.config.timeframe
    });
    
    // Check if we're past the data collection end time (only for real-time jobs)
    if (job.config.dataEndDate && !job.config.dataStartDate) {
      const dataEndDateTime = `${job.config.dataEndDate}T${job.config.dataEndTime || '23:59'}:59`;
      const dataEnd = new Date(dataEndDateTime);
      const now = new Date();
      
      if (now > dataEnd) {
        console.log(`⏰ [JobManager] Job ${job.name} reached end of collection period. Stopping...`);
        job.status = 'completed';
        job.progress = 100;
        if (job.task) {
          job.task.stop();
          job.task = undefined;
        }
        this.jobs.set(jobId, job);
        return;
      }
    }
    
    try {
      job.progress = 10;
      this.jobs.set(jobId, job);

      // Run data collection based on source
      if (job.source === 'Binance API' && job.config.symbol) {
        job.progress = 50;
        this.jobs.set(jobId, job);

        // Determine the time range for data collection
        let startTime: Date | undefined;
        let endTime: Date | undefined;
        let limit = job.config.lookback || 100;
        let interval = job.config.timeframe || job.config.interval || '1m';
        
        // Priority 1: Use custom date range from config if specified (HISTORICAL DATA)
        if (job.config.dataStartDate) {
          startTime = new Date(job.config.dataStartDate);
          console.log(`📅 [JobManager] HISTORICAL MODE: Using dataStartDate: ${job.config.dataStartDate}`);
          
          // Set end time for historical data
          if (job.config.dataEndDate) {
            const dataEndDateTime = `${job.config.dataEndDate}T${job.config.dataEndTime || '23:59'}:59`;
            endTime = new Date(dataEndDateTime);
            console.log(`📅 [JobManager] HISTORICAL MODE: Using dataEndDate: ${dataEndDateTime}`);
          } else {
            // If no end date, collect for one day from start date
            endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
            console.log(`📅 [JobManager] HISTORICAL MODE: Using default end date (24h later): ${endTime.toISOString()}`);
          }
          
          // For historical data, we need to calculate how many records we can get in the time range
          const timeRangeMs = endTime.getTime() - startTime.getTime();
          let intervalMs = 0;
          
          switch (interval) {
            case '1m': intervalMs = 60 * 1000; break;
            case '3m': intervalMs = 3 * 60 * 1000; break;
            case '5m': intervalMs = 5 * 60 * 1000; break;
            case '15m': intervalMs = 15 * 60 * 1000; break;
            case '30m': intervalMs = 30 * 60 * 1000; break;
            case '1h': intervalMs = 60 * 60 * 1000; break;
            case '4h': intervalMs = 4 * 60 * 60 * 1000; break;
            case '1d': intervalMs = 24 * 60 * 60 * 1000; break;
            default: intervalMs = 60 * 1000; // default 1m
          }
          
          const maxRecordsInRange = Math.floor(timeRangeMs / intervalMs);
          // Binance API limit is 1000, so we cap it
          limit = Math.min(maxRecordsInRange, 1000);
          console.log(`📊 [JobManager] HISTORICAL MODE: Calculated limit: ${limit} records for time range`);
        }

        // Priority 2: If no custom date range, use current time with lookback (REAL-TIME DATA)
        else {
          const now = new Date();
          // Calculate lookback based on interval and limit
          let lookbackMs = 0;
          
          switch (interval) {
            case '1m': lookbackMs = limit * 60 * 1000; break;
            case '3m': lookbackMs = limit * 3 * 60 * 1000; break;
            case '5m': lookbackMs = limit * 5 * 60 * 1000; break;
            case '15m': lookbackMs = limit * 15 * 60 * 1000; break;
            case '30m': lookbackMs = limit * 30 * 60 * 1000; break;
            case '1h': lookbackMs = limit * 60 * 60 * 1000; break;
            case '4h': lookbackMs = limit * 4 * 60 * 60 * 1000; break;
            case '1d': lookbackMs = limit * 24 * 60 * 60 * 1000; break;
            default: lookbackMs = limit * 60 * 1000; // default 1m
          }
          
          startTime = new Date(now.getTime() - lookbackMs);
          endTime = now;
          console.log(`📅 [JobManager] REAL-TIME MODE: Using lookback calculation: ${limit} ${interval} periods`);
        }

        console.log(`📅 [JobManager] Collection interval: ${interval}, limit: ${limit}`);
        console.log(`🕐 [JobManager] Time range: ${startTime?.toISOString()} to ${endTime?.toISOString()}`);
        console.log(`🎯 [JobManager] Target: ${job.config.targetDatabase}/${job.config.targetTable}`);

        const result = await binanceDataCollector.runDataCollection(
          job.config.symbol,
          interval,
          limit,
          startTime,
          endTime,
          {
            targetDatabase: job.config.targetDatabase,
            targetTable: job.config.targetTable
          }
        );

        if (result.success) {
          job.recordsCollected += result.recordsCollected;
          
          // For historical data, mark as completed after successful collection
          if (job.config.dataStartDate) {
            job.status = 'completed';
            job.progress = 100;
            console.log(`✅ [JobManager] HISTORICAL job completed: ${job.name} (${result.recordsCollected} records)`);
            
            // Stop the job if it's running as cron
            if (job.task) {
              job.task.stop();
              job.task = undefined;
            }
            job.nextRun = null;
          } else {
            // For real-time data, keep running
            job.status = 'running';
            job.progress = 100;
            job.lastRun = new Date();
            job.nextRun = this.getNextRunTime(job.cronExpression);
            console.log(`✅ [JobManager] REAL-TIME job completed: ${job.name} (${result.recordsCollected} records)`);
          }
        } else {
          job.status = 'error';
          job.progress = 0;
          console.error(`❌ [JobManager] Job failed: ${job.name} - ${result.error}`);
        }
      }

      this.jobs.set(jobId, job);

    } catch (error) {
      console.error(`❌ [JobManager] Job execution error for ${job.name}:`, error);
      job.status = 'error';
      job.progress = 0;
      this.jobs.set(jobId, job);
    }

    // Reset progress after a delay (only for running jobs)
    setTimeout(() => {
      if (job.status === 'running') {
        job.progress = 0;
        this.jobs.set(jobId, job);
      }
    }, 5000);
  }

  /**
   * Tính toán thời gian chạy tiếp theo
   */
  private getNextRunTime(cronExpression: string): Date {
    // Simple next run calculation (trong thực tế có thể dùng cron-parser)
    const now = new Date();
    if (cronExpression.startsWith('*/1')) { // Every minute
      return new Date(now.getTime() + 60 * 1000);
    } else if (cronExpression.startsWith('*/5')) { // Every 5 minutes
      return new Date(now.getTime() + 5 * 60 * 1000);
    } else if (cronExpression.startsWith('*/15')) { // Every 15 minutes
      return new Date(now.getTime() + 15 * 60 * 1000);
    } else {
      return new Date(now.getTime() + 60 * 1000); // Default 1 minute
    }
  }

  /**
   * Lấy tất cả jobs
   */
  getAllJobs(): RealDataCollectionJob[] {
    return Array.from(this.jobs.values()).map(job => ({
      ...job,
      task: undefined // Don't serialize cron task
    }));
  }

  /**
   * Lấy job theo ID
   */
  getJob(jobId: string): RealDataCollectionJob | undefined {
    const job = this.jobs.get(jobId);
    if (!job) return undefined;
    
    return {
      ...job,
      task: undefined // Don't serialize cron task
    };
  }

  /**
   * Restart job
   */
  restartJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    this.stopJob(jobId);
    return this.startJob(jobId);
  }

  /**
   * Cleanup tất cả jobs (khi server shutdown)
   */
  cleanup(): void {
    console.log('🧹 [JobManager] Cleaning up all jobs...');
    
    for (const [jobId, job] of this.jobs) {
      if (job.task) {
        job.task.stop();
        job.task.destroy();
      }
    }
    
    this.jobs.clear();
    console.log('✅ [JobManager] All jobs cleaned up');
  }

  /**
   * Lên lịch để job bắt đầu vào thời điểm được chỉ định
   */
  private scheduleDelayedStart(jobId: string, startTime: Date): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    const delay = startTime.getTime() - Date.now();
    
    if (delay > 0) {
      const timeout = setTimeout(() => {
        const currentJob = this.jobs.get(jobId);
        if (currentJob && currentJob.status === 'scheduled') {
          this.startJob(jobId);
        }
      }, delay);

      job.startTimeout = timeout;
      this.jobs.set(jobId, job);

      console.log(`⏰ [JobManager] Scheduled job ${job.name} to start at ${startTime.toLocaleString('vi-VN')}`);
    } else {
      // Start immediately if time has passed
      this.startJob(jobId);
    }
  }
}

// Global instance (only in server environment)
export const jobManager = new JobManager(); 