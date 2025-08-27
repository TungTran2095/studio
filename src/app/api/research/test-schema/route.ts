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
    console.log('🔍 [Test Schema] Checking research_models table schema...');
    
    // Test different field combinations to find the correct schema
    const testFields = [
      { name: 'test1', algorithm: 'test' },
      { name: 'test2', model_type: 'test' },
      { name: 'test3', category: 'test' },
      { name: 'test4', category: 'test', algorithm: 'test' },
      { name: 'test5', category: 'test', model_type: 'test' },
      { name: 'test6', category: 'test', algorithm_type: 'test' }
    ];

    const results = [];

    for (const testPayload of testFields) {
      const { data: insertTest, error: insertError } = await supabase
        .from('research_models')
        .insert([testPayload])
        .select()
        .single();

      if (insertError) {
        results.push({
          test_payload: testPayload,
          success: false,
          error: insertError.message,
          code: insertError.code
        });
      } else {
        // Clean up successful test
        if (insertTest) {
          await supabase
            .from('research_models')
            .delete()
            .eq('id', insertTest.id);
        }
        
        results.push({
          test_payload: testPayload,
          success: true,
          inserted_record: insertTest
        });
        break; // Found working schema
      }
    }

    return NextResponse.json({
      message: 'Schema discovery results',
      results,
      summary: results.find(r => r.success) ? 'Found working schema' : 'No working schema found'
    });

  } catch (error) {
    return NextResponse.json({
      error: 'Unexpected error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}