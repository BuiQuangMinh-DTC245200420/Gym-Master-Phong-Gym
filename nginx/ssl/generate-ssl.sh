#!/bin/sh
# Script sinh chứng chỉ SSL tự ký cho Nginx (Linux / macOS / Git Bash)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DOMAIN="localhost"
DAYS=365

echo "=========================================="
echo "Sinh chứng chỉ SSL tự ký cho Nginx ($DOMAIN)"
echo "=========================================="

if command -v openssl >/dev/null 2>&1; then
    echo "[INFO] Sử dụng openssl trên hệ thống..."
    openssl req -x509 -nodes -days $DAYS -newkey rsa:2048 \
        -keyout "$SCRIPT_DIR/nginx.key" \
        -out "$SCRIPT_DIR/nginx.crt" \
        -subj "/CN=$DOMAIN"
else
    echo "[INFO] Không tìm thấy openssl, sử dụng docker alpine/openssl..."
    docker run --rm -v "$SCRIPT_DIR:/ssl" alpine/openssl req -x509 -nodes -days $DAYS -newkey rsa:2048 \
        -keyout /ssl/nginx.key \
        -out /ssl/nginx.crt \
        -subj "/CN=$DOMAIN"
fi

if [ -f "$SCRIPT_DIR/nginx.key" ] && [ -f "$SCRIPT_DIR/nginx.crt" ]; then
    echo "[SUCCESS] Đã tạo thành công nginx.crt và nginx.key!"
else
    echo "[ERROR] Lỗi khi tạo chứng chỉ SSL!"
    exit 1
fi
