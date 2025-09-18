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
    const experimentId = searchParams.get('id');

    if (!experimentId) {
      return NextResponse.json(
        { error: 'Experiment ID is required' },
        { status: 400 }
      );
    }

    // Get detailed experiment data with timeout handling
    const queryFn = async () => {
      return await supabase
        .from('research_experiments')
        .select('*')
        .eq('id', experimentId)
        .single();
    };

    const { data: experiment, error } = await executeWithTimeout(
      queryFn,
      SUPABASE_TIMEOUT_CONFIG.DEFAULT_TIMEOUT
    );

    if (error) {
      console.error('Error fetching experiment details:', error);
      
      // Check if it's a timeout error
      if (error.code === '57014') {
        return NextResponse.json({ 
          error: 'Database query timeout. Please try again.',
          timeout: true,
          details: 'Query took too long to execute.'
        }, { status: 504 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch experiment details', 
        details: error.message 
      }, { status: 500 });
    }

    if (!experiment) {
      return NextResponse.json(
        { error: 'Experiment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ experiment });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
