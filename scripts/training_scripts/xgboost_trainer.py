#!/usr/bin/env python3
"""
XGBoost Training Script - Urus Platform
Auto-generated training script for XGBoost models
"""

import os
import json
import sys
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import (
    mean_squared_error, mean_absolute_error, r2_score,
    accuracy_score, classification_report
)
import psycopg2
from datetime import datetime
import joblib
import warnings
warnings.filterwarnings('ignore')

class XGBoostTrainer:
    def __init__(self, config):
        """Initialize XGBoost Trainer"""
        self.config = config
        self.model = None
        self.scaler = StandardScaler()
        self.label_encoder = None
        self.results = {}
        
        # Database connection
        self.db_config = {
            'host': os.getenv('SUPABASE_DB_HOST'),
            'port': os.getenv('SUPABASE_DB_PORT', 5432),
            'database': os.getenv('SUPABASE_DB_NAME'),
            'user': os.getenv('SUPABASE_DB_USER'),
            'password': os.getenv('SUPABASE_DB_PASSWORD')
        }
        
        print(f"🚀 [XGBoost Trainer] Khởi tạo XGBoost trainer: {config.get('model_name', 'Unknown')}")

    def load_data_from_supabase(self):
        """Load data từ Supabase"""
        try:
            print("📊 [XGBoost Trainer] Đang kết nối Supabase...")
            
            conn = psycopg2.connect(**self.db_config)
            
            dataset_query = """
                SELECT file_path, columns 
                FROM research_datasets 
                WHERE id = %s AND status = 'processed'
            """
            
            dataset_info = pd.read_sql(dataset_query, conn, params=[self.config['dataset_id']])
            
            if dataset_info.empty:
                raise ValueError(f"Dataset {self.config['dataset_id']} không tìm thấy")
            
            file_path = dataset_info.iloc[0]['file_path']
            
            if file_path.endswith('.csv'):
                data = pd.read_csv(file_path)
            elif file_path.endswith('.parquet'):
                data = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")
            
            print(f"✅ [XGBoost Trainer] Loaded {len(data)} rows, {len(data.columns)} columns")
            
            conn.close()
            return data
            
        except Exception as e:
            print(f"❌ [XGBoost Trainer] Error loading data: {str(e)}")
            raise

    def prepare_data(self, data):
        """Chuẩn bị data cho XGBoost"""
        try:
            print("🔧 [XGBoost Trainer] Preparing data...")
            
            target_col = self.config['target_column']
            
            if target_col not in data.columns:
                raise ValueError(f"Target column '{target_col}' not found")
            
            # Separate features and target
            X = data.drop(columns=[target_col])
            y = data[target_col]
            
            # Handle categorical features
            categorical_columns = X.select_dtypes(include=['object']).columns
            for col in categorical_columns:
                X[col] = LabelEncoder().fit_transform(X[col].astype(str))
            
            # Determine task type
            task_type = 'regression'
            if y.dtype == 'object' or len(y.unique()) < 20:
                task_type = 'classification'
                self.label_encoder = LabelEncoder()
                y = self.label_encoder.fit_transform(y)
            
            print(f"🎯 [XGBoost Trainer] Task type: {task_type}")
            print(f"📊 [XGBoost Trainer] Features: {X.shape[1]}, Target unique values: {len(np.unique(y))}")
            
            return X.values, y, task_type
            
        except Exception as e:
            print(f"❌ [XGBoost Trainer] Error preparing data: {str(e)}")
            raise

    def build_model(self, task_type):
        """Xây dựng XGBoost model"""
        try:
            print(f"🏗️ [XGBoost Trainer] Building XGBoost model for {task_type}...")
            
            params = self.config['parameters']
            
            if task_type == 'regression':
                self.model = xgb.XGBRegressor(
                    n_estimators=params.get('n_estimators', 100),
                    learning_rate=params.get('learning_rate', 0.1),
                    max_depth=params.get('max_depth', 6),
                    subsample=params.get('subsample', 0.8),
                    colsample_bytree=params.get('colsample_bytree', 0.8),
                    random_state=params.get('random_state', 42),
                    n_jobs=params.get('n_jobs', -1),
                    verbose=1
                )
            else:
                self.model = xgb.XGBClassifier(
                    n_estimators=params.get('n_estimators', 100),
                    learning_rate=params.get('learning_rate', 0.1),
                    max_depth=params.get('max_depth', 6),
                    subsample=params.get('subsample', 0.8),
                    colsample_bytree=params.get('colsample_bytree', 0.8),
                    random_state=params.get('random_state', 42),
                    n_jobs=params.get('n_jobs', -1),
                    verbose=1
                )
            
            print(f"✅ [XGBoost Trainer] Model created with {params.get('n_estimators', 100)} trees")
            return self.model
            
        except Exception as e:
            print(f"❌ [XGBoost Trainer] Error building model: {str(e)}")
            raise

    def train_model(self, X, y, task_type):
        """Train XGBoost model"""
        try:
            print("🎯 [XGBoost Trainer] Starting training...")
            
            params = self.config['parameters']
            test_size = params.get('test_size', 0.2)
            
            # Split data
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, stratify=y if task_type == 'classification' else None
            )
            
            print(f"📊 [XGBoost Trainer] Train: {len(X_train)}, Test: {len(X_test)}")
            
            # Scale features if needed
            if params.get('scale_features', False):
                X_train = self.scaler.fit_transform(X_train)
                X_test = self.scaler.transform(X_test)
            
            # Train model
            print("🚀 [XGBoost Trainer] Training XGBoost...")
            self.model.fit(
                X_train, y_train,
                eval_set=[(X_test, y_test)],
                early_stopping_rounds=params.get('early_stopping_rounds', 10),
                verbose=True
            )
            
            # Predictions
            y_pred_train = self.model.predict(X_train)
            y_pred_test = self.model.predict(X_test)
            
            # Calculate metrics
            if task_type == 'regression':
                train_metrics = self.calculate_regression_metrics(y_train, y_pred_train)
                test_metrics = self.calculate_regression_metrics(y_test, y_pred_test)
            else:
                train_metrics = self.calculate_classification_metrics(y_train, y_pred_train)
                test_metrics = self.calculate_classification_metrics(y_test, y_pred_test)
            
            # Feature importance
            feature_importance = self.model.feature_importances_
            
            self.results = {
                'model_id': self.config['model_id'],
                'algorithm': 'XGBoost',
                'task_type': task_type,
                'parameters': params,
                'metrics': {
                    'train': train_metrics,
                    'test': test_metrics
                },
                'feature_importance': feature_importance.tolist(),
                'data_info': {
                    'total_samples': len(X),
                    'train_samples': len(X_train),
                    'test_samples': len(X_test),
                    'features': X.shape[1]
                }
            }
            
            print("✅ [XGBoost Trainer] Training completed!")
            if task_type == 'regression':
                print(f"📊 [XGBoost Trainer] Test RMSE: {test_metrics['rmse']:.4f}")
                print(f"📊 [XGBoost Trainer] Test R²: {test_metrics['r2']:.4f}")
            else:
                print(f"📊 [XGBoost Trainer] Test Accuracy: {test_metrics['accuracy']:.4f}")
            
            return self.results
            
        except Exception as e:
            print(f"❌ [XGBoost Trainer] Error training model: {str(e)}")
            raise

    def calculate_regression_metrics(self, y_true, y_pred):
        """Tính metrics cho regression"""
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

    def calculate_classification_metrics(self, y_true, y_pred):
        """Tính metrics cho classification"""
        accuracy = accuracy_score(y_true, y_pred)
        report = classification_report(y_true, y_pred, output_dict=True)
        
        return {
            'accuracy': float(accuracy),
            'precision': float(report['weighted avg']['precision']),
            'recall': float(report['weighted avg']['recall']),
            'f1_score': float(report['weighted avg']['f1-score'])
        }

    def save_model_artifacts(self):
        """Lưu model và artifacts"""
        try:
            print("💾 [XGBoost Trainer] Saving model artifacts...")
            
            model_dir = f"models/{self.config['model_id']}"
            os.makedirs(model_dir, exist_ok=True)
            
            # Save model
            model_path = f"{model_dir}/xgboost_model.pkl"
            joblib.dump(self.model, model_path)
            print(f"✅ [XGBoost Trainer] Model saved: {model_path}")
            
            # Save scaler if used
            if hasattr(self, 'scaler') and self.scaler is not None:
                scaler_path = f"{model_dir}/scaler.pkl"
                joblib.dump(self.scaler, scaler_path)
                print(f"✅ [XGBoost Trainer] Scaler saved: {scaler_path}")
            
            # Save label encoder if used
            if self.label_encoder is not None:
                encoder_path = f"{model_dir}/label_encoder.pkl"
                joblib.dump(self.label_encoder, encoder_path)
                print(f"✅ [XGBoost Trainer] Label encoder saved: {encoder_path}")
            
            # Save results
            results_path = f"{model_dir}/results.json"
            with open(results_path, 'w') as f:
                json.dump(self.results, f, indent=2)
            print(f"✅ [XGBoost Trainer] Results saved: {results_path}")
            
            return {
                'model_path': model_path,
                'results_path': results_path
            }
            
        except Exception as e:
            print(f"❌ [XGBoost Trainer] Error saving artifacts: {str(e)}")
            raise

def main():
    """Main training function"""
    try:
        # Read config
        if len(sys.argv) > 1:
            config_path = sys.argv[1]
            with open(config_path, 'r') as f:
                config = json.load(f)
        else:
            config = {
                'model_id': 'test_xgb_001',
                'model_name': 'Test XGBoost',
                'dataset_id': 'default_dataset',
                'target_column': 'target',
                'parameters': {
                    'n_estimators': 100,
                    'learning_rate': 0.1,
                    'max_depth': 6,
                    'subsample': 0.8,
                    'colsample_bytree': 0.8,
                    'random_state': 42,
                    'n_jobs': -1,
                    'test_size': 0.2,
                    'early_stopping_rounds': 10,
                    'scale_features': False
                }
            }
        
        print("🚀 [XGBoost Trainer] Starting XGBoost training...")
        
        # Initialize trainer
        trainer = XGBoostTrainer(config)
        
        # Load data
        data = trainer.load_data_from_supabase()
        
        # Prepare data
        X, y, task_type = trainer.prepare_data(data)
        
        # Build model
        model = trainer.build_model(task_type)
        
        # Train model
        results = trainer.train_model(X, y, task_type)
        
        # Save artifacts
        artifacts = trainer.save_model_artifacts()
        
        # Final results
        final_results = {
            'success': True,
            'message': 'XGBoost training completed successfully',
            'results': results,
            'artifacts': artifacts,
            'timestamp': datetime.now().isoformat()
        }
        
        print("🎉 [XGBoost Trainer] Training thành công!")
        print(json.dumps(final_results, indent=2))
        
        return final_results
        
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }
        print(f"❌ [XGBoost Trainer] Training failed: {str(e)}")
        print(json.dumps(error_result, indent=2))
        return error_result

if __name__ == "__main__":
    main() 