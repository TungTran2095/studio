"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Folder,
  Plus,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Database,
  Zap
} from 'lucide-react';
import { ProjectDetailView } from './project-detail-view';

interface ResearchProject {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export function ResearchProjectsTab() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [newProject, setNewProject] = useState({
    name: '',
    description: ''
  });
  const [createStatus, setCreateStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('🔍 Fetching projects...');
      const response = await fetch('/api/research/projects');
      console.log('📁 Projects API response:', response.status);
      
      const data = await response.json();
      console.log('✅ Projects data:', data);
      
      if (response.ok) {
        setProjects(data.projects || []);
        setNeedsSetup(false);
      } else if (response.status === 404 && data.error?.includes('Research tables not found')) {
        console.log('⚠️ Database setup required');
        setNeedsSetup(true);
        setProjects([]);
      } else {
        console.error('❌ Failed to fetch projects:', response.status);
        setProjects([]);
      }
    } catch (error) {
      console.error('❌ Error fetching projects:', error);
      setProjects([]);
    }
  };

  const setupDatabase = async () => {
    try {
      setSetupLoading(true);
      console.log('🚀 Setting up real database...');
      
      const response = await fetch('/api/research/setup-real-database', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const data = await response.json();
      console.log('🔧 Database setup response:', data);

      if (response.ok) {
        setNeedsSetup(false);
        await fetchProjects(); // Refresh projects
        setCreateStatus('success');
        setErrorMessage('');
        
        // Show success for 3 seconds
        setTimeout(() => setCreateStatus('idle'), 3000);
      } else {
        console.error('❌ Database setup failed:', data);
        setErrorMessage(data.error || 'Database setup failed');
        setCreateStatus('error');
      }
    } catch (error) {
      console.error('❌ Database setup error:', error);
      setErrorMessage('Network error during setup');
      setCreateStatus('error');
    } finally {
      setSetupLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProject.name.trim()) {
      setErrorMessage('Tên project không được để trống');
      setCreateStatus('error');
      return;
    }

    try {
      setLoading(true);
      setCreateStatus('idle');
      setErrorMessage('');
      
      console.log('🚀 Creating project:', newProject);
      
      const response = await fetch('/api/research/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProject)
      });

      console.log('📁 Create project response:', response.status);
      
      const data = await response.json();
      console.log('Project creation result:', data);
      
      if (response.ok) {
        console.log('✅ Project created successfully:', data);
        
        setCreateStatus('success');
        await fetchProjects(); // Refresh the list
        setShowCreateForm(false);
        setNewProject({ name: '', description: '' });
        
        // Show success message for 3 seconds
        setTimeout(() => setCreateStatus('idle'), 3000);
      } else {
        console.error('❌ Failed to create project:', data);
        if (response.status === 404 && data.error?.includes('Research tables not found')) {
          setNeedsSetup(true);
          setErrorMessage('Database chưa được setup. Vui lòng setup database trước.');
        } else {
          setErrorMessage(data.error || 'Không thể tạo project');
        }
        setCreateStatus('error');
      }
    } catch (error) {
      console.error('❌ Error creating project:', error);
      setErrorMessage('Lỗi kết nối server. Vui lòng thử lại.');
      setCreateStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Return project detail view if selected (AFTER all hooks)
  if (selectedProjectId) {
    return (
      <ProjectDetailView 
        projectId={selectedProjectId}
        onBack={() => setSelectedProjectId(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Research Projects</h2>
          <p className="text-muted-foreground">
            Quản lý các dự án nghiên cứu định lượng
          </p>
        </div>
        <div className="flex gap-2">
          {needsSetup && (
            <Button 
              onClick={setupDatabase} 
              disabled={setupLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {setupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Setting up...
                </>
              ) : (
                <>
                  <Database className="h-4 w-4 mr-2" />
                  Setup Real Database
                </>
              )}
            </Button>
          )}
          <Button onClick={() => setShowCreateForm(true)} disabled={needsSetup}>
            <Plus className="h-4 w-4 mr-2" />
            Tạo Project Mới
          </Button>
        </div>
      </div>

      {/* Database Setup Alert */}
      {needsSetup && (
        <Card className="border-yellow-500 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-700 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Database Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-yellow-800 mb-4">
              Research tables chưa tồn tại trong database. Click "Setup Real Database" để tạo tables và migrate từ mock data sang Supabase thật.
            </p>
            <div className="space-y-2 text-sm text-yellow-700">
              <div>✅ Persistent storage (không mất data khi restart)</div>
              <div>✅ Real database với foreign keys</div>
              <div>✅ Demo projects và models có sẵn</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success/Error Messages */}
      {createStatus === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-700">
            ✅ {needsSetup ? 'Database setup thành công!' : 'Project đã được tạo thành công!'} 
            {projects.length > 0 && ` Total: ${projects.length} projects`}
          </AlertDescription>
        </Alert>
      )}

      {createStatus === 'error' && errorMessage && (
        <Alert className="border-red-500 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-700">
            ❌ {errorMessage}
          </AlertDescription>
        </Alert>
      )}

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Tạo Research Project</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="project-name">Tên Project</Label>
              <Input
                id="project-name"
                value={newProject.name}
                onChange={(e) => {
                  setNewProject(prev => ({ ...prev, name: e.target.value }));
                  if (createStatus === 'error') {
                    setCreateStatus('idle');
                    setErrorMessage('');
                  }
                }}
                placeholder="VD: Nghiên cứu giá BTC"
                className={createStatus === 'error' && !newProject.name.trim() ? 'border-red-500' : ''}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="project-description">Mô tả</Label>
              <Input
                id="project-description"
                value={newProject.description}
                onChange={(e) => setNewProject(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Mô tả mục tiêu và phạm vi nghiên cứu..."
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={createProject} 
                disabled={loading || !newProject.name.trim()}
                className={createStatus === 'success' ? 'bg-green-600 hover:bg-green-700' : ''}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang tạo...
                  </>
                ) : createStatus === 'success' ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Đã tạo!
                  </>
                ) : (
                  'Tạo Project'
                )}
              </Button>
              <Button variant="outline" onClick={() => {
                setShowCreateForm(false);
                setCreateStatus('idle');
                setErrorMessage('');
                setNewProject({ name: '', description: '' });
              }}>
                Hủy
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-blue-500" />
                  <CardTitle className="text-base">{project.name}</CardTitle>
                </div>
                <Badge variant="outline">
                  {project.status || 'active'}
                </Badge>
              </div>
              <CardDescription>
                {project.description || 'Chưa có mô tả'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                <span>Created: {new Date(project.created_at).toLocaleDateString('vi-VN')}</span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  View
                </Button>
              </div>
            </CardContent>
          </Card>
        )) : (
          <Card className="col-span-full">
            <CardContent className="text-center py-8">
              <Folder className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">Chưa có project nào</h3>
              <p className="text-muted-foreground mb-4">
                Tạo research project đầu tiên để bắt đầu nghiên cứu
              </p>
              <Button onClick={() => setShowCreateForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Tạo Project Đầu Tiên
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 