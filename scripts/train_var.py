import os
import argparse
import json
import sys
import traceback
import time
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
import joblib
from dotenv import load_dotenv
from datetime import datetime

# VAR specific imports
try:
    from statsmodels.tsa.vector_ar.var_model import VAR
    from statsmodels.tsa.stattools import adfuller
    from statsmodels.stats.diagnostic import acorr_ljungbox
except ImportError:
    print("❌ Error: statsmodels not installed. Please install: pip install statsmodels")
    sys.exit(1)

# Load environment variables
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train VAR (Vector Autoregression) model for time series forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# VAR parameters (with defaults)
parser.add_argument('--maxlags', type=int, default=15, help='Maximum number of lags to test')
parser.add_argument('--ic', type=str, default='aic', help='Information criterion (aic, bic, hqic, fpe)')
parser.add_argument('--trend', type=str, default='c', help='Trend specification (n, c, ct, ctt)')
parser.add_argument('--seasonal', type=bool, default=False, help='Include seasonal effects')

# Data parameters
parser.add_argument('--target_columns', nargs='+', default=['close', 'volume'], help='List of target columns for VAR.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns to use.')
parser.add_argument('--difference_order', type=int, default=1, help='Order of differencing for stationarity')

args = parser.parse_args()

def log_with_timestamp(message, level="INFO"):
    """Log message with timestamp"""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] [{level}] {message}")
    sys.stdout.flush()

# --- Helper Functions ---
def load_config_and_override_args():
    """Load configuration from JSON file and override command line arguments"""
    if args.config and os.path.exists(args.config):
        log_with_timestamp(f"Loading config from {args.config}")
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Override args with config parameters if available
        if 'parameters' in config:
            params = config['parameters']
            for key, value in params.items():
                if hasattr(args, key):
                    old_value = getattr(args, key)
                    setattr(args, key, value)
                    log_with_timestamp(f"Parameter {key}: {old_value} -> {value}")

def load_data_from_files():
    """Load training and test data from JSON files"""
    train_data = None
    test_data = None
    
    if args.train_data and os.path.exists(args.train_data):
        log_with_timestamp(f"Loading training data from {args.train_data}")
        start_time = time.time()
        with open(args.train_data, 'r') as f:
            train_data = json.load(f)
        load_time = time.time() - start_time
        log_with_timestamp(f"Loaded {len(train_data)} training records in {load_time:.2f}s")
    
    if args.test_data and os.path.exists(args.test_data):
        log_with_timestamp(f"Loading test data from {args.test_data}")
        start_time = time.time()
        with open(args.test_data, 'r') as f:
            test_data = json.load(f)
        load_time = time.time() - start_time
        log_with_timestamp(f"Loaded {len(test_data)} test records in {load_time:.2f}s")
    
    return train_data, test_data

def check_stationarity(series, name):
    """Check stationarity using Augmented Dickey-Fuller test"""
    log_with_timestamp(f"🔍 Checking stationarity for {name}")
    try:
        result = adfuller(series.dropna())
        p_value = result[1]
        is_stationary = p_value < 0.05
        log_with_timestamp(f"📊 ADF Test for {name}: p-value={p_value:.4f}, stationary={is_stationary}")
        return is_stationary, p_value
    except Exception as e:
        log_with_timestamp(f"❌ Error in stationarity test for {name}: {e}")
        return False, 1.0

def make_stationary(df, columns, max_diff=2):
    """Make time series stationary by differencing"""
    log_with_timestamp("⚙️ Making data stationary...")
    diff_df = df.copy()
    diff_orders = {}
    
    for col in columns:
        series = diff_df[col]
        for d in range(max_diff + 1):
            is_stationary, p_value = check_stationarity(series, f"{col}_diff{d}")
            if is_stationary:
                diff_orders[col] = d
                log_with_timestamp(f"✅ {col} is stationary after {d} differences")
                break
            if d < max_diff:
                series = series.diff().dropna()
                diff_df[col] = series
        else:
            log_with_timestamp(f"⚠️ {col} may not be stationary after {max_diff} differences")
            diff_orders[col] = max_diff
    
    return diff_df.dropna(), diff_orders

def select_optimal_lag(data, maxlags=15, ic='aic'):
    """Select optimal lag order using information criterion"""
    log_with_timestamp(f"🔍 Selecting optimal lag order (max={maxlags}, ic={ic})")
    
    try:
        var_model = VAR(data)
        lag_results = var_model.select_order(maxlags=maxlags)
        
        optimal_lag = getattr(lag_results, ic)
        log_with_timestamp(f"✅ Optimal lag order: {optimal_lag}")
        
        # Log all IC values for comparison
        log_with_timestamp("📊 Information Criteria:")
        for ic_name in ['aic', 'bic', 'hqic', 'fpe']:
            if hasattr(lag_results, ic_name):
                value = getattr(lag_results, ic_name)
                log_with_timestamp(f"  {ic_name.upper()}: {value}")
        
        return optimal_lag
    except Exception as e:
        log_with_timestamp(f"❌ Error in lag selection: {e}")
        return min(5, maxlags)  # Fallback to reasonable default

def print_json_output(success, message=None, rmse=None, mae=None, r2=None, model_path=None, training_time=None, var_info=None):
    """Prints results or errors as JSON to stdout."""
    output = {"success": success}
    if message:
        output["message"] = message
    if rmse is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["rmse"] = rmse
    if mae is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["mae"] = mae
    if r2 is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["r2"] = r2
    if model_path:
         if "results" not in output: output["results"] = {}
         output["results"]["model_path"] = model_path
    if training_time:
         if "results" not in output: output["results"] = {}
         output["results"]["training_time_seconds"] = training_time
    if var_info:
         if "results" not in output: output["results"] = {}
         output["results"]["var_info"] = var_info
    print(json.dumps(output))
    sys.stdout.flush()

# --- Main Training Logic ---
try:
    overall_start_time = time.time()
    log_with_timestamp("🚀 Starting VAR (Vector Autoregression) training process", "START")
    
    # Load configuration and override arguments
    log_with_timestamp("📋 Loading configuration...")
    load_config_and_override_args()
    
    # Try to load data from files first (new API method)
    log_with_timestamp("📊 Loading training data...")
    train_data, test_data = load_data_from_files()
    
    if train_data and test_data:
        log_with_timestamp("✅ Using data from API files")
        # Combine train and test data
        data_combine_start = time.time()
        all_data = train_data + test_data
        df = pd.DataFrame(all_data)
        
        # Convert timestamp column
        if 'open_time' in df.columns:
            df['open_time'] = pd.to_datetime(df['open_time'])
            df = df.sort_values('open_time').set_index('open_time')
        
        data_combine_time = time.time() - data_combine_start
        log_with_timestamp(f"📈 Data combined in {data_combine_time:.2f}s")
        
        # Use the original train/test split from API
        train_size = len(train_data)
        log_with_timestamp(f"📊 Using API train/test split: {train_size}/{len(test_data)}")
        
    else:
        raise ValueError("No training data provided. Please provide train_data and test_data files.")

    # Select target columns for VAR
    available_cols = df.columns.tolist()
    if 'open_time' in available_cols:
        available_cols.remove('open_time')
    
    # Use target_columns if specified, otherwise use all numeric columns
    if args.target_columns and all(col in available_cols for col in args.target_columns):
        var_columns = args.target_columns
    else:
        # Use all available numeric columns
        var_columns = [col for col in args.feature_columns if col in available_cols]
    
    if len(var_columns) < 2:
        raise ValueError("VAR requires at least 2 variables. Please provide more target columns.")

    log_with_timestamp(f"🔧 Using VAR columns: {var_columns}")
    log_with_timestamp(f"📊 Raw data shape: {df.shape}")

    # --- Preprocess Data ---
    preprocessing_start = time.time()
    
    # Select VAR data
    var_data = df[var_columns].astype(float)
    log_with_timestamp(f"📊 VAR data shape: {var_data.shape}")
    
    # Check for missing values
    missing_counts = var_data.isnull().sum()
    if missing_counts.sum() > 0:
        log_with_timestamp(f"⚠️ Missing values found: {missing_counts.to_dict()}")
        var_data = var_data.dropna()
        log_with_timestamp(f"📊 After removing NaN: {var_data.shape}")
    
    # Make data stationary
    stationary_data, diff_orders = make_stationary(var_data, var_columns, args.difference_order)
    log_with_timestamp(f"📊 Stationary data shape: {stationary_data.shape}")
    
    preprocessing_time = time.time() - preprocessing_start
    log_with_timestamp(f"⚙️ Total preprocessing time: {preprocessing_time:.2f}s")

    # --- Split Data ---
    log_with_timestamp("✂️ Splitting data...")
    split_start = time.time()
    
    # Use time-based split for VAR
    train_end_idx = int(len(stationary_data) * train_size / (train_size + len(test_data)))
    train_data_var = stationary_data.iloc[:train_end_idx]
    test_data_var = stationary_data.iloc[train_end_idx:]
    
    split_time = time.time() - split_start
    log_with_timestamp(f"✅ Data split completed in {split_time:.2f}s")
    log_with_timestamp(f"📊 Split sizes: Train={len(train_data_var)}, Test={len(test_data_var)}")

    if len(train_data_var) < 50:
        raise ValueError("Insufficient training data for VAR model. Need at least 50 observations.")

    # --- Select Optimal Lag Order ---
    log_with_timestamp("🔍 Selecting optimal lag order...")
    lag_start = time.time()
    optimal_lag = select_optimal_lag(train_data_var, args.maxlags, args.ic)
    lag_time = time.time() - lag_start
    log_with_timestamp(f"✅ Lag selection completed in {lag_time:.2f}s")

    # --- Build and Train VAR Model ---
    log_with_timestamp("🏗️ Building VAR model...")
    
    train_start = time.time()
    
    var_model = VAR(train_data_var)
    var_fitted = var_model.fit(maxlags=optimal_lag, ic=args.ic, trend=args.trend)
    
    train_time = time.time() - train_start
    log_with_timestamp(f"✅ VAR model training completed in {train_time:.4f}s")
    log_with_timestamp(f"📊 Model lag order: {var_fitted.k_ar}")
    log_with_timestamp(f"📊 Number of variables: {var_fitted.neqs}")

    # --- Model Diagnostics ---
    log_with_timestamp("📈 Running model diagnostics...")
    diag_start = time.time()
    
    # Model summary
    model_summary = str(var_fitted.summary())
    log_with_timestamp("📋 VAR Model Summary generated")
    
    # Residual diagnostics
    residuals = var_fitted.resid
    log_with_timestamp(f"📊 Residuals shape: {residuals.shape}")
    
    diag_time = time.time() - diag_start
    log_with_timestamp(f"✅ Diagnostics completed in {diag_time:.2f}s")

    # --- Forecasting and Evaluation ---
    log_with_timestamp("🔮 Generating forecasts...")
    eval_start = time.time()
    
    # Generate forecasts
    forecast_steps = len(test_data_var)
    forecast = var_fitted.forecast(train_data_var.values[-var_fitted.k_ar:], steps=forecast_steps)
    forecast_df = pd.DataFrame(forecast, columns=var_columns, index=test_data_var.index)
    
    # Calculate metrics for each variable
    metrics = {}
    overall_rmse = 0
    overall_mae = 0
    overall_r2 = 0
    
    for i, col in enumerate(var_columns):
        actual = test_data_var[col].values
        predicted = forecast_df[col].values
        
        rmse = np.sqrt(mean_squared_error(actual, predicted))
        mae = mean_absolute_error(actual, predicted)
        r2 = r2_score(actual, predicted)
        
        metrics[col] = {
            'rmse': float(rmse),
            'mae': float(mae),
            'r2': float(r2)
        }
        
        overall_rmse += rmse
        overall_mae += mae
        overall_r2 += r2
        
        log_with_timestamp(f"📊 {col} - RMSE: {rmse:.6f}, MAE: {mae:.6f}, R²: {r2:.6f}")
    
    # Average metrics
    n_vars = len(var_columns)
    overall_rmse /= n_vars
    overall_mae /= n_vars
    overall_r2 /= n_vars
    
    eval_time = time.time() - eval_start
    log_with_timestamp(f"✅ Evaluation completed in {eval_time:.2f}s")
    log_with_timestamp(f"📊 Overall Metrics - RMSE: {overall_rmse:.6f}, MAE: {overall_mae:.6f}, R²: {overall_r2:.6f}")

    # --- Save Model ---
    if args.output_dir:
        log_with_timestamp("💾 Saving model...")
        save_start = time.time()
        
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, 'var_model.pkl')
        forecast_path = os.path.join(args.output_dir, 'forecasts.csv')
        
        log_with_timestamp(f"💾 Saving VAR model to {model_path}")
        joblib.dump(var_fitted, model_path)
        
        # Save forecasts
        forecast_df.to_csv(forecast_path)
        log_with_timestamp(f"💾 Saved forecasts to {forecast_path}")
        
        # Save model info
        var_info = {
            'lag_order': int(var_fitted.k_ar),
            'n_variables': int(var_fitted.neqs),
            'variables': var_columns,
            'trend': args.trend,
            'ic_used': args.ic,
            'differencing_orders': diff_orders,
            'aic': float(var_fitted.aic),
            'bic': float(var_fitted.bic),
            'hqic': float(var_fitted.hqic),
            'fpe': float(var_fitted.fpe)
        }
        
        model_info = {
            'model_type': 'VAR (Vector Autoregression)',
            'parameters': {
                'maxlags': args.maxlags,
                'ic': args.ic,
                'trend': args.trend,
                'seasonal': args.seasonal,
                'difference_order': args.difference_order,
                'optimal_lag': int(var_fitted.k_ar)
            },
            'variables': var_columns,
            'var_info': var_info,
            'training_info': {
                'train_samples': len(train_data_var),
                'test_samples': len(test_data_var),
                'n_variables': len(var_columns),
                'training_time_seconds': train_time,
                'total_time_seconds': time.time() - overall_start_time
            },
            'metrics': {
                'overall': {
                    'rmse': float(overall_rmse),
                    'mae': float(overall_mae),
                    'r2': float(overall_r2)
                },
                'by_variable': metrics
            }
        }
        
        info_path = os.path.join(args.output_dir, 'model_info.json')
        with open(info_path, 'w') as f:
            json.dump(model_info, f, indent=2)
        
        save_time = time.time() - save_start
        log_with_timestamp(f"✅ Model saved in {save_time:.2f}s")
        log_with_timestamp(f"📄 Model info saved to {info_path}")
        
        total_time = time.time() - overall_start_time
        log_with_timestamp(f"🏁 Total training time: {total_time:.2f}s", "COMPLETE")
        
        print_json_output(
            success=True, 
            message="VAR model trained successfully", 
            rmse=overall_rmse, 
            mae=overall_mae, 
            r2=overall_r2, 
            model_path=model_path,
            training_time=total_time,
            var_info=var_info
        )
    else:
        total_time = time.time() - overall_start_time
        log_with_timestamp(f"🏁 Total training time: {total_time:.2f}s", "COMPLETE")
        
        print_json_output(
            success=True, 
            message="VAR model trained successfully", 
            rmse=overall_rmse, 
            mae=overall_mae, 
            r2=overall_r2,
            training_time=total_time
        )

except Exception as e:
    error_msg = f"Error in VAR training: {str(e)}"
    log_with_timestamp(f"❌ {error_msg}", "ERROR")
    traceback.print_exc()
    print_json_output(success=False, message=error_msg)
    sys.exit(1) 