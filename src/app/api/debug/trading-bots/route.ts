import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function GET() {
  try {
    console.log('🔍 Debug: Checking trading bots...');
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    // Kiểm tra bảng trading_bots
    const { data: tradingBots, error: tradingBotsError } = await supabase
      .from('trading_bots')
      .select('*')
      .limit(10);

    // Kiểm tra bảng research_experiments
    const { data: experiments, error: experimentsError } = await supabase
      .from('research_experiments')
      .select('*')
      .limit(10);

    // Kiểm tra bảng projects
    const { data: projects, error: projectsError } = await supabase
      .from('research_projects')
      .select('*')
      .limit(10);

    return NextResponse.json({
      trading_bots: {
        data: tradingBots,
        error: tradingBotsError,
        count: tradingBots?.length || 0
      },
      research_experiments: {
        data: experiments,
        error: experimentsError,
        count: experiments?.length || 0
      },
      research_projects: {
        data: projects,
        error: projectsError,
        count: projects?.length || 0
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 