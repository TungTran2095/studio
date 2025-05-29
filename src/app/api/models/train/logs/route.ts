import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import fs from 'fs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const model_id = searchParams.get('model_id');

    console.log(`🔍 Logs API called with model_id: ${model_id}`);

    if (!model_id) {
      console.log('❌ No model_id provided');
      return NextResponse.json(
        { error: 'model_id is required' },
        { status: 400 }
      );
    }

    // Get logs and model info from database - select only existing columns
    const { data: model, error } = await supabase
      .from('research_models')
      .select(`
        id,
        name,
        status,
        training_logs,
        created_at,
        updated_at
      `)
      .eq('id', model_id)
      .single();

    if (error) {
      console.error('❌ Database error fetching model:', error);
      return NextResponse.json(
        { error: 'Model not found', details: error.message },
        { status: 404 }
      );
    }

    console.log(`📊 Fetching logs for model ${model_id}:`, {
      name: model.name,
      status: model.status,
      has_training_logs: !!model.training_logs,
      training_logs_type: typeof model.training_logs,
      training_logs_length: model.training_logs ? (Array.isArray(model.training_logs) ? model.training_logs.length : model.training_logs.toString().length) : 0
    });

    let logs = [];
    let rawLogs = null;

    // Try to parse training_logs as JSON with detailed processing
    if (model.training_logs) {
      try {
        // Store raw logs for debugging
        rawLogs = model.training_logs;
        
        // If training_logs is already an array (JSONB), use it directly
        if (Array.isArray(model.training_logs)) {
          logs = model.training_logs.map((log: any, index: number) => ({
            id: index + 1,
            timestamp: log.timestamp || new Date().toISOString(),
            level: log.level || 'info',
            message: log.message || '',
            source: log.source || 'system',
            details: log.details || {},
            raw: log // Include raw log entry for debugging
          }));
          console.log(`✅ Parsed ${logs.length} JSONB logs for model ${model_id}`);
        } 
        // If it's a JSON string, parse it
        else if (typeof model.training_logs === 'string') {
          const parsedLogs = JSON.parse(model.training_logs);
          if (Array.isArray(parsedLogs)) {
            logs = parsedLogs.map((log: any, index: number) => ({
              id: index + 1,
              timestamp: log.timestamp || new Date().toISOString(),
              level: log.level || 'info',
              message: log.message || '',
              source: log.source || 'system',
              details: log.details || {},
              raw: log
            }));
            console.log(`✅ Parsed ${logs.length} JSON string logs for model ${model_id}`);
          } else {
            console.log('⚠️ training_logs is not an array after parsing');
          }
        }
      } catch (parseError) {
        console.log('⚠️ Error parsing training_logs JSON, falling back to text parsing:', parseError);
        
        // Fallback: treat as text and split by lines
        const logText = model.training_logs.toString();
        const logLines = logText
          .split('\n')
          .filter((line: string) => line.trim() !== '');
          
        logs = logLines.map((line: string, index: number) => ({
          id: index + 1,
          timestamp: extractTimestamp(line),
          level: extractLogLevel(line),
          message: line.trim(),
          source: 'file',
          raw: line
        }));
        console.log(`✅ Parsed ${logs.length} text logs for model ${model_id}`);
      }
    }

    // If no logs but model status is available, generate comprehensive status logs
    if (logs.length === 0) {
      logs = generateDetailedStatusLogs(model);
      console.log(`📝 Generated ${logs.length} status logs for model ${model_id}`);
    }

    // Parse performance_metrics if available - skip for now since column doesn't exist
    let performance_metrics = {};
    // if (model.performance_metrics) {
    //   try {
    //     if (typeof model.performance_metrics === 'string') {
    //       performance_metrics = JSON.parse(model.performance_metrics);
    //     } else {
    //       performance_metrics = model.performance_metrics;
    //     }
    //     console.log(`📊 Performance metrics available for model ${model_id}:`, Object.keys(performance_metrics));
    //   } catch (error) {
    //     console.log('⚠️ Error parsing performance_metrics:', error);
    //     performance_metrics = {};
    //   }
    // }

    // Build comprehensive response
    const response = {
      success: true,
      model_id,
      model_info: {
        name: model.name,
        status: model.status,
        created_at: model.created_at,
        updated_at: model.updated_at
      },
      training_info: {
        training_logs: model.training_logs,
        training_logs_type: typeof model.training_logs,
        training_logs_length: model.training_logs ? (Array.isArray(model.training_logs) ? model.training_logs.length : model.training_logs.toString().length) : 0
      },
      logs: {
        entries: logs,
        count: logs.length,
        raw_logs: rawLogs, // Include raw logs for debugging
        has_detailed_logs: logs.length > 0 && logs[0].source !== 'generated'
      },
      metrics: {
        // accuracy: model.accuracy,
        // loss: model.loss
        message: "Metrics will be available after running SQL schema update"
      },
      performance_metrics,
      debug_info: {
        database_columns_found: {
          training_logs: !!model.training_logs,
          // performance_metrics: !!model.performance_metrics,
          // training_started_at: !!model.training_started_at,
          // training_completed_at: !!model.training_completed_at
          status: !!model.status,
          name: !!model.name
        }
      }
    };

    console.log(`✅ Returning comprehensive logs response for model ${model_id}`);
    return NextResponse.json(response);

  } catch (error) {
    console.error('❌ Logs API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch logs', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

function extractTimestamp(logLine: string): string {
  const timestampMatch = logLine.match(/\[([^\]]+)\]/);
  return timestampMatch ? timestampMatch[1] : new Date().toISOString();
}

function extractLogLevel(logLine: string): string {
  if (logLine.includes('[STDOUT]')) return 'info';
  if (logLine.includes('[STDERR]')) return 'error';
  if (logLine.includes('❌')) return 'error';
  if (logLine.includes('✅')) return 'success';
  if (logLine.includes('🚀')) return 'start';
  if (logLine.includes('🏁')) return 'complete';
  if (logLine.includes('⚠️')) return 'warning';
  return 'info';
}

function generateDetailedStatusLogs(model: any) {
  const logs = [];
  let index = 1;

  if (model.training_started_at) {
    logs.push({
      id: index++,
      timestamp: model.training_started_at,
      level: 'start',
      message: `🚀 Training started for model: ${model.name || model.id}`,
      source: 'generated'
    });
  }

  if (model.status === 'training') {
    logs.push({
      id: index++,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `⏳ Training in progress...`,
      source: 'generated'
    });
  } else if (model.status === 'completed') {
    logs.push({
      id: index++,
      timestamp: model.training_completed_at || new Date().toISOString(),
      level: 'success',
      message: `✅ Training completed successfully`,
      source: 'generated'
    });
  } else if (model.status === 'failed') {
    logs.push({
      id: index++,
      timestamp: model.training_completed_at || new Date().toISOString(),
      level: 'error',
      message: `❌ Training failed: ${model.training_error || 'Unknown error'}`,
      source: 'generated'
    });
  }

  return logs;
} 