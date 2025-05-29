# 🚀 **Urus Studio - AI Trading Platform**

Platform giao dịch crypto tích hợp AI với thu thập dữ liệu real-time từ Binance API và CoinMarketCap.

## ✨ **Tính năng chính**

### 🤖 **Yinsen AI Assistant với Workspace Integration** ⭐ **MỚI!**
- Chat AI hỗ trợ phân tích thị trường và **tự động tương tác với workspace**
- **Tự động thu thập dữ liệu** khi người dùng yêu cầu (ví dụ: "Thu thập dữ liệu BTC")
- **Quản lý jobs tự động** - tạo, start, stop jobs chỉ bằng chat
- **Lấy thống kê real-time** từ workspace chỉ bằng câu lệnh
- **Thu thập tin tức crypto** từ 4 nguồn uy tín chỉ bằng chat
- Phát hiện tự động các token crypto trong câu hỏi
- Cung cấp giá real-time và phân tích kỹ thuật

### 📊 **Thu thập Dữ liệu Real-time**
- **Jobs Manager thật** - không còn mockup!
- Thu thập dữ liệu OHLCV từ Binance API 
- **6 tabs tích hợp**: Tổng quan, Nguồn dữ liệu, Jobs, Chất lượng, Real-time, **Tin tức**
- Lưu trữ tự động vào Supabase với 2.7M+ records
- Cron jobs với scheduling linh hoạt
- **Enhanced Market Data** với charts và connection monitoring

### 📰 **Hệ thống Thu thập Tin tức** ⭐ **MỚI!**
- **4 nguồn tin tức uy tín**: CoinDesk, CoinMarketCap, Reddit r/cryptocurrency, CoinTelegraph
- **Sentiment Analysis** tự động (positive/negative/neutral)
- **Tag extraction** và relevance scoring
- Auto-refresh 30 giây, filters theo nguồn và sentiment
- Tích hợp trong tab "Tin tức" của module thu thập dữ liệu

### 🗂️ **Workspace Management**
- Quản lý data sources (Binance, CoinMarketCap, Supabase)
- Data quality dashboard với 100% quality score
- Job monitoring và control real-time
- Connection status với latency metrics

### 🔌 **API Integrations**
- ✅ **Binance API** - OHLCV data, market data
- ✅ **CoinMarketCap API** - Real-time prices, market overview  
- ✅ **Supabase** - Database và real-time sync
- ✅ **News APIs** - RSS feeds và JSON APIs

## 🤖 **Yinsen Workspace Commands**

Với tích hợp workspace mới, bạn có thể chat với Yinsen để:

### 📊 **Thu thập dữ liệu**
```
"Thu thập dữ liệu BTC cho tôi"
"Collect data for ETH USDT"
"Bắt đầu thu thập BTCUSDT"
```

### ⚙️ **Quản lý Jobs**
```
"Tạo job thu thập ETH mỗi 5 phút"
"Start job BTC"
"Dừng job ETHUSDT"
"Hiển thị danh sách jobs"
```

### 📈 **Thống kê & Báo cáo**
```
"Cho tôi xem thống kê thu thập dữ liệu"
"Stats hiện tại như thế nào?"
"Báo cáo hệ thống"
```

### 📰 **Tin tức thị trường**
```
"Lấy tin tức crypto mới nhất"
"Market news hôm nay"
"Tin tức positive về BTC"
```

### ⚡ **Dữ liệu Real-time**
```
"Cho tôi xem dữ liệu real-time BTC ETH"
"Real-time prices top 10"
"Giá thời gian thực"
```

## 🛠️ **Tech Stack**

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: Supabase (PostgreSQL) với 2.7M+ records
- **Jobs**: node-cron, real-time scheduling
- **AI**: Google Genkit, **Workspace Tools Integration** ⭐
- **APIs**: Binance, CoinMarketCap, News APIs (CoinDesk, CoinTelegraph, Reddit)
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

### 6. Test Yinsen Workspace Integration ⭐
Truy cập [http://localhost:9002/demo-yinsen-workspace](http://localhost:9002/demo-yinsen-workspace) để test tích hợp AI với workspace!

## 📊 **Jobs Thu thập Dữ liệu**

### Cách sử dụng Jobs Manager:
1. **Truy cập Workspace** → Data Collection Jobs
2. **Test Binance**: Click "Test Binance" để test thu thập 5 records
3. **Tạo Job mới**: Click "Tạo Job Mới" hoặc **chat với Yinsen**: "Tạo job BTC"
4. **Start Job**: Click "Chạy" hoặc **chat**: "Start job BTC"
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
│   └── demo-yinsen-workspace/  # ⭐ Demo tích hợp AI-Workspace
├── components/          # React components
├── lib/
│   ├── jobs/           # ⭐ Real Jobs Manager
│   │   ├── binance-data-collector.ts
│   │   └── job-manager.ts
│   ├── market-data/    # Market data services
│   └── services/       # API services
│       └── news-data-collector.ts  # ⭐ News collection
├── types/              # TypeScript types
└── ai/                 # AI integration
    ├── flows/          # AI flows
    └── tools/          # ⭐ Workspace tools cho Yinsen
        └── workspace-tools.ts
```

### Key Files:
- `src/ai/tools/workspace-tools.ts` - **Yinsen workspace integration** ⭐
- `src/lib/services/news-data-collector.ts` - News collection service ⭐
- `src/lib/jobs/job-manager.ts` - Real cron jobs management
- `src/lib/jobs/binance-data-collector.ts` - Binance API integration
- `src/app/api/jobs/route.ts` - Jobs API endpoint
- `src/app/api/market-data/news/route.ts` - News API endpoint ⭐

## 🌟 **Features Highlight**

### ✅ **Yinsen AI Workspace Integration** ⭐ **NEW!**
- Chat tự nhiên để điều khiển toàn bộ workspace
- Tự động nhận dạng intent và thực hiện actions
- Không cần click interface, chỉ cần chat!

### ✅ **Real Jobs (không còn mockup!)**
- Cron scheduling thật với `node-cron`
- Thu thập dữ liệu thật từ Binance API
- Lưu vào Supabase database (2.7M+ records)
- Real-time progress tracking

### ✅ **4-Source News Collection** ⭐ **NEW!**
- CoinDesk RSS, CoinMarketCap API, Reddit JSON, CoinTelegraph RSS
- Sentiment analysis và tag extraction
- Real-time updates mỗi 30 giây

### ✅ **Enhanced Market Data** ⭐ **NEW!**
- Tích hợp từ Enhanced Market Data module
- Real-time crypto data với stats overview
- Connection monitoring với latency metrics

### ✅ **Production Ready**
- Error handling robust
- Logging chi tiết
- Rate limiting awareness
- Environment-based configuration

## 🐛 **Troubleshooting**

### Common Issues:

1. **Port 9002 đã bị sử dụng**:
```bash
npm run safe-dev    # Tự động kill port và start
# hoặc
./scripts/cleanup-ports.ps1  # Windows PowerShell script
```

2. **Supabase connection issues**:
- Kiểm tra `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Verify database tables đã được tạo

3. **CoinMarketCap API**:
- Kiểm tra `COINMARKETCAP_API_KEY` trong `.env.local`
- Verify API quotas

4. **Yinsen Workspace Integration không hoạt động**:
- Đảm bảo server đang chạy trên port 9002
- Test tại `/demo-yinsen-workspace`
- Kiểm tra console logs để debug

## 📈 **Current Stats**

- **📊 2.7M+ records** đã thu thập
- **🟢 3 nguồn dữ liệu** hoạt động
- **📰 4 nguồn tin tức** tích hợp
- **🤖 6 workspace commands** cho Yinsen
- **100% chất lượng dữ liệu**

## 📄 **License**

MIT License - see LICENSE file for details.

---

**🤖 Developed with ❤️ - Now with Yinsen AI Workspace Integration!**