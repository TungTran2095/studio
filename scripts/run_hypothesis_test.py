#!/usr/bin/env python3
import argparse
import json
import sys
import pandas as pd
import numpy as np
from scipy import stats
import plotly.graph_objects as go
from supabase import create_client, Client
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
supabase: Client = create_client(
    os.getenv('NEXT_PUBLIC_SUPABASE_URL'),
    os.getenv('SUPABASE_SERVICE_ROLE_KEY')
)

def fetch_market_data(start_date: str, end_date: str) -> pd.DataFrame:
    """Fetch market data from Supabase"""
    response = supabase.table('OHLCV_BTC_USDT_1m').select('*').gte('open_time', start_date).lte('open_time', end_date).execute()
    return pd.DataFrame(response.data)

def calculate_returns(data: pd.DataFrame) -> pd.Series:
    """Calculate returns from OHLCV data"""
    return data['close_price'].pct_change()

def calculate_volatility(data: pd.DataFrame, window: int = 20) -> pd.Series:
    """Calculate rolling volatility"""
    returns = calculate_returns(data)
    return returns.rolling(window=window).std()

def run_correlation_test(data: pd.DataFrame, variables: list, config: dict) -> dict:
    """Run correlation test between variables"""
    x = data[variables[0]['name']].values
    y = data[variables[1]['name']].values
    
    # Calculate correlation
    r, p_value = stats.pearsonr(x, y)
    
    # Calculate confidence interval
    z = np.arctanh(r)
    se = 1/np.sqrt(len(x) - 3)
    ci = np.tanh([z - 1.96*se, z + 1.96*se])
    
    # Create scatter plot
    fig = go.Figure()
    fig.add_trace(go.Scatter(x=x, y=y, mode='markers', name='Data points'))
    fig.add_trace(go.Scatter(x=x, y=np.poly1d(np.polyfit(x, y, 1))(x), 
                            mode='lines', name='Regression line'))
    
    return {
        'testStatistic': r,
        'pValue': p_value,
        'criticalValue': 0.05,
        'confidenceLevel': config.get('confidenceLevel', 0.95),
        'isSignificant': p_value < 0.05,
        'effect_size': abs(r),
        'interpretation': f"Correlation coefficient: {r:.3f} (p-value: {p_value:.3f})",
        'visualizations': [fig.to_json()]
    }

def run_t_test(data: pd.DataFrame, variables: list, config: dict) -> dict:
    """Run t-test between two groups"""
    group1 = data[data[variables[0]['name']] > data[variables[0]['name']].median()]
    group2 = data[data[variables[0]['name']] <= data[variables[0]['name']].median()]
    
    t_stat, p_value = stats.ttest_ind(
        group1[variables[1]['name']],
        group2[variables[1]['name']]
    )
    
    # Calculate effect size (Cohen's d)
    pooled_std = np.sqrt((group1[variables[1]['name']].var() + group2[variables[1]['name']].var()) / 2)
    cohens_d = (group1[variables[1]['name']].mean() - group2[variables[1]['name']].mean()) / pooled_std
    
    # Create box plot
    fig = go.Figure()
    fig.add_trace(go.Box(y=group1[variables[1]['name']], name='Group 1'))
    fig.add_trace(go.Box(y=group2[variables[1]['name']], name='Group 2'))
    
    return {
        'testStatistic': t_stat,
        'pValue': p_value,
        'criticalValue': 0.05,
        'confidenceLevel': config.get('confidenceLevel', 0.95),
        'isSignificant': p_value < 0.05,
        'effect_size': abs(cohens_d),
        'interpretation': f"t-statistic: {t_stat:.3f} (p-value: {p_value:.3f})",
        'visualizations': [fig.to_json()]
    }

def run_anova(data: pd.DataFrame, variables: list, config: dict) -> dict:
    """Run one-way ANOVA test"""
    groups = []
    labels = []
    
    # Split data into groups based on independent variable
    quartiles = data[variables[0]['name']].quantile([0.25, 0.5, 0.75])
    for i in range(4):
        if i == 0:
            group = data[data[variables[0]['name']] <= quartiles[0.25]]
        elif i == 1:
            group = data[(data[variables[0]['name']] > quartiles[0.25]) & 
                        (data[variables[0]['name']] <= quartiles[0.5])]
        elif i == 2:
            group = data[(data[variables[0]['name']] > quartiles[0.5]) & 
                        (data[variables[0]['name']] <= quartiles[0.75])]
        else:
            group = data[data[variables[0]['name']] > quartiles[0.75]]
        
        groups.append(group[variables[1]['name']].values)
        labels.append(f'Group {i+1}')
    
    f_stat, p_value = stats.f_oneway(*groups)
    
    # Calculate effect size (eta-squared)
    grand_mean = np.mean([np.mean(g) for g in groups])
    ss_between = sum(len(g) * (np.mean(g) - grand_mean)**2 for g in groups)
    ss_total = sum(sum((x - grand_mean)**2 for x in g) for g in groups)
    eta_squared = ss_between / ss_total
    
    # Create box plot
    fig = go.Figure()
    for i, group in enumerate(groups):
        fig.add_trace(go.Box(y=group, name=labels[i]))
    
    return {
        'testStatistic': f_stat,
        'pValue': p_value,
        'criticalValue': 0.05,
        'confidenceLevel': config.get('confidenceLevel', 0.95),
        'isSignificant': p_value < 0.05,
        'effect_size': eta_squared,
        'interpretation': f"F-statistic: {f_stat:.3f} (p-value: {p_value:.3f})",
        'visualizations': [fig.to_json()]
    }

def run_chi_square(data: pd.DataFrame, variables: list, config: dict) -> dict:
    """Run chi-square test of independence"""
    # Create contingency table
    x_bins = pd.qcut(data[variables[0]['name']], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
    y_bins = pd.qcut(data[variables[1]['name']], q=4, labels=['Q1', 'Q2', 'Q3', 'Q4'])
    contingency = pd.crosstab(x_bins, y_bins)
    
    chi2_stat, p_value, dof, expected = stats.chi2_contingency(contingency)
    
    # Calculate effect size (Cramer's V)
    n = contingency.sum().sum()
    cramers_v = np.sqrt(chi2_stat / (n * (min(contingency.shape) - 1)))
    
    # Create heatmap
    fig = go.Figure(data=go.Heatmap(
        z=contingency.values,
        x=contingency.columns,
        y=contingency.index,
        colorscale='Viridis'
    ))
    
    return {
        'testStatistic': chi2_stat,
        'pValue': p_value,
        'criticalValue': 0.05,
        'confidenceLevel': config.get('confidenceLevel', 0.95),
        'isSignificant': p_value < 0.05,
        'effect_size': cramers_v,
        'interpretation': f"Chi-square statistic: {chi2_stat:.3f} (p-value: {p_value:.3f})",
        'visualizations': [fig.to_json()]
    }

def main():
    parser = argparse.ArgumentParser(description='Run hypothesis test')
    parser.add_argument('--test_id', required=True, help='Test ID')
    parser.add_argument('--test_type', required=True, help='Type of test')
    parser.add_argument('--variables', required=True, help='Variables in JSON format')
    parser.add_argument('--config', required=True, help='Test configuration in JSON format')
    
    args = parser.parse_args()
    
    try:
        # Parse arguments
        variables = json.loads(args.variables)
        config = json.loads(args.config)
        
        # Fetch market data
        data = fetch_market_data(
            config.get('startDate', '2024-01-01'),
            config.get('endDate', '2024-03-20')
        )
        
        # Calculate derived variables
        data['returns'] = calculate_returns(data)
        data['volatility'] = calculate_volatility(data, config.get('windowSize', 20))
        
        # Run appropriate test
        if args.test_type == 'correlation':
            result = run_correlation_test(data, variables, config)
        elif args.test_type == 't_test':
            result = run_t_test(data, variables, config)
        elif args.test_type == 'anova':
            result = run_anova(data, variables, config)
        elif args.test_type == 'chi_square':
            result = run_chi_square(data, variables, config)
        else:
            raise ValueError(f"Unsupported test type: {args.test_type}")
        
        # Print result as JSON
        print(json.dumps(result))
        sys.exit(0)
        
    except Exception as e:
        print(f"Error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main() 