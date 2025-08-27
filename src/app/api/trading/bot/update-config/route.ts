import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { createClient } from '@supabase/supabase-js';

// Supabase admin client để bypass RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { botId, positionSize } = body;

    if (!botId || positionSize === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (positionSize < 1 || positionSize > 100) {
      return NextResponse.json({ error: 'Position size must be between 1 and 100' }, { status: 400 });
    }

    // Cảnh báo khi Position Size quá cao
    if (positionSize > 80) {
      console.warn(`[API] ⚠️ User setting Position Size = ${positionSize}% - High risk!`);
    }

    // Lấy thông tin bot hiện tại
    const { data: bot, error: fetchError } = await supabaseAdmin
      .from('trading_bots')
      .select('config')
      .eq('id', botId)
      .single();

    if (fetchError || !bot) {
      return NextResponse.json({ error: 'Bot not found' }, { status: 404 });
    }

    // Cập nhật config với positionSize mới
    const updatedConfig = {
      ...bot.config,
      positionSize: positionSize
    };

    const { error: updateError } = await supabaseAdmin
      .from('trading_bots')
      .update({ 
        config: updatedConfig,
        updated_at: new Date().toISOString()
      })
      .eq('id', botId);

    if (updateError) {
      console.error('Error updating bot config:', updateError);
      return NextResponse.json({ error: 'Failed to update bot config' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Bot config updated successfully',
      config: updatedConfig
    });

  } catch (error: any) {
    console.error('Error updating bot config:', error);
    return NextResponse.json({ 
      error: 'Failed to update bot config',
      details: error.message 
    }, { status: 500 });
  }
}
