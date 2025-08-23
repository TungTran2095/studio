# Hướng dẫn triển khai Trading Bot Studio Fullstack trên Heroku

## Tổng quan
Dự án này đã được cấu hình để triển khai **Fullstack** lên Heroku, bao gồm:
- **Frontend**: Next.js (React) với TypeScript
- **Backend Python**: Flask + FastAPI
- **Database**: Supabase + PostgreSQL
- **AI/ML**: TensorFlow, PyTorch, Scikit-learn
- **Trading**: CCXT, Binance API

## Cấu trúc Fullstack

```
Trading Bot Studio
├── Frontend (Next.js/React)
│   ├── Trading Dashboard
│   ├── Bot Management UI
│   ├── Backtest Results
│   └── Strategy Builder
├── Backend (Python)
│   ├── Flask/FastAPI API
│   ├── Trading Bot Engine
│   ├── Backtest Engine
│   └── ML Model Serving
└── Database (Supabase)
    ├── User Data
    ├── Bot Configurations
    └── Trading History
```

## Các file cấu hình đã tạo

### 1. `requirements.txt`
Chứa tất cả dependencies Python cần thiết:
- Data Science: pandas, numpy, scipy, scikit-learn
- Deep Learning: tensorflow, torch, keras
- Web Framework: Flask, FastAPI, gunicorn
- Database: supabase, sqlalchemy, psycopg2
- Financial: ccxt, yfinance, alpha-vantage

### 2. `package.json`
Cấu hình Node.js với scripts:
- `npm run build`: Build Next.js app
- `npm start`: Start production server
- `npm run dev`: Development server

### 3. `next.config.mjs`
Cấu hình Next.js cho Heroku:
- `output: 'standalone'`: Tối ưu cho production
- `images.unoptimized: true`: Disable image optimization
- API rewrites cho Python backend

### 4. `Procfile`
Chỉ định cách Heroku khởi chạy ứng dụng:
- Web process: Next.js frontend + Python backend

### 5. `runtime.txt`
Chỉ định phiên bản Python 3.11.7

### 6. `app.json`
Cấu hình Heroku app với:
- Environment variables cho cả Node.js và Python
- Add-ons (PostgreSQL)
- Buildpacks (Node.js + Python)
- Formation (web dyno)

### 7. `wsgi.py`
Entry point cho Python backend

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
heroku config:set NODE_ENV=production
heroku config:set PYTHON_ENV=production
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_supabase_key
heroku config:set BINANCE_API_KEY=your_binance_key
heroku config:set BINANCE_SECRET_KEY=your_binance_secret
```

### Bước 5: Thêm buildpacks (quan trọng!)
```bash
# Thêm Node.js buildpack TRƯỚC Python
heroku buildpacks:add heroku/nodejs
# Thêm Python buildpack SAU
heroku buildpacks:add heroku/python
```

### Bước 6: Triển khai
```bash
git add .
git commit -m "Configure fullstack for Heroku deployment"
git push heroku main
```

### Bước 7: Khởi chạy
```bash
heroku ps:scale web=1
heroku open
```

## Quy trình Build trên Heroku

### 1. Node.js Build (Buildpack đầu tiên)
- Cài đặt Node.js dependencies
- Build Next.js app (`npm run build`)
- Tạo production bundle

### 2. Python Build (Buildpack thứ hai)
- Cài đặt Python dependencies
- Cài đặt Python packages từ `requirements.txt`
- Chuẩn bị Python backend

### 3. Runtime
- Next.js server khởi chạy trên port `$PORT`
- Python backend chạy như service
- Frontend giao tiếp với backend qua API

## API Endpoints

### Frontend (Next.js)
- `/` - Trading Dashboard
- `/bots` - Bot Management
- `/backtests` - Backtest Results
- `/strategies` - Strategy Builder

### Backend (Python)
- `/api/python/` - Python API endpoints
- `/api/python/health` - Health check
- `/api/python/bots` - Bot management
- `/api/python/backtests` - Backtest engine

## Monitoring & Logs

### Xem logs
```bash
heroku logs --tail
```

### Xem buildpacks
```bash
heroku buildpacks
```

### Xem status
```bash
heroku ps
```

## Troubleshooting

### Lỗi build
- **Node.js buildpack phải ở đầu tiên**
- Kiểm tra `package.json` có script `build` và `start`
- Đảm bảo `next.config.mjs` đúng cấu hình

### Lỗi runtime
- Kiểm tra environment variables
- Xem logs: `heroku logs --tail`
- Kiểm tra buildpack order

### Performance
- Scale dynos: `heroku ps:scale web=2`
- Monitor với: `heroku addons:open scout`

## Tính năng Fullstack

### Frontend (React/Next.js)
- **UI Components**: Trading dashboard, charts, forms
- **State Management**: Zustand, React Query
- **Styling**: Tailwind CSS, Radix UI
- **Type Safety**: TypeScript

### Backend (Python)
- **API**: Flask, FastAPI
- **ML Models**: TensorFlow, PyTorch, Scikit-learn
- **Trading**: CCXT, Binance API
- **Database**: Supabase integration

## Lưu ý quan trọng

1. **Buildpack Order**: Node.js phải ở đầu tiên
2. **Environment Variables**: Cấu hình cho cả frontend và backend
3. **Port Configuration**: Sử dụng `$PORT` từ Heroku
4. **Static Assets**: Next.js build tạo production bundle
5. **API Communication**: Frontend gọi backend qua rewrites

## Hỗ trợ

Nếu gặp vấn đề, kiểm tra:
1. Buildpack order (Node.js trước, Python sau)
2. Heroku logs
3. Environment variables
4. Next.js build process
5. Python backend startup
