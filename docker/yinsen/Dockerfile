# Base image sử dụng Node.js 20
FROM node:20-alpine AS builder

# Đặt tên cho container
LABEL name="yinsen-btc-trading"
LABEL description="Container YINSEN cho giao dịch BTC/USDT - Giống JARVIS của Iron Man"

# Cài đặt các phụ thuộc cần thiết
RUN apk add --no-cache python3 py3-pip build-base

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép package.json và package-lock.json
COPY package*.json ./
COPY requirements.txt ./

# Cài đặt các phụ thuộc Node.js
RUN npm ci

# Sao chép mã nguồn
COPY . .

# Đảm bảo thư mục public tồn tại để tránh lỗi COPY ở runtime stage
RUN mkdir -p public

# Build ứng dụng Next.js
RUN npm run build

# Cài đặt các phụ thuộc Python cho các mô hình ML
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime image
FROM node:20-alpine

# Cài đặt các phụ thuộc runtime
RUN apk add --no-cache python3 py3-pip

# Tạo thư mục làm việc
WORKDIR /app

# Sao chép từ stage builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
# Sao chép thư mục public đã được tạo ở build stage (nếu có)
COPY --from=builder /app/public ./public
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/next.config.mjs ./
COPY --from=builder /app/requirements.txt ./
COPY --from=builder /app/scripts ./scripts
COPY --from=builder /app/killport.js ./
COPY --from=builder /app/fix-recvWindow.js ./

# Cài đặt các phụ thuộc Python cần thiết cho runtime
RUN python3 -m pip install --no-cache-dir -r requirements.txt

# Thiết lập biến môi trường
ENV PORT 9002
ENV NODE_ENV=production

# Mở cổng
EXPOSE 9002

# Tạo script khởi động
RUN echo '#!/bin/sh\nnode killport.js && node .next/server/server.js' > /app/start.sh && \
    chmod +x /app/start.sh

# Thiết lập khởi động
CMD ["/app/start.sh"] 