
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
# Model Architecture
parser.add_argument('--units', type=int, required=True, help='Number of units per LSTM layer.')
parser.add_argument('--layers', type=int, required=True, help='Number of LSTM layers.')
parser.add_argument('--timesteps', type=int, required=True, help='Lookback period (number of past time steps).')
parser.add_argument('--dropout', type=float, required=True, help='Dropout rate.')
# Training Parameters
parser.add_argument('--learning_rate', type=float, required=True, help='Optimizer learning rate.')
parser.add_argument('--batch_size', type=int, required=True, help='Training batch size.')
parser.add_argument('--epochs', type=int, required=True, help='Number of training epochs.')
# Data Parameters
parser.add_argument('--train_test_split_ratio', type=float, required=True, help='Ratio for training data split (e.g., 0.8 for 80%).')
parser.add_argument('--target_column', type=str, default='close', help='Column name to predict.')
parser.add_argument('--feature_columns', nargs='+', default=['open', 'high', 'low', 'close', 'volume'], help='List of feature columns to use.')
# Supabase Credentials (passed via env variables for security)

args = parser.parse_args()

# --- Helper Functions ---
def create_sequences(data, target_col_index, timesteps):
    X, y = [], []
    for i in range(len(data) - timesteps):
        X.append(data[i:(i + timesteps)])
        y.append(data[i + timesteps, target_col_index]) # Predict the target column of the next step
    if not X:
        raise ValueError("Not enough data to create sequences with the given timesteps.")
    return np.array(X), np.array(y)

def print_json_output(success, message=None, rmse=None, mae=None):
    """Prints results or errors as JSON to stdout."""
    output = {"success": success}
    if message:
        output["message"] = message
    if rmse is not None: # Check for None specifically
         if "results" not in output: output["results"] = {}
         output["results"]["rmse"] = rmse
    if mae is not None: # Check for None specifically
         if "results" not in output: output["results"] = {}
         output["results"]["mae"] = mae
    # Ensure output is printed to stdout
    print(json.dumps(output))
    sys.stdout.flush() # Ensure output is sent immediately


# --- Main Training Logic ---
try:
    # --- 1. Connect to Supabase ---
    supabase_url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if not supabase_url or not supabase_key:
        raise ValueError("Missing Supabase URL or Key. Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env")

    print("[Python Script] Connecting to Supabase...", file=sys.stderr) # Log progress to stderr
    supabase: Client = create_client(supabase_url, supabase_key)
    print("[Python Script] Supabase client created.", file=sys.stderr)

    # --- 2. Fetch Data ---
    print(f"[Python Script] Fetching data from OHLCV_BTC_USDT_1m...", file=sys.stderr)
    # Fetch all data, ordered by time
    response = supabase.table("OHLCV_BTC_USDT_1m").select("*").order("open_time", desc=False).execute()
    print(f"[Python Script] Fetched {len(response.data)} records.", file=sys.stderr)


    if not response.data:
        raise ValueError("No data fetched from OHLCV_BTC_USDT_1m table. Ensure data exists and RLS allows reads.")

    df = pd.DataFrame(response.data)
    df['open_time'] = pd.to_datetime(df['open_time'])
    df = df.sort_values('open_time').set_index('open_time') # Set time as index

    # Select features and target
    if args.target_column not in args.feature_columns:
        # Ensure target is included for scaling and sequence creation if needed
        all_cols = list(dict.fromkeys([args.target_column] + args.feature_columns)) # Unique list, target first
    else:
        all_cols = args.feature_columns

    if not all(col in df.columns for col in all_cols):
        missing_cols = [col for col in all_cols if col not in df.columns]
        raise ValueError(f"Missing required columns in fetched data: {', '.join(missing_cols)}")

    print(f"[Python Script] Using features: {all_cols}", file=sys.stderr)
    data_to_process = df[all_cols].astype(float).values # Ensure numeric type
    target_col_index_in_features = all_cols.index(args.target_column) # Index of target within the selected columns

    # --- 3. Preprocess Data ---
    print("[Python Script] Scaling data...", file=sys.stderr)
    # Scale features
    scaler = MinMaxScaler(feature_range=(0, 1))
    scaled_data = scaler.fit_transform(data_to_process)
    print(f"[Python Script] Scaled data shape: {scaled_data.shape}", file=sys.stderr)


    # Create sequences
    print(f"[Python Script] Creating sequences with {args.timesteps} timesteps...", file=sys.stderr)
    X, y = create_sequences(scaled_data, target_col_index_in_features, args.timesteps)
    print(f"[Python Script] Created sequences: X shape={X.shape}, y shape={y.shape}", file=sys.stderr)


    # --- 4. Split Data ---
    print(f"[Python Script] Splitting data (Train ratio: {args.train_test_split_ratio})...", file=sys.stderr)
    X_train, X_temp, y_train, y_temp = train_test_split(X, y, train_size=args.train_test_split_ratio, shuffle=False) # Keep order for time series
    # Split remaining temp data into validation and test (e.g., 50/50 split of the remainder)
    X_val, X_test, y_val, y_test = train_test_split(X_temp, y_temp, test_size=0.5, shuffle=False)
    print(f"[Python Script] Split sizes: Train={len(X_train)}, Val={len(X_val)}, Test={len(X_test)}", file=sys.stderr)


    if len(X_train) == 0 or len(X_val) == 0 or len(X_test) == 0:
        raise ValueError("Data split resulted in empty sets. Ensure enough data and appropriate split ratio/timesteps.")

    n_features = X_train.shape[2] # Number of features in the input sequence

    # --- 5. Build LSTM Model ---
    print(f"[Python Script] Building LSTM model ({args.layers} layers, {args.units} units)...", file=sys.stderr)
    model = Sequential()
    # Input Layer + Hidden Layers
    for i in range(args.layers):
        return_sequences = (i < args.layers - 1) # True for all but the last LSTM layer
        if i == 0:
            model.add(LSTM(units=args.units, return_sequences=return_sequences, input_shape=(args.timesteps, n_features)))
        else:
            model.add(LSTM(units=args.units, return_sequences=return_sequences))
        model.add(Dropout(args.dropout))

    # Output Layer (predicting a single value - the target column)
    model.add(Dense(units=1, activation='linear')) # Linear activation for regression
    model.summary(print_fn=lambda x: print(x, file=sys.stderr)) # Print model summary to stderr


    # --- 6. Compile Model ---
    print(f"[Python Script] Compiling model (LR: {args.learning_rate})...", file=sys.stderr)
    optimizer = Adam(learning_rate=args.learning_rate)
    model.compile(optimizer=optimizer, loss='mean_squared_error', metrics=['mae']) # Use MSE for regression

    # --- 7. Train Model ---
    print(f"[Python Script] Starting training ({args.epochs} epochs, Batch: {args.batch_size})...", file=sys.stderr)
    early_stopping = EarlyStopping(monitor='val_loss', patience=10, restore_best_weights=True, verbose=1) # Increased verbosity for callback logs (to stderr)

    history = model.fit(
        X_train, y_train,
        validation_data=(X_val, y_val),
        epochs=args.epochs,
        batch_size=args.batch_size,
        callbacks=[early_stopping],
        verbose=0 # Suppress Keras epoch logging to keep stdout clean for JSON
    )
    print("[Python Script] Training finished.", file=sys.stderr)


    # --- 8. Evaluate Model ---
    print("[Python Script] Evaluating model on test set...", file=sys.stderr)
    loss, mae = model.evaluate(X_test, y_test, verbose=0)
    rmse = np.sqrt(loss) # RMSE is sqrt of MSE loss
    print(f"[Python Script] Evaluation Results - RMSE: {rmse:.4f}, MAE: {mae:.4f}", file=sys.stderr)


    # --- 9. Output Results (to stdout) ---
    # Optional: Save the model locally if needed
    # model_save_path = 'trained_lstm_model.h5'
    # print(f"[Python Script] Saving model to {model_save_path}", file=sys.stderr)
    # model.save(model_save_path)

    final_message = f"Training completed successfully. Final Val Loss: {history.history['val_loss'][-1]:.4f}"
    print_json_output(success=True, message=final_message, rmse=rmse, mae=mae)

except Exception as e:
    # --- Error Handling ---
    # Log detailed exception traceback to stderr for debugging
    print(f"[Python Script ERROR] An error occurred during training: {str(e)}", file=sys.stderr)
    traceback.print_exc(file=sys.stderr) # Print full traceback to stderr

    # Print a structured JSON error message to stdout
    # The Node.js action expects a JSON object on stdout
    print_json_output(success=False, message=f"Training failed: {str(e)}")
    sys.exit(1) # Exit with a non-zero code to indicate failure
