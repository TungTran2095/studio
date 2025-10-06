"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw,
  Shield,
  Zap,
  TrendingUp,
  Database,
  Info,
  Pause,
  Play,
  Settings
} from 'lucide-react';

interface APIUsageStats {
  currentWeight: number;
  maxWeight: number;
  weightPercentage: number;
  callsPerMinute: number;
  lastResetTime: number;
  emergencyMode: boolean;
  endpointBreakdown: {
    endpoint: string;
    weight: number;
    calls: number;
    lastCall: number;
  }[];
  recommendations: string[];
}

interface BinanceAPIUsageMonitorProps {
  className?: string;
}

export function BinanceAPIUsageMonitor({ className }: BinanceAPIUsageMonitorProps) {
  const [usageStats, setUsageStats] = useState<APIUsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch API usage statistics
  const fetchUsageStats = async () => {
    try {
      const response = await fetch('/api/monitor/binance-api-usage');
      if (response.ok) {
        const data = await response.json();
        setUsageStats(data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch API usage stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto refresh every 5 seconds
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchUsageStats, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  // Initial fetch
  useEffect(() => {
    fetchUsageStats();
  }, []);

  const getStatusColor = (percentage: number) => {
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 70) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getStatusBadge = (percentage: number, emergencyMode: boolean) => {
    if (emergencyMode) return <Badge variant="destructive">Emergency Mode</Badge>;
    if (percentage >= 90) return <Badge variant="destructive">Critical</Badge>;
    if (percentage >= 70) return <Badge variant="secondary">Warning</Badge>;
    return <Badge variant="default">Safe</Badge>;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Binance API Usage Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading API usage statistics...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!usageStats) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Binance API Usage Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Unable to load API usage statistics. Please check your connection.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Binance API Usage Monitor
            </CardTitle>
            <CardDescription>
              Real-time monitoring of Binance API usage and rate limits
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsageStats}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Main Usage Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Weight Usage</span>
              {getStatusBadge(usageStats.weightPercentage, usageStats.emergencyMode)}
            </div>
            <Progress 
              value={usageStats.weightPercentage} 
              className="h-2"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{usageStats.currentWeight} / {usageStats.maxWeight}</span>
              <span className={getStatusColor(usageStats.weightPercentage)}>
                {usageStats.weightPercentage.toFixed(1)}%
              </span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Calls per Minute</div>
            <div className="text-2xl font-bold">{usageStats.callsPerMinute}</div>
            <div className="text-xs text-muted-foreground">
              Last reset: {new Date(usageStats.lastResetTime).toLocaleTimeString()}
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Status</div>
            <div className="flex items-center gap-2">
              {usageStats.emergencyMode ? (
                <AlertTriangle className="h-5 w-5 text-red-500" />
              ) : (
                <CheckCircle className="h-5 w-5 text-green-500" />
              )}
              <span className="text-sm">
                {usageStats.emergencyMode ? 'Emergency Mode Active' : 'Normal Operation'}
              </span>
            </div>
          </div>
        </div>

        {/* Endpoint Breakdown */}
        <div className="space-y-3">
          <h4 className="font-semibold flex items-center gap-2">
            <Database className="h-4 w-4" />
            Endpoint Usage Breakdown
          </h4>
          <div className="space-y-2">
            {usageStats.endpointBreakdown.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                <div className="flex-1">
                  <div className="text-sm font-medium">{endpoint.endpoint}</div>
                  <div className="text-xs text-muted-foreground">
                    Weight: {endpoint.weight} | Calls: {endpoint.calls}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {new Date(endpoint.lastCall).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendations */}
        {usageStats.recommendations.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Recommendations
            </h4>
            <div className="space-y-2">
              {usageStats.recommendations.map((recommendation, index) => (
                <Alert key={index}>
                  <AlertDescription className="text-sm">
                    {recommendation}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </div>
        )}

        {/* Emergency Actions */}
        {usageStats.emergencyMode && (
          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2 text-red-600">
              <Shield className="h-4 w-4" />
              Emergency Actions
            </h4>
            <div className="flex gap-2">
              <Button variant="destructive" size="sm">
                Force Emergency Mode
              </Button>
              <Button variant="outline" size="sm">
                Reset Rate Limits
              </Button>
              <Button variant="outline" size="sm">
                Switch to Testnet
              </Button>
            </div>
          </div>
        )}

        {/* Last Updated */}
        <div className="text-xs text-muted-foreground text-center">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  );
}
