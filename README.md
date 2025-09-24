# WorkLog Application

Ứng dụng quản lý báo cáo công việc với hệ thống RAG (Retrieval-Augmented Generation) và Bot Telegram cho Tổng giám đốc.

## 🚀 Tính năng chính

### 📝 Quản lý báo cáo công việc
- Form báo cáo công việc với tệp đính kèm bắt buộc
- Lịch sử công việc với tìm kiếm và lọc
- Lịch làm việc kiểu iPhone với điểm đánh dấu
- Modal chi tiết với preview tài liệu

### 🔐 Xác thực và bảo mật
- Đăng nhập/đăng ký với Supabase Auth
- Đổi mật khẩu và quên mật khẩu
- Lưu trữ thông tin nhân viên (Họ tên, Mã NV)

### 🤖 Bot Telegram cho CEO
- Thống kê công việc realtime
- Tìm kiếm tài liệu thông minh bằng AI
- Xem công việc của từng nhân viên
- Tóm tắt và báo cáo tự động

### 🧠 Hệ thống RAG
- Tự động xử lý tài liệu (PDF, DOCX)
- Vector database với pgvector
- Tìm kiếm semantic thông minh
- Tích hợp OpenAI Embeddings

## 🛠️ Công nghệ sử dụng

- **Frontend**: Next.js 15, React, TypeScript
- **UI**: Radix UI, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Storage)
- **AI**: OpenAI GPT, Google Gemini
- **Automation**: n8n workflows
- **Vector DB**: pgvector (Supabase)
- **Bot**: Telegram Bot API

## 📋 Yêu cầu hệ thống

- Node.js 18+
- npm hoặc yarn
- Tài khoản Supabase
- Tài khoản OpenAI
- Tài khoản n8n (cloud hoặc self-hosted)

## 🚀 Cài đặt

### 1. Clone repository
```bash
git clone <repository-url>
cd worklog
```

### 2. Cài đặt dependencies
```bash
npm install
```

### 3. Cấu hình environment variables
Tạo file `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

### 4. Setup Supabase
```bash
# Chạy SQL scripts trong docs/
# 1. Tạo bảng worklogs
# 2. Tạo bảng documents (cho RAG)
# 3. Cấu hình RLS policies
# 4. Tạo storage bucket
```

### 5. Chạy ứng dụng
```bash
npm run dev
```

## 📚 Documentation

- [Hướng dẫn setup chi tiết](SETUP_INSTRUCTIONS.md)
- [Cài đặt Bot Telegram](docs/telegram-bot-setup.md)
- [Lệnh Bot Telegram](docs/ceo-bot-commands.md)
- [Workflow n8n](docs/n8n-telegram-bot-workflow.json)

## 🏗️ Cấu trúc dự án

```
src/
├── app/                    # Next.js App Router
│   ├── actions.ts         # Server actions
│   ├── page.tsx          # Trang chính
│   ├── login/            # Trang đăng nhập
│   └── reset-password/   # Trang đặt lại mật khẩu
├── components/           # React components
│   ├── ui/              # UI components (Radix)
│   ├── work-log-form.tsx
│   ├── work-history.tsx
│   ├── work-calendar.tsx
│   └── work-entry-detail-dialog.tsx
├── lib/                 # Utilities
│   ├── supabase.ts     # Supabase client
│   ├── types.ts        # TypeScript types
│   └── utils.ts        # Helper functions
└── ai/                 # AI integration
    ├── genkit.ts       # Google Gemini setup
    └── flows/          # AI workflows
```

## 🔧 Cấu hình n8n

### Import workflow
1. Mở n8n
2. Import file `docs/n8n-telegram-bot-workflow.json`
3. Cấu hình credentials:
   - Supabase API
   - OpenAI API
   - Telegram Bot API

### Tạo Bot Telegram
1. Tìm @BotFather trên Telegram
2. Tạo bot mới với `/newbot`
3. Lưu Bot Token
4. Cấu hình trong n8n

## 📊 Database Schema

### Bảng `worklogs`
```sql
CREATE TABLE worklogs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  category TEXT,
  file_url TEXT,
  file_name TEXT,
  processed_for_rag BOOLEAN DEFAULT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);
```

### Bảng `documents` (RAG)
```sql
CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  worklog_id BIGINT,
  file_url TEXT,
  file_name TEXT,
  mime_type TEXT,
  content TEXT,
  chunk TEXT,
  embedding VECTOR(1536),
  tokens INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🤖 Bot Commands

- `/start` - Menu chính
- `/stats` - Thống kê công việc
- `/search [từ khóa]` - Tìm kiếm tài liệu
- `/user [email]` - Xem công việc nhân viên
- `/summary` - Tóm tắt AI

## 🔒 Bảo mật

- Row Level Security (RLS) trên tất cả bảng
- JWT authentication với Supabase
- File upload validation
- Input sanitization

## 🚀 Deployment

### Vercel (Khuyến nghị)
```bash
npm run build
vercel --prod
```

### Docker
```bash
docker build -t worklog-app .
docker run -p 3000:3000 worklog-app
```

## 📈 Monitoring

- Supabase Dashboard cho database
- n8n logs cho automation
- Telegram Bot analytics
- Application logs

## 🤝 Contributing

1. Fork repository
2. Tạo feature branch
3. Commit changes
4. Push to branch
5. Tạo Pull Request

## 📄 License

MIT License - xem file [LICENSE](LICENSE) để biết thêm chi tiết.

## 🆘 Support

Nếu gặp vấn đề, hãy tạo issue trên GitHub hoặc liên hệ qua email.

---

**Phát triển bởi**: [Tên của bạn]  
**Phiên bản**: 1.0.0  
**Cập nhật lần cuối**: 2024-01-20