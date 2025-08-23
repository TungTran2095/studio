# Hướng dẫn triển khai Trading Bot Studio Fullstack trên Heroku

## Tổng quan
Dự án này được triển khai theo kiến trúc **hybrid**:
- **Backend Python**: Triển khai trên Heroku (Flask + FastAPI)
- **Frontend React**: Triển khai riêng biệt (Vercel/Netlify/Firebase)
- **Database**: Supabase (external)

## Kiến trúc Triển khai

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   Database      │
│   (React/Next)  │◄──►│   (Python)      │◄──►│   (Supabase)    │
│   Vercel/Netlify│    │   Heroku        │    │   External      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Cách 1: Triển khai Backend Python trên Heroku

### Các file cấu hình

#### 1. `requirements.txt`
Chứa tất cả dependencies Python cần thiết:
- Data Science: pandas, numpy, scipy, scikit-learn
- Deep Learning: tensorflow, torch, keras
- Web Framework: Flask, FastAPI, gunicorn
- Database: supabase, sqlalchemy, psycopg2
- Financial: ccxt, yfinance, alpha-vantage

#### 2. `Procfile`
Chỉ định cách Heroku khởi chạy Python backend:
```bash
web: gunicorn backend.app:app --bind 0.0.0.0:$PORT --workers 2 --timeout 120
```

#### 3. `.python-version` (thay thế runtime.txt)
Chỉ định Python version:
```
3.11
```

#### 4. `app.json`
Cấu hình Heroku app với Python buildpack

#### 5. `wsgi.py`
Entry point cho WSGI server

### Các bước triển khai Backend

#### Bước 1: Cài đặt Heroku CLI
```bash
# Windows
winget install --id=Heroku.HerokuCLI

# macOS
brew tap heroku/brew && brew install heroku

# Linux
curl https://cli-assets.heroku.com/install.sh | sh
```

#### Bước 2: Đăng nhập và tạo app
```bash
heroku login
heroku create your-backend-name
```

#### Bước 3: Cấu hình environment variables
```bash
heroku config:set PYTHON_ENV=production
heroku config:set SUPABASE_URL=your_supabase_url
heroku config:set SUPABASE_ANON_KEY=your_supabase_key
heroku config:set BINANCE_API_KEY=your_binance_key
heroku config:set BINANCE_SECRET_KEY=your_binance_secret
```

#### Bước 4: Triển khai
```bash
git add .
git commit -m "Configure Python backend for Heroku"
git push heroku main
```

#### Bước 5: Khởi chạy
```bash
heroku ps:scale web=1
heroku open
```

## Cách 2: Triển khai Frontend React riêng biệt

### Option A: Vercel (Recommended)
```bash
# Cài đặt Vercel CLI
npm i -g vercel

# Triển khai
vercel

# Hoặc connect với GitHub repo
vercel --prod
```

### Option B: Netlify
```bash
# Build project
npm run build

# Deploy to Netlify
# Upload dist/ folder hoặc connect GitHub repo
```

### Option C: Firebase Hosting
```bash
# Cài đặt Firebase CLI
npm i -g firebase-tools

# Login và init
firebase login
firebase init hosting

# Deploy
firebase deploy
```

## Cấu hình Frontend để kết nối Backend

### 1. Cập nhật API base URL
```typescript
// src/lib/api.ts
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://your-backend-name.herokuapp.com'
  : 'http://localhost:5000';

export const apiClient = {
  baseURL: API_BASE_URL,
  // ... other config
};
```

### 2. Environment Variables
```bash
# .env.local
NEXT_PUBLIC_API_URL=https://your-backend-name.herokuapp.com
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
```

## API Endpoints

### Backend (Python - Heroku)
- `GET /` - Home page
- `GET /health` - Health check
- `GET /api/status` - API status
- `POST /api/bots` - Create trading bot
- `GET /api/backtests` - Get backtest results
- `POST /api/backtests` - Run backtest

### Frontend (React - Vercel/Netlify)
- `/` - Trading Dashboard
- `/bots` - Bot Management
- `/backtests` - Backtest Results
- `/strategies` - Strategy Builder

## Monitoring & Logs

### Backend (Heroku)
```bash
heroku logs --tail
heroku ps
heroku restart
```

### Frontend (Vercel/Netlify)
- Dashboard monitoring
- Build logs
- Performance analytics

## Troubleshooting

### Backend Issues
- Kiểm tra Heroku logs: `heroku logs --tail`
- Kiểm tra environment variables
- Kiểm tra database connection

### Frontend Issues
- Kiểm tra API base URL
- Kiểm tra environment variables
- Kiểm tra CORS configuration

### CORS Configuration
```python
# backend/app.py
from flask_cors import CORS

app = Flask(__name__)
CORS(app, origins=[
    "https://your-frontend.vercel.app",
    "https://your-frontend.netlify.app",
    "http://localhost:3000"
])
```

## Lưu ý quan trọng

1. **Backend**: Triển khai Python trên Heroku
2. **Frontend**: Triển khai React riêng biệt (Vercel/Netlify)
3. **Database**: Sử dụng Supabase (external)
4. **CORS**: Cấu hình để frontend có thể gọi backend
5. **Environment Variables**: Cấu hình riêng cho từng platform

## Ưu điểm của kiến trúc này

- **Backend**: Tận dụng Python ecosystem cho AI/ML
- **Frontend**: Tận dụng React/Next.js cho UI/UX
- **Scalability**: Mỗi phần có thể scale độc lập
- **Cost**: Chỉ trả tiền cho backend trên Heroku
- **Flexibility**: Có thể thay đổi frontend platform dễ dàng
