# 🚀 **Urus Studio - AI Trading Platform**

Platform giao dịch crypto tích hợp AI với thu thập dữ liệu real-time từ Binance API và CoinMarketCap.

## ✨ **Tính năng chính**

### 🤖 **AI Trading Assistant**
- Chat AI hỗ trợ phân tích thị trường
- Phát hiện tự động các token crypto trong câu hỏi
- Cung cấp giá real-time và phân tích kỹ thuật

### 📊 **Thu thập Dữ liệu Real-time**
- **Jobs Manager thật** - không còn mockup!
- Thu thập dữ liệu OHLCV từ Binance API 
- Lưu trữ tự động vào Supabase
- Cron jobs với scheduling linh hoạt
- Monitor real-time progress và status

### 🗂️ **Workspace Management**
- Quản lý data sources (Binance, CoinMarketCap, Supabase)
- Data quality dashboard
- Job monitoring và control

### 🔌 **API Integrations**
- ✅ **Binance API** - OHLCV data, market data
- ✅ **CoinMarketCap API** - Real-time prices, market overview  
- ✅ **Supabase** - Database và real-time sync

## 🛠️ **Tech Stack**

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL)
- **Jobs**: node-cron, real-time scheduling
- **AI**: Google Genkit, AI chat integration
- **APIs**: Binance, CoinMarketCap
- **UI**: shadcn/ui components

## 🚀 **Quick Start**

### 1. Clone Repository
```bash
git clone <repository-url>
cd studio
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Tạo file `.env.local`:
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# CoinMarketCap API
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Google AI (optional)
GOOGLE_API_KEY=your_google_api_key
```

### 4. Database Setup
Tạo tables trong Supabase:
```sql
-- BTC OHLCV Table
CREATE TABLE "OHLCV_BTC_USDT_1m" (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  quote_asset_volume DECIMAL NOT NULL,
  number_of_trades INTEGER NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(open_time)
);

-- ETH OHLCV Table
CREATE TABLE "OHLCV_ETH_USDT_1m" (
  id SERIAL PRIMARY KEY,
  symbol TEXT NOT NULL,
  open_time TIMESTAMPTZ NOT NULL,
  close_time TIMESTAMPTZ NOT NULL,
  open DECIMAL NOT NULL,
  high DECIMAL NOT NULL,
  low DECIMAL NOT NULL,
  close DECIMAL NOT NULL,
  volume DECIMAL NOT NULL,
  quote_asset_volume DECIMAL NOT NULL,
  number_of_trades INTEGER NOT NULL,
  inserted_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(open_time)
);
```

### 5. Run Development Server
```bash
npm run dev
```

Mở [http://localhost:9002](http://localhost:9002)

## 📊 **Jobs Thu thập Dữ liệu**

### Cách sử dụng Jobs Manager:
1. **Truy cập Workspace** → Data Collection Jobs
2. **Test Binance**: Click "Test Binance" để test thu thập 5 records
3. **Tạo Job mới**: Click "Tạo Job Mới" 
4. **Start Job**: Click "Chạy" để bắt đầu cron job thật
5. **Monitor**: Theo dõi progress và records real-time

### Supported Frequencies:
- Mỗi 1 phút (`*/1 * * * *`)
- Mỗi 5 phút (`*/5 * * * *`) 
- Mỗi 15 phút (`*/15 * * * *`)
- Mỗi 1 giờ (`0 * * * *`)
- Mỗi 24 giờ (`0 0 * * *`)

## 🔧 **Development**

### Project Structure
```
src/
├── app/                 # Next.js app router
├── components/          # React components
├── lib/
│   ├── jobs/           # ⭐ Real Jobs Manager
│   │   ├── binance-data-collector.ts
│   │   └── job-manager.ts
│   ├── market-data/    # Market data services
│   └── services/       # API services
├── types/              # TypeScript types
└── ai/                 # AI integration
```

### Key Files:
- `src/lib/jobs/job-manager.ts` - Real cron jobs management
- `src/lib/jobs/binance-data-collector.ts` - Binance API integration
- `src/app/api/jobs/route.ts` - Jobs API endpoint
- `src/components/workspace/modules/data-collection-jobs-manager.tsx` - Jobs UI

## 🌟 **Features Highlight**

### ✅ **Real Jobs (không còn mockup!)**
- Cron scheduling thật với `node-cron`
- Thu thập dữ liệu thật từ Binance API
- Lưu vào Supabase database
- Real-time progress tracking

### ✅ **AI Integration**
- Chat với AI về crypto
- Phân tích giá real-time
- Hỗ trợ trading decisions

### ✅ **Production Ready**
- Error handling robust
- Logging chi tiết
- Rate limiting awareness
- Environment-based configuration

## 🐛 **Troubleshooting**

### Common Issues:

1. **Port 9002 đã bị sử dụng**:
```bash
netstat -ano | findstr :9002
taskkill /F /PID <PID>
```

2. **Supabase connection issues**:
- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify database tables đã được tạo

3. **CoinMarketCap API**:
- Kiểm tra `COINMARKETCAP_API_KEY` trong `.env.local`
- Verify API quotas

## 📄 **License**

MIT License - see LICENSE file for details.

---

**Developed with ❤️ for the crypto trading community**