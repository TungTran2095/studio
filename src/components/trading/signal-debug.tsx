'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface SignalDebugProps {
  botId?: string;
}

interface DebugLog {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  data?: any;
}

export const SignalDebug: React.FC<SignalDebugProps> = ({ botId }) => {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [lastSignal, setLastSignal] = useState<string | null>(null);
  const [lastRSI, setLastRSI] = useState<number | null>(null);

  useEffect(() => {
    if (!isMonitoring) return;

    // Intercept console.log để capture debug logs
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    const addLog = (level: 'info' | 'error' | 'warn' | 'debug', ...args: any[]) => {
      const message = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
      ).join(' ');
      
      const log: DebugLog = {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message,
        data: args.length > 1 ? args : undefined
      };

      setLogs(prev => [...prev.slice(-99), log]); // Giữ 100 logs gần nhất

      // Extract signal và RSI từ logs
      if (message.includes('RSI Signal Debug - Current RSI:')) {
        const rsiMatch = message.match(/Current RSI: ([\d.]+)/);
        if (rsiMatch) {
          setLastRSI(parseFloat(rsiMatch[1]));
        }
      }

      if (message.includes('returning BUY signal')) {
        setLastSignal('BUY');
      } else if (message.includes('returning SELL signal')) {
        setLastSignal('SELL');
      }
    };

    console.log = (...args) => {
      originalLog(...args);
      if (args[0]?.includes?.('[BotExecutor]')) {
        addLog('info', ...args);
      }
    };

    console.error = (...args) => {
      originalError(...args);
      if (args[0]?.includes?.('[BotExecutor]')) {
        addLog('error', ...args);
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      if (args[0]?.includes?.('[BotExecutor]')) {
        addLog('warn', ...args);
      }
    };

    return () => {
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
    };
  }, [isMonitoring]);

  const clearLogs = () => {
    setLogs([]);
    setLastSignal(null);
    setLastRSI(null);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500';
      case 'warn': return 'text-yellow-500';
      case 'debug': return 'text-blue-500';
      default: return 'text-green-500';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Signal Debug</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={isMonitoring ? "destructive" : "default"}
              onClick={() => setIsMonitoring(!isMonitoring)}
            >
              {isMonitoring ? 'Stop' : 'Start'} Monitoring
            </Button>
            <Button size="sm" variant="outline" onClick={clearLogs}>
              Clear
            </Button>
          </div>
        </div>
        
        {/* Status indicators */}
        <div className="flex items-center gap-4 mt-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Status:</span>
            <Badge variant={isMonitoring ? "default" : "secondary"}>
              {isMonitoring ? 'Monitoring' : 'Stopped'}
            </Badge>
          </div>
          
          {lastSignal && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last Signal:</span>
              <Badge variant={lastSignal === 'BUY' ? "default" : "destructive"}>
                {lastSignal}
              </Badge>
            </div>
          )}
          
          {lastRSI !== null && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Last RSI:</span>
              <Badge variant="outline">
                {lastRSI.toFixed(2)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <ScrollArea className="h-64 w-full">
          <div className="space-y-1">
            {logs.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                {isMonitoring ? 'Waiting for debug logs...' : 'No logs captured'}
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="text-xs font-mono">
                  <span className="text-muted-foreground">[{log.timestamp}]</span>
                  <span className={`ml-2 ${getLogColor(log.level)}`}>
                    {log.message}
                  </span>
                  {log.data && (
                    <pre className="mt-1 ml-4 text-xs bg-muted p-2 rounded overflow-x-auto">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        
        <Separator className="my-3" />
        
        <div className="text-xs text-muted-foreground">
          <p>• Monitoring console logs for [BotExecutor] messages</p>
          <p>• Captures RSI calculations, signal generation, and errors</p>
          <p>• Auto-extracts current RSI value and trading signals</p>
        </div>
      </CardContent>
    </Card>
  );
}; 