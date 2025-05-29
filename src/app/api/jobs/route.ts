import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobs/job-manager';

interface DataCollectionJob {
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
    lookback?: number;
  };
}

/**
 * Serialize job để tránh circular structure
 */
function serializeJob(job: any): DataCollectionJob {
  return {
    id: job.id,
    name: job.name,
    description: job.description,
    status: job.status,
    progress: job.progress,
    lastRun: job.lastRun,
    nextRun: job.nextRun,
    recordsCollected: job.recordsCollected,
    source: job.source,
    frequency: job.frequency,
    config: {
      symbol: job.config?.symbol,
      interval: job.config?.interval,
      rateLimit: job.config?.rateLimit,
      autoStart: job.config?.autoStart,
      startDate: job.config?.startDate,
      startTime: job.config?.startTime,
      dataStartDate: job.config?.dataStartDate,
      dataEndDate: job.config?.dataEndDate,
      dataEndTime: job.config?.dataEndTime,
      targetDatabase: job.config?.targetDatabase,
      targetTable: job.config?.targetTable,
      timeframe: job.config?.timeframe,
      lookback: job.config?.lookback
    }
  };
}

/**
 * Serialize array of jobs
 */
function serializeJobs(jobs: any[]): DataCollectionJob[] {
  return jobs.map(serializeJob);
}

export async function GET() {
  try {
    const jobs = jobManager.getAllJobs();
    
    return NextResponse.json({
      success: true,
      data: serializeJobs(jobs)
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Không thể tải danh sách jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, jobId, jobData } = body;

    switch (action) {
      case 'create':
        const newJob = jobManager.createJob({
          name: jobData.name,
          description: jobData.description,
          source: jobData.source,
          frequency: jobData.frequency,
          config: jobData.config || {}
        });
        
        console.log(`[JobsAPI] Tạo job mới: ${newJob.name}`);
        return NextResponse.json({
          success: true,
          data: serializeJob(newJob),
          message: 'Tạo job thành công'
        });

      case 'start':
        const startSuccess = jobManager.startJob(jobId);
        if (startSuccess) {
          const updatedJob = jobManager.getJob(jobId);
          console.log(`[JobsAPI] Khởi động job: ${updatedJob?.name}`);
          return NextResponse.json({
            success: true,
            data: serializeJobs(jobManager.getAllJobs()),
            message: 'Khởi động job thành công'
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Không thể khởi động job' },
            { status: 400 }
          );
        }

      case 'stop':
        const stopSuccess = jobManager.stopJob(jobId);
        if (stopSuccess) {
          const updatedJob = jobManager.getJob(jobId);
          console.log(`[JobsAPI] Dừng job: ${updatedJob?.name}`);
          return NextResponse.json({
            success: true,
            data: serializeJobs(jobManager.getAllJobs()),
            message: 'Dừng job thành công'
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Không thể dừng job' },
            { status: 400 }
          );
        }

      case 'restart':
        const restartSuccess = jobManager.restartJob(jobId);
        if (restartSuccess) {
          const updatedJob = jobManager.getJob(jobId);
          console.log(`[JobsAPI] Khởi động lại job: ${updatedJob?.name}`);
          return NextResponse.json({
            success: true,
            data: serializeJobs(jobManager.getAllJobs()),
            message: 'Khởi động lại job thành công'
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Không thể khởi động lại job' },
            { status: 400 }
          );
        }

      case 'delete':
        const deleteSuccess = jobManager.deleteJob(jobId);
        if (deleteSuccess) {
          console.log(`[JobsAPI] Xóa job thành công`);
          return NextResponse.json({
            success: true,
            data: serializeJobs(jobManager.getAllJobs()),
            message: 'Xóa job thành công'
          });
        } else {
          return NextResponse.json(
            { success: false, error: 'Không thể xóa job' },
            { status: 400 }
          );
        }

      case 'test_binance':
        // Test job - chạy một lần để test
        try {
          const { binanceDataCollector } = await import('@/lib/jobs/binance-data-collector');
          
          // Parse startTime and endTime if provided
          let startTime: Date | undefined;
          let endTime: Date | undefined;
          
          if (jobData?.startTime) {
            startTime = new Date(jobData.startTime);
          }
          if (jobData?.endTime) {
            endTime = new Date(jobData.endTime);
          }
          
          const testResult = await binanceDataCollector.runDataCollection(
            jobData?.symbol || 'BTCUSDT',
            jobData?.interval || '1m',
            jobData?.limit || 100, // Use limit from jobData or default 100
            startTime,
            endTime
          );

          return NextResponse.json({
            success: true,
            data: testResult,
            message: testResult.success ? 'Test thành công' : 'Test thất bại'
          });
        } catch (error) {
          return NextResponse.json(
            { success: false, error: 'Test job thất bại' },
            { status: 500 }
          );
        }

      case 'execute_historical':
        // Execute historical data collection immediately
        try {
          const { binanceDataCollector } = await import('@/lib/jobs/binance-data-collector');
          
          const startTime = new Date(jobData.dataStartDate);
          let endTime: Date;
          
          if (jobData.dataEndDate) {
            const dataEndDateTime = `${jobData.dataEndDate}T${jobData.dataEndTime || '23:59'}:59`;
            endTime = new Date(dataEndDateTime);
          } else {
            // Default to 24 hours from start date
            endTime = new Date(startTime.getTime() + 24 * 60 * 60 * 1000);
          }

          console.log(`🚀 [API] Historical collection: ${startTime.toISOString()} to ${endTime.toISOString()}`);

          const historicalResult = await binanceDataCollector.runDataCollection(
            jobData.symbol || 'BTCUSDT',
            jobData.interval || '1m',
            jobData.limit || 1000,
            startTime,
            endTime,
            {
              targetDatabase: jobData.targetDatabase,
              targetTable: jobData.targetTable
            }
          );

          return NextResponse.json({
            success: true,
            data: historicalResult,
            message: historicalResult.success ? 'Historical collection thành công' : 'Historical collection thất bại'
          });
        } catch (error) {
          console.error('Historical collection error:', error);
          return NextResponse.json(
            { success: false, error: 'Historical collection thất bại' },
            { status: 500 }
          );
        }

      case 'stop_all':
        // Stop all running jobs
        try {
          const allJobs = jobManager.getAllJobs();
          let stoppedCount = 0;
          
          for (const job of allJobs) {
            if (job.status === 'running' || job.status === 'scheduled') {
              const success = jobManager.stopJob(job.id);
              if (success) {
                stoppedCount++;
                console.log(`🛑 [API] Stopped job: ${job.name}`);
              }
            }
          }
          
          console.log(`🛑 [API] Stopped ${stoppedCount} jobs total`);
          
          return NextResponse.json({
            success: true,
            data: { stoppedCount },
            message: `Đã dừng ${stoppedCount} jobs`
          });
        } catch (error) {
          console.error('Stop all jobs error:', error);
          return NextResponse.json(
            { success: false, error: 'Không thể dừng jobs' },
            { status: 500 }
          );
        }

      case 'cleanup_all':
        // Cleanup and delete all jobs
        try {
          const allJobs = jobManager.getAllJobs();
          let deletedCount = 0;
          
          for (const job of allJobs) {
            // Stop job first
            jobManager.stopJob(job.id);
            // Then delete it
            const success = jobManager.deleteJob(job.id);
            if (success) {
              deletedCount++;
              console.log(`🗑️ [API] Deleted job: ${job.name}`);
            }
          }
          
          // Also call cleanup method
          jobManager.cleanup();
          
          console.log(`🧹 [API] Cleaned up ${deletedCount} jobs total`);
          
          return NextResponse.json({
            success: true,
            data: { deletedCount },
            message: `Đã xóa và cleanup ${deletedCount} jobs`
          });
        } catch (error) {
          console.error('Cleanup all jobs error:', error);
          return NextResponse.json(
            { success: false, error: 'Không thể cleanup jobs' },
            { status: 500 }
          );
        }

      default:
        return NextResponse.json(
          { success: false, error: 'Action không hợp lệ' },
          { status: 400 }
        );
    }

  } catch (error) {
    console.error('Error managing jobs:', error);
    return NextResponse.json(
      { success: false, error: 'Lỗi khi quản lý jobs' },
      { status: 500 }
    );
  }
} 