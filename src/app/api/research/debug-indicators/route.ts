import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    const experimentId = searchParams.get('experiment_id');

    if (experimentId) {
      // Debug một experiment cụ thể
      const { data: experiment, error } = await supabase
        .from('research_experiments')
        .select('*')
        .eq('id', experimentId)
        .single();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const debugInfo = {
        experiment: {
          id: experiment.id,
          name: experiment.name,
          type: experiment.type,
          status: experiment.status,
          config: experiment.config,
          hasIndicators: !!experiment.indicators,
          indicatorsKeys: experiment.indicators ? Object.keys(experiment.indicators) : [],
          indicatorsData: experiment.indicators
        }
      };

      return NextResponse.json(debugInfo);
    } else {
      // Debug tất cả experiments có indicators
      const { data: experiments, error } = await supabase
        .from('research_experiments')
        .select('*')
        .not('indicators', 'is', null);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const debugInfo = {
        totalExperiments: experiments?.length || 0,
        experiments: experiments?.map(exp => ({
          id: exp.id,
          name: exp.name,
          type: exp.type,
          status: exp.status,
          strategyType: exp.config?.strategy?.type,
          hasIndicators: !!exp.indicators,
          indicatorsKeys: exp.indicators ? Object.keys(exp.indicators) : [],
          timestampsCount: exp.indicators?.timestamps?.length || 0,
          indicatorsData: exp.indicators
        })) || []
      };

      return NextResponse.json(debugInfo);
    }
  } catch (error) {
    console.error('Error debugging indicators:', error);
          return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      );
  }
}
