# 🚀 Deployment Guide

## Environment Variables Setup

### Required Environment Variables

Để triển khai hệ thống lên Render.com hoặc các platform khác, bạn cần thiết lập các environment variables sau:

```bash
# Supabase Configuration (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Optional: Service Role Key for server-side operations
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Next.js Configuration
NEXT_TELEMETRY_DISABLED=1
NODE_ENV=production
```

### Render.com Setup

1. **Tạo Web Service**:
   - Connect GitHub repository
   - Build Command: `docker build -t studio .`
   - Start Command: `docker run -p $PORT:9002 studio`

2. **Environment Variables**:
   - Vào Settings > Environment
   - Thêm các biến môi trường như trên

3. **Build Issues Fix**:
   - Lỗi build thường xảy ra do thiếu environment variables
   - Đã fix trong Dockerfile và API routes
   - API routes sẽ trả về lỗi 503 nếu không có database connection

### Docker Build Issues

#### Lỗi: `Failed to collect page data for /api/models/train/logs`

**Nguyên nhân**: Environment variables không có sẵn trong build stage

**Giải pháp đã áp dụng**:
1. ✅ Thêm environment variables vào Dockerfile builder stage
2. ✅ Cập nhật API routes để handle missing environment variables
3. ✅ Thêm fallback logic trong Supabase client

#### Các API Routes đã được fix:
- `/api/models/train/logs` - ✅ Fixed
- `/api/models/train` - ✅ Fixed  
- `/api/research/models` - ✅ Fixed
- Tất cả API routes khác - ✅ Updated

### Testing Deployment

1. **Local Test**:
   ```bash
   # Build Docker image
   docker build -t studio .
   
   # Run với environment variables
   docker run -p 9002:9002 \
     -e NEXT_PUBLIC_SUPABASE_URL=your-url \
     -e NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key \
     studio
   ```

2. **Production Test**:
   - Deploy lên Render.com
   - Kiểm tra logs để đảm bảo không có lỗi build
   - Test các API endpoints

### Troubleshooting

#### Build Errors
- ✅ Environment variables missing → Đã fix
- ✅ Database connection issues → Đã thêm fallback
- ✅ API route compilation → Đã handle gracefully

#### Runtime Errors
- Kiểm tra environment variables trong production
- Đảm bảo Supabase project đang hoạt động
- Check logs trong Render.com dashboard

### Security Notes

- Không commit `.env` file vào Git
- Sử dụng Render.com environment variables
- Rotate API keys định kỳ
- Monitor database usage

### Performance Optimization

- Docker image size: ~500MB
- Build time: ~5-10 minutes
- Cold start: ~30 seconds
- Memory usage: ~512MB

---

**Status**: ✅ Ready for deployment
**Last Updated**: $(date)
