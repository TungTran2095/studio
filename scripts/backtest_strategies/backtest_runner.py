import pandas as pd
import numpy as np
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any
import argparse
from supabase import create_client, Client

# Add parent directory to Python path để có thể import các module
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import các strategy
from backtest_strategies.ma_crossover_strategy import MACrossoverStrategy
from backtest_strategies.rsi_strategy import RSIStrategy
from backtest_strategies.macd_strategy import MACDStrategy
from backtest_strategies.bollinger_bands_strategy import BollingerBandsStrategy
from backtest_strategies.breakout_strategy import BreakoutStrategy

# Khởi tạo Supabase client
supabase: Client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL', ''),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
)

def load_data(symbol: str, timeframe: str, start_date: str, end_date: str) -> pd.DataFrame:
    """Load historical price data for backtesting from Supabase"""
    try:
        # Dựa trên thông tin từ người dùng, dữ liệu OHLCV nằm trong bảng cụ thể cho mỗi symbol.
        # Ví dụ: 'OHLCV_BTC_USDT_1m'.
        # Xây dựng tên bảng một cách động từ symbol, giả sử timeframe cơ sở là 1m.
        table_name = f"OHLCV_BTC_USDT_1m"
        print(f"INFO: Attempting to load data from table '{table_name}'")

        # Lấy dữ liệu từ bảng được xây dựng động
        response = supabase.table(table_name) \
            .select('*') \
            .gte('open_time', start_date) \
            .lte('open_time', end_date) \
            .order('open_time', desc=False) \
            .execute()
        
        if not response.data:
            raise ValueError(f"No data found for symbol {symbol} in table {table_name} between {start_date} and {end_date}")

        # Convert to DataFrame
        df = pd.DataFrame(response.data)

        # Đảm bảo các cột đúng chuẩn OHLCV
        # Nếu cần, có thể rename cho đồng nhất
        # Ở đây giả sử các cột đã đúng: open, high, low, close, volume

        # Chuyển đổi open_time thành datetime index
        df['open_time'] = pd.to_datetime(df['open_time'])
        df.set_index('open_time', inplace=True)

        # Resample data theo timeframe
        if timeframe != '1m':  # Nếu không phải 1 phút thì cần resample
            # Map timeframe to pandas offset string
            timeframe_map = {
                '1m': '1T',
                '3m': '3T',
                '5m': '5T',
                '15m': '15T',
                '30m': '30T',
                '1h': 'H',
                '2h': '2H',
                '4h': '4H',
                '6h': '6H',
                '8h': '8H',
                '12h': '12H',
                '1d': 'D',
                '3d': '3D',
                '1w': 'W',
                '1M': 'M'
            }
            
            rule = timeframe_map.get(timeframe)
            if not rule:
                raise ValueError(f"Invalid timeframe: {timeframe}")
            
            # Resample OHLCV data
            df = df.resample(rule).agg({
                'open': 'first',
                'high': 'max',
                'low': 'min',
                'close': 'last',
                'volume': 'sum'
            }).dropna()
        
        return df

    except Exception as e:
        print(f"Error loading data: {str(e)}")
        raise

def run_backtest(config: Dict[str, Any], experiment_id: str) -> Dict[str, Any]:
    """Run backtest with specified strategy and parameters"""
    # Create results directory if it doesn't exist
    results_dir = os.path.join('results', 'backtests', experiment_id)
    os.makedirs(results_dir, exist_ok=True)

    # Load data
    symbol = config['trading']['symbol']
    timeframe = config['trading']['timeframe']
    start_date = config['trading'].get('startDate', '2023-01-01')
    end_date = config['trading'].get('endDate', '2023-12-31')
    
    data = load_data(symbol, timeframe, start_date, end_date)

    # Strategy mapping
    strategy_map = {
        'ma_crossover': MACrossoverStrategy,
        'rsi': RSIStrategy,
        'macd': MACDStrategy,
        'bollinger_bands': BollingerBandsStrategy,
        'breakout': BreakoutStrategy
    }

    # Get strategy class
    strategy_type = config['strategy']['type']
    if strategy_type not in strategy_map:
        raise ValueError(f"Strategy type '{strategy_type}' not supported")

    StrategyClass = strategy_map[strategy_type]

    # Initialize strategy
    strategy = StrategyClass(config)

    # Run backtest
    results = strategy.run_backtest(data)

    # Save results
    save_results(results, results_dir, strategy_type)

    return results

def save_results(results: Dict[str, Any], results_dir: str, strategy_type: str):
    """Save backtest results to file"""
    # Create unique filename with timestamp
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    filename = f"{strategy_type}_{timestamp}"

    # Save performance metrics
    metrics_file = os.path.join(results_dir, f"{filename}_metrics.json")
    with open(metrics_file, 'w') as f:
        json.dump(results['performance'], f, indent=4)

    # Save trades
    trades_file = os.path.join(results_dir, f"{filename}_trades.csv")
    trades_df = pd.DataFrame(results['trades'])
    trades_df.to_csv(trades_file, index=False)

    # Save equity curve
    equity_file = os.path.join(results_dir, f"{filename}_equity.csv")
    equity_df = pd.DataFrame({'equity': results['equity_curve']})
    equity_df.to_csv(equity_file, index=False)

    print(f"Results saved to {results_dir}/{filename}_*")

if __name__ == '__main__':
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Run backtest strategy')
    parser.add_argument('--experiment_id', type=str, required=True, help='Experiment ID')
    parser.add_argument('--config', type=str, required=True, help='Backtest configuration in JSON format')
    args = parser.parse_args()

    # Parse config from JSON string
    config = json.loads(args.config)

    try:
        # Run backtest
        results = run_backtest(config, args.experiment_id)
        
        # In kết quả performance ra stdout để Node.js có thể bắt được
        if 'performance' in results:
            print(json.dumps(results['performance']))
        else:
            print(json.dumps({'error': 'Performance data not found in results'}))

        exit(0)
    except Exception as e:
        print(json.dumps({'error': f'Error running backtest: {str(e)}'}))
        exit(1) 