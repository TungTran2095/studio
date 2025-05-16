// src/types/indicators.ts

// Define the structure for the indicator data
export interface IndicatorsData {
    // Trend Indicators
    "Moving Average (50)": string;
    "Moving Average (200)": string;
    "EMA (21)": string;
    "Ichimoku Cloud": string;
    "ADX (14)": string;
    "Parabolic SAR": string;
    
    // Momentum Indicators
    "RSI (14)": string;
    "Stochastic (14,3)": string;
    "MACD": string;
    "CCI (20)": string;
    
    // Volatility Indicators
    "Bollinger Bands": string;
    "ATR (14)": string;
    
    // Volume Indicators
    "OBV": string;
    "Volume MA (20)": string;
    
    // Support/Resistance
    "Fibonacci Levels": string;
    "Pivot Points": string;
    
    // Other
    "Price Trend": string;
    lastUpdated: string; // Add timestamp for last update
    
    // Cho phép truy cập bằng chuỗi (index signature)
    [key: string]: string;
}

// Define a type for indicator categories for UI organization
export const indicatorCategories = {
    "Trend": ["Moving Average (50)", "Moving Average (200)", "EMA (21)", "Ichimoku Cloud", "ADX (14)", "Parabolic SAR"],
    "Momentum": ["RSI (14)", "Stochastic (14,3)", "MACD", "CCI (20)"],
    "Volatility": ["Bollinger Bands", "ATR (14)"],
    "Volume": ["OBV", "Volume MA (20)"],
    "Support/Resistance": ["Fibonacci Levels", "Pivot Points"],
    "Other": ["Price Trend"]
}; 