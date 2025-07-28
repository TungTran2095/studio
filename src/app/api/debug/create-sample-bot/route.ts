import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

export async function POST() {
  try {
    console.log('🔧 Creating sample trading bot...');
    
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase not initialized' }, { status: 500 });
    }

    // Tạo sample project trước
    const { data: project, error: projectError } = await supabase
      .from('research_projects')
      .insert({
        name: 'Sample Trading Project',
        description: 'Project để test trading bots',
        status: 'active'
      })
      .select()
      .single();

    if (projectError) {
      console.error('Project creation error:', projectError);
      return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
    }

    // Tạo sample trading bot
    const { data: bot, error: botError } = await supabase
      .from('trading_bots')
      .insert({
        project_id: project.id,
        experiment_id: '00000000-0000-0000-0000-000000000000', // dummy experiment ID
        name: 'Sample Trading Bot',
        description: 'Bot mẫu để test',
        status: 'idle',
        config: {
          strategy: 'RSI',
          symbol: 'BTCUSDT',
          timeframe: '1h'
        },
        total_trades: 0,
        total_profit: 0,
        win_rate: 0
      })
      .select()
      .single();

    if (botError) {
      console.error('Bot creation error:', botError);
      return NextResponse.json({ error: 'Failed to create bot' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      project,
      bot
    });

  } catch (error) {
    console.error('Create sample bot error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 