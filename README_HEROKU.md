# Hướng dẫn triển khai Trading Bot Studio trên Heroku

## Tổng quan
Dự án này đã được cấu hình để hỗ trợ triển khai đa ngôn ngữ trên Heroku, bao gồm:
- **Backend Python**: Flask + FastAPI
- **Frontend**: Next.js (Node.js)
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
Chỉ định cách Heroku khởi chạy ứng dụng:
- Web process: Flask/FastAPI backend
- Worker process: Background tasks (optional)
- Release process: Database migrations (optional)

### 3. `runtime.txt`
Chỉ định phiên bản Python 3.11.7

### 4. `app.json`
Cấu hình Heroku app với:
- Environment variables
- Add-ons (PostgreSQL, Redis)
- Buildpacks (Python + Node.js)
- Formation (web + worker dynos)

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

### Bước 5: Thêm buildpacks
```bash
heroku buildpacks:add heroku/python
heroku buildpacks:add heroku/nodejs
```

### Bước 6: Triển khai
```bash
git add .
git commit -m "Configure for Heroku deployment"
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
├── Web Dyno (Flask/FastAPI)
│   ├── Trading Bot API
│   ├── Backtest Engine
│   └── ML Model Serving
├── Worker Dyno (Background Tasks)
│   ├── Bot Execution
│   ├── Data Processing
│   └── Model Training
└── Add-ons
    ├── PostgreSQL (Database)
    └── Redis (Caching)
```

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
- Optimize database queries

## Tính năng đa ngôn ngữ

Dự án hỗ trợ:
- **Python**: Backend API, ML models, trading strategies
- **JavaScript/TypeScript**: Frontend, Node.js scripts
- **SQL**: Database queries, migrations
- **Shell**: Deployment scripts, automation

## Lưu ý quan trọng

1. **Environment Variables**: Không commit sensitive data
2. **Database**: Sử dụng Supabase hoặc Heroku PostgreSQL
3. **File Storage**: Sử dụng cloud storage (AWS S3, Cloudinary)
4. **Secrets**: Sử dụng Heroku Config Vars
5. **Monitoring**: Setup alerts và logging

## Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Heroku logs
2. Environment variables
3. Database connection
4. Buildpacks configuration
5. Dyno status
