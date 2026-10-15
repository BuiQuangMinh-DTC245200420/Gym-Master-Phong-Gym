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
| **Prometheus** | `gym_prometheus` | `prom/prometheus` | 9090 | `9090` | Thu thập chỉ số hiệu năng (Metrics) |
| **Grafana** | `gym_grafana` | `grafana/grafana` | 3000 | `3001` | Dashboard trực quan hóa giám sát hệ thống |
| **Loki** | `gym_loki` | `grafana/loki` | 3100 | Nội bộ | Lưu trữ và xử lý log tập trung |
| **Promtail** | `gym_promtail` | `grafana/promtail` | - | Nội bộ | Thu thập log container gửi về Loki |

---

## 🛡️ 3. Các biện pháp Hardening Bảo mật đã áp dụng
1. **Non-root Container**: Đóng gói Web App chạy dưới quyền user thông thường `node` (UID:GID 1000:1000), loại bỏ nguy cơ chiếm quyền root container.
2. **Network Isolation**: Phân tách 2 mạng Docker Bridge độc lập:
   - `gym_frontend`: Nginx giao tiếp với Web App và phpMyAdmin.
   - `gym_backend`: Web App giao tiếp với MySQL. Cơ sở dữ liệu MySQL không public port ra ngoài Internet.
3. **Nginx Security Headers**:
   - `server_tokens off;` (Ẩn số phiên bản Nginx phòng chống quét lỗ hổng).
   - `X-Frame-Options: SAMEORIGIN` (Chống Clickjacking).
   - `X-Content-Type-Options: nosniff` (Chống MIME-type sniffing).
   - `Strict-Transport-Security: max-age=31536000` (Ép buộc HTTPS).
4. **Bảo mật Biến môi trường**: Mật khẩu root và database được lưu trong file `.env`, không hardcode vào mã nguồn và được loại trừ trong `.gitignore`.

---

## 🚀 4. Hướng dẫn Khởi chạy Hệ thống

### Yêu cầu cài đặt trước:
- **Docker Desktop** (bản 20.x trở lên) và **Docker Compose**
- **Git**

### Bước 1: Clone dự án và cấu hình biến môi trường
```bash
git clone <URL_REPOSITORY_GITHUB_CUA_BAN>
cd "Phát triển phần mềm-Phòng Gym"
```
Tạo file `.env` từ file mẫu:
```bash
cp .env.example .env
```

### Bước 2: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```

### Bước 3: Kiểm tra trạng thái các container
```bash
docker compose ps
```
Đảm bảo tất cả các container đều ở trạng thái `running` (hoặc `healthy`).

---

## 🌐 5. Địa chỉ Truy cập Dịch vụ

| Dịch vụ | Địa chỉ URL | Ghi chú |
| :--- | :--- | :--- |
| **Website Phòng Gym (HTTPS)** | **https://localhost** | Chấp nhận cảnh báo SSL tự ký để vào web |
| **Website Phòng Gym (HTTP)** | **http://localhost** | Tự động chuyển hướng (Redirect 301) về HTTPS |
| **Quản trị Database phpMyAdmin** | **http://localhost:8080** | Đăng nhập: `root` / `gym_root_secure_2026!` |
| **Prometheus Targets & Metrics** | **http://localhost:9090** | Xem các target giám sát hệ thống |
| **Grafana Monitoring Dashboard** | **http://localhost:3001** | Đăng nhập: `admin` / `admin` |

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

## 📝 7. Lịch sử Commit theo Quy định Đề tài
- **Commit 1**: Triển khai ứng dụng Gym Web App, MySQL Database, phpMyAdmin và cấu hình Nginx Reverse Proxy (HTTPS + Security Headers).
- **Commit 2**: Tích hợp hệ thống giám sát Prometheus và Grafana Dashboard giám sát container, web server và database.
- **Commit 3**: Tích hợp hệ thống log tập trung Loki + Promtail, truy vấn log LogQL và áp dụng các giải pháp Hardening bảo mật.
