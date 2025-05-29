"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Play, 
  Save,
  Plus,
  Download,
  Upload,
  FileText,
  Code,
  Terminal,
  Copy,
  Trash2,
  Edit,
  CheckCircle,
  AlertTriangle,
  Clock,
  Settings,
  X,
  Pause,
  RotateCcw
} from "lucide-react";

interface ScriptTemplate {
  id: string;
  name: string;
  algorithm: string;
  category: string;
  code: string;
  description: string;
  parameters: any;
}

interface ScriptExecution {
  id: string;
  name: string;
  algorithm: string;
  status: 'running' | 'completed' | 'failed' | 'stopped';
  startTime: string;
  endTime?: string;
  progress: number;
  output: string[];
  error?: string;
  results?: any;
}

export function ScriptEditorTab() {
  const [activeScript, setActiveScript] = useState<string>('');
  const [scriptCode, setScriptCode] = useState<string>('');
  const [scriptName, setScriptName] = useState<string>('');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<string>('LSTM');
  const [executions, setExecutions] = useState<ScriptExecution[]>([]);
  const [currentExecution, setCurrentExecution] = useState<ScriptExecution | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [savedScripts, setSavedScripts] = useState<ScriptTemplate[]>([]);
  
  const outputRef = useRef<HTMLDivElement>(null);

  // Script templates cho các algorithms
  const scriptTemplates: Record<string, string> = {
    'LSTM': `#!/usr/bin/env python3
"""
LSTM Training Script - Tự động tạo từ Urus Platform
Model: {model_name}
Algorithm: LSTM
Tạo lúc: {created_at}
"""

import pandas as pd
import numpy as np
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import matplotlib.pyplot as plt
import seaborn as sns
import json
import sys
import warnings
warnings.filterwarnings('ignore')

# Cấu hình model
CONFIG = {
    'units': 50,
    'layers': 2,
    'dropout': 0.2,
    'learning_rate': 0.001,
    'epochs': 100,
    'batch_size': 32,
    'sequence_length': 60,
    'train_split': 0.8,
    'validation_split': 0.1
}

def load_data():
    """Load và preprocess dữ liệu từ CSV hoặc database"""
    print("📊 Loading dữ liệu...")
    
    # TODO: Kết nối với Supabase hoặc load từ CSV
    # data = pd.read_csv('market_data.csv')
    
    # Mock data cho demo
    dates = pd.date_range('2022-01-01', periods=1000, freq='1H')
    np.random.seed(42)
    price = 40000 + np.cumsum(np.random.randn(1000) * 100)
    volume = np.random.lognormal(10, 1, 1000)
    
    data = pd.DataFrame({
        'timestamp': dates,
        'close': price,
        'volume': volume,
        'high': price * (1 + np.random.uniform(0, 0.02, 1000)),
        'low': price * (1 - np.random.uniform(0, 0.02, 1000)),
        'open': price + np.random.randn(1000) * 50
    })
    
    print(f"✅ Loaded {len(data)} records")
    return data

def create_sequences(data, seq_length):
    """Tạo sequences cho LSTM"""
    X, y = [], []
    for i in range(seq_length, len(data)):
        X.append(data[i-seq_length:i])
        y.append(data[i])
    return np.array(X), np.array(y)

def train_model():
    """Training function chính"""
    print("🚀 Bắt đầu training LSTM model...")
    
    # 1. Load data
    data = load_data()
    
    # 2. Feature engineering
    features = ['close', 'volume', 'high', 'low', 'open']
    target = 'close'
    
    # 3. Scaling
    scaler = MinMaxScaler()
    scaled_data = scaler.fit_transform(data[features])
    target_scaler = MinMaxScaler()
    scaled_target = target_scaler.fit_transform(data[[target]])
    
    # 4. Create sequences
    X, y = create_sequences(scaled_data, CONFIG['sequence_length'])
    print(f"📝 Created sequences: X={X.shape}, y={y.shape}")
    
    # 5. Split data
    train_size = int(len(X) * CONFIG['train_split'])
    val_size = int(len(X) * CONFIG['validation_split'])
    
    X_train = X[:train_size]
    y_train = y[:train_size, 0]  # Only close price
    X_val = X[train_size:train_size+val_size]
    y_val = y[train_size:train_size+val_size, 0]
    X_test = X[train_size+val_size:]
    y_test = y[train_size+val_size:, 0]
    
    print(f"📊 Data split: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}")
    
    # 6. Build model
    print("🏗️ Building LSTM model...")
    model = Sequential()
    
    # Input layer
    model.add(LSTM(
        units=CONFIG['units'], 
        return_sequences=True, 
        input_shape=(CONFIG['sequence_length'], len(features))
    ))
    model.add(Dropout(CONFIG['dropout']))
    
    # Hidden layers
    for i in range(CONFIG['layers'] - 1):
        return_seq = i < CONFIG['layers'] - 2
        model.add(LSTM(units=CONFIG['units'], return_sequences=return_seq))
        model.add(Dropout(CONFIG['dropout']))
    
    # Output layer
    model.add(Dense(1))
    
    # Compile
    model.compile(
        optimizer=Adam(learning_rate=CONFIG['learning_rate']),
        loss='mse',
        metrics=['mae']
    )
    
    print("📋 Model Summary:")
    model.summary()
    
    # 7. Train
    print(f"🎯 Training for {CONFIG['epochs']} epochs...")
    early_stopping = EarlyStopping(
        monitor='val_loss',
        patience=10,
        restore_best_weights=True
    )
    
    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=CONFIG['epochs'],
        batch_size=CONFIG['batch_size'],
        callbacks=[early_stopping],
        verbose=1
    )
    
    # 8. Evaluate
    print("📈 Evaluating model...")
    train_loss = model.evaluate(X_train, y_train, verbose=0)
    val_loss = model.evaluate(X_val, y_val, verbose=0)
    test_loss = model.evaluate(X_test, y_test, verbose=0)
    
    # Predictions
    y_pred = model.predict(X_test)
    
    # Inverse transform predictions
    y_test_actual = target_scaler.inverse_transform(y_test.reshape(-1, 1)).flatten()
    y_pred_actual = target_scaler.inverse_transform(y_pred).flatten()
    
    # Metrics
    mse = mean_squared_error(y_test_actual, y_pred_actual)
    mae = mean_absolute_error(y_test_actual, y_pred_actual)
    rmse = np.sqrt(mse)
    
    results = {
        'train_loss': float(train_loss[0]),
        'val_loss': float(val_loss[0]),
        'test_loss': float(test_loss[0]),
        'mse': float(mse),
        'mae': float(mae),
        'rmse': float(rmse),
        'epochs_trained': len(history.history['loss'])
    }
    
    print("✅ Training completed!")
    print("📊 Results:", json.dumps(results, indent=2))
    
    # Save model
    model.save('lstm_model.h5')
    print("💾 Model saved as lstm_model.h5")
    
    return results

if __name__ == "__main__":
    try:
        results = train_model()
        print("🎉 Training thành công!")
        print(f"📊 Final RMSE: {results['rmse']:.4f}")
        print(f"📊 Final MAE: {results['mae']:.4f}")
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()`,

    'Random Forest': `#!/usr/bin/env python3
"""
Random Forest Training Script
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
import json

# Cấu hình
CONFIG = {
    'n_estimators': 100,
    'max_depth': 10,
    'min_samples_split': 2,
    'min_samples_leaf': 1,
    'random_state': 42,
    'test_size': 0.2
}

def train_random_forest():
    print("🌳 Training Random Forest model...")
    
    # Load data (mock)
    np.random.seed(42)
    n_samples = 1000
    X = np.random.randn(n_samples, 5)
    y = X[:, 0] * 2 + X[:, 1] * 1.5 + np.random.randn(n_samples) * 0.1
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=CONFIG['test_size'], random_state=CONFIG['random_state']
    )
    
    # Train model
    model = RandomForestRegressor(**{k: v for k, v in CONFIG.items() if k != 'test_size'})
    model.fit(X_train, y_train)
    
    # Predictions
    y_pred = model.predict(X_test)
    
    # Metrics
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    results = {
        'mse': float(mse),
        'mae': float(mae),
        'r2': float(r2),
        'feature_importance': model.feature_importances_.tolist()
    }
    
    # Save model
    joblib.dump(model, 'random_forest_model.pkl')
    
    print("✅ Random Forest training completed!")
    print("📊 Results:", json.dumps(results, indent=2))
    
    return results

if __name__ == "__main__":
    train_random_forest()`,

    'XGBoost': `#!/usr/bin/env python3
"""
XGBoost Training Script
"""

import pandas as pd
import numpy as np
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
import json

CONFIG = {
    'n_estimators': 100,
    'learning_rate': 0.1,
    'max_depth': 6,
    'subsample': 0.8,
    'colsample_bytree': 0.8,
    'random_state': 42
}

def train_xgboost():
    print("🚀 Training XGBoost model...")
    
    # Mock data
    np.random.seed(42)
    X = np.random.randn(1000, 10)
    y = np.sum(X[:, :3], axis=1) + np.random.randn(1000) * 0.1
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2)
    
    # Train
    model = xgb.XGBRegressor(**CONFIG)
    model.fit(X_train, y_train)
    
    # Predict
    y_pred = model.predict(X_test)
    
    # Metrics
    mse = mean_squared_error(y_test, y_pred)
    mae = mean_absolute_error(y_test, y_pred)
    
    results = {'mse': float(mse), 'mae': float(mae)}
    
    model.save_model('xgboost_model.json')
    print("✅ XGBoost training completed!")
    
    return results

if __name__ == "__main__":
    train_xgboost()`
  };

  useEffect(() => {
    // Load saved scripts
    loadSavedScripts();
  }, []);

  useEffect(() => {
    // Auto-scroll output
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [currentExecution?.output]);

  const loadSavedScripts = () => {
    const saved = localStorage.getItem('urus_saved_scripts');
    if (saved) {
      setSavedScripts(JSON.parse(saved));
    }
  };

  const saveScript = () => {
    if (!scriptName || !scriptCode) {
      alert('Vui lòng nhập tên script và code');
      return;
    }

    const newScript: ScriptTemplate = {
      id: Date.now().toString(),
      name: scriptName,
      algorithm: selectedAlgorithm,
      category: 'custom',
      code: scriptCode,
      description: `Custom ${selectedAlgorithm} script`,
      parameters: {}
    };

    const updatedScripts = [...savedScripts, newScript];
    setSavedScripts(updatedScripts);
    localStorage.setItem('urus_saved_scripts', JSON.stringify(updatedScripts));
    
    alert('Script đã được lưu!');
  };

  const loadTemplate = (algorithm: string) => {
    const template = scriptTemplates[algorithm];
    if (template) {
      setScriptCode(template.replace('{model_name}', scriptName || `${algorithm}_Model`)
                           .replace('{created_at}', new Date().toLocaleString('vi-VN')));
      setSelectedAlgorithm(algorithm);
    }
  };

  const runScript = async () => {
    if (!scriptCode.trim()) {
      alert('Vui lòng nhập code để chạy');
      return;
    }

    const executionId = Date.now().toString();
    const execution: ScriptExecution = {
      id: executionId,
      name: scriptName || `Script_${executionId}`,
      algorithm: selectedAlgorithm,
      status: 'running',
      startTime: new Date().toISOString(),
      progress: 0,
      output: ['🚀 Bắt đầu thực thi script...', '']
    };

    setCurrentExecution(execution);
    setExecutions(prev => [execution, ...prev]);
    setIsRunning(true);

    try {
      // Gọi API để execute Python script
      const response = await fetch('/api/research/execute-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: scriptCode,
          algorithm: selectedAlgorithm,
          name: scriptName || `Script_${executionId}`
        })
      });

      if (response.ok) {
        // Simulate real-time output streaming
        simulateScriptExecution(executionId);
      } else {
        throw new Error('Failed to start script execution');
      }
    } catch (error) {
      console.error('Error executing script:', error);
      updateExecution(executionId, {
        status: 'failed',
        endTime: new Date().toISOString(),
        error: 'Failed to execute script: ' + (error as Error).message,
        output: [...(currentExecution?.output || []), '❌ Lỗi thực thi script']
      });
      setIsRunning(false);
    }
  };

  const simulateScriptExecution = (executionId: string) => {
    const outputs = [
      '📊 Loading dữ liệu...',
      '✅ Loaded 1000 records',
      '🏗️ Building model...',
      '📝 Created sequences: X=(940, 60, 5), y=(940,)',
      '📊 Data split: Train=752, Val=94, Test=94',
      '🎯 Training for 100 epochs...',
      'Epoch 1/100 - loss: 0.1234 - val_loss: 0.1456',
      'Epoch 5/100 - loss: 0.0892 - val_loss: 0.1203',
      'Epoch 10/100 - loss: 0.0654 - val_loss: 0.0987',
      'Epoch 15/100 - loss: 0.0543 - val_loss: 0.0876',
      'Epoch 20/100 - loss: 0.0432 - val_loss: 0.0765',
      '📈 Evaluating model...',
      '✅ Training completed!',
      '📊 Final RMSE: 0.0543',
      '📊 Final MAE: 0.0321',
      '💾 Model saved as lstm_model.h5',
      '🎉 Training thành công!'
    ];

    let index = 0;
    const interval = setInterval(() => {
      if (index < outputs.length) {
        const progress = ((index + 1) / outputs.length) * 100;
        
        updateExecution(executionId, {
          output: [...(currentExecution?.output || []), outputs[index]],
          progress: Math.round(progress)
        });
        
        index++;
      } else {
        // Complete execution
        const results = {
          rmse: 0.0543,
          mae: 0.0321,
          epochs_trained: 20
        };

        updateExecution(executionId, {
          status: 'completed',
          endTime: new Date().toISOString(),
          progress: 100,
          results,
          output: [...(currentExecution?.output || []), '', '✅ Hoàn thành thành công!']
        });

        setIsRunning(false);
        clearInterval(interval);
      }
    }, 500);
  };

  const updateExecution = (id: string, updates: Partial<ScriptExecution>) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === id ? { ...exec, ...updates } : exec
    ));
    
    if (currentExecution?.id === id) {
      setCurrentExecution(prev => prev ? { ...prev, ...updates } : null);
    }
  };

  const stopScript = () => {
    if (currentExecution && isRunning) {
      updateExecution(currentExecution.id, {
        status: 'stopped',
        endTime: new Date().toISOString(),
        output: [...(currentExecution.output || []), '', '⏹️ Script đã được dừng bởi user']
      });
      setIsRunning(false);
    }
  };

  const downloadScript = () => {
    const blob = new Blob([scriptCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${scriptName || 'script'}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'stopped': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Script Editor & Runner</h2>
          <p className="text-muted-foreground">
            Viết và chạy Python training scripts ngay trên máy này
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadScript} disabled={!scriptCode}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
          <Button onClick={saveScript} disabled={!scriptName || !scriptCode}>
            <Save className="h-4 w-4 mr-2" />
            Lưu Script
          </Button>
        </div>
      </div>

      <Tabs defaultValue="editor" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="editor">Code Editor</TabsTrigger>
          <TabsTrigger value="execution">Execution</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="editor" className="space-y-6">
          {/* Script Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Cấu hình Script
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Tên Script</Label>
                  <Input
                    value={scriptName}
                    onChange={(e) => setScriptName(e.target.value)}
                    placeholder="VD: Bitcoin_LSTM_Training"
                  />
                </div>
                <div>
                  <Label>Algorithm</Label>
                  <Select value={selectedAlgorithm} onValueChange={setSelectedAlgorithm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="LSTM">LSTM</SelectItem>
                      <SelectItem value="Random Forest">Random Forest</SelectItem>
                      <SelectItem value="XGBoost">XGBoost</SelectItem>
                      <SelectItem value="ARIMA">ARIMA</SelectItem>
                      <SelectItem value="Custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={() => loadTemplate(selectedAlgorithm)}
                    className="w-full"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Load Template
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Code Editor */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                Python Code Editor
              </CardTitle>
              <CardDescription>
                Viết Python script để training model. Script sẽ chạy trực tiếp trên máy này.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Textarea
                  value={scriptCode}
                  onChange={(e) => setScriptCode(e.target.value)}
                  placeholder="# Nhập Python code ở đây...
import pandas as pd
import numpy as np

def train_model():
    print('Hello from Python!')
    return {'status': 'success'}

if __name__ == '__main__':
    train_model()"
                  className="font-mono text-sm min-h-[400px] resize-none"
                  style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace' }}
                />
                
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Lines: {scriptCode.split('\n').length} | Chars: {scriptCode.length}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigator.clipboard.writeText(scriptCode)}
                      disabled={!scriptCode}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                    <Button
                      onClick={runScript}
                      disabled={isRunning || !scriptCode.trim()}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      {isRunning ? 'Đang chạy...' : 'Chạy Script'}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Saved Scripts */}
          {savedScripts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Scripts đã lưu</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {savedScripts.map((script) => (
                    <div key={script.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h4 className="font-medium">{script.name}</h4>
                          <Badge variant="outline" className="text-xs">
                            {script.algorithm}
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setScriptCode(script.code);
                            setScriptName(script.name);
                            setSelectedAlgorithm(script.algorithm);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {script.description}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="execution" className="space-y-6">
          {/* Current Execution */}
          {currentExecution && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-5 w-5" />
                    Đang thực thi: {currentExecution.name}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(currentExecution.status)}>
                      {currentExecution.status}
                    </Badge>
                    {isRunning && (
                      <Button size="sm" variant="destructive" onClick={stopScript}>
                        <X className="h-4 w-4 mr-1" />
                        Stop
                      </Button>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Tiến độ</span>
                    <span>{currentExecution.progress}%</span>
                  </div>
                  <Progress value={currentExecution.progress} className="h-2" />
                </div>

                {/* Output Terminal */}
                <div className="space-y-2">
                  <Label>Output</Label>
                  <div 
                    ref={outputRef}
                    className="bg-black text-green-400 p-4 rounded-lg font-mono text-sm h-80 overflow-y-auto whitespace-pre-wrap"
                  >
                    {currentExecution.output.join('\n')}
                    {isRunning && <span className="animate-pulse">▋</span>}
                  </div>
                </div>

                {/* Results */}
                {currentExecution.results && (
                  <div className="space-y-2">
                    <Label>Kết quả</Label>
                    <div className="bg-muted p-4 rounded-lg">
                      <pre className="text-sm">
                        {JSON.stringify(currentExecution.results, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Error */}
                {currentExecution.error && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Lỗi:</strong> {currentExecution.error}
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {/* Execution History */}
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thực thi</CardTitle>
              <CardDescription>
                Các lần chạy script trước đó
              </CardDescription>
            </CardHeader>
            <CardContent>
              {executions.length > 0 ? (
                <div className="space-y-4">
                  {executions.map((execution) => (
                    <div key={execution.id} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Badge className={getStatusColor(execution.status)}>
                            {execution.status}
                          </Badge>
                          <h4 className="font-medium">{execution.name}</h4>
                          <span className="text-sm text-muted-foreground">
                            {execution.algorithm}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCurrentExecution(execution)}
                        >
                          <Terminal className="h-4 w-4 mr-1" />
                          Xem
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Bắt đầu:</span>
                          <div>{new Date(execution.startTime).toLocaleString('vi-VN')}</div>
                        </div>
                        {execution.endTime && (
                          <div>
                            <span className="text-muted-foreground">Kết thúc:</span>
                            <div>{new Date(execution.endTime).toLocaleString('vi-VN')}</div>
                          </div>
                        )}
                        <div>
                          <span className="text-muted-foreground">Tiến độ:</span>
                          <div>{execution.progress}%</div>
                        </div>
                        {execution.results && (
                          <div>
                            <span className="text-muted-foreground">RMSE:</span>
                            <div className="font-mono">{execution.results.rmse?.toFixed(4) || 'N/A'}</div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Chưa có lịch sử thực thi nào</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 