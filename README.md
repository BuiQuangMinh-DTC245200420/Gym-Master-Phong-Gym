# HỆ THỐNG QUẢN LÝ PHÒNG GYM / FITNESS (GYM MASTER)
> **Môn học**: Triển khai và Quản trị Hệ thống Phần mềm  
> **Đề tài số 23**: Hệ thống Quản lý Phòng Gym / Fitness  
> **Kiến trúc triển khai**: Docker Compose, Nginx Reverse Proxy (HTTPS), Prometheus + Grafana, Loki + Promtail, MySQL 8.0, Node.js Express.

---

## 📌 1. Giới thiệu Dự án
Hệ thống giải quyết bài toán quản lý phòng tập Gym từ quy trình thủ công sang tự động hóa toàn diện:
- **Quản lý Hội viên & Thẻ tập**: Theo dõi thông tin hội viên, ngày đăng ký, ngày hết hạn gói tập.
- **Quầy Điểm danh Thông minh**: Tự động xác thực trạng thái gói tập khi hội viên check-in; từ chối và cảnh báo ngay lập tức nếu gói hết hạn.
- **Quản lý Gói tập & Dịch vụ**: Hỗ trợ đăng ký các gói tập tự do và kèm riêng HLV cá nhân (PT).
- **Quản lý Huấn luyện viên & Lịch tập PT**: Thuật toán xếp lịch và ngăn chặn 100% tình trạng trùng lịch hẹn của PT.
- **Hóa đơn & Doanh thu**: Lưu trữ lịch sử thanh toán, phương thức thanh toán và tổng hợp doanh thu.
- **Phân quyền 5 nhóm vai trò**: `ADMIN`, `OWNER`, `RECEPTIONIST`, `TRAINER`, `CUSTOMER`.

---

## 🏗️ 2. Kiến trúc Hệ thống & Danh sách Container (Docker Stack)

| Tên Dịch vụ | Container Name | Image / Base | Cổng nội bộ | Cổng Public | Chức năng chính |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Nginx** | `gym_nginx_proxy` | `nginx:alpine` | 80, 443 | `80`, `443` | Reverse Proxy, SSL HTTPS, Security Headers |
| **Web App** | `gym_web_app` | `Node.js 20 Alpine` | 3000 | Nội bộ | Ứng dụng quản trị phòng Gym (Non-root user) |
| **MySQL** | `gym_mysql_db` | `mysql:8.0` | 3306 | Nội bộ | Lưu trữ CSDL quan hệ (Cô lập trong backend) |
| **phpMyAdmin** | `gym_phpmyadmin` | `phpmyadmin` | 80 | `8080` | Giao diện đồ họa quản lý CSDL |
| **mysqld_exporter** | `gym_mysqld_exporter` | `prom/mysqld-exporter` | 9104 | Nội bộ | Thu thập MySQL Metrics cho Prometheus |
| **nginx_exporter** | `gym_nginx_exporter` | `nginx/nginx-prometheus-exporter` | 9113 | Nội bộ | Thu thập Nginx Metrics cho Prometheus |
| **cAdvisor** | `gym_cadvisor` | `gcr.io/cadvisor/cadvisor` | 8080 | Nội bộ | Thu thập Docker Container Metrics |
| **Prometheus** | `gym_prometheus` | `prom/prometheus` | 9090 | `9090` | Thu thập chỉ số hiệu năng (Metrics) |
| **Grafana** | `gym_grafana` | `grafana/grafana` | 3000 | `3001` | Dashboard trực quan hóa giám sát hệ thống |
| **Loki** | `gym_loki` | `grafana/loki` | 3100 | Nội bộ | Lưu trữ và xử lý log tập trung |
| **Promtail** | `gym_promtail` | `grafana/promtail` | - | Nội bộ | Thu thập log container gửi về Loki |

---

## 🛡️ 3. Các biện pháp Hardening Bảo mật đã áp dụng
1. **Non-root Container**: Đóng gói Web App chạy dưới quyền user thông thường `node` (UID:GID 1000:1000), loại bỏ nguy cơ chiếm quyền root container.
2. **Network Isolation**: Phân tách 3 mạng Docker Bridge độc lập:
   - `gym_frontend`: Nginx giao tiếp với Web App và phpMyAdmin.
   - `gym_backend`: Web App giao tiếp với MySQL. Cơ sở dữ liệu MySQL không public port ra ngoài Internet.
   - `gym_monitoring`: Prometheus, Grafana, Loki, các Exporter giao tiếp nội bộ.
3. **Nginx Security Headers**:
   - `server_tokens off;` (Ẩn số phiên bản Nginx phòng chống quét lỗ hổng).
   - `X-Frame-Options: SAMEORIGIN` (Chống Clickjacking).
   - `X-Content-Type-Options: nosniff` (Chống MIME-type sniffing).
   - `Strict-Transport-Security: max-age=31536000` (Ép buộc HTTPS).
4. **Bảo mật Biến môi trường**: Mật khẩu root và database được lưu trong file `.env`, không hardcode vào mã nguồn và được loại trừ trong `.gitignore`.
5. **Bảo mật File cấu hình nhạy cảm**: File `database/.my.cnf` (chứa thông tin MySQL Exporter) được loại trừ khỏi Git trong `.gitignore`.

---

## 🚀 4. Hướng dẫn Khởi chạy Hệ thống

### ⚡ Cách 1: Khởi chạy Nhanh Nhất (1-Click trên Windows - Khuyên Dùng Khi Báo Cáo / Chấm Thi)
Chỉ cần mở thư mục dự án và **Click đúp vào file:**
👉 **`Mo-He-Thong-Gym.bat`**

> **Tự động hóa 100%:** File script sẽ tự động kiểm tra, khởi động toàn bộ 11 container Docker trong nền và tự động mở trình duyệt web vào hệ thống tại: **`https://gymmaster.localtest.me`** (hoặc `https://localhost`).

---

### 💻 Cách 2: Khởi chạy bằng Lệnh Terminal (Dành cho Mọi Hệ Điều Hành)

#### 🔹 Bước 1: Khởi chạy toàn bộ hệ thống
Mở Terminal / PowerShell tại thư mục dự án và chạy:
```bash
docker compose up -d
```
*(Nếu là lần đầu tiên chạy trên máy mới, thêm cờ `--build`: `docker compose up -d --build`)*

#### 🔹 Bước 2: Kiểm tra trạng thái các dịch vụ
```bash
docker compose ps
```
> Đảm bảo toàn bộ **11 container** đều hiển thị trạng thái `Up` (hoặc `Up (healthy)`).

#### 🔹 Bước 3: Mở trình duyệt và trải nghiệm
Truy cập hệ thống qua một trong hai địa chỉ:
- Tên miền: **[https://gymmaster.localtest.me](https://gymmaster.localtest.me)**
- Hoặc IP Local: **[https://localhost](https://localhost)**

---

### ⚙️ Hướng dẫn Chuẩn bị Môi trường (Chỉ cần làm 1 lần khi Clone sang Máy Mới)
Nếu bạn vừa tải/clone dự án về máy tính mới tinh, hãy thực hiện các bước chuẩn bị sau:

1. **Tạo file cấu hình môi trường `.env`:**
   ```bash
   cp .env.example .env
   ```
2. **Tạo chứng chỉ SSL cho Nginx (Chạy 1 trong 2 cách):**
   - *Trên Windows (PowerShell):*
     ```powershell
     .\nginx\ssl\generate-ssl.ps1
     ```
   - *Trên Linux / macOS / Git Bash:*
     ```bash
     chmod +x ./nginx/ssl/generate-ssl.sh && ./nginx/ssl/generate-ssl.sh
     ```
3. **Tạo file xác thực MySQL Exporter (`database/.my.cnf`):**
   ```ini
   [client]
   user=root
   password=26/09/2006
   host=db
   port=3306
   ```

---

## 🌐 5. Địa chỉ Truy cập Dịch vụ

| Dịch vụ | Địa chỉ URL | Thông tin đăng nhập | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Website Phòng Gym (Tên miền)** | **https://gymmaster.localtest.me** | *(Xem danh sách tài khoản mục 6)* | Tên miền tự phân giải loopback |
| **Website Phòng Gym (Localhost)** | **https://localhost** | *(Xem danh sách tài khoản mục 6)* | Chấp nhận cảnh báo SSL tự ký |
| **Website Phòng Gym (HTTP)** | **http://localhost** | - | Tự động chuyển hướng (Redirect 301) về HTTPS |
| **Quản trị Database phpMyAdmin** | **http://localhost:8080** | User: `root`<br>Pass: `26/09/2006` *(hoặc pass trong .env)* | Quản trị dữ liệu CSDL MySQL |
| **Prometheus Targets & Metrics** | **http://localhost:9090** | - | Kiểm tra trạng thái 5 targets thu thập |
| **Grafana Dashboard Giám sát** | **http://localhost:3001** | User: `admin`<br>Pass: `26/09/2006` *(hoặc `admin`)* | Trực quan hóa Metrics & LogQL |

---

## 🔑 6. Danh sách Tài khoản Kiểm thử (Tất cả mật khẩu mặc định: 123456)

| Tên đăng nhập | Vai trò | Tên người dùng | Mục đích kiểm thử |
| :--- | :--- | :--- | :--- |
| `admin` | **ADMIN** | Quản trị viên Hệ thống | Toàn quyền cấu hình, tài khoản và hệ thống |
| `owner` | **OWNER** | Nguyễn Chủ Phòng Gym | Xem báo cáo doanh thu, quản lý gói tập và giá |
| `letan` | **RECEPTIONIST** | Trần Thị Lễ Tân | Quầy điểm danh, tạo hội viên, thu tiền hóa đơn |
| `trainer1` | **TRAINER** | Lê HLV Thể Hình (PT) | Xem lịch dạy cá nhân, xác nhận buổi tập |
| `customer1` | **CUSTOMER** | Nguyễn Văn Hội Viên A | Hội viên có gói tập **còn hạn** (điểm danh hợp lệ) |
| `customer2` | **CUSTOMER** | Hoàng Thị Hội Viên B | Hội viên có gói tập **hết hạn** (kiểm thử từ chối điểm danh) |

---

## 📊 7. Hệ thống Giám sát & Log (Prometheus + Grafana + Loki)

### Prometheus Targets (5 targets giám sát):
| Job Name | Target | Dữ liệu thu thập |
| :--- | :--- | :--- |
| `gym-web-app` | `app:3000/metrics` | HTTP requests, latency, Node.js heap, active sessions |
| `gym-mysql-db` | `mysqld_exporter:9104` | MySQL queries, connections, slow queries, InnoDB |
| `gym-nginx-proxy` | `nginx_exporter:9113` | Nginx connections, active/waiting/reading/writing |
| `gym-cadvisor` | `cadvisor:8080` | Docker container CPU, RAM, network I/O |
| `prometheus` | `localhost:9090` | Prometheus self-monitoring |

### Grafana Dashboards (3 dashboards):
- **Gym Master - Giám sát Ứng dụng Web & Nginx**: HTTP requests rate, P50/P95/P99 latency, traffic by route, Nginx connections.
- **Gym Master - Giám sát Cơ sở dữ liệu MySQL**: QPS, connections, slow queries, InnoDB buffer pool, SQL command frequency.
- **Gym Master - Giám sát Docker Containers & Hạ tầng**: CPU%, RAM, network RX/TX của từng container.

### Truy vấn LogQL mẫu (Loki - Grafana Explore):
```logql
# Xem tất cả log của Web App
{container="gym_web_app"}

# Lọc log lỗi HTTP 5xx
{container="gym_web_app"} |= "500"

# Lọc log đăng nhập thất bại
{container="gym_web_app"} |= "POST /login"

# Xem log Nginx access
{container="gym_nginx_proxy"}

# Đếm số lượng log lỗi mỗi phút
count_over_time({container="gym_web_app"} |= "ERROR" [1m])
```

---

## 📝 8. Lịch sử Commit theo Quy định Đề tài
- **Commit 1**: Triển khai ứng dụng Gym Web App, MySQL Database, phpMyAdmin và cấu hình Nginx Reverse Proxy (HTTPS + Security Headers).
- **Commit 2**: Tích hợp hệ thống giám sát Prometheus và Grafana Dashboard giám sát container, web server và database (cAdvisor, mysqld_exporter, nginx_exporter).
- **Commit 3**: Triển khai hệ thống log tập trung Loki + Promtail, truy vấn log LogQL và tài liệu kiểm thử log.
- **Các Commit tiếp theo**: Áp dụng các giải pháp Hardening bảo mật nâng cao (Network Isolation 3 phân vùng mạng, non-root user node, bảo vệ secret credentials và SSL private key).
## 📝 9. Kết quả kiểm thử Loki + Promtail + LogQL

Đã kiểm thử trên môi trường Docker Compose:

- **Thu thập log:** Promtail phát hiện các Docker container được cấu hình và gửi log đến Loki.
- **Truy vấn log ứng dụng:** `{container="gym_web_app"}` — trả về log của Web App.
- **Lọc log đăng nhập:** `{container="gym_web_app"} |= "login"` — trả về các dòng log có chứa chuỗi `login`.
- **Lọc log mã lỗi HTTP 500:** `{container="gym_web_app"} |= "500"` — dùng để tìm các dòng log chứa chuỗi `500`; kết quả phụ thuộc vào log phát sinh tại thời điểm truy vấn.
- **Truy vấn log Nginx:** `{container="gym_nginx_proxy"}` — dùng để xem log của Nginx Reverse Proxy.
- **Thống kê log lỗi:** `count_over_time({container="gym_web_app"} |= "ERROR" [1m])` — đếm số dòng log chứa `ERROR` trong khoảng thời gian một phút.

Các truy vấn được thực hiện trong Grafana Explore với Loki làm nguồn dữ liệu.
