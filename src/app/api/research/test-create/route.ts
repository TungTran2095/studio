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