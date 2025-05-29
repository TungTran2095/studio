#!/usr/bin/env python3
"""
LSTM Training Script with asyncpg
"""

import os
import sys
import json
import asyncio
import asyncpg
import pandas as pd
import numpy as np
from datetime import datetime
from pathlib import Path

# TensorFlow/Keras imports
try:
    import tensorflow as tf
    from tensorflow.keras.models import Sequential
    from tensorflow.keras.layers import LSTM, Dense, Dropout
    from tensorflow.keras.optimizers import Adam
    from tensorflow.keras.callbacks import EarlyStopping, ModelCheckpoint
    from sklearn.preprocessing import MinMaxScaler
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
    import joblib
    print("✅ TensorFlow and scikit-learn imported successfully")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Please install: pip install tensorflow scikit-learn joblib")
    sys.exit(1)

async def load_data_from_supabase(dataset_id: str, target_column: str):
    """Load data from Supabase using asyncpg or local files"""
    try:
        # Check if this is a local dataset ID
        if dataset_id in ['crypto-price-data', 'stock-features-data']:
            print(f"📁 [LSTM Trainer] Loading local dataset: {dataset_id}")
            
            if dataset_id == 'crypto-price-data':
                file_path = 'data/sample_datasets/crypto_price_data.csv'
            else:
                file_path = 'data/sample_datasets/stock_features_data.csv'
            
            if os.path.exists(file_path):
                df = pd.read_csv(file_path)
                print(f"✅ [LSTM Trainer] Loaded local dataset: {df.shape}")
                return df
            else:
                print(f"❌ [LSTM Trainer] Local file not found: {file_path}")
                return generate_mock_data()
        
        # Try to load from Supabase
        print(f"🔗 [LSTM Trainer] Attempting to load from Supabase: {dataset_id}")
        
        # Database connection
        conn = await asyncpg.connect(
            host=os.getenv('SUPABASE_DB_HOST'),
            port=int(os.getenv('SUPABASE_DB_PORT', 5432)),
            database=os.getenv('SUPABASE_DB_NAME'),
            user=os.getenv('SUPABASE_DB_USER'),
            password=os.getenv('SUPABASE_DB_PASSWORD')
        )
        
        # Get dataset info
        dataset_query = "SELECT * FROM research_datasets WHERE id = $1"
        dataset_row = await conn.fetchrow(dataset_query, dataset_id)
        
        if not dataset_row:
            raise ValueError(f"Dataset {dataset_id} not found")
        
        file_path = dataset_row['file_path']
        
        # Close connection
        await conn.close()
        
        # Load CSV file
        if os.path.exists(file_path):
            df = pd.read_csv(file_path)
            print(f"✅ [LSTM Trainer] Loaded Supabase dataset: {df.shape}")
            return df
        else:
            raise FileNotFoundError(f"Dataset file not found: {file_path}")
            
    except Exception as e:
        print(f"❌ [LSTM Trainer] Error loading data: {e}")
        # Fallback to mock data
        return generate_mock_data()

def generate_mock_data():
    """Generate mock cryptocurrency data for testing"""
    print("🎭 Generating mock data for testing...")
    
    dates = pd.date_range('2020-01-01', periods=1000, freq='H')
    np.random.seed(42)
    
    # Generate realistic crypto price data
    price = 50000  # Starting price
    prices = []
    
    for i in range(len(dates)):
        # Random walk with trend
        change = np.random.normal(0, 0.02)  # 2% volatility
        price *= (1 + change)
        prices.append(price)
    
    df = pd.DataFrame({
        'timestamp': dates,
        'close': prices,
        'volume': np.random.uniform(1000, 10000, len(dates)),
        'returns': np.random.normal(0, 0.02, len(dates)),
        'volatility': np.random.uniform(0.01, 0.05, len(dates))
    })
    
    print(f"✅ Generated mock data: {df.shape}")
    return df

class LSTMTrainer:
    def __init__(self, config):
        """
        Initialize LSTM Trainer với cấu hình từ Urus
        
        Args:
            config (dict): Cấu hình training từ hệ thống
        """
        self.config = config
        self.model = None
        self.scaler_X = MinMaxScaler()
        self.scaler_y = MinMaxScaler()
        self.history = None
        self.results = {}
        
        # Database connection từ ENV
        self.db_config = {
            'host': os.getenv('SUPABASE_DB_HOST'),
            'port': os.getenv('SUPABASE_DB_PORT', 5432),
            'database': os.getenv('SUPABASE_DB_NAME'),
            'user': os.getenv('SUPABASE_DB_USER'),
            'password': os.getenv('SUPABASE_DB_PASSWORD')
        }
        
        print(f"🚀 [LSTM Trainer] Khởi tạo trainer cho model: {config.get('model_name', 'Unknown')}")
        print(f"📋 [LSTM Trainer] Parameters: {json.dumps(config.get('parameters', {}), indent=2)}")

    def load_data_from_supabase(self):
        """Load data từ Supabase dataset"""
        try:
            print("📊 [LSTM Trainer] Đang kết nối Supabase...")
            
            # Kết nối database
            conn = asyncpg.connect(**self.db_config)
            
            # Lấy thông tin dataset
            dataset_query = """
                SELECT file_path, columns 
                FROM research_datasets 
                WHERE id = %s AND status = 'processed'
            """
            
            dataset_info = pd.read_sql(
                dataset_query, 
                conn, 
                params=[self.config['dataset_id']]
            )
            
            if dataset_info.empty:
                raise ValueError(f"Dataset {self.config['dataset_id']} không tìm thấy")
            
            file_path = dataset_info.iloc[0]['file_path']
            available_columns = dataset_info.iloc[0]['columns']
            
            print(f"📁 [LSTM Trainer] File path: {file_path}")
            print(f"📋 [LSTM Trainer] Available columns: {available_columns}")
            
            # Load data từ file CSV
            if file_path.endswith('.csv'):
                data = pd.read_csv(file_path)
            elif file_path.endswith('.parquet'):
                data = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")
            
            print(f"✅ [LSTM Trainer] Loaded {len(data)} rows, {len(data.columns)} columns")
            
            conn.close()
            return data
            
        except Exception as e:
            print(f"❌ [LSTM Trainer] Error loading data: {str(e)}")
            raise

    def prepare_sequences(self, data):
        """Chuẩn bị sequences cho LSTM"""
        try:
            print("🔧 [LSTM Trainer] Preparing sequences...")
            
            # Lấy target column và feature columns
            target_col = self.config['target_column']
            sequence_length = self.config['parameters'].get('sequence_length', 60)
            
            if target_col not in data.columns:
                raise ValueError(f"Target column '{target_col}' not found in data")
            
            # Chọn feature columns (numeric only)
            numeric_columns = data.select_dtypes(include=[np.number]).columns
            feature_columns = [col for col in numeric_columns if col != target_col]
            
            print(f"🎯 [LSTM Trainer] Target column: {target_col}")
            print(f"📊 [LSTM Trainer] Feature columns: {feature_columns}")
            
            # Chuẩn bị features và target
            X = data[feature_columns].values
            y = data[target_col].values.reshape(-1, 1)
            
            # Scaling
            X_scaled = self.scaler_X.fit_transform(X)
            y_scaled = self.scaler_y.fit_transform(y)
            
            # Tạo sequences
            X_sequences, y_sequences = [], []
            
            for i in range(sequence_length, len(X_scaled)):
                X_sequences.append(X_scaled[i-sequence_length:i])
                y_sequences.append(y_scaled[i])
            
            X_sequences = np.array(X_sequences)
            y_sequences = np.array(y_sequences)
            
            print(f"📏 [LSTM Trainer] Sequences shape: X={X_sequences.shape}, y={y_sequences.shape}")
            
            return X_sequences, y_sequences, feature_columns
            
        except Exception as e:
            print(f"❌ [LSTM Trainer] Error preparing sequences: {str(e)}")
            raise

    def build_model(self, input_shape):
        """Xây dựng LSTM model"""
        try:
            print("🏗️ [LSTM Trainer] Building LSTM model...")
            
            params = self.config['parameters']
            
            model = Sequential()
            
            # Input LSTM layer
            model.add(LSTM(
                units=params.get('units', 50),
                return_sequences=params.get('layers', 2) > 1,
                input_shape=input_shape
            ))
            model.add(Dropout(params.get('dropout', 0.2)))
            
            # Hidden LSTM layers
            for i in range(params.get('layers', 2) - 1):
                return_seq = i < params.get('layers', 2) - 2
                model.add(LSTM(
                    units=params.get('units', 50),
                    return_sequences=return_seq
                ))
                model.add(Dropout(params.get('dropout', 0.2)))
            
            # Output layer
            model.add(Dense(1))
            
            # Compile
            model.compile(
                optimizer=Adam(learning_rate=params.get('learning_rate', 0.001)),
                loss='mse',
                metrics=['mae']
            )
            
            print("📋 [LSTM Trainer] Model architecture:")
            model.summary()
            
            self.model = model
            return model
            
        except Exception as e:
            print(f"❌ [LSTM Trainer] Error building model: {str(e)}")
            raise

    def train_model(self, X, y):
        """Training LSTM model"""
        try:
            print("🎯 [LSTM Trainer] Starting training...")
            
            params = self.config['parameters']
            
            # Split data
            train_size = params.get('train_split', 0.8)
            val_size = params.get('validation_split', 0.1)
            
            # Train/validation/test split
            X_temp, X_test, y_temp, y_test = train_test_split(
                X, y, test_size=1-train_size-val_size, random_state=42, shuffle=False
            )
            
            X_train, X_val, y_train, y_val = train_test_split(
                X_temp, y_temp, test_size=val_size/(train_size+val_size), random_state=42, shuffle=False
            )
            
            print(f"📊 [LSTM Trainer] Data split:")
            print(f"  Train: {X_train.shape[0]} samples")
            print(f"  Validation: {X_val.shape[0]} samples") 
            print(f"  Test: {X_test.shape[0]} samples")
            
            # Callbacks
            callbacks = [
                EarlyStopping(
                    monitor='val_loss',
                    patience=params.get('patience', 10),
                    restore_best_weights=True
                ),
                ModelCheckpoint(
                    f"models/{self.config['model_name']}_best.h5",
                    monitor='val_loss',
                    save_best_only=True
                )
            ]
            
            # Training
            self.history = self.model.fit(
                X_train, y_train,
                validation_data=(X_val, y_val),
                epochs=params.get('epochs', 100),
                batch_size=params.get('batch_size', 32),
                callbacks=callbacks,
                verbose=1
            )
            
            # Evaluation
            train_loss = self.model.evaluate(X_train, y_train, verbose=0)
            val_loss = self.model.evaluate(X_val, y_val, verbose=0)
            test_loss = self.model.evaluate(X_test, y_test, verbose=0)
            
            # Predictions
            y_pred_train = self.model.predict(X_train)
            y_pred_val = self.model.predict(X_val)
            y_pred_test = self.model.predict(X_test)
            
            # Inverse transform predictions
            y_train_actual = self.scaler_y.inverse_transform(y_train)
            y_val_actual = self.scaler_y.inverse_transform(y_val)
            y_test_actual = self.scaler_y.inverse_transform(y_test)
            
            y_pred_train_actual = self.scaler_y.inverse_transform(y_pred_train)
            y_pred_val_actual = self.scaler_y.inverse_transform(y_pred_val)
            y_pred_test_actual = self.scaler_y.inverse_transform(y_pred_test)
            
            # Calculate metrics
            train_metrics = self.calculate_metrics(y_train_actual, y_pred_train_actual)
            val_metrics = self.calculate_metrics(y_val_actual, y_pred_val_actual)
            test_metrics = self.calculate_metrics(y_test_actual, y_pred_test_actual)
            
            self.results = {
                'model_id': self.config['model_id'],
                'algorithm': 'LSTM',
                'parameters': params,
                'training': {
                    'epochs_trained': len(self.history.history['loss']),
                    'final_train_loss': float(train_loss[0]),
                    'final_val_loss': float(val_loss[0]),
                    'final_test_loss': float(test_loss[0])
                },
                'metrics': {
                    'train': train_metrics,
                    'validation': val_metrics,
                    'test': test_metrics
                },
                'data_info': {
                    'total_samples': len(X),
                    'train_samples': len(X_train),
                    'val_samples': len(X_val),
                    'test_samples': len(X_test),
                    'features': X.shape[2],
                    'sequence_length': X.shape[1]
                }
            }
            
            print("✅ [LSTM Trainer] Training completed!")
            print(f"📊 [LSTM Trainer] Test RMSE: {test_metrics['rmse']:.4f}")
            print(f"📊 [LSTM Trainer] Test MAE: {test_metrics['mae']:.4f}")
            print(f"📊 [LSTM Trainer] Test R²: {test_metrics['r2']:.4f}")
            
            return self.results
            
        except Exception as e:
            print(f"❌ [LSTM Trainer] Error training model: {str(e)}")
            raise

    def calculate_metrics(self, y_true, y_pred):
        """Tính toán metrics"""
        mse = mean_squared_error(y_true, y_pred)
        mae = mean_absolute_error(y_true, y_pred)
        rmse = np.sqrt(mse)
        r2 = r2_score(y_true, y_pred)
        
        return {
            'mse': float(mse),
            'mae': float(mae),
            'rmse': float(rmse),
            'r2': float(r2)
        }

    def save_model_artifacts(self):
        """Lưu model và artifacts"""
        try:
            print("💾 [LSTM Trainer] Saving model artifacts...")
            
            model_dir = f"models/{self.config['model_id']}"
            os.makedirs(model_dir, exist_ok=True)
            
            # Save trained model
            model_path = f"{model_dir}/lstm_model.h5"
            self.model.save(model_path)
            print(f"✅ [LSTM Trainer] Model saved: {model_path}")
            
            # Save scalers
            scaler_X_path = f"{model_dir}/scaler_X.pkl"
            scaler_y_path = f"{model_dir}/scaler_y.pkl"
            joblib.dump(self.scaler_X, scaler_X_path)
            joblib.dump(self.scaler_y, scaler_y_path)
            print(f"✅ [LSTM Trainer] Scalers saved: {scaler_X_path}, {scaler_y_path}")
            
            # Save training history
            history_path = f"{model_dir}/training_history.json"
            with open(history_path, 'w') as f:
                json.dump({
                    'loss': [float(x) for x in self.history.history['loss']],
                    'val_loss': [float(x) for x in self.history.history['val_loss']],
                    'mae': [float(x) for x in self.history.history['mae']],
                    'val_mae': [float(x) for x in self.history.history['val_mae']]
                }, f, indent=2)
            print(f"✅ [LSTM Trainer] Training history saved: {history_path}")
            
            # Save results
            results_path = f"{model_dir}/results.json"
            with open(results_path, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"✅ [LSTM Trainer] Results saved: {results_path}")
            
            return {
                'model_path': model_path,
                'scaler_X_path': scaler_X_path,
                'scaler_y_path': scaler_y_path,
                'history_path': history_path,
                'results_path': results_path
            }
            
        except Exception as e:
            print(f"❌ [LSTM Trainer] Error saving artifacts: {str(e)}")
            raise

async def main():
    """Main training function"""
    try:
        print("🚀 [LSTM Trainer] Starting LSTM training...")
        
        # Load config
        if len(sys.argv) != 2:
            print("❌ Usage: python lstm_trainer.py <config_file>")
            sys.exit(1)
        
        config_file = sys.argv[1]
        
        if not os.path.exists(config_file):
            print(f"❌ Config file not found: {config_file}")
            sys.exit(1)
        
        with open(config_file, 'r') as f:
            config = json.load(f)
        
        print(f"📋 [LSTM Trainer] Config loaded: {config['model_name']}")
        
        # Load data using async function
        dataset_id = config.get('dataset_id')
        target_column = config.get('target_column', 'close')
        
        if dataset_id:
            print(f"📊 [LSTM Trainer] Loading data from Supabase dataset: {dataset_id}")
            data = await load_data_from_supabase(dataset_id, target_column)
        else:
            print("📊 [LSTM Trainer] No dataset_id provided, using mock data")
            data = generate_mock_data()
        
        # Initialize trainer
        trainer = LSTMTrainer(config)
        
        # Prepare data
        X, y, feature_columns = trainer.prepare_sequences(data)
        
        # Build model
        trainer.build_model((X.shape[1], X.shape[2]))
        
        # Train model
        results = trainer.train_model(X, y)
        
        # Save artifacts
        artifacts = trainer.save_model_artifacts()
        
        # Final results
        final_results = {
            'success': True,
            'results': results,
            'artifacts': artifacts,
            'training_time': results.get('training_time', 0),
            'model_path': artifacts.get('model_path'),
            'message': 'LSTM training completed successfully'
        }
        
        # Output JSON result for API
        print(json.dumps(final_results))
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'message': f'LSTM training failed: {str(e)}'
        }
        print(json.dumps(error_result))
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(main()) 