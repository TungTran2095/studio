import * as cron from 'node-cron';
import { binanceDataCollector } from './binance-data-collector';

export interface RealDataCollectionJob {
  id: string;
  name: string;
  description: string;
  status: 'running' | 'stopped' | 'error' | 'completed';
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
  };
  // Cron task instance
  task?: cron.ScheduledTask;
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
    };
  }): RealDataCollectionJob {
    const jobId = `job-${Date.now()}`;
    
    // Convert frequency to cron expression
    const cronExpression = this.frequencyToCron(jobData.frequency);
    
    const newJob: RealDataCollectionJob = {
      id: jobId,
      name: jobData.name,
      description: jobData.description,
      status: 'stopped',
      progress: 0,
      lastRun: new Date(),
      nextRun: null,
      recordsCollected: 0,
      source: jobData.source,
      frequency: jobData.frequency,
      cronExpression,
      config: jobData.config
    };

    this.jobs.set(jobId, newJob);
    
    // Auto start if configured
    if (jobData.config.autoStart && this.isServerEnvironment) {
      this.startJob(jobId);
    }

    console.log(`✅ [JobManager] Created new job: ${newJob.name} (${jobId})`);
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

    if (job.task) {
      job.task.stop();
      job.task.destroy();
    }

    job.status = 'stopped';
    job.nextRun = null;
    job.task = undefined;

    this.jobs.set(jobId, job);
    
    console.log(`⏹️ [JobManager] Stopped job: ${job.name}`);
    return true;
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

    // Stop job first
    this.stopJob(jobId);

    // Delete from map
    this.jobs.delete(jobId);

    console.log(`🗑️ [JobManager] Deleted job: ${job.name}`);
    return true;
  }

  /**
   * Thực thi job
   */
  private async executeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    console.log(`⚡ [JobManager] Executing job: ${job.name}`);
    
    try {
      job.progress = 10;
      this.jobs.set(jobId, job);

      // Run data collection based on source
      if (job.source === 'Binance API' && job.config.symbol) {
        job.progress = 50;
        this.jobs.set(jobId, job);

        const result = await binanceDataCollector.runDataCollection(
          job.config.symbol,
          job.config.interval || '1m',
          100
        );

        if (result.success) {
          job.recordsCollected += result.recordsCollected;
          job.status = 'running'; // Keep running
          job.progress = 100;
          job.lastRun = new Date();
          job.nextRun = this.getNextRunTime(job.cronExpression);
          
          console.log(`✅ [JobManager] Job completed: ${job.name} (${result.recordsCollected} records)`);
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

    // Reset progress after a delay
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
}

// Global instance (only in server environment)
export const jobManager = new JobManager(); 