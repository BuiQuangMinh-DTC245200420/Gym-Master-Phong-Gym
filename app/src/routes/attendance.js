const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');
const { activeAttendanceGauge } = require('../config/metrics');

// Trang quản lý điểm danh
router.get('/attendance', isAuthenticated, async (req, res) => {
  const user = req.session.user;

  try {
    // Danh sách 20 lượt điểm danh mới nhất
    const [logs] = await pool.query(`
      SELECT a.*, u.full_name, u.phone, u.username, p.name as package_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN packages p ON a.package_id = p.id
      ORDER BY a.check_in_time DESC
      LIMIT 20
    `);

    // Danh sách hội viên để tìm kiếm
    const [members] = await pool.query(`
      SELECT u.id, u.username, u.full_name, u.phone,
             m.status as membership_status, m.end_date, p.name as package_name
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.status = 'ACTIVE'
      LEFT JOIN packages p ON m.package_id = p.id
      WHERE u.role = 'CUSTOMER'
    `);

    res.render('attendance', {
      title: 'Điểm danh Check-in Gym',
      user,
      logs,
      members,
      checkinResult: req.session.checkinResult || null,
      message: req.query.msg || null,
      error: req.query.err || null
    });

    req.session.checkinResult = null;
  } catch (err) {
    console.error('[ATTENDANCE ERROR]', err);
    res.status(500).render('error', { title: 'Lỗi', message: err.message, user });
  }
});

// Xử lý Check-in tại quầy lễ tân (Kiểm tra nghiêm ngặt hạn gói tập)
router.post('/attendance/checkin', isAuthenticated, async (req, res) => {
  const { identifier } = req.body; // Có thể là user_id hoặc số điện thoại hoặc username

  try {
    // 1. Tìm thông tin hội viên
    const [users] = await pool.query(
      `SELECT * FROM users WHERE (id = ? OR phone = ? OR username = ?) AND role = 'CUSTOMER'`,
      [identifier, identifier, identifier]
    );

    if (users.length === 0) {
      req.session.checkinResult = {
        success: false,
        type: 'NOT_FOUND',
        message: `Không tìm thấy hội viên với thông tin "${identifier}"!`
      };
      return res.redirect('/attendance');
    }

    const member = users[0];

    // 2. Kiểm tra gói tập còn hiệu lực không
    const [memberships] = await pool.query(`
      SELECT m.*, p.name as package_name
      FROM memberships m
      JOIN packages p ON m.package_id = p.id
      WHERE m.user_id = ? AND m.status = 'ACTIVE' AND m.end_date >= CURDATE()
      ORDER BY m.end_date DESC
      LIMIT 1
    `, [member.id]);

    if (memberships.length === 0) {
      // Gói đã hết hạn hoặc chưa từng đăng ký -> TỪ CHỐI ĐIỂM DANH
      await pool.query(
        `INSERT INTO attendance (user_id, status, note)
         VALUES (?, 'EXPIRED_DENIED', 'Gói tập đã hết hạn hoặc chưa đăng ký')`,
        [member.id]
      );

      console.warn(`[ATTENDANCE] Hội viên ${member.full_name} bị từ chối vào tập do gói hết hạn.`);

      req.session.checkinResult = {
        success: false,
        type: 'EXPIRED',
        member,
        message: `CẢNH BÁO: Hội viên "${member.full_name}" không có gói tập còn hạn! Từ chối lượt vào Gym.`
      };
      return res.redirect('/attendance');
    }

    // 3. Gói hợp lệ -> GHI NHẬN CHECK-IN THÀNH CÔNG
    const activePkg = memberships[0];
    await pool.query(
      `INSERT INTO attendance (user_id, package_id, status, note)
       VALUES (?, ?, 'VALID', 'Check-in hợp lệ qua quầy')`,
      [member.id, activePkg.package_id]
    );

    // Cập nhật Prometheus gauge
    activeAttendanceGauge.inc();

    console.log(`[ATTENDANCE] Check-in thành công: ${member.full_name} - Gói: ${activePkg.package_name}`);

    req.session.checkinResult = {
      success: true,
      type: 'VALID',
      member,
      package: activePkg,
      message: `HỢP LỆ: Chào mừng "${member.full_name}" vào tập Gym! (Gói: ${activePkg.package_name}, Hạn: ${activePkg.end_date.toISOString().split('T')[0]})`
    };

    res.redirect('/attendance');
  } catch (err) {
    console.error('[CHECKIN PROCESS ERROR]', err);
    res.redirect('/attendance?err=' + encodeURIComponent(err.message));
  }
});

// Check-out
router.post('/attendance/checkout/:id', isAuthenticated, async (req, res) => {
  try {
    await pool.query(
      'UPDATE attendance SET check_out_time = NOW() WHERE id = ?',
      [req.params.id]
    );
    activeAttendanceGauge.dec();
    res.redirect('/attendance?msg=Đã+ghi+nhận+check-out');
  } catch (err) {
    res.redirect('/attendance?err=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
