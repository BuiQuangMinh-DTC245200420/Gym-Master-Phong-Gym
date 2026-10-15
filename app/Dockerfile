# Sử dụng bản Node.js Alpine gọn nhẹ và an toàn
FROM node:20-alpine AS base

# Đặt thư mục làm việc
WORKDIR /app

# Thiết lập biến môi trường production
ENV NODE_ENV=production
ENV PORT=3000

# Copy file định nghĩa phụ thuộc
COPY package*.json ./

# Cài đặt các gói phụ thuộc gọn gàng (bỏ devDependencies)
RUN npm install --omit=dev && npm cache clean --force

# Copy toàn bộ mã nguồn ứng dụng
COPY . .

# HARDENING BẢO MẬT: Chuyển quyền sở hữu cho user không phải root (non-root)
RUN chown -R node:node /app

# Chuyển sang user 'node' (non-root) để chạy container
USER node

# Khai báo cổng
EXPOSE 3000

# Health check định kỳ để kiểm tra container còn sống không
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O - http://127.0.0.1:3000/health || exit 1

# Lệnh khởi chạy ứng dụng
CMD ["node", "src/server.js"]
