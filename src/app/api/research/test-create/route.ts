import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [Test Create] Starting model creation test...');
    
    const testModelData = {
      project_id: 'b42d7da9-9663-4d9a-a9c2-56abc10a1686',
      name: 'Test Model from GET',
      model_type: 'Linear Regression',
      algorithm: 'Linear Regression'
    };

    console.log('📋 [Test Create] Test model data:', testModelData);

    const { data: model, error } = await supabase
      .from('research_models')
      .insert([testModelData])
      .select()
      .single();

    if (error) {
      console.error('❌ [Test Create] Database error:', error);
      return NextResponse.json({
        success: false,
        error: 'Database error',
        details: error.message,
        code: error.code,
        hint: error.hint
      });
    }

    console.log('✅ [Test Create] Model created successfully:', model);

    return NextResponse.json({
      success: true,
      message: 'Model created successfully via GET test',
      model: model
    });

  } catch (error) {
    console.error('❌ [Test Create] Unexpected error:', error);
    return NextResponse.json({
      success: false,
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : String(error)
    });
  }
} 