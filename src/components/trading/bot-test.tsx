"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BotTestProps {
  botId: string;
  botConfig: any;
}

export const BotTest: React.FC<BotTestProps> = ({ botId, botConfig }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const startBot = async () => {
    try {
      setIsRunning(true);
      setError(null);
      addLog('Starting bot...');

      const response = await fetch('/api/trading/bot/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to start bot');
      }

      const result = await response.json();
      addLog(`Bot started successfully: ${result.message}`);
      
      // Poll for bot status
      const pollInterval = setInterval(async () => {
        try {
          const statusResponse = await fetch(`/api/trading/bot/status?botId=${botId}`);
          if (statusResponse.ok) {
            const statusData = await statusResponse.json();
            addLog(`Bot status: ${statusData.status}`);
            
            if (statusData.status === 'stopped' || statusData.status === 'error') {
              clearInterval(pollInterval);
              setIsRunning(false);
            }
          }
        } catch (error) {
          console.error('Error polling bot status:', error);
        }
      }, 5000);

    } catch (error: any) {
      setError(error.message);
      addLog(`Error: ${error.message}`);
      setIsRunning(false);
    }
  };

  const stopBot = async () => {
    try {
      addLog('Stopping bot...');

      const response = await fetch('/api/trading/bot/stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stop bot');
      }

      const result = await response.json();
      addLog(`Bot stopped: ${result.message}`);
      setIsRunning(false);
    } catch (error: any) {
      setError(error.message);
      addLog(`Error: ${error.message}`);
    }
  };

  const clearLogs = () => {
    setLogs([]);
    setError(null);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Bot Test
          <div className="flex gap-2">
            <Badge variant={isRunning ? "default" : "secondary"}>
              {isRunning ? "Running" : "Stopped"}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button 
            onClick={startBot} 
            disabled={isRunning}
            className="bg-green-600 hover:bg-green-700"
          >
            Start Bot
          </Button>
          <Button 
            onClick={stopBot} 
            disabled={!isRunning}
            variant="destructive"
          >
            Stop Bot
          </Button>
          <Button onClick={clearLogs} variant="outline">
            Clear Logs
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}

        <div className="border rounded p-3 h-64 overflow-y-auto bg-gray-50">
          <h4 className="font-semibold mb-2">Bot Logs:</h4>
          {logs.length === 0 ? (
            <p className="text-gray-500">No logs yet</p>
          ) : (
            <div className="space-y-1">
              {logs.map((log, index) => (
                <div key={index} className="text-sm font-mono">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border rounded p-3">
          <h4 className="font-semibold mb-2">Bot Configuration:</h4>
          <pre className="text-xs bg-gray-100 p-2 rounded overflow-x-auto">
            {JSON.stringify(botConfig, null, 2)}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}; 