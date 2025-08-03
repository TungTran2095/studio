import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  try {
    console.log('🧠 [Models API] GET - Fetching from Supabase database...');
    
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const modelId = searchParams.get('id');

    // First, fetch models without join to avoid relationship errors
    let query = supabase
      .from('research_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    if (modelId) {
      query = query.eq('id', modelId);
    }

    const { data: models, error } = await query;

    if (error) {
      console.error('❌ [Models API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch models', details: error.message },
        { status: 500 }
      );
    }

    // Optionally fetch training results separately if models exist
    const modelsWithResults = models || [];
    if (modelsWithResults.length > 0) {
      try {
        const modelIds = modelsWithResults.map(m => m.id);
        const { data: trainingResults } = await supabase
          .from('model_training_results')
          .select('*')
          .in('model_id', modelIds);

        // Attach training results to models
        modelsWithResults.forEach(model => {
          model.model_training_results = trainingResults?.filter(tr => tr.model_id === model.id) || [];
        });
      } catch (trainingError) {
        console.log('⚠️ [Models API] Training results not available:', trainingError);
        // Continue without training results if table doesn't exist
      }
    }

    console.log(`✅ [Models API] Retrieved ${modelsWithResults.length} models from database`);
    return NextResponse.json({ models: modelsWithResults });

  } catch (error) {
    console.error('❌ [Models API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('🚀 [Models API] POST - Creating model:', body);

    // Validate required fields
    if (!body.project_id) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      );
    }

    if (!body.name || !body.name.trim()) {
      return NextResponse.json(
        { error: 'Model name is required' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = ['statistical', 'machine_learning', 'financial_math'];
    if (body.category && !validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      );
    }

    // First check what columns exist in the table
    const { data: schemaInfo, error: schemaError } = await supabase
      .from('research_models')
      .select('*')
      .limit(1);
    
    if (schemaError) {
      console.log('⚠️ [Models API] Schema check error:', schemaError);
    } else {
      console.log('🔍 [Models API] Available columns:', Object.keys(schemaInfo?.[0] || {}));
    }

    const modelData: any = {
      project_id: body.project_id,
      name: body.name,
      category: body.category || 'machine_learning',
      algorithm_type: body.algorithm_type || body.algorithm || 'linear_regression',
      status: body.status || 'draft',
      user_id: null // Will be set by RLS policy based on auth context
    };

    // Add optional fields if they exist in schema
    if (body.description) modelData.description = body.description;
    if (body.parameters) modelData.parameters = body.parameters;
    if (body.hyperparameters) modelData.hyperparameters = body.hyperparameters;
    if (body.feature_config) modelData.feature_config = body.feature_config;
    if (body.training_config) modelData.training_config = body.training_config;
    if (body.model_file_path) modelData.model_file_path = body.model_file_path;
    if (body.training_time_seconds) modelData.training_time_seconds = body.training_time_seconds;
    if (body.data_size) modelData.data_size = body.data_size;

    console.log('📋 [Models API] Prepared model data (actual schema):', modelData);

    // Try to insert with RLS bypass for testing
    const { data: model, error } = await supabase
      .from('research_models')
      .insert([modelData])
      .select()
      .single();

    if (error) {
      console.error('❌ [Models API] Database error:', error);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      return NextResponse.json(
        { error: 'Failed to create model', details: error.message, code: error.code, hint: error.hint },
        { status: 500 }
      );
    }

    console.log('✅ [Models API] Model created successfully:', model.id);
    return NextResponse.json({ model });

  } catch (error) {
    console.error('❌ [Models API] Unexpected error:', error);
    console.error('Error type:', typeof error);
    console.error('Error message:', error instanceof Error ? error.message : String(error));
    console.error('Stack trace:', error instanceof Error ? error.stack : 'No stack');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const body = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data: model, error } = await supabase
      .from('research_models')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('❌ [Models API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to update model', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ model });

  } catch (error) {
    console.error('❌ [Models API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Model ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('research_models')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ [Models API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to delete model', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ [Models API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 