import os
import argparse
import json
import sys
import traceback
import numpy as np
import pandas as pd
from sklearn.metrics import mean_squared_error, mean_absolute_error
from arch import arch_model
import warnings
import joblib
from dotenv import load_dotenv

# Suppress warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train GARCH model for volatility forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# GARCH parameters (with defaults)
parser.add_argument('--p', type=int, default=1, help='Order of GARCH terms')
parser.add_argument('--q', type=int, default=1, help='Order of ARCH terms')
parser.add_argument('--mean', type=str, default='Constant', help='Mean model (Constant, Zero, ARX)')
parser.add_argument('--vol', type=str, default='GARCH', help='Volatility model (GARCH, EGARCH, GJR-GARCH)')
parser.add_argument('--dist', type=str, default='Normal', help='Error distribution (Normal, StudentT, SkewStudent)')
parser.add_argument('--rescale', type=bool, default=True, help='Whether to rescale data')

# Data parameters
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--return_type', type=str, default='log', help='Type of returns (log, simple)')

args = parser.parse_args()

# --- Helper Functions ---
def load_config_and_override_args():
    """Load configuration from JSON file and override command line arguments"""
    if args.config and os.path.exists(args.config):
        print(f"Loading config from {args.config}")
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Override args with config parameters if available
        if 'parameters' in config:
            params = config['parameters']
            for key, value in params.items():
                if hasattr(args, key):
                    setattr(args, key, value)

def load_data_from_files():
    """Load training and test data from JSON files"""
    train_data = None
    test_data = None
    
    if args.train_data and os.path.exists(args.train_data):
        print(f"Loading training data from {args.train_data}")
        with open(args.train_data, 'r') as f:
            train_data = json.load(f)
        print(f"Loaded {len(train_data)} training records")
    
    if args.test_data and os.path.exists(args.test_data):
        print(f"Loading test data from {args.test_data}")
        with open(args.test_data, 'r') as f:
            test_data = json.load(f)
        print(f"Loaded {len(test_data)} test records")
    
    return train_data, test_data

def calculate_returns(prices, return_type='log'):
    """Calculate returns from price series"""
    if return_type == 'log':
        returns = np.log(prices / prices.shift(1))
    else:  # simple returns
        returns = prices.pct_change()
    
    return returns.dropna()

def print_json_output(success, message=None, rmse=None, mae=None, aic=None, bic=None, model_path=None):
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
    if aic is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["aic"] = aic
    if bic is not None:
         if "results" not in output: output["results"] = {}
         output["results"]["bic"] = bic
    if model_path:
         if "results" not in output: output["results"] = {}
         output["results"]["model_path"] = model_path
    print(json.dumps(output))
    sys.stdout.flush()

# --- Main Training Logic ---
try:
    # Load configuration and override arguments
    load_config_and_override_args()
    
    # Try to load data from files first (new API method)
    train_data, test_data = load_data_from_files()
    
    if train_data and test_data:
        print("Using data from API files")
        # Combine train and test data
        all_data = train_data + test_data
        df = pd.DataFrame(all_data)
        
        # Convert timestamp column
        if 'open_time' in df.columns:
            df['open_time'] = pd.to_datetime(df['open_time'])
            df = df.sort_values('open_time').set_index('open_time')
        
        # Use the original train/test split from API
        train_size = len(train_data)
        print(f"Using API train/test split: {train_size}/{len(test_data)}")
        
    else:
        raise ValueError("No training data provided. Please provide train_data and test_data files.")

    # Select target column
    if args.target_column not in df.columns:
        raise ValueError(f"Target column '{args.target_column}' not found in data")

    print(f"Using target column: {args.target_column}")
    
    # Calculate returns
    prices = df[args.target_column].astype(float)
    returns = calculate_returns(prices, args.return_type)
    
    print(f"Calculated {args.return_type} returns, shape: {returns.shape}")
    
    # Convert to percentage for better numerical stability
    returns_pct = returns * 100
    
    # Split data
    train_returns = returns_pct[:train_size-1]  # -1 because returns are one less than prices
    test_returns = returns_pct[train_size-1:]
    
    print(f"Returns split: Train={len(train_returns)}, Test={len(test_returns)}")

    if len(train_returns) < 50:
        raise ValueError("Not enough training data for GARCH model (minimum 50 observations)")

    # --- Build and Train GARCH Model ---
    print(f"Building GARCH({args.p},{args.q}) model...")
    print(f"Mean model: {args.mean}, Vol model: {args.vol}, Distribution: {args.dist}")
    
    # Create GARCH model
    model = arch_model(
        train_returns, 
        mean=args.mean, 
        vol=args.vol, 
        p=args.p, 
        q=args.q,
        dist=args.dist,
        rescale=args.rescale
    )

    print("Training GARCH model...")
    fitted_model = model.fit(disp='off')  # Suppress optimization output
    print("Training finished.")

    # Print model summary
    print(f"AIC: {fitted_model.aic:.4f}")
    print(f"BIC: {fitted_model.bic:.4f}")
    print(f"Log-Likelihood: {fitted_model.loglikelihood:.4f}")

    # --- Make Predictions ---
    print("Making volatility forecasts on test set...")
    
    # Forecast volatility
    forecast_horizon = len(test_returns)
    forecasts = fitted_model.forecast(horizon=forecast_horizon, reindex=False)
    
    # Extract conditional volatility forecasts
    vol_forecast = np.sqrt(forecasts.variance.values[-1, :])
    
    # Calculate realized volatility for test period (rolling window)
    window_size = 5  # 5-period rolling volatility
    realized_vol = []
    
    for i in range(len(test_returns)):
        if i >= window_size - 1:
            window_returns = test_returns.iloc[i-window_size+1:i+1]
            realized_vol.append(np.std(window_returns))
        else:
            realized_vol.append(np.nan)
    
    realized_vol = np.array(realized_vol)
    
    # Remove NaN values for evaluation
    valid_idx = ~np.isnan(realized_vol)
    if np.sum(valid_idx) > 0:
        vol_forecast_valid = vol_forecast[:np.sum(valid_idx)]
        realized_vol_valid = realized_vol[valid_idx]
        
        # Calculate metrics
        test_rmse = np.sqrt(mean_squared_error(realized_vol_valid, vol_forecast_valid))
        test_mae = mean_absolute_error(realized_vol_valid, vol_forecast_valid)
        
        print(f"Volatility Forecast Results - RMSE: {test_rmse:.4f}, MAE: {test_mae:.4f}")
    else:
        test_rmse = np.nan
        test_mae = np.nan
        print("Warning: Could not calculate forecast metrics due to insufficient test data")

    print(f"Model AIC: {fitted_model.aic:.4f}, BIC: {fitted_model.bic:.4f}")

    # --- Save Model ---
    model_path = None
    if args.output_dir and args.model_id:
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, f'garch_model_{args.model_id}.joblib')
        print(f"Saving model to {model_path}")
        
        # Save model and metadata
        model_data = {
            'fitted_model': fitted_model,
            'target_column': args.target_column,
            'return_type': args.return_type,
            'garch_order': (args.p, args.q),
            'mean_model': args.mean,
            'vol_model': args.vol,
            'distribution': args.dist,
            'train_returns_tail': train_returns.tail(50).tolist(),  # Save last 50 returns for future forecasting
            'aic': fitted_model.aic,
            'bic': fitted_model.bic,
            'loglikelihood': fitted_model.loglikelihood
        }
        joblib.dump(model_data, model_path)

    # --- Output Results ---
    if not np.isnan(test_rmse):
        final_message = f"GARCH training completed successfully. Volatility forecast RMSE: {test_rmse:.4f}, MAE: {test_mae:.4f}, AIC: {fitted_model.aic:.4f}"
        print_json_output(
            success=True, 
            message=final_message, 
            rmse=test_rmse, 
            mae=test_mae, 
            aic=fitted_model.aic,
            bic=fitted_model.bic,
            model_path=model_path
        )
    else:
        final_message = f"GARCH training completed successfully. AIC: {fitted_model.aic:.4f}, BIC: {fitted_model.bic:.4f}"
        print_json_output(
            success=True, 
            message=final_message, 
            aic=fitted_model.aic,
            bic=fitted_model.bic,
            model_path=model_path
        )

except Exception as e:
    print(f"An error occurred during training: {str(e)}")
    traceback.print_exc(file=sys.stderr)
    print_json_output(success=False, message=f"Training failed: {str(e)}")
    sys.exit(1) 