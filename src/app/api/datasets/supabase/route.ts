import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
    const limit = parseInt(searchParams.get('limit') || '1000');
    const offset = parseInt(searchParams.get('offset') || '0');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    console.log('📊 Fetching OHLCV data from Supabase:', {
      limit,
      offset,
      startDate,
      endDate
    });

    // Build query - Get latest data first for preview
    let query = supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*')
      .order('open_time', { ascending: false }) // Get latest data first
      .limit(limit);

    // Add date filters if provided
    if (startDate) {
      query = query.gte('open_time', startDate);
    }
    if (endDate) {
      query = query.lte('open_time', endDate);
    }

    // Add pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('❌ Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch data from Supabase', details: error.message },
        { status: 500 }
      );
    }

    // Get total count for pagination
    const { count: totalCount } = await supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*', { count: 'exact', head: true });

    console.log('✅ Successfully fetched OHLCV data:', {
      records: data?.length || 0,
      totalCount
    });

    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        offset,
        limit,
        total: totalCount || 0,
        hasMore: (offset + limit) < (totalCount || 0)
      }
    });

  } catch (error) {
    console.error('❌ API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
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

    const body = await request.json();
    const { sampleSize, trainTestSplit, startDate, endDate } = body;

    console.log('📊 Creating dataset sample:', {
      sampleSize,
      trainTestSplit,
      startDate,
      endDate
    });

    // Build query for sampling
    let query = supabase
      .from('OHLCV_BTC_USDT_1m')
      .select('*')
      .order('open_time', { ascending: true });

    // Add date filters
    if (startDate) {
      query = query.gte('open_time', startDate);
    }
    if (endDate) {
      query = query.lte('open_time', endDate);
    }

    // Limit to sample size
    if (sampleSize) {
      query = query.limit(sampleSize);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase sampling error:', error);
      return NextResponse.json(
        { error: 'Failed to sample data', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'No data found for the specified criteria' },
        { status: 404 }
      );
    }

    // Split data into train/test
    const splitIndex = Math.floor(data.length * (trainTestSplit / 100));
    const trainData = data.slice(0, splitIndex);
    const testData = data.slice(splitIndex);

    console.log('✅ Dataset created:', {
      totalRecords: data.length,
      trainRecords: trainData.length,
      testRecords: testData.length,
      splitRatio: `${trainTestSplit}/${100 - trainTestSplit}`
    });

    return NextResponse.json({
      success: true,
      dataset: {
        total: data.length,
        train: trainData,
        test: testData,
        metadata: {
          sampleSize,
          trainTestSplit,
          startDate,
          endDate,
          trainSize: trainData.length,
          testSize: testData.length
        }
    });

  } catch (error) {
    console.error('❌ Dataset creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create dataset', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }