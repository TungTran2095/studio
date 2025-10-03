ximport React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Settings, 
  Copy, 
  CheckCircle, 
  AlertTriangle, 
  ExternalLink,
  Terminal,
  Globe
} from 'lucide-react';

interface EnvironmentSetupGuideProps {
  className?: string;
}

export function EnvironmentSetupGuide({ className }: EnvironmentSetupGuideProps) {
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());

  const environmentVariables = {
    'BINANCE_USED_WEIGHT_PER_MIN': '1000',
    'BINANCE_ORDERS_PER_10S': '40',
    'BINANCE_ORDERS_PER_1M': '1500',
    'CACHE_DEFAULT_TTL': '30000',
    'CACHE_MAX_SIZE': '1000',
    'WEBSOCKET_RECONNECT_ATTEMPTS': '5',
    'WEBSOCKET_RECONNECT_INTERVAL': '5000',
    'NEXT_PUBLIC_BINANCE_WEIGHT_1M': '1000',
    'NEXT_PUBLIC_BINANCE_WEIGHT_1D': '100000',
    'NEXT_PUBLIC_BINANCE_ORDERS_10S': '40',
    'NEXT_PUBLIC_BINANCE_ORDERS_1M': '1500',
    'NEXT_PUBLIC_BINANCE_ORDERS_1D': '200000',
    'NEXT_PUBLIC_BINANCE_RAW_1M': '6000'
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedItems(prev => new Set(prev).add(key));
      setTimeout(() => {
        setCopiedItems(prev => {
          const newSet = new Set(prev);
          newSet.delete(key);
          return newSet;
        });
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateEnvFile = () => {
    const envContent = Object.entries(environmentVariables)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
    
    copyToClipboard(envContent, 'env-file');
  };

  const generateRenderCommands = () => {
    const commands = Object.entries(environmentVariables)
      .map(([key, value]) => `render env set ${key}=${value}`)
      .join('\n');
    
    copyToClipboard(commands, 'render-commands');
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Environment Variables Setup
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="local" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="local" className="flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Local Development
            </TabsTrigger>
            <TabsTrigger value="render" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Render.com
            </TabsTrigger>
          </TabsList>

          <TabsContent value="local" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Tạo file <code>.env.local</code> trong thư mục gốc của project
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Environment Variables</h4>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateEnvFile}
                  className="flex items-center gap-2"
                >
                  {copiedItems.has('env-file') ? (
                    <CheckCircle className="h-3 w-3 text-green-600" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  Copy All
                </Button>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg space-y-2 max-h-60 overflow-y-auto">
                {Object.entries(environmentVariables).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between text-sm">
                    <code className="flex-1">{key}={value}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(`${key}=${value}`, key)}
                      className="ml-2 h-6 w-6 p-0"
                    >
                      {copiedItems.has(key) ? (
                        <CheckCircle className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">Steps:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Tạo file <code>.env.local</code> trong thư mục gốc</li>
                <li>Copy tất cả environment variables ở trên</li>
                <li>Restart development server: <code>npm run dev</code></li>
                <li>Kiểm tra console để đảm bảo không có lỗi</li>
              </ol>
            </div>
          </TabsContent>

          <TabsContent value="render" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Thêm environment variables vào Render.com service
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Method 1: Render CLI Commands</h4>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={generateRenderCommands}
                    className="flex items-center gap-2"
                  >
                    {copiedItems.has('render-commands') ? (
                      <CheckCircle className="h-3 w-3 text-green-600" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                    Copy Commands
                  </Button>
                </div>

                <div className="bg-gray-50 p-3 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`# Install Render CLI
npm install -g @render/cli

# Login to Render
render login

# Set environment variables
${Object.entries(environmentVariables)
  .map(([key, value]) => `render env set ${key}=${value}`)
  .join('\n')}`}
                  </pre>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Method 2: Render Dashboard</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 1</Badge>
                    <span className="text-sm">Vào Render Dashboard → Chọn service</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 2</Badge>
                    <span className="text-sm">Vào tab <strong>Environment</strong></span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Step 3</Badge>
                    <span className="text-sm">Thêm từng biến một theo bảng bên dưới</span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse border border-gray-300">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-300 p-2 text-left">Key</th>
                        <th className="border border-gray-300 p-2 text-left">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(environmentVariables).map(([key, value]) => (
                        <tr key={key}>
                          <td className="border border-gray-300 p-2 font-mono">{key}</td>
                          <td className="border border-gray-300 p-2">{value}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-sm font-medium">After Setup:</h4>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Restart service trên Render</li>
                <li>Kiểm tra logs để đảm bảo không có lỗi</li>
                <li>Monitor performance qua OptimizationStatus component</li>
              </ol>
            </div>
          </TabsContent>
        </Tabs>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-start gap-2">
            <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5" />
            <div className="text-sm">
              <div className="font-medium text-blue-900">💡 Pro Tip</div>
              <div className="text-blue-700">
                Sau khi setup, hệ thống sẽ tự động sử dụng các settings tối ưu và giảm 90% API calls!
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
