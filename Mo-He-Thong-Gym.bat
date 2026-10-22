@echo off
chcp 65001 >nul
title Khởi Động Hệ Thống Quản Lý Phòng Gym - Gym Master

echo ==========================================================
echo    ĐANG KHỞI CHẠY HỆ THỐNG QUẢN LÝ PHÒNG GYM (GYM MASTER)
echo ==========================================================
echo.
echo [1/2] Đang khởi động các dịch vụ Docker Containers...
docker compose up -d
echo.
echo [2/2] Đang mở trình duyệt vào hệ thống...
timeout /t 2 >nul
start https://gymmaster.localtest.me
echo.
echo ==========================================================
echo    ✅ HỆ THỐNG ĐÃ SẴN SÀNG HOẠT ĐỘNG!
echo    👉 Địa chỉ Web App: https://gymmaster.localtest.me
echo    👉 Hoặc truy cập:   https://localhost
echo    👉 Quản trị DB:     http://localhost:8080
echo    👉 Giám sát:        http://localhost:3001
echo ==========================================================
echo Cửa sổ này sẽ tự đóng sau 5 giây...
timeout /t 5 >nul
exit /b
