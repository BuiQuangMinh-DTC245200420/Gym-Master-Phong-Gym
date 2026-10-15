const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/', (req, res) => {
  if (req.session && req.session.user) {
    return res.redirect('/dashboard');
  }
  return res.redirect('/login');
});

router.get('/dashboard', isAuthenticated, async (req, res) => {
  const user = req.session.user;

  try {
    // 1. Thống kê tổng quan
    const [[{ totalMembers }]] = await pool.query(
      'SELECT COUNT(*) as totalMembers FROM users WHERE role = "CUSTOMER"'
    );

    const [[{ activeMemberships }]] = await pool.query(
      'SELECT COUNT(*) as activeMemberships FROM memberships WHERE status = "ACTIVE"'
    );

    const [[{ todayCheckins }]] = await pool.query(
      'SELECT COUNT(*) as todayCheckins FROM attendance WHERE DATE(check_in_time) = CURDATE() AND status = "VALID"'
    );

    const [[{ totalRevenue }]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as totalRevenue FROM invoices WHERE payment_status = "PAID"'
    );

    // 2. Lấy 5 lượt điểm danh gần nhất
    const [recentAttendance] = await pool.query(`
      SELECT a.*, u.full_name, u.phone, p.name as package_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN packages p ON a.package_id = p.id
      ORDER BY a.check_in_time DESC
      LIMIT 6
    `);

    // 3. Lấy các lịch tập PT sắp tới
    const [upcomingSchedules] = await pool.query(`
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone,
             t_user.full_name as trainer_name
      FROM schedules s
      JOIN users c ON s.customer_id = c.id
      JOIN trainers t ON s.trainer_id = t.id
      JOIN users t_user ON t.user_id = t_user.id
      WHERE s.schedule_date >= CURDATE()
      ORDER BY s.schedule_date ASC, s.start_time ASC
      LIMIT 5
    `);

    res.render('dashboard', {
      title: 'Bảng điều khiển - Gym System',
      user,
      stats: {
        totalMembers,
        activeMemberships,
        todayCheckins,
        totalRevenue
      },
      recentAttendance,
      upcomingSchedules
    });
  } catch (err) {
    console.error('[DASHBOARD ERROR]', err);
    res.status(500).render('error', {
      title: 'Lỗi tải trang Dashboard',
      message: err.message,
      user
    });
  }
});

module.exports = router;
