"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MacOSCloseButton } from '@/components/ui/macos-close-button';
import { 
  Plus, 
  Settings, 
  Trash2, 
  CheckCircle, 
  AlertCircle,
  Globe,
  Database,
  FileText,
  Zap,
  Wifi,
  WifiOff,
  Eye,
  EyeOff,
  Clock,
  RotateCcw,
  Link,
  Shield,
  Edit,
  AlertTriangle
} from 'lucide-react';
import { DataSource } from '@/types/market-data';
import { realDataService } from '@/lib/market-data/real-data-service';

export function DataSourceManager() {
  const [dataSources, setDataSources] = useState<DataSource[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DataSource | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [connections, setConnections] = useState<{ source: string; connected: boolean; latency?: number }[]>([]);
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadDataSources();
    checkConnections();
  }, []);

  const loadDataSources = async () => {
    try {
      setIsLoading(true);
      const sources = await realDataService.getDataSources();
      setDataSources(sources);
    } catch (error) {
      console.error('Error loading data sources:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkConnections = async () => {
    try {
      const connectionStatus = await realDataService.checkDataSourceConnections();
      setConnections(connectionStatus);
    } catch (error) {
      console.error('Error checking connections:', error);
    }
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'api': return <Globe className="h-4 w-4" />;
      case 'websocket': return <Zap className="h-4 w-4" />;
      case 'database': return <Database className="h-4 w-4" />;
      case 'file': return <FileText className="h-4 w-4" />;
      default: return <Globe className="h-4 w-4" />;
    }
  };

  const getLastSyncText = (lastSync?: Date) => {
    if (!lastSync) return 'Chưa đồng bộ';
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Vừa xong';
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    return `${hours} giờ trước`;
  };

  const getConnectionStatus = (sourceName: string) => {
    const connection = connections.find(conn => 
      conn.source.toLowerCase().includes(sourceName.toLowerCase()) ||
      sourceName.toLowerCase().includes(conn.source.toLowerCase())
    );
    return connection;
  };

  const handleRefresh = () => {
    loadDataSources();
    checkConnections();
  };

  const testConnection = async (sourceId: string) => {
    setDataSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { ...source, status: 'testing' as const }
        : source
    ));

    // Simulate testing
    await new Promise(resolve => setTimeout(resolve, 2000));

    setDataSources(prev => prev.map(source => 
      source.id === sourceId 
        ? { 
            ...source, 
            status: Math.random() > 0.2 ? 'connected' as const : 'error' as const,
            lastConnected: new Date(),
            responseTime: Math.floor(Math.random() * 300) + 50
          }
        : source
    ));
  };

  const toggleApiKeyVisibility = (sourceId: string) => {
    setShowApiKeys(prev => ({
      ...prev,
      [sourceId]: !prev[sourceId]
    }));
  };

  const getStatusIcon = (status: DataSource['status']) => {
    switch (status) {
      case 'connected':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-gray-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'testing':
        return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: DataSource['status']) => {
    switch (status) {
      case 'connected':
        return <Badge className="bg-green-500">Kết nối</Badge>;
      case 'disconnected':
        return <Badge variant="secondary">Ngắt kết nối</Badge>;
      case 'error':
        return <Badge variant="destructive">Lỗi</Badge>;
      case 'testing':
        return <Badge className="bg-blue-500">Đang test</Badge>;
    }
  };

  const getTypeIcon = (type: DataSource['type']) => {
    switch (type) {
      case 'api':
        return <Link className="h-4 w-4" />;
      case 'database':
        return <Database className="h-4 w-4" />;
      case 'webhook':
        return <Zap className="h-4 w-4" />;
    }
  };

  const formatResponseTime = (ms: number) => {
    if (ms === 0) return 'N/A';
    return `${ms}ms`;
  };

  const maskApiKey = (apiKey?: string) => {
    if (!apiKey) return 'Chưa cấu hình';
    const parts = apiKey.split('_');
    if (parts.length >= 3) {
      return `${parts[0]}_${parts[1]}_${'*'.repeat(20)}${apiKey.slice(-6)}`;
    }
    return `${'*'.repeat(apiKey.length - 6)}${apiKey.slice(-6)}`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
          <p className="text-muted-foreground">Đang tải nguồn dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Quản lý nguồn dữ liệu</h2>
          <p className="text-muted-foreground">
            Cấu hình và quản lý các nguồn dữ liệu thị trường thực tế
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <Zap className="h-4 w-4 mr-2" />
            Kiểm tra kết nối
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Thêm nguồn dữ liệu
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Thêm nguồn dữ liệu mới</DialogTitle>
                <DialogDescription>
                  Cấu hình nguồn dữ liệu mới để thu thập thông tin thị trường
                </DialogDescription>
              </DialogHeader>
              <AddDataSourceForm onClose={() => setIsDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Connection Summary */}
      {connections.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="font-medium mb-3">Trạng thái kết nối</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {connections.map((conn, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  {conn.connected ? 
                    <CheckCircle className="h-4 w-4 text-green-500" /> : 
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  }
                  <span className="flex-1">{conn.source}</span>
                  {conn.latency && (
                    <span className="text-muted-foreground">{conn.latency}ms</span>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Sources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {dataSources.map((source) => {
          const connectionStatus = getConnectionStatus(source.name);
          const isConnected = connectionStatus?.connected ?? source.isActive;

          return (
            <Card key={source.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getTypeIcon(source.type)}
                    <CardTitle className="text-lg">{source.name}</CardTitle>
                    {source.isSecure && <Shield className="h-4 w-4 text-green-500" />}
                  </div>
                  <div className="flex items-center gap-1">
                    {getStatusBadge(source.status)}
                  </div>
                </div>
                <CardDescription className="text-sm truncate">
                  {source.endpoint}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loại:</span>
                    <span className="capitalize">{source.type}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Lần cuối:</span>
                    <span>{getLastSyncText(source.lastSync)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cấu hình:</span>
                    <span>{Object.keys(source.config).length} thuộc tính</span>
                  </div>

                  {/* Show specific config details */}
                  <div className="text-xs text-muted-foreground">
                    {source.config.rateLimit && (
                      <div>Rate limit: {source.config.rateLimit}/phút</div>
                    )}
                    {source.config.symbols && (
                      <div>Symbols: {source.config.symbols.slice(0, 3).join(', ')}</div>
                    )}
                    {source.config.tables && (
                      <div>Tables: {source.config.tables.join(', ')}</div>
                    )}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-3 w-3 mr-1" />
                      Cấu hình
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {dataSources.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Database className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Chưa có nguồn dữ liệu</h3>
            <p className="text-muted-foreground mb-4">
              Thêm nguồn dữ liệu đầu tiên để bắt đầu thu thập thông tin thị trường
            </p>
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Thêm nguồn dữ liệu
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function AddDataSourceForm({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'api',
    endpoint: '',
    apiKey: ''
  });

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Tên nguồn dữ liệu</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Ví dụ: Binance API"
        />
      </div>
      
      <div>
        <Label htmlFor="type">Loại</Label>
        <Select value={formData.type} onValueChange={(value) => setFormData(prev => ({ ...prev, type: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="api">API REST</SelectItem>
            <SelectItem value="websocket">WebSocket</SelectItem>
            <SelectItem value="database">Database</SelectItem>
            <SelectItem value="file">File</SelectItem>
            <SelectItem value="webhook">Webhook</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div>
        <Label htmlFor="endpoint">Endpoint</Label>
        <Input
          id="endpoint"
          value={formData.endpoint}
          onChange={(e) => setFormData(prev => ({ ...prev, endpoint: e.target.value }))}
          placeholder="https://api.example.com/v1"
        />
      </div>
      
      <div>
        <Label htmlFor="apiKey">API Key (tùy chọn)</Label>
        <Input
          id="apiKey"
          type="password"
          value={formData.apiKey}
          onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
          placeholder="API key của bạn"
        />
      </div>
      
      <div className="flex gap-2 pt-4">
        <Button onClick={onClose} className="flex-1">
          Thêm nguồn dữ liệu
        </Button>
        <Button variant="outline" onClick={onClose}>
          Hủy
        </Button>
      </div>
    </div>
  );
} 