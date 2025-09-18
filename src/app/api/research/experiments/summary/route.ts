import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { executeWithTimeout, SUPABASE_TIMEOUT_CONFIG } from '@/lib/supabase/timeout-config';

// Check if environment variables are available
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Only create Supabase client if environment variables are available
const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase client is available
    if (!supabase) {
      console.log('⚠️ Supabase client not available - environment variables missing');
      return NextResponse.json(
        { 
          error: 'Database connection not available',
          details: 'NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required',
          success: false
        },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');

    // Get summary statistics instead of full data
    const queryFn = async () => {
      let query = supabase
        .from('research_experiments')
        .select('status, type, created_at, results')
        .order('created_at', { ascending: false })
        .limit(1000); // Higher limit for summary

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      return await query;
    };

    const { data: experiments, error } = await executeWithTimeout(
      queryFn,
      SUPABASE_TIMEOUT_CONFIG.DEFAULT_TIMEOUT
    );

    if (error) {
      console.error('Error fetching experiments summary:', error);
      
      // Check if it's a timeout error
      if (error.code === '57014') {
        return NextResponse.json({ 
          error: 'Database query timeout. Please try again.',
          timeout: true,
          details: 'Query took too long to execute.'
        }, { status: 504 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch experiments summary', 
        details: error.message 
      }, { status: 500 });
    }

    // Calculate summary statistics
    const summary: {
      total: number;
      byStatus: Record<'pending' | 'running' | 'completed' | 'failed' | 'stopped', number>;
      byType: Record<'backtest' | 'hypothesis_test' | 'optimization' | 'monte_carlo', number>;
      recent: any[];
      performance: { avgWinRate: number; totalTrades: number; avgReturn: number };
    } = {
      total: experiments?.length || 0,
      byStatus: {
        pending: 0,
        running: 0,
        completed: 0,
        failed: 0,
        stopped: 0
      },
      byType: {
        backtest: 0,
        hypothesis_test: 0,
        optimization: 0,
        monte_carlo: 0
      },
      recent: experiments?.slice(0, 10) || [], // Chỉ 10 thí nghiệm gần nhất
      performance: {
        avgWinRate: 0,
        totalTrades: 0,
        avgReturn: 0
      }
    };

    // Process experiments data
    if (experiments) {
      experiments.forEach((exp: any) => {
        // Count by status
        const status = exp.status as keyof typeof summary.byStatus;
        if (Object.prototype.hasOwnProperty.call(summary.byStatus, status)) {
          summary.byStatus[status]++;
        }

        // Count by type
        const typeKey = exp.type as keyof typeof summary.byType;
        if (Object.prototype.hasOwnProperty.call(summary.byType, typeKey)) {
          summary.byType[typeKey]++;
        }

        // Calculate performance metrics from results
        if (exp.results && typeof exp.results === 'object') {
          const results = exp.results;
          if (results.win_rate || results.winRate) {
            summary.performance.avgWinRate += results.win_rate || results.winRate || 0;
          }
          if (results.total_trades || results.totalTrades) {
            summary.performance.totalTrades += results.total_trades || results.totalTrades || 0;
          }
          if (results.total_return || results.totalReturn) {
            summary.performance.avgReturn += results.total_return || results.totalReturn || 0;
          }
        }
      });

      // Calculate averages
      const completedCount = summary.byStatus.completed;
      if (completedCount > 0) {
        summary.performance.avgWinRate = summary.performance.avgWinRate / completedCount;
        summary.performance.avgReturn = summary.performance.avgReturn / completedCount;
      }
    }

    return NextResponse.json({ 
      summary,
      success: true 
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
