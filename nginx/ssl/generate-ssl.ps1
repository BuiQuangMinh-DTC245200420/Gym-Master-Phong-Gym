# Script sinh chứng chỉ SSL tự ký cho môi trường thử nghiệm Nginx HTTPS
param(
    [string]$Domain = "localhost",
    [int]$Days = 365
)

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$certPath = Join-Path $scriptDir "nginx.crt"
$keyPath = Join-Path $scriptDir "nginx.key"

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "Sinh chứng chỉ SSL tự ký cho Nginx ($Domain)" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Kiểm tra openssl trên máy
$opensslCmd = Get-Command openssl -ErrorAction SilentlyContinue

if ($opensslCmd) {
    Write-Host "[INFO] Sử dụng OpenSSL trên hệ thống: $($opensslCmd.Source)" -ForegroundColor Green
    & openssl req -x509 -nodes -days $Days -newkey rsa:2048 -keyout $keyPath -out $certPath -subj "/CN=$Domain"
} else {
    Write-Host "[INFO] Không tìm thấy OpenSSL trên hệ thống. Đang sử dụng Docker alpine/openssl để tạo..." -ForegroundColor Yellow
    docker run --rm -v "${scriptDir}:/ssl" alpine/openssl req -x509 -nodes -days $Days -newkey rsa:2048 -keyout /ssl/nginx.key -out /ssl/nginx.crt -subj "/CN=$Domain"
}

if ((Test-Path $certPath) -and (Test-Path $keyPath)) {
    Write-Host "[SUCCESS] Đã tạo thành công nginx.crt và nginx.key!" -ForegroundColor Green
} else {
    Write-Host "[ERROR] Không thể tạo chứng chỉ SSL. Vui lòng kiểm tra lại Docker hoặc cài đặt OpenSSL." -ForegroundColor Red
}
