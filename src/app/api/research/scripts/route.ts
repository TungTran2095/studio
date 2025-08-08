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

    
  try {
    const { searchParams } = new URL(request.url);
    const modelId = searchParams.get('model_id');
    const scriptType = searchParams.get('type') || 'training';

    console.log('📜 [Scripts API] GET - Fetching scripts...');

    // For now, return a placeholder since we don't have scripts table yet
    // In real implementation, you would query from a scripts table
    const scripts: any[] = [];

    if (modelId) {
      // Return scripts for specific model
      console.log(`📜 [Scripts API] Fetching scripts for model: ${modelId}`);
    }

    return NextResponse.json({ 
      scripts,
      message: 'Scripts table not implemented yet. Python scripts are generated on-demand during training.'
    });

  } catch (error) {
    console.error('❌ [Scripts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scripts' },
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
    const { model_id, script_content, script_type, filename } = body;

    console.log('📜 [Scripts API] POST - Saving script for model:', model_id);

    // For now, just return the script content
    // In real implementation, you would save to a scripts table or file system
    const scriptData = {
      id: `script_${Date.now()}`,
      model_id,
      script_type: script_type || 'training',
      filename: filename || `model_${model_id}_${script_type || 'training'}.py`,
      content: script_content,
      created_at: new Date().toISOString()
    };

    console.log('✅ [Scripts API] Script saved (mock):', scriptData.filename);

    return NextResponse.json({ 
      script: scriptData,
      message: 'Script saved successfully (mock implementation)'
    });

  } catch (error) {
    console.error('❌ [Scripts API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to save script' },
      { status: 500 }
    );
  }
} 