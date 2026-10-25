@echo off
chcp 65001 >nul
title Cài Đặt Tin Cậy Chứng Chỉ SSL Cho Hệ Thống Gym Master

echo ==========================================================
echo    CÀI ĐẶT CHỨNG CHỈ SSL VÀO WINDOWS TRUSTED ROOT
echo ==========================================================
echo.
echo Đang yêu cầu quyền Administrator để cài chứng chỉ...

net session >nul 2>&1
if %errorlevel% neq 0 (
    echo [INFO] Đang chuyển sang quyền Quản trị viên (Admin)...
    powershell -Command "Start-Process cmd -ArgumentList '/c \"\"%~f0\"\"' -Verb RunAs"
    exit /b
)

cd /d "%~dp0"

echo [1/2] Đang cài đặt chứng chỉ nginx\ssl\nginx.crt vào Windows Root Store...
certutil -addstore -f "Root" "nginx\ssl\nginx.crt"

echo.
echo ==========================================================
echo    ✅ ĐÃ CÀI ĐẶT THÀNH CÔNG CHỨNG CHỈ SSL!
echo    Trình duyệt Chrome / Edge giờ đã công nhận hệ thống là BẢO MẬT.
echo.
echo    👉 BƯỚC TIẾP THEO:
echo    1. Hãy TẮT HẲN trình duyệt Chrome/Edge và mở lại.
echo    2. Truy cập vào: https://gymmaster.localtest.me
echo       hoặc:          https://localhost
echo ==========================================================
echo.
pause
