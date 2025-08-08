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
    const projectId = searchParams.get('project_id');
    const modelId = searchParams.get('id');

    if (modelId) {
      // Get specific model
      const { data: model, error } = await supabase
        .from('research_models')
        .select('*')
        .eq('id', modelId)
        .single();

      if (error) {
        console.error('Error fetching model:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      return NextResponse.json({ model });
    }

    // Get all models for project
    let query = supabase
      .from('research_models')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }

    const { data: models, error } = await query;

    if (error) {
      console.error('Error fetching models:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ models: models || [] });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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

      if (!model) {
        return NextResponse.json(
          { error: 'Failed to create model - no data returned' },
          { status: 500 }
        );
      }

      console.log('✅ [Models API] Model created successfully:', model.id);
      return NextResponse.json({ 
        success: true, 
        model,
        message: 'Model created successfully' 
      });
    } catch (error) {
      console.error('❌ [Models API] Unexpected error:', error);
      return NextResponse.json(
        { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('❌ [Models API] Outer error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('id');
    const body = await request.json();

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
    }

    const updateData = {
      ...body,
      updated_at: new Date().toISOString()
    };

    const { data: model, error } = await supabase
      .from('research_models')
      .update(updateData)
      .eq('id', modelId)
      .select()
      .single();

    if (error) {
      console.error('Error updating model:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      model,
      message: 'Model updated successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('id');

    if (!modelId) {
      return NextResponse.json({ error: 'Model ID is required' }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 503 });
    }

    const { error } = await supabase
      .from('research_models')
      .delete()
      .eq('id', modelId);

    if (error) {
      console.error('Error deleting model:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Model deleted successfully' 
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 