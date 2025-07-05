"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAssetStore } from '@/store/asset-store';
import { SignalDebug } from './signal-debug';

interface DebugInfo {
  timestamp: string;
  type: 'info' | 'error' | 'warning' | 'success';
  message: string;
  details?: any;
}

export const TradingDebug: React.FC = () => {
  const { apiKey, apiSecret, isTestnet } = useAssetStore();
  const [debugLogs, setDebugLogs] = useState<DebugInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("general");

  // Thêm log mới
  const addLog = (type: DebugInfo['type'], message: string, details?: any) => {
    const newLog: DebugInfo = {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message,
      details
    };
    setDebugLogs(prev => [newLog, ...prev.slice(0, 49)]); // Giữ tối đa 50 logs
  };

  // Kiểm tra trạng thái kết nối
  useEffect(() => {
    const isConnected = !!(apiKey && apiSecret);
    addLog('info', `Connection status: ${isConnected ? 'Connected' : 'Disconnected'}`);
    if (apiKey && apiSecret) {
      addLog('info', `API Key: ${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`);
      addLog('info', `Testnet: ${isTestnet ? 'Yes' : 'No'}`);
    } else {
      addLog('warning', 'No API credentials found');
    }
  }, [apiKey, apiSecret, isTestnet]);

  // Test connection
  const testConnection = async () => {
    addLog('info', 'Testing Binance connection...');
    
    if (!apiKey || !apiSecret) {
      addLog('error', 'No API credentials available');
      return;
    }

    try {
      const response = await fetch('/api/trading/binance/account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, apiSecret, isTestnet })
      });

      if (response.ok) {
        const data = await response.json();
        addLog('success', 'Connection test successful', data);
      } else {
        const error = await response.text();
        addLog('error', 'Connection test failed', error);
      }
    } catch (error: any) {
      addLog('error', 'Connection test error', error.message);
    }
  };

  // Clear logs
  const clearLogs = () => {
    setDebugLogs([]);
  };

  // Get badge color
  const getBadgeColor = (type: DebugInfo['type']) => {
    switch (type) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-blue-500';
    }
  };

  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        🐛 Debug
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 w-[500px] h-[600px] z-50 bg-white border-2 border-gray-300 shadow-lg">
      <CardHeader className="p-3 border-b">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm">Trading Debug</CardTitle>
          <div className="flex gap-2">
            <Button size="sm" onClick={testConnection}>Test</Button>
            <Button size="sm" variant="outline" onClick={clearLogs}>Clear</Button>
            <Button size="sm" variant="ghost" onClick={() => setIsVisible(false)}>×</Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 overflow-hidden h-[520px]">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-2 mb-2">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="signals">Signals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="h-[480px] overflow-y-auto">
            <div className="space-y-1">
              {debugLogs.map((log, index) => (
                <div key={index} className="text-xs border-b border-gray-100 pb-1">
                  <div className="flex items-center gap-2">
                    <Badge className={`text-xs ${getBadgeColor(log.type)}`}>
                      {log.type.toUpperCase()}
                    </Badge>
                    <span className="text-gray-500">{log.timestamp}</span>
                  </div>
                  <div className="mt-1 text-gray-700">{log.message}</div>
                  {log.details && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-gray-500">Details</summary>
                      <pre className="text-xs bg-gray-100 p-1 mt-1 rounded overflow-x-auto">
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
              {debugLogs.length === 0 && (
                <div className="text-gray-500 text-center py-4">No debug logs yet</div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="signals" className="h-[480px]">
            <SignalDebug />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}; 