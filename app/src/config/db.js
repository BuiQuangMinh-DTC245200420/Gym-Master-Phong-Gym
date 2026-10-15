const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'gym_root_password_2026',
  database: process.env.DB_NAME || 'gym_db',
  port: parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

// Hàm kiểm tra kết nối với cơ chế retry khi chạy trong Docker
async function testConnection(retries = 10, delay = 3000) {
  for (let i = 1; i <= retries; i++) {
    try {
      const connection = await pool.getConnection();
      console.log(`[DB] Đã kết nối thành công đến MySQL Database: ${process.env.DB_NAME || 'gym_db'}`);
      connection.release();
      return true;
    } catch (err) {
      console.log(`[DB] Lần thử ${i}/${retries}: Chưa kết nối được MySQL (${err.message}). Đang đợi ${delay/1000}s...`);
      if (i === retries) {
        console.error('[DB] Không thể kết nối đến MySQL Database sau nhiều lần thử.');
        return false;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

module.exports = {
  pool,
  testConnection
};
