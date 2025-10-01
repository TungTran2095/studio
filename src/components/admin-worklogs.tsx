'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  Search, 
  FileText, 
  User, 
  Clock,
  RefreshCw,
  Filter,
  Download
} from 'lucide-react';
import { getAllWorkLogs } from '@/app/admin-actions';
import { WorkLogEntry } from '@/lib/types';

export function AdminWorkLogs() {
  const [workLogs, setWorkLogs] = useState<WorkLogEntry[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWorkLogs();
  }, []);

  const loadWorkLogs = async () => {
    try {
      setLoading(true);
      const result = await getAllWorkLogs();
      if (result.worklogs) {
        setWorkLogs(result.worklogs);
      }
    } catch (error) {
      console.error('Error loading worklogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkLogs = workLogs.filter(worklog => 
    worklog.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worklog.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    worklog.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categoryStats = workLogs.reduce((acc, worklog) => {
    acc[worklog.category] = (acc[worklog.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded mb-6"></div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-24 bg-gray-200 animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="h-96 bg-gray-200 animate-pulse rounded"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Calendar className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">Quản lý WorkLogs</h1>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={loadWorkLogs} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng WorkLogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{workLogs.length}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số báo cáo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hôm nay</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workLogs.filter(w => {
                const today = new Date().toDateString();
                const worklogDate = new Date(w.timestamp).toDateString();
                return today === worklogDate;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Báo cáo hôm nay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tuần này</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workLogs.filter(w => {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return new Date(w.timestamp) >= weekAgo;
              }).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Báo cáo tuần này
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Có file</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {workLogs.filter(w => w.file_url).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Có file đính kèm
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category Stats */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Thống kê theo danh mục</CardTitle>
          <CardDescription>
            Phân bố WorkLogs theo các danh mục
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(categoryStats).map(([category, count]) => (
              <div key={category} className="text-center p-3 border rounded-lg">
                <div className="text-lg font-bold">{count}</div>
                <div className="text-sm text-muted-foreground">{category}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* WorkLogs List */}
      <Card>
        <CardHeader>
          <CardTitle>Danh sách WorkLogs</CardTitle>
          <CardDescription>
            Tất cả báo cáo công việc trong hệ thống
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Tìm kiếm theo tiêu đề, mô tả hoặc danh mục..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="space-y-3">
              {filteredWorkLogs.length > 0 ? (
                filteredWorkLogs.map((worklog) => (
                  <div key={worklog.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-sm">{worklog.title}</h4>
                          <Badge variant="outline">{worklog.category}</Badge>
                          {worklog.file_url && (
                            <Badge variant="secondary">Có file</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {worklog.description}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <div className="flex items-center space-x-1">
                            <User className="h-3 w-3" />
                            <span>User ID: {worklog.user_id}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Clock className="h-3 w-3" />
                            <span>{worklog.start_time} - {worklog.end_time}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Calendar className="h-3 w-3" />
                            <span>{new Date(worklog.timestamp).toLocaleDateString('vi-VN')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Không tìm thấy WorkLog nào
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Thử thay đổi từ khóa tìm kiếm
                  </p>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
