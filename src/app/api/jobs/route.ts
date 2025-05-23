import { NextRequest, NextResponse } from 'next/server';
import { jobManager } from '@/lib/jobs/job-manager';

interface DataCollectionJob {
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
  config: {
    symbol?: string;
    interval?: string;
    rateLimit?: number;
    autoStart?: boolean;
  };
}

export async function GET() {
  try {
    const jobs = jobManager.getAllJobs();
    
    return NextResponse.json({
      success: true,
      data: jobs
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
          data: newJob,
          message: 'Tạo job thành công'
        });

      case 'start':
        const startSuccess = jobManager.startJob(jobId);
        if (startSuccess) {
          const updatedJob = jobManager.getJob(jobId);
          console.log(`[JobsAPI] Khởi động job: ${updatedJob?.name}`);
          return NextResponse.json({
            success: true,
            data: jobManager.getAllJobs(),
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
            data: jobManager.getAllJobs(),
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
            data: jobManager.getAllJobs(),
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
            data: jobManager.getAllJobs(),
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
          
          const testResult = await binanceDataCollector.runDataCollection(
            jobData?.symbol || 'BTCUSDT',
            jobData?.interval || '1m',
            5 // Only 5 records for testing
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