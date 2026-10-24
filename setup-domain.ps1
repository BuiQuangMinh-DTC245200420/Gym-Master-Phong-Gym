# ========================================================
# SCRIPT CẤU HÌNH TÊN MIỀN TỰ CHỌN CHO PHÒNG GYM
# Tên miền truy cập: https://gymmaster.local hoặc http://gymmaster.local
# ========================================================

# Tự động yêu cầu quyền Administrator nếu chưa có
if (-not ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Host "[INFO] Yêu cầu quyền Administrator để chỉnh sửa file hosts..." -ForegroundColor Yellow
    Start-Process powershell.exe -ArgumentList ("-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"") -Verb RunAs
    exit
}

$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$domains = @("gymmaster.local", "gym.local")
$content = Get-Content -Path $hostsPath -Raw -ErrorAction Stop

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  CẤU HÌNH TÊN MIỀN TRUY CẬP CHUYÊN NGHIỆP GYM MASTER" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

$added = $false
foreach ($domain in $domains) {
    if ($content -notmatch "\b$([regex]::Escape($domain))\b") {
        Add-Content -Path $hostsPath -Value "`n127.0.0.1 $domain"
        Write-Host "[OK] Đã thêm tên miền: $domain -> 127.0.0.1" -ForegroundColor Green
        $added = $true
    } else {
        Write-Host "[INFO] Tên miền $domain đã tồn tại trong file hosts." -ForegroundColor Gray
    }
}

# Cài đặt chứng chỉ SSL vào Trusted Root Store để trình duyệt tin cậy
$certPath = Join-Path $PSScriptRoot "nginx\ssl\nginx.crt"
if (Test-Path $certPath) {
    Write-Host "[INFO] Đang cài đặt chứng chỉ SSL vào Windows Trusted Root..." -ForegroundColor Yellow
    certutil -addstore -f "Root" $certPath | Out-Null
    Write-Host "[OK] Đã tin cậy chứng chỉ SSL trên Windows!" -ForegroundColor Green
}

# Làm mới bộ nhớ đệm DNS
Write-Host "[INFO] Đang làm mới bộ đệm DNS hệ thống..." -ForegroundColor Yellow
ipconfig /flushdns | Out-Null

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " CẤU HÌNH THÀNH CÔNG!" -ForegroundColor Green
Write-Host " Giờ bạn có thể mở trực tiếp hệ thống tại:" -ForegroundColor White
Write-Host " 👉 https://gymmaster.local" -ForegroundColor Cyan
Write-Host " 👉 http://gymmaster.local (sẽ tự động chuyển hướng bảo mật HTTPS)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Green

# Mở trình duyệt truy cập ngay
Start-Process "https://gymmaster.local"
Start-Sleep -Seconds 3
