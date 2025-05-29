import os
import argparse
import json
import sys
import traceback # Import traceback for detailed error logging
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# --- Argument Parsing ---
parser = argparse.ArgumentParser(description='Train LSTM model for time series forecasting.')
# New arguments for API integration
parser.add_argument('--train_data', type=str, help='Path to training data JSON file')
parser.add_argument('--test_data', type=str, help='Path to test data JSON file')
parser.add_argument('--config', type=str, help='Path to configuration JSON file')
parser.add_argument('--model_id', type=str, help='Model ID for tracking')
parser.add_argument('--output_dir', type=str, help='Output directory for model files')

# Model Architecture (with defaults)
parser.add_argument('--units', type=int, default=50, help='Number of units per LSTM layer.')
parser.add_argument('--layers', type=int, default=2, help='Number of LSTM layers.')
parser.add_argument('--timesteps', type=int, default=60, help='Lookback period (number of past time steps).')
parser.add_argument('--dropout', type=float, default=0.2, help='Dropout rate.')
# Training Parameters (with defaults)
parser.add_argument('--learning_rate', type=float, default=0.001, help='Optimizer learning rate.')
parser.add_argument('--batch_size', type=int, default=32, help='Training batch size.')
parser.add_argument('--epochs', type=int, default=100, help='Number of training epochs.')
# Data Parameters
parser.add_argument('--train_test_split_ratio', type=float, default=0.8, help='Ratio for training data split (e.g., 0.8 for 80%).')
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns to use.')

args = parser.parse_args()

# --- Helper Functions ---
def load_config_and_override_args():
    """Load configuration from JSON file and override command line arguments"""
    if args.config and os.path.exists(args.config):
        print(f"[Python Script] Loading config from {args.config}", file=sys.stderr)
        with open(args.config, 'r') as f:
            config = json.load(f)
        
        # Override args with config parameters if available
        if 'parameters' in config:
            params = config['parameters']
            for key, value in params.items():
                if hasattr(args, key):
                    setattr(args, key, value)
                    print(f"[Python Script] Override {key} = {value}", file=sys.stderr)

def load_data_from_files():
    """Load training and test data from JSON files"""
    train_data = None
    test_data = None
    
    if args.train_data and os.path.exists(args.train_data):
        print(f"[Python Script] Loading training data from {args.train_data}", file=sys.stderr)
        with open(args.train_data, 'r') as f:
            train_data = json.load(f)
        print(f"[Python Script] Loaded {len(train_data)} training records", file=sys.stderr)
    
    if args.test_data and os.path.exists(args.test_data):
        print(f"[Python Script] Loading test data from {args.test_data}", file=sys.stderr)
        with open(args.test_data, 'r') as f:
            test_data = json.load(f)
        print(f"[Python Script] Loaded {len(test_data)} test records", file=sys.stderr)
    
    return train_data, test_data

def create_sequences(data, target_col_index, timesteps):
    X, y = [], []
    for i in range(len(data) - timesteps):
        X.append(data[i:(i + timesteps)])
        y.append(data[i + timesteps, target_col_index])
    if not X:
        raise ValueError("Not enough data to create sequences with the given timesteps.")
    return np.array(X), np.array(y)

def print_json_output(success, message=None, rmse=None, mae=None, model_path=None):
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
        print("[Python Script] Using data from API files", file=sys.stderr)
        # Combine train and test data
        all_data = train_data + test_data
        df = pd.DataFrame(all_data)
        
        # Convert timestamp column
        if 'timestamp' in df.columns:
            df['timestamp'] = pd.to_datetime(df['timestamp'])
            df = df.sort_values('timestamp').set_index('timestamp')
        elif 'open_time' in df.columns:
            df['open_time'] = pd.to_datetime(df['open_time'])
            df = df.sort_values('open_time').set_index('open_time')
        
        # Use the original train/test split from API
        train_size = len(train_data)
        print(f"[Python Script] Using API train/test split: {train_size}/{len(test_data)}", file=sys.stderr)
        
    else:
        print("[Python Script] Falling back to Supabase data", file=sys.stderr)
        # Fallback to original Supabase method
        supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
        supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

        if not supabase_url or not supabase_key:
            raise ValueError("Missing Supabase URL or Key. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env")

        print("[Python Script] Connecting to Supabase...", file=sys.stderr)
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print(f"[Python Script] Fetching data from OHLCV_BTC_USDT_1m...", file=sys.stderr)
        response = supabase.table("OHLCV_BTC_USDT_1m").select("*").order("open_time", desc=False).execute()
        print(f"[Python Script] Fetched {len(response.data)} records.", file=sys.stderr)

        if not response.data:
            raise ValueError("No data fetched from OHLCV_BTC_USDT_1m table.")

        df = pd.DataFrame(response.data)
        df['open_time'] = pd.to_datetime(df['open_time'])
        df = df.sort_values('open_time').set_index('open_time')

    # Select features and target
    if args.target_column not in args.feature_columns:
        all_cols = list(dict.fromkeys([args.target_column] + args.feature_columns))
    else:
        all_cols = args.feature_columns

    if not all(col in df.columns for col in all_cols):
        missing_cols = [col for col in all_cols if col not in df.columns]
        raise ValueError(f"Missing required columns in fetched data: {', '.join(missing_cols)}")

    print(f"[Python Script] Using features: {all_cols}", file=sys.stderr)
    data_to_process = df[all_cols].astype(float).values
    target_col_index_in_features = all_cols.index(args.target_column)

    # --- 3. Preprocess Data ---
    print("[Python Script] Scaling data...", file=sys.stderr)
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data_to_process)
    print(f"[Python Script] Scaled data shape: {scaled_data.shape}", file=sys.stderr)

    # Create sequences
    print(f"[Python Script] Creating sequences with {args.timesteps} timesteps...", file=sys.stderr)
    X, y = create_sequences(scaled_data, target_col_index_in_features, args.timesteps)
    print(f"[Python Script] Created sequences: X shape={X.shape}, y shape={y.shape}", file=sys.stderr)

    # --- 4. Split Data ---
    if train_data and test_data:
        # Use API-provided split
        train_end_idx = int(len(X) * len(train_data) / (len(train_data) + len(test_data)))
        X_train_full = X[:train_end_idx]
        y_train_full = y[:train_end_idx]
        X_test = X[train_end_idx:]
        y_test = y[train_end_idx:]
        
        # Split training data into train/validation
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_full, y_train_full, test_size=0.2, shuffle=False
        )
    else:
        # Use original split method
        X_train, X_temp, y_train, y_temp = train_test_split(
            X, y, train_size=args.train_test_split_ratio, shuffle=False
        )
        X_val, X_test, y_val, y_test = train_test_split(
            X_temp, y_temp, test_size=0.5, shuffle=False
        )
    
    print(f"[Python Script] Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}", file=sys.stderr)

    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets.")

    n_features = X_train.shape[2]

    # --- 5. Build LSTM Model ---
    print(f"[Python Script] Building LSTM model ({args.layers} layers, {args.units} units)...", file=sys.stderr)
    model = Sequential()
    
    for i in range(args.layers):
        return_sequences = (i < args.layers - 1)
        if i == 0:
            model.add(LSTM(units=args.units, return_sequences=return_sequences, input_shape=(args.timesteps, n_features)))
        else:
            model.add(LSTM(units=args.units, return_sequences=return_sequences))
        model.add(Dropout(args.dropout))

    model.add(Dense(units=1, activation='linear'))
    model.summary(print_fn=lambda x: print(x, file=sys.stderr))

    # --- 6. Compile Model ---
    print(f"[Python Script] Compiling model (LR: {args.learning_rate})...", file=sys.stderr)
    optimizer = Adam(learning_rate=args.learning_rate)
    model.compile(optimizer=optimizer, loss='mean_squared_error', metrics=['mae'])

    # --- 7. Train Model ---
    print(f"[Python Script] Starting training ({args.epochs} epochs, Batch: {args.batch_size})...", file=sys.stderr)
    early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=1)

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=[early_stopping],
        verbose=0
    )
    print("[Python Script] Training finished.", file=sys.stderr)

    # --- 8. Evaluate Model ---
    print("[Python Script] Evaluating model on test set...", file=sys.stderr)
    loss, mae = model.evaluate(X_test, y_test, verbose=0)
    rmse = np.sqrt(loss)
    print(f"[Python Script] Evaluation Results - RMSE: {rmse:.4f}, MAE: {mae:.4f}", file=sys.stderr)

    # --- 9. Save Model ---
    model_path = None
    if args.output_dir and args.model_id:
        os.makedirs(args.output_dir, exist_ok=True)
        model_path = os.path.join(args.output_dir, f'lstm_model_{args.model_id}.h5')
        print(f"[Python Script] Saving model to {model_path}", file=sys.stderr)
        model.save(model_path)

    # --- 10. Output Results ---
    final_message = f"LSTM training completed successfully. Final Val Loss: {history.history['val_loss'][-1]:.4f}"
    print_json_output(success=True, message=final_message, rmse=rmse, mae=mae, model_path=model_path)

except Exception as e:
    # --- Error Handling ---
    # Log detailed exception traceback to stderr for debugging
    print(f"[Python Script ERROR] An error occurred during training: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr) # Print full traceback to stderr

    # Print a structured JSON error message to stdout
    # The Node.js action expects a JSON object on stdout
    print_json_output(success=False, message=f"Training failed: {str(e)}")
    sys.exit(1) # Exit with a non-zero code to indicate failure
