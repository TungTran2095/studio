#!/usr/bin/env python3
"""
Model Trainer - Executes specific training scripts with realtime logging
"""

import os
import sys
import json
import time
import subprocess
import argparse
import traceback
from datetime import datetime
from typing import Dict, Any, List, Optional
import tempfile
import signal

# Database connection for logging
try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    print("⚠️ Supabase client not available. Install with: pip install supabase")

class ModelTrainer:
    def __init__(self, model_id: str, supabase_url: str = None, supabase_key: str = None):
        self.model_id = model_id
        self.logs = []
        self.start_time = time.time()
        self.process = None
        
        # Initialize Supabase client
        if SUPABASE_AVAILABLE and supabase_url and supabase_key:
            try:
                self.supabase: Client = create_client(supabase_url, supabase_key)
                self.db_logging = True
                self.log("🔗 Connected to Supabase for realtime logging")
            except Exception as e:
                self.db_logging = False
                self.log(f"⚠️ Failed to connect to Supabase: {e}")
        else:
            self.db_logging = False
            self.log("⚠️ Database logging disabled")
    
    def log(self, message: str, level: str = "INFO", source: str = "trainer"):
        """Log message with timestamp and optionally to database"""
        timestamp = datetime.now().isoformat()
        log_entry = {
            "timestamp": timestamp,
            "level": level,
            "message": message,
            "source": source
        }
        
        self.logs.append(log_entry)
        
        # Print to console
        print(f"[{timestamp}] [{level}] [{source}] {message}")
        sys.stdout.flush()
        
        # Save to database immediately
        if self.db_logging:
            try:
                self.save_logs_to_db()
            except Exception as e:
                print(f"⚠️ Failed to save log to database: {e}")
    
    def save_logs_to_db(self):
        """Save current logs to database"""
        if not self.db_logging:
            return
            
        try:
            self.supabase.table('research_models').update({
                'training_logs': json.dumps(self.logs),
                'updated_at': datetime.now().isoformat()
            }).eq('id', self.model_id).execute()
        except Exception as e:
            print(f"❌ Database logging error: {e}")
    
    def update_status(self, status: str, progress: int = None, metrics: Dict = None):
        """Update model status in database"""
        if not self.db_logging:
            return
            
        try:
            update_data = {
                'status': status,
                'updated_at': datetime.now().isoformat()
            }
            
            # Only update progress if column exists and value provided
            if progress is not None:
                try:
                    # Test if progress column exists by checking table schema
                    update_data['progress'] = progress
                except Exception:
                    # If progress column doesn't exist, skip it
                    self.log(f"⚠️ Progress column not available, skipping progress update", "WARNING")
                    pass
                
            if metrics:
                update_data['performance_metrics'] = json.dumps(metrics)
            
            self.supabase.table('research_models').update(update_data).eq('id', self.model_id).execute()
            progress_info = f" ({progress}%)" if progress else ""
            self.log(f"📊 Status updated: {status}{progress_info}")
        except Exception as e:
            self.log(f"❌ Failed to update status: {e}", "ERROR")
    
    def get_training_script_path(self, algorithm: str) -> str:
        """Get the appropriate training script path for algorithm"""
        script_mapping = {
            'linear_regression': 'train_linear_regression.py',
            'decision_tree': 'train_decision_tree.py',
            'random_forest': 'train_random_forest.py',
            'xgboost': 'train_xgboost.py',
            'lightgbm': 'train_lightgbm.py',
            'svm': 'train_svm.py',
            'lstm': 'train_lstm.py',
            'gru': 'train_gru.py',
            'arima': 'train_arima.py',
            'var': 'train_var.py',
            'garch': 'train_garch.py',
            'prophet': 'train_prophet.py',
            'exponential_smoothing': 'train_exponential_smoothing.py',
            'nbeats': 'train_nbeats.py',
            'informer': 'train_informer.py',
            'deepar': 'train_deepar.py',
            'dlinear': 'train_dlinear.py'
        }
        
        # Normalize algorithm name to lowercase
        algorithm_lower = algorithm.lower()
        
        script_name = script_mapping.get(algorithm_lower)
        if not script_name:
            # Try to find script in training_scripts folder
            training_script_path = f"training_scripts/{algorithm_lower}_trainer.py"
            if os.path.exists(training_script_path):
                return training_script_path
            
            raise ValueError(f"No training script found for algorithm: {algorithm}")
        
        script_path = os.path.join(os.path.dirname(__file__), script_name)
        if not os.path.exists(script_path):
            raise FileNotFoundError(f"Training script not found: {script_path}")
        
        return script_path
    
    def prepare_data_files(self, train_data: List[Dict], test_data: List[Dict]) -> tuple:
        """Create temporary data files for training"""
        self.log(f"📊 Preparing data files: {len(train_data)} train, {len(test_data)} test records")
        
        # Create temporary files
        train_file = tempfile.NamedTemporaryFile(mode='w', suffix='_train.json', delete=False)
        test_file = tempfile.NamedTemporaryFile(mode='w', suffix='_test.json', delete=False)
        
        try:
            # Write train data
            json.dump(train_data, train_file, indent=2)
            train_file.close()
            
            # Write test data  
            json.dump(test_data, test_file, indent=2)
            test_file.close()
            
            self.log(f"✅ Data files created: {train_file.name}, {test_file.name}")
            return train_file.name, test_file.name
            
        except Exception as e:
            self.log(f"❌ Failed to create data files: {e}", "ERROR")
            raise
    
    def prepare_config_file(self, training_config: Dict) -> str:
        """Create temporary config file for training"""
        self.log("📋 Preparing training configuration")
        
        config_file = tempfile.NamedTemporaryFile(mode='w', suffix='_config.json', delete=False)
        
        try:
            json.dump(training_config, config_file, indent=2)
            config_file.close()
            
            self.log(f"✅ Config file created: {config_file.name}")
            return config_file.name
            
        except Exception as e:
            self.log(f"❌ Failed to create config file: {e}", "ERROR")
            raise
    
    def execute_training(self, script_path: str, train_data_path: str, test_data_path: str, config_path: str, output_dir: str = None) -> Dict[str, Any]:
        """Execute the training script and capture output"""
        
        if not output_dir:
            # Use models directory by default instead of temp
            models_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'models')
            os.makedirs(models_dir, exist_ok=True)
            output_dir = os.path.join(models_dir, f"model_{self.model_id}")
            os.makedirs(output_dir, exist_ok=True)
            self.log(f"📁 Using default models directory: {output_dir}")
        
        cmd = [
            sys.executable, script_path,
            '--train_data', train_data_path,
            '--test_data', test_data_path,
            '--config', config_path,
            '--model_id', self.model_id,
            '--output_dir', output_dir
        ]
        
        self.log(f"🚀 Starting training process: {' '.join(cmd)}")
        self.log(f"📁 Model output directory: {output_dir}")
        
        self.update_status('training', 0)
        
        try:
            # Start process
            self.process = subprocess.Popen(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                universal_newlines=True,
                encoding='utf-8',
                errors='replace',
                bufsize=1
            )
            
            # Real-time output capture
            output_lines = []
            progress = 0
            
            while True:
                output = self.process.stdout.readline()
                if output == '' and self.process.poll() is not None:
                    break
                
                if output:
                    line = output.strip()
                    output_lines.append(line)
                    
                    # Log training output
                    if line:
                        self.log(line, "TRAINING", "script")
                    
                    # Extract progress if available
                    if "progress:" in line.lower() or "%" in line:
                        try:
                            # Try to extract percentage
                            import re
                            match = re.search(r'(\d+)%', line)
                            if match:
                                progress = int(match.group(1))
                                self.update_status('training', progress)
                        except:
                            pass
            
            # Wait for completion
            return_code = self.process.wait()
            
            if return_code == 0:
                self.log("✅ Training completed successfully")
                self.update_status('completed', 100)
                
                # Try to parse final JSON output
                final_output = '\n'.join(output_lines)
                try:
                    # Look for JSON in the last few lines
                    for line in reversed(output_lines[-10:]):
                        if line.startswith('{') and line.endswith('}'):
                            result = json.loads(line)
                            if result.get('success'):
                                return result
                except:
                    pass
                
                return {
                    'success': True,
                    'message': 'Training completed',
                    'output': final_output
                }
            else:
                error_msg = f"Training script failed with return code: {return_code}"
                self.log(error_msg, "ERROR")
                self.update_status('failed')
                
                return {
                    'success': False,
                    'error': error_msg,
                    'output': '\n'.join(output_lines)
                }
                
        except Exception as e:
            error_msg = f"Training execution error: {str(e)}"
            self.log(error_msg, "ERROR")
            self.update_status('failed')
            
            return {
                'success': False,
                'error': error_msg,
                'traceback': traceback.format_exc()
            }
    
    def cleanup_temp_files(self, *file_paths):
        """Clean up temporary files"""
        for file_path in file_paths:
            try:
                if os.path.exists(file_path):
                    os.unlink(file_path)
                    self.log(f"🗑️ Cleaned up: {file_path}")
            except Exception as e:
                self.log(f"⚠️ Failed to cleanup {file_path}: {e}")
    
    def handle_interrupt(self, signum, frame):
        """Handle interrupt signal"""
        self.log("⚠️ Training interrupted by user", "WARNING")
        if self.process:
            self.process.terminate()
        self.update_status('cancelled')
        sys.exit(1)
    
    def train_model(self, algorithm: str, train_data: List[Dict], test_data: List[Dict], training_config: Dict) -> Dict[str, Any]:
        """Main training orchestration method"""
        
        # Set up signal handling
        signal.signal(signal.SIGINT, self.handle_interrupt)
        signal.signal(signal.SIGTERM, self.handle_interrupt)
        
        train_data_path = None
        test_data_path = None
        config_path = None
        
        try:
            self.log(f"🎯 Starting training for model {self.model_id} with algorithm: {algorithm}")
            
            # Mark training started in database
            training_started_at = datetime.now().isoformat()
            if self.db_logging:
                try:
                    self.supabase.table('research_models').update({
                        'training_started_at': training_started_at,
                        'status': 'training',
                        'updated_at': training_started_at
                    }).eq('id', self.model_id).execute()
                    self.log(f"📅 Training started timestamp saved: {training_started_at}")
                except Exception as e:
                    self.log(f"⚠️ Failed to save training_started_at: {e}", "WARNING")
            
            # Get training script
            script_path = self.get_training_script_path(algorithm)
            self.log(f"📜 Using training script: {script_path}")
            
            # Prepare data files
            train_data_path, test_data_path = self.prepare_data_files(train_data, test_data)
            
            # Prepare config file
            config_path = self.prepare_config_file(training_config)
            
            # Execute training
            result = self.execute_training(script_path, train_data_path, test_data_path, config_path)
            
            # Mark training completed in database
            training_completed_at = datetime.now().isoformat()
            if self.db_logging:
                try:
                    update_data = {
                        'training_completed_at': training_completed_at,
                        'updated_at': training_completed_at
                    }
                    
                    # Update final metrics and status
                    if result.get('success'):
                        update_data['status'] = 'completed'
                        if result.get('results'):
                            update_data['performance_metrics'] = json.dumps(result.get('results'))
                            self.log("📊 Performance metrics saved to database")
                    else:
                        update_data['status'] = 'failed'
                    
                    self.supabase.table('research_models').update(update_data).eq('id', self.model_id).execute()
                    self.log(f"📅 Training completed timestamp saved: {training_completed_at}")
                except Exception as e:
                    self.log(f"⚠️ Failed to save training_completed_at: {e}", "WARNING")
            
            total_time = time.time() - self.start_time
            self.log(f"⏱️ Total training time: {total_time:.2f} seconds")
            
            return result
            
        except Exception as e:
            error_msg = f"Training orchestration error: {str(e)}"
            self.log(error_msg, "ERROR")
            
            # Mark training failed with completed timestamp
            if self.db_logging:
                try:
                    training_completed_at = datetime.now().isoformat()
                    self.supabase.table('research_models').update({
                        'training_completed_at': training_completed_at,
                        'status': 'failed',
                        'updated_at': training_completed_at
                    }).eq('id', self.model_id).execute()
                    self.log(f"📅 Training failed timestamp saved: {training_completed_at}")
                except Exception as update_error:
                    self.log(f"⚠️ Failed to save failure timestamp: {update_error}", "WARNING")
            
            return {
                'success': False,
                'error': error_msg,
                'traceback': traceback.format_exc()
            }
        
        finally:
            # Cleanup temporary files
            if train_data_path:
                self.cleanup_temp_files(train_data_path)
            if test_data_path:
                self.cleanup_temp_files(test_data_path)
            if config_path:
                self.cleanup_temp_files(config_path)
            
            # Final log save
            if self.db_logging:
                self.save_logs_to_db()


def main():
    parser = argparse.ArgumentParser(description='Model Training Orchestrator')
    parser.add_argument('--model_id', required=True, help='Model ID from database')
    parser.add_argument('--algorithm', required=True, help='Algorithm type')
    parser.add_argument('--train_data', required=True, help='Path to training data JSON')
    parser.add_argument('--test_data', required=True, help='Path to test data JSON')
    parser.add_argument('--config', required=True, help='Path to training config JSON')
    parser.add_argument('--supabase_url', help='Supabase URL for logging')
    parser.add_argument('--supabase_key', help='Supabase anon key for logging')
    
    args = parser.parse_args()
    
    # Initialize trainer
    trainer = ModelTrainer(args.model_id, args.supabase_url, args.supabase_key)
    
    # Load data
    with open(args.train_data, 'r') as f:
        train_data = json.load(f)
    
    with open(args.test_data, 'r') as f:
        test_data = json.load(f)
    
    with open(args.config, 'r') as f:
        training_config = json.load(f)
    
    # Execute training
    result = trainer.train_model(args.algorithm, train_data, test_data, training_config)
    
    # Output final result
    print(json.dumps(result))


if __name__ == "__main__":
    main() 