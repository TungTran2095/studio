// Workspace content cho AI agent
export const QUANTITATIVE_RESEARCH_CONTENT = `
# 🧠 Module Nghiên cứu Định lượng & Phát triển Mô hình

Đây là module cốt lõi của Urus Studio, nơi bạn có thể thực hiện toàn bộ quy trình nghiên cứu định lượng từ A-Z:

## 🏗️ **Xây dựng Mô hình**
- **Mô hình Thống kê**: Linear Regression, ARIMA, GARCH, VAR, Cointegration
- **Machine Learning**: Random Forest, Gradient Boosting, XGBoost, Neural Networks, LSTM, SVM
- **Toán tài chính**: Black-Scholes, CAPM, VaR, Monte Carlo, Binomial Tree

**Template có sẵn:**
- Bitcoin Price Prediction LSTM
- ETH Momentum Strategy Random Forest  
- Mean Reversion ARIMA Model
- Multi-Asset Portfolio Optimization

## 🔬 **Kiểm tra Giả thuyết Thống kê**
- **Correlation Test**: Phân tích mối tương quan giữa các biến
- **T-Test**: So sánh trung bình giữa các nhóm
- **ANOVA**: So sánh nhiều nhóm dữ liệu
- **Chi-Square**: Kiểm tra tính độc lập
- **Granger Causality**: Phân tích quan hệ nhân quả

**Template phổ biến:**
- Volume-Price Relationship Analysis
- News Sentiment Impact Testing
- Weekend Effect Research
- Market Efficiency Testing

## 📊 **Backtesting Engine Nâng cao**
- **Chiến lược**: Mean Reversion, Momentum, Pairs Trading, Breakout, Arbitrage
- **Risk Management**: Stop Loss, Take Profit, Position Sizing, Portfolio Heat
- **Performance Metrics**: Sharpe, Sortino, Calmar, Max Drawdown, Win Rate, Profit Factor
- **Advanced Analysis**: Rolling statistics, Walk-forward analysis, Monte Carlo simulation

## ⚡ **Tối ưu hóa Tham số Thông minh**
- **Grid Search**: Tìm kiếm toàn diện trong không gian tham số
- **Random Search**: Tối ưu ngẫu nhiên hiệu quả
- **Bayesian Optimization**: Tối ưu thông minh với Gaussian Process
- **Genetic Algorithm**: Mô phỏng tiến hóa cho optimization
- **Hyperband**: Tối ưu với early stopping

**Mục tiêu tối ưu đa dạng:**
- Maximize Sharpe Ratio
- Minimize Drawdown  
- Maximize Return/Risk ratio
- Minimize Volatility
- Multi-objective optimization

## 📚 **Quản lý Dự án Nghiên cứu**
- **Project Management**: Tổ chức nghiên cứu theo dự án
- **Model Library**: Thư viện mô hình có thể tái sử dụng
- **Version Control**: Quản lý phiên bản mô hình và kết quả
- **Collaboration**: Chia sẻ và cộng tác nghiên cứu

## 🚀 **Workflow Nghiên cứu Hoàn chỉnh**

1. **📋 Lập kế hoạch** → Tạo research project
2. **🔍 Khám phá dữ liệu** → EDA và feature engineering  
3. **📊 Định nghĩa giả thuyết** → Statistical hypothesis testing
4. **🏗️ Xây dựng mô hình** → Template hoặc custom development
5. **⚡ Backtesting** → Historical performance evaluation
6. **🎯 Tối ưu hóa** → Parameter optimization và validation
7. **📈 Deployment** → Model deployment và monitoring

## 🔬 **Tính năng Nghiên cứu Nâng cao**
- **Statistical Analysis**: Comprehensive statistical testing toolkit
- **Feature Engineering**: Advanced feature creation và selection
- **Cross-validation**: Time series và walk-forward validation
- **Risk Analysis**: VaR, CVaR, stress testing
- **Market Regime Detection**: Hidden Markov Models, change point detection
- **Alternative Data**: Social sentiment, satellite data integration

## 🎯 **Performance Dashboard**
- **Real-time Monitoring**: Live model performance tracking
- **Comparative Analysis**: Multi-model comparison và benchmarking
- **Risk Metrics**: Comprehensive risk analysis dashboard
- **Attribution Analysis**: Performance attribution và factor analysis

## 💻 **Development Tools**
- **Code Editor**: Python/R code development environment
- **Jupyter Integration**: Interactive notebook support
- **Version Control**: Git integration cho code và models
- **Testing Framework**: Automated model validation và testing

## 🤖 **AI-Powered Research Assistant**
- **Automated EDA**: AI-generated exploratory data analysis
- **Model Suggestions**: Smart model recommendations
- **Feature Selection**: AI-guided feature engineering
- **Interpretation**: Automated model interpretation và explanation

Sử dụng module này để thực hiện nghiên cứu định lượng chuyên nghiệp và phát triển các chiến lược giao dịch hiệu quả!
`;

export const QUANTITATIVE_RESEARCH_TOOLS = [
  {
    name: "Tạo dự án nghiên cứu mới",
    description: "Khởi tạo project nghiên cứu định lượng mới với template",
    action: "createResearchProject"
  },
  {
    name: "Xây dựng mô hình từ template",
    description: "Sử dụng các template có sẵn để khởi tạo nhanh",
    action: "openModelBuilder"
  },
  {
    name: "Kiểm tra giả thuyết thống kê", 
    description: "Phân tích tương quan và kiểm định giả thuyết",
    action: "openHypothesisTesting"
  },
  {
    name: "Chạy backtesting nâng cao",
    description: "Kiểm tra hiệu suất chiến lược với analysis sâu", 
    action: "openBacktesting"
  },
  {
    name: "Tối ưu hóa tham số thông minh",
    description: "Sử dụng AI để tự động tìm kiếm tham số tối ưu",
    action: "openOptimization"
  },
  {
    name: "Quản lý thư viện mô hình",
    description: "Xem, chia sẻ và download các mô hình có sẵn",
    action: "openModelLibrary"
  },
  {
    name: "Xem dashboard kết quả",
    description: "Truy cập dashboard performance và analytics",
    action: "openResultsDashboard"
  }
];

// Keep existing exports for backward compatibility
export const RESEARCH_DEVELOPMENT_CONTENT = QUANTITATIVE_RESEARCH_CONTENT;
export const RESEARCH_DEVELOPMENT_TOOLS = QUANTITATIVE_RESEARCH_TOOLS; 