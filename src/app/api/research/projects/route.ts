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
    console.log('📁 [Projects API] GET - Fetching from Supabase database...');
    
    const { data: projects, error } = await supabase
      .from('research_projects')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ [Projects API] Supabase error:', error);
      
      // If table doesn't exist, return setup instructions
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Research tables not found',
          message: 'Please run database setup first',
          setup_url: '/api/research/setup-real-database',
          instructions: 'POST to /api/research/setup-real-database to create tables',
          projects: [],
          total: 0
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to fetch projects from database',
        details: error.message,
        projects: [],
        total: 0
      }, { status: 500 });
    }
    
    console.log(`✅ [Projects API] Retrieved ${projects?.length || 0} projects from database`);
    
    return NextResponse.json({
      projects: projects || [],
      total: projects?.length || 0,
      message: 'Data retrieved from Supabase database (persistent storage)',
      storage_type: 'supabase_database'
    });
    
  } catch (error) {
    console.error('❌ [Projects API] GET error:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch projects',
      projects: [],
      total: 0
    }, { status: 500 }    );
  }
}

export async function POST(request: NextRequest) {
  
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
    console.log('📁 [Projects API] POST - Creating project in database:', body);

    // Validation
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json({ 
        error: 'Project name is required' 
      }, { status: 400 });
    }

    // Create new project in Supabase
    const { data: newProject, error } = await supabase
      .from('research_projects')
      .insert({
        name: body.name.trim(),
        description: body.description?.trim() || '',
        objective: body.objective?.trim() || '',
        status: 'active',
        progress: 0
      })
      .select()
      .single();

    if (error) {
      console.error('❌ [Projects API] Supabase insertion error:', error);
      
      if (error.code === '42P01') {
        return NextResponse.json({
          error: 'Research tables not found',
          message: 'Please run database setup first',
          setup_url: '/api/research/setup-real-database'
        }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to create project in database',
        details: error.message
      }, { status: 500 });
    }

    console.log('✅ [Projects API] Project created successfully in database:', newProject.id);

    return NextResponse.json({
      project: newProject,
      message: 'Project created successfully in database (persistent storage)',
      storage_type: 'supabase_database'
    });

  } catch (error) {
    console.error('❌ [Projects API] POST error:', error);
    return NextResponse.json({ 
      error: 'Failed to create project',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}


export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('📁 [Projects API] PUT - Updating project in database:', projectId);

    const { data: updatedProject, error } = await supabase
      .from('research_projects')
      .update({
        ...body,
        updated_at: new Date().toISOString()
      })
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Projects API] Update error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to update project',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Projects API] Project updated successfully:', projectId);

    return NextResponse.json({
      project: updatedProject,
      message: 'Project updated successfully in database'
    });

  } catch (error) {
    console.error('❌ [Projects API] PUT error:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('id');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    console.log('📁 [Projects API] DELETE - Deleting project from database:', projectId);

    const { data: deletedProject, error } = await supabase
      .from('research_projects')
      .delete()
      .eq('id', projectId)
      .select()
      .single();

    if (error) {
      console.error('❌ [Projects API] Delete error:', error);
      
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        error: 'Failed to delete project',
        details: error.message 
      }, { status: 500 });
    }

    console.log('✅ [Projects API] Project deleted successfully:', projectId);

    return NextResponse.json({
      message: 'Project deleted successfully from database',
      deleted_project: deletedProject
    });

  } catch (error) {
    console.error('❌ [Projects API] DELETE error:', error);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }
} 