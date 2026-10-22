-- ========================================================
-- DATABASE SCHEMA: HỆ THỐNG QUẢN LÝ PHÒNG GYM / FITNESS
-- Đề tài 23 - Môn Triển khai và Quản trị Hệ thống Phần mềm
-- ========================================================

SET NAMES utf8mb4;
SET CHARACTER SET utf8mb4;

CREATE DATABASE IF NOT EXISTS gym_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gym_db;

-- 1. Bảng USERS (Phân quyền 5 vai trò: ADMIN, OWNER, RECEPTIONIST, TRAINER, CUSTOMER)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    role ENUM('ADMIN', 'OWNER', 'RECEPTIONIST', 'TRAINER', 'CUSTOMER') NOT NULL DEFAULT 'CUSTOMER',
    avatar_url VARCHAR(255) DEFAULT '/images/default-avatar.png',
    status ENUM('ACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- 2. Bảng GÓI TẬP (PACKAGES)
CREATE TABLE IF NOT EXISTS packages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    duration_days INT NOT NULL COMMENT 'Thời hạn tính theo ngày (30, 90, 365...)',
    price DECIMAL(12, 2) NOT NULL,
    pt_sessions INT NOT NULL DEFAULT 0 COMMENT 'Số buổi kèm HLV cá nhân',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Bảng ĐĂNG KÝ HỘI VIÊN / GÓI TẬP (MEMBERSHIPS)
CREATE TABLE IF NOT EXISTS memberships (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    remaining_pt_sessions INT NOT NULL DEFAULT 0,
    status ENUM('ACTIVE', 'EXPIRED', 'PENDING_PAYMENT') NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- 4. Bảng THÔNG TIN HUẤN LUYỆN VIÊN (TRAINERS)
CREATE TABLE IF NOT EXISTS trainers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL UNIQUE,
    specialty VARCHAR(150) NOT NULL COMMENT 'Chuyên môn: Gym, Thể hình, Cardio, Yoga...',
    bio TEXT,
    experience_years INT DEFAULT 1,
    rating_avg DECIMAL(3, 2) DEFAULT 5.00,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Bảng LỊCH TẬP VỚI PT (SCHEDULES) - Có ràng buộc chống trùng lịch
CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    trainer_id INT NOT NULL,
    schedule_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status ENUM('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE CASCADE
);

-- 6. Bảng ĐIỂM DANH CHECK-IN / CHECK-OUT (ATTENDANCE)
CREATE TABLE IF NOT EXISTS attendance (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    package_id INT NULL,
    check_in_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    check_out_time DATETIME NULL,
    status ENUM('VALID', 'EXPIRED_DENIED') NOT NULL DEFAULT 'VALID',
    note VARCHAR(255) NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Bảng HÓA ĐƠN & THANH TOÁN (INVOICES)
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_code VARCHAR(30) NOT NULL UNIQUE,
    user_id INT NOT NULL,
    package_id INT NOT NULL,
    amount DECIMAL(12, 2) NOT NULL,
    payment_method ENUM('CASH', 'BANK_TRANSFER', 'MOMO', 'VNPAY') NOT NULL DEFAULT 'CASH',
    payment_status ENUM('PAID', 'UNPAID') NOT NULL DEFAULT 'PAID',
    cashier_id INT NULL COMMENT 'Lễ tân / Nhân viên thu tiền',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

-- 8. Bảng ĐÁNH GIÁ & PHẢN HỒI (FEEDBACKS)
CREATE TABLE IF NOT EXISTS feedbacks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    trainer_id INT NULL,
    rating TINYINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (trainer_id) REFERENCES trainers(id) ON DELETE SET NULL
);

-- ========================================================
-- DỮ LIỆU MẪU BAN ĐẦU (SEED DATA)
-- Mật khẩu mặc định cho tất cả tài khoản test: 123456
-- Chuỗi hash bcrypt của '123456': $2a$10$wT8m9xVj1.eS.i78OaQWkuvJ5a8yFm9a76dJtGq8E7H6A5B4C3D2E
-- ========================================================

-- TÀI KHOẢN MẪU ĐẠI DIỆN CHO 5 VAI TRÒ
INSERT INTO users (id, username, password_hash, full_name, email, phone, role) VALUES
(1, 'admin', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Quản trị viên Hệ thống', 'admin@gymsystem.local', '0901000001', 'ADMIN'),
(2, 'owner', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Nguyễn Chủ Phòng Gym', 'owner@gymsystem.local', '0901000002', 'OWNER'),
(3, 'letan', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Trần Thị Lễ Tân', 'receptionist@gymsystem.local', '0901000003', 'RECEPTIONIST'),
(4, 'trainer1', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Lê HLV Thể Hình (PT)', 'trainer1@gymsystem.local', '0901000004', 'TRAINER'),
(5, 'trainer2', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Phạm HLV Cardio & Yoga', 'trainer2@gymsystem.local', '0901000005', 'TRAINER'),
(6, 'customer1', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Nguyễn Văn Hội Viên A', 'customer1@gmail.com', '0988111222', 'CUSTOMER'),
(7, 'customer2', '$2b$10$epRfZL.1yWnviG.E/O7b..ZJjKxJv85yO1gRnmK157d0wB/pD4H2W', 'Hoàng Thị Hội Viên B', 'customer2@gmail.com', '0988333444', 'CUSTOMER')
ON DUPLICATE KEY UPDATE id=id;

-- DỮ LIỆU HLV
INSERT INTO trainers (id, user_id, specialty, bio, experience_years, rating_avg) VALUES
(1, 4, 'Thể hình tăng cơ & Siết mỡ', 'Chứng chỉ HLV Quốc gia, 5 năm kinh nghiệm huấn luyện cá nhân', 5, 4.9),
(2, 5, 'Cardio giảm cân & Phục hồi chức năng', 'Chuyên gia thể lực, 3 năm kinh nghiệm', 3, 4.8)
ON DUPLICATE KEY UPDATE id=id;

-- GÓI TẬP MẪU
INSERT INTO packages (id, name, description, duration_days, price, pt_sessions, is_active) VALUES
(1, 'Gói 1 Tháng Tự Do (Silver)', 'Tập luyện toàn thời gian 1 tháng, tự do sử dụng trang thiết bị phòng Gym', 30, 450000, 0, TRUE),
(2, 'Gói 3 Tháng Tiết Kiệm (Gold)', 'Tập luyện 3 tháng, tặng 2 buổi hướng dẫn cùng HLV cá nhân', 90, 1200000, 2, TRUE),
(3, 'Gói 1 Năm VIP (Platinum)', 'Tập luyện 12 tháng không giới hạn, tặng 12 buổi kèm riêng 1:1 với PT', 365, 4200000, 12, TRUE),
(4, 'Gói Kèm Riêng PT 10 Buổi', 'Gói chuyên sâu 10 buổi cùng HLV cá nhân chuyên nghiệp', 45, 2500000, 10, TRUE)
ON DUPLICATE KEY UPDATE id=id;

-- MEMBERSHIP ĐANG HOẠT ĐỘNG
INSERT INTO memberships (id, user_id, package_id, start_date, end_date, remaining_pt_sessions, status) VALUES
(1, 6, 2, CURDATE() - INTERVAL 10 DAY, CURDATE() + INTERVAL 80 DAY, 2, 'ACTIVE'),
(2, 7, 1, CURDATE() - INTERVAL 40 DAY, CURDATE() - INTERVAL 10 DAY, 0, 'EXPIRED')
ON DUPLICATE KEY UPDATE id=id;

-- HÓA ĐƠN MẪU
INSERT INTO invoices (id, invoice_code, user_id, package_id, amount, payment_method, payment_status, cashier_id) VALUES
(1, 'INV-20261001-001', 6, 2, 1200000, 'BANK_TRANSFER', 'PAID', 3),
(2, 'INV-20261002-002', 7, 1, 450000, 'CASH', 'PAID', 3)
ON DUPLICATE KEY UPDATE id=id;

-- ĐIỂM DANH MẪU
INSERT INTO attendance (id, user_id, package_id, check_in_time, check_out_time, status, note) VALUES
(1, 6, 2, NOW() - INTERVAL 2 HOUR, NOW() - INTERVAL 30 MINUTE, 'VALID', 'Check-in hợp lệ qua quầy lễ tân'),
(2, 7, 1, NOW() - INTERVAL 1 HOUR, NULL, 'EXPIRED_DENIED', 'Gói tập đã hết hạn 10 ngày trước')
ON DUPLICATE KEY UPDATE id=id;

-- LỊCH TẬP MẪU
INSERT INTO schedules (id, customer_id, trainer_id, schedule_date, start_time, end_time, status, notes) VALUES
(1, 6, 1, CURDATE() + INTERVAL 1 DAY, '17:30:00', '18:30:00', 'CONFIRMED', 'Buổi 1: Hướng dẫn kỹ thuật Squat và Bench Press')
ON DUPLICATE KEY UPDATE id=id;
