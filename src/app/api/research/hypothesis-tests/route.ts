import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';
import { 
  CorrelationTest, 
  TTest, 
  ANOVA, 
  ChiSquareTest,
  StatTestConfig 
} from '@/lib/research/statistical-tests';

export async function GET(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('project_id');
    const status = searchParams.get('status');

    let query = supabase
      .from('hypothesis_tests')
      .select('*')
      .order('created_at', { ascending: false });

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }

    const { data: tests, error } = await query;

    if (error) {
      console.error('Error fetching hypothesis tests:', error);
      return NextResponse.json({ error: 'Failed to fetch tests' }, { status: 500 });
    }

    return NextResponse.json({ tests });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabase) {
      return NextResponse.json({ error: 'Database connection not available' }, { status: 500 });
    }

    const body = await request.json();
    const {
      project_id,
      name,
      description,
      hypothesis,
      null_hypothesis,
      alternative_hypothesis,
      test_type,
      variables,
      test_config,
      run_immediately = false
    } = body;

    if (!name || !test_type || !variables) {
      return NextResponse.json({
        error: 'Name, test_type, and variables are required'
      }, { status: 400 });
    }

    // Create test record
    const { data: test, error: insertError } = await supabase
      .from('hypothesis_tests')
      .insert({
        project_id,
        name,
        description,
        hypothesis,
        null_hypothesis,
        alternative_hypothesis,
        test_type,
        variables,
        test_config: test_config || {},
        status: run_immediately ? 'running' : 'pending'
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error creating hypothesis test:', insertError);
      return NextResponse.json({ error: 'Failed to create test' }, { status: 500 });
    }

    // If run_immediately is true, execute the test
    if (run_immediately) {
      try {
        const result = await executeHypothesisTest(test.id, test_type, variables, test_config);
        
        // Update test with results
        const { error: updateError } = await supabase
          .from('hypothesis_tests')
          .update({
            results: result,
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', test.id);

        if (updateError) {
          console.error('Error updating test results:', updateError);
        }

        return NextResponse.json({ 
          test: { ...test, results: result, status: 'completed' }
        }, { status: 201 });
      } catch (testError) {
        console.error('Error executing test:', testError);
        
        // Update test status to failed
        await supabase
          .from('hypothesis_tests')
          .update({ status: 'failed' })
          .eq('id', test.id);

        return NextResponse.json({
          error: 'Test created but execution failed',
          test
        }, { status: 500 });
      }
    }

    return NextResponse.json({ test }, { status: 201 });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Execute hypothesis test based on type
async function executeHypothesisTest(
  testId: string,
  testType: string,
  variables: any,
  testConfig: any
) {
  // For demo, we'll generate sample data
  // In production, this would fetch real market data
  const sampleData = generateSampleData(testType);
  
  const config: StatTestConfig = {
    confidenceLevel: testConfig.confidenceLevel || 0.95,
    alternative: testConfig.alternative || 'two-sided'
  };

  switch (testType) {
    case 'correlation':
      if (!sampleData.x || !sampleData.y) {
        throw new Error('Invalid sample data for correlation test');
      }
      return CorrelationTest.perform(sampleData.x, sampleData.y, config);
      
    case 't_test':
      if (!sampleData.group1 || !sampleData.group2) {
        throw new Error('Invalid sample data for t-test');
      }
      return TTest.independentSamples(sampleData.group1, sampleData.group2, config);
      
    case 'anova':
      if (!sampleData.groups) {
        throw new Error('Invalid sample data for ANOVA');
      }
      return ANOVA.oneWay(sampleData.groups, config);
      
    case 'chi_square':
      if (!sampleData.observed) {
        throw new Error('Invalid sample data for Chi-square test');
      }
      return ChiSquareTest.independence(sampleData.observed, config);
      
    default:
      throw new Error(`Unsupported test type: ${testType}`);
  }
}

// Generate sample data for testing
function generateSampleData(testType: string): {
  x?: number[];
  y?: number[];
  group1?: number[];
  group2?: number[];
  groups?: number[][];
  observed?: number[][];
} {
  const random = (mean = 0, std = 1) => mean + std * (Math.random() - 0.5) * 2;
  
  switch (testType) {
    case 'correlation':
      // Generate correlated data
      const n = 100;
      const x = Array.from({ length: n }, () => random(50, 10));
      const y = x.map(xi => xi * 0.8 + random(0, 5)); // Some correlation with noise
      return { x, y };
      
    case 't_test':
      // Generate two groups with different means
      const group1 = Array.from({ length: 50 }, () => random(100, 15));
      const group2 = Array.from({ length: 50 }, () => random(110, 15)); // Slightly higher mean
      return { group1, group2 };
      
    case 'anova':
      // Generate multiple groups
      const groups = [
        Array.from({ length: 30 }, () => random(100, 10)),
        Array.from({ length: 30 }, () => random(105, 10)),
        Array.from({ length: 30 }, () => random(95, 10))
      ];
      return { groups };
      
    case 'chi_square':
      // Generate contingency table
      const observed = [
        [20, 30, 25],
        [25, 35, 20],
        [30, 20, 30]
      ];
      return { observed };
      
    default:
      return {};
  }
} 