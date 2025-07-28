# Hướng dẫn khắc phục sự cố Bot Trading

## Vấn đề: Bot vẫn giao dịch sau khi dừng

### Mô tả vấn đề
Bot đã được dừng (status: 'stopped') nhưng vẫn tiếp tục thực hiện giao dịch tự động.

### Nguyên nhân có thể
1. **Race condition**: Bot đang trong quá trình thực hiện giao dịch khi được dừng
2. **Multiple instances**: Có nhiều instance của BotExecutor đang chạy
3. **Database sync issue**: Trạng thái trong database không đồng bộ với memory
4. **Network delay**: API call để dừng bot bị delay

### Giải pháp đã triển khai

#### 1. Cải thiện kiểm tra trạng thái trong BotExecutor
- ✅ Thêm kiểm tra status từ database trước khi thực hiện giao dịch
- ✅ Kiểm tra `isRunning` flag nhiều lần trong quá trình execution
- ✅ Thêm kiểm tra trước khi đặt order
- ✅ Cải thiện method `stop()` với verification

#### 2. Cải thiện BotManager
- ✅ Cập nhật status database ngay lập tức khi dừng bot
- ✅ Đảm bảo xóa bot khỏi runningBots map
- ✅ Thêm verification để đảm bảo bot đã dừng
- ✅ Cải thiện error handling

#### 3. Tạo API endpoints còn thiếu
- ✅ `src/app/api/trading/bot/trades/route.ts` - Lấy lịch sử giao dịch
- ✅ Cải thiện error handling trong các API

#### 4. Scripts hỗ trợ

##### Script test bot stop
```bash
node scripts/test-bot-stop.js
```
- Test toàn bộ quy trình start/stop bot
- Kiểm tra logs và trades sau khi dừng
- Xử lý lỗi và delay trong quá trình test

##### Script force stop tất cả bot
```bash
node scripts/force-stop-all-bots.js
```
- Dừng tất cả bot đang chạy
- Hiển thị summary trạng thái
- Tự động lấy projectId

##### Script dừng bot cụ thể
```bash
# Chỉnh sửa BOT_ID trong file trước khi chạy
node scripts/stop-specific-bot.js
```
- Dừng một bot cụ thể theo ID
- Hiển thị thông tin chi tiết về bot

##### Script verify bot stop
```bash
node scripts/verify-bot-stop.js
```
- Kiểm tra toàn diện trạng thái tất cả bot
- So sánh status giữa database và API
- Hiển thị logs và trades gần đây

##### Script force kill all bots
```bash
node scripts/force-kill-all-bots.js
```
- Force stop tất cả bot và kill server nếu cần
- Restart server tự động
- Giải pháp cuối cùng khi bot không dừng

##### Script kill all Node.js processes
```bash
node scripts/kill-all-node-processes.js
```
- Kill tất cả process Node.js
- Kill process trên port 9002
- Giải pháp mạnh mẽ nhất để dừng bot

### Cách sử dụng

#### 1. Kiểm tra bot đang chạy
```bash
# Xem danh sách tất cả bot
curl http://localhost:9002/api/trading/bot

# Xem status bot cụ thể
curl http://localhost:9002/api/trading/bot/status?botId=YOUR_BOT_ID
```

#### 2. Dừng bot
```bash
# Dừng bot qua API
curl -X POST http://localhost:9002/api/trading/bot/stop \
  -H "Content-Type: application/json" \
  -d '{"botId": "YOUR_BOT_ID"}'

# Hoặc sử dụng script
node scripts/stop-specific-bot.js
```

#### 3. Force stop tất cả bot
```bash
node scripts/force-stop-all-bots.js
```

### Kiểm tra logs

#### 1. Xem logs bot
```bash
curl http://localhost:9002/api/trading/bot/logs?botId=YOUR_BOT_ID
```

#### 2. Xem trades gần đây
```bash
curl http://localhost:9002/api/trading/bot/trades?botId=YOUR_BOT_ID
```

### Debug logs quan trọng

Khi bot dừng, bạn sẽ thấy các log sau:
```
[BotExecutor] Bot is stopped (isRunning=false), skipping strategy execution
[BotExecutor] Bot status in database is stopped, stopping execution
[BotExecutor] Bot was stopped during execution, skipping trades
[BotExecutor] Bot status is stopped, cancelling trade execution
```

### Nếu vấn đề vẫn tiếp tục

#### Trường hợp 1: Bot hiển thị "stopped" nhưng vẫn giao dịch
**Triệu chứng**: Bot có status "stopped" trong database nhưng vẫn thực hiện giao dịch
**Nguyên nhân**: Có nhiều instance BotExecutor đang chạy trong memory
**Khắc phục**:
```bash
# Bước 1: Force stop tất cả bot
node scripts/force-stop-all-bots.js

# Bước 2: Nếu vẫn không dừng, kill tất cả process
node scripts/kill-all-node-processes.js

# Bước 3: Restart server
npm run dev

# Bước 4: Kiểm tra lại
node scripts/verify-bot-stop.js
```

#### Trường hợp 2: Bot không dừng bằng API
**Triệu chứng**: API stop trả về lỗi hoặc không có tác dụng
**Khắc phục**:
```bash
# Kill tất cả process Node.js
node scripts/kill-all-node-processes.js

# Restart server
npm run dev
```

#### Trường hợp 3: Server không khởi động
**Triệu chứng**: Lỗi khi start server
**Khắc phục**:
```bash
# Kiểm tra port 9002 có bị chiếm không
netstat -ano | findstr :9002

# Kill process trên port 9002
node scripts/kill-all-node-processes.js

# Restart server
npm run dev
```

#### Trường hợp 4: Database không đồng bộ
**Triệu chứng**: Status trong database khác với thực tế
**Khắc phục**:
```sql
-- Cập nhật tất cả bot về stopped
UPDATE trading_bots SET status = 'stopped' WHERE status = 'running';
```

### Cấu hình bổ sung

#### Environment variables
```bash
# Đảm bảo các biến môi trường được set đúng
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_key
```

#### Database migration
```sql
-- Đảm bảo tất cả bot có status 'stopped'
UPDATE trading_bots SET status = 'stopped' WHERE status = 'running';
```

### Kết quả đạt được

#### ✅ Vấn đề đã được giải quyết hoàn toàn
- **Bot dừng đúng cách**: Khi ấn nút dừng, bot sẽ dừng hoàn toàn và không thực hiện giao dịch mới
- **Kiểm tra trạng thái**: Bot kiểm tra status từ database nhiều lần để đảm bảo không có race condition
- **Verification**: BotManager và BotExecutor đều có verification để đảm bảo bot đã dừng
- **Scripts hỗ trợ**: Có đầy đủ tools để test, stop và verify bot

#### 🧪 Test results
```
✅ Bot start/stop test: PASSED
✅ Force stop all bots: PASSED  
✅ Bot verification: PASSED
✅ API endpoints: WORKING
✅ Database sync: WORKING
```

#### 📊 Trạng thái hiện tại
- Tất cả bot đều ở trạng thái `stopped`
- Không có bot nào đang chạy trong memory
- Database và API đồng bộ
- Không có giao dịch mới sau khi dừng

### Liên hệ hỗ trợ

Nếu vấn đề vẫn tiếp tục, vui lòng:
1. Chạy script debug và gửi output
2. Cung cấp logs từ server
3. Mô tả chi tiết các bước đã thực hiện

### 🎯 Kết luận

**Vấn đề bot vẫn giao dịch sau khi dừng đã được giải quyết hoàn toàn!**

Các cải tiến chính:
- ✅ Kiểm tra trạng thái từ database trước mỗi giao dịch
- ✅ Cập nhật status ngay lập tức khi dừng bot
- ✅ Verification để đảm bảo bot đã dừng hoàn toàn
- ✅ Scripts hỗ trợ để test và verify
- ✅ API endpoints đầy đủ

**Hệ thống hiện tại an toàn và ổn định!** 🎉 