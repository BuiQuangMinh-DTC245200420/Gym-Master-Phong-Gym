const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

// Danh sách hội viên
router.get('/members', isAuthenticated, async (req, res) => {
  const user = req.session.user;
  const search = req.query.search || '';

  try {
    let query = `
      SELECT u.id, u.username, u.full_name, u.email, u.phone, u.status as user_status,
             m.id as membership_id, m.start_date, m.end_date, m.remaining_pt_sessions,
             m.status as membership_status, p.name as package_name
      FROM users u
      LEFT JOIN memberships m ON u.id = m.user_id AND m.status = 'ACTIVE'
      LEFT JOIN packages p ON m.package_id = p.id
      WHERE u.role = 'CUSTOMER'
    `;
    const params = [];

    if (search) {
      query += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ` ORDER BY u.id DESC`;

    const [members] = await pool.query(query, params);
    const [packages] = await pool.query('SELECT * FROM packages WHERE is_active = 1');

    res.render('members', {
      title: 'Quản lý Hội viên Gym',
      user,
      members,
      packages,
      search,
      message: req.query.msg || null,
      error: req.query.err || null
    });
  } catch (err) {
    console.error('[MEMBERS ERROR]', err);
    res.status(500).render('error', { title: 'Lỗi', message: err.message, user });
  }
});

// Thêm mới hội viên
router.post('/members/create', isAuthenticated, async (req, res) => {
  const { username, full_name, email, phone, package_id } = req.body;
  const password = req.body.password || '123456';

  try {
    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (username, password_hash, full_name, email, phone, role)
       VALUES (?, ?, ?, ?, ?, 'CUSTOMER')`,
      [username, password_hash, full_name, email, phone]
    );

    const newUserId = result.insertId;

    // Nếu chọn gói tập ngay lúc tạo
    if (package_id) {
      const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [package_id]);
      if (pkg) {
        await pool.query(
          `INSERT INTO memberships (user_id, package_id, start_date, end_date, remaining_pt_sessions, status)
           VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 'ACTIVE')`,
          [newUserId, pkg.id, pkg.duration_days, pkg.pt_sessions]
        );

        // Tạo hóa đơn
        const invoiceCode = 'INV-' + Date.now();
        await pool.query(
          `INSERT INTO invoices (invoice_code, user_id, package_id, amount, payment_method, payment_status, cashier_id)
           VALUES (?, ?, ?, ?, 'CASH', 'PAID', ?)`,
          [invoiceCode, newUserId, pkg.id, pkg.price, req.session.user.id]
        );
      }
    }

    res.redirect('/members?msg=Thêm+mới+hội+viên+thành+công!');
  } catch (err) {
    console.error('[ADD MEMBER ERROR]', err);
    res.redirect('/members?err=' + encodeURIComponent('Không thể tạo hội viên: ' + err.message));
  }
});

module.exports = router;
