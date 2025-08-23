# Hướng dẫn triển khai Trading Bot Studio Backend trên Heroku

## Tổng quan
Dự án này đã được cấu hình để triển khai **Python Backend** lên Heroku, bao gồm:
- **Backend Python**: Flask + FastAPI
- **Database**: Supabase + PostgreSQL
- **AI/ML**: TensorFlow, PyTorch, Scikit-learn
- **Trading**: CCXT, Binance API

## Các file cấu hình đã tạo

### 1. `requirements.txt`
Chứa tất cả dependencies Python cần thiết:
- Data Science: pandas, numpy, scipy, scikit-learn
- Deep Learning: tensorflow, torch, keras
- Web Framework: Flask, FastAPI, gunicorn
- Database: supabase, sqlalchemy, psycopg2
- Financial: ccxt, yfinance, alpha-vantage
- Monitoring: loguru, prometheus-client

### 2. `Procfile`
Chỉ định cách Heroku khởi chạy ứng dụng Python:
- Web process: Flask/FastAPI backend với Gunicorn

### 3. `runtime.txt`
Chỉ định phiên bản Python 3.11.7

### 4. `app.json`
Cấu hình Heroku app với:
- Environment variables
- Add-ons (PostgreSQL)
- Buildpacks (Python only)
- Formation (web dyno)

### 5. `wsgi.py`
Entry point cho WSGI server

## Các bước triển khai

### Bước 1: Cài đặt Heroku CLI
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

### Bước 2: Đăng nhập Heroku
```bash
heroku login
```

### Bước 3: Tạo Heroku app
```bash
heroku create your-app-name
```

### Bước 4: Cấu hình environment variables
```bash
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_supabase_key
heroku config:set BINANCE_API_KEY=your_binance_key
heroku config:set BINANCE_SECRET_KEY=your_binance_secret
```

### Bước 5: Thêm buildpack Python
```bash
heroku buildpacks:add heroku/python
```

### Bước 6: Triển khai
```bash
git add .
git commit -m "Configure Python backend for Heroku deployment"
git push heroku main
```

### Bước 7: Khởi chạy
```bash
heroku ps:scale web=1
heroku open
```

## Cấu trúc triển khai

```
Heroku App
└── Web Dyno (Python Backend)
    ├── Flask/FastAPI API
    ├── Trading Bot Engine
    ├── Backtest Engine
    ├── ML Model Serving
    └── Database Connection (Supabase)
```

## API Endpoints

Sau khi triển khai, backend sẽ có các endpoints:
- `GET /` - Home page
- `GET /health` - Health check
- `GET /api/status` - API status
- Các endpoints khác từ Flask app

## Monitoring & Logs

### Xem logs
```bash
heroku logs --tail
```

### Xem status
```bash
heroku ps
```

### Restart app
```bash
heroku restart
```

## Troubleshooting

### Lỗi build
- Kiểm tra `requirements.txt` có đúng syntax
- Đảm bảo `runtime.txt` chỉ định Python version hợp lệ
- Kiểm tra `Procfile` có đúng format

### Lỗi runtime
- Kiểm tra environment variables
- Xem logs: `heroku logs --tail`
- Kiểm tra database connection

### Performance
- Scale dynos: `heroku ps:scale web=2`
- Monitor với: `heroku addons:open scout`

## Tính năng Python Backend

Dự án hỗ trợ:
- **Flask**: Legacy API endpoints
- **FastAPI**: Modern async API endpoints
- **ML Models**: TensorFlow, PyTorch, Scikit-learn
- **Trading Strategies**: CCXT, Binance API
- **Database**: Supabase integration
- **Background Tasks**: Bot execution, data processing

## Lưu ý quan trọng

1. **Environment Variables**: Không commit sensitive data
2. **Database**: Sử dụng Supabase (external)
3. **File Storage**: Sử dụng cloud storage (AWS S3, Cloudinary)
4. **Secrets**: Sử dụng Heroku Config Vars
5. **Frontend**: Chưa triển khai (chỉ backend Python)

## Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Heroku logs
2. Environment variables
3. Database connection
4. Python buildpack configuration
5. Dyno status
