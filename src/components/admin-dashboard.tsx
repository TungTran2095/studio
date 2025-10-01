'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Users, 
  FileText, 
  MessageSquare, 
  TrendingUp,
  Calendar,
  Clock,
  UserCheck,
  Activity
} from 'lucide-react';
import { getSystemStats, getAllWorkLogs, getAllUsers } from '@/app/admin-actions';
import { WorkLogEntry, UserProfile } from '@/lib/types';

interface SystemStats {
  totalUsers: number;
  totalWorkLogs: number;
  totalConversations: number;
  workLogsThisWeek: number;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [recentWorkLogs, setRecentWorkLogs] = useState<WorkLogEntry[]>([]);
  const [recentUsers, setRecentUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const [statsResult, workLogsResult, usersResult] = await Promise.all([
          getSystemStats(),
          getAllWorkLogs(),
          getAllUsers()
        ]);

        if (statsResult.stats) {
          setStats(statsResult.stats);
        }

        if (workLogsResult.worklogs) {
          setRecentWorkLogs(workLogsResult.worklogs.slice(0, 5));
        }

        if (usersResult.users) {
          setRecentUsers(usersResult.users.slice(0, 5));
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-20 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-4 w-4 bg-gray-200 animate-pulse rounded"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 w-16 bg-gray-200 animate-pulse rounded"></div>
                <div className="h-3 w-24 bg-gray-200 animate-pulse rounded mt-2"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <Badge variant="secondary" className="flex items-center space-x-1">
          <Activity className="h-3 w-3" />
          <span>Real-time</span>
        </Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số người dùng trong hệ thống
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tổng WorkLogs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalWorkLogs || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số báo cáo công việc
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cuộc trò chuyện</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              Tổng số cuộc trò chuyện AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">WorkLogs tuần này</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.workLogsThisWeek || 0}</div>
            <p className="text-xs text-muted-foreground">
              Báo cáo trong 7 ngày qua
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent WorkLogs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>WorkLogs gần đây</span>
            </CardTitle>
            <CardDescription>
              Các báo cáo công việc mới nhất
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentWorkLogs.length > 0 ? (
                recentWorkLogs.map((worklog) => (
                  <div key={worklog.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{worklog.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {worklog.start_time} - {worklog.end_time}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {worklog.category}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có WorkLog nào
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <UserCheck className="h-5 w-5" />
              <span>Users mới</span>
            </CardTitle>
            <CardDescription>
              Người dùng đăng ký gần đây
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentUsers.length > 0 ? (
                recentUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{user.full_name || 'Chưa có tên'}</h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {user.is_admin && (
                        <Badge variant="secondary" className="text-xs">
                          Admin
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {user.employee_id || 'Chưa có mã NV'}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Chưa có User nào
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
