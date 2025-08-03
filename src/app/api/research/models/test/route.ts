import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🧪 [Test API] Testing model creation:', body);

    // Test data
    const testModelData = {
      project_id: body.project_id || '00000000-0000-0000-0000-000000000000',
      name: body.name || 'Test Model',
      description: body.description || 'Test model for debugging',
      category: body.category || 'machine_learning',
      algorithm_type: body.algorithm_type || 'linear_regression',
      status: 'draft',
      user_id: null
    };

    console.log('🧪 [Test API] Test model data:', testModelData);

    // Try to insert
    const { data: model, error } = await supabase
      .from('research_models')
      .insert([testModelData])
      .select()
      .single();

    if (error) {
      console.error('❌ [Test API] Database error:', error);
      return NextResponse.json(
        { 
          error: 'Test failed', 
          details: error.message, 
          code: error.code, 
          hint: error.hint,
          testData: testModelData
        },
        { status: 500 }
      );
    }

    console.log('✅ [Test API] Test successful:', model);
    return NextResponse.json({ 
      success: true, 
      model,
      testData: testModelData
    });

  } catch (error) {
    console.error('❌ [Test API] Unexpected error:', error);
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 