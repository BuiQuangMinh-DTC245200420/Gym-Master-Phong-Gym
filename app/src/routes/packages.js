const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

// Danh sách gói tập
router.get('/packages', isAuthenticated, async (req, res) => {
  const user = req.session.user;

  try {
    const [packages] = await pool.query('SELECT * FROM packages ORDER BY price ASC');
    const [members] = await pool.query('SELECT id, full_name, phone FROM users WHERE role = "CUSTOMER"');

    res.render('packages', {
      title: 'Quản lý Gói tập Gym',
      user,
      packages,
      members,
      message: req.query.msg || null,
      error: req.query.err || null
    });
  } catch (err) {
    console.error('[PACKAGES ERROR]', err);
    res.status(500).render('error', { title: 'Lỗi', message: err.message, user });
  }
});

// Thêm gói tập mới (Admin/Owner)
router.post('/packages/create', isAuthenticated, async (req, res) => {
  const { name, description, duration_days, price, pt_sessions } = req.body;

  try {
    await pool.query(
      `INSERT INTO packages (name, description, duration_days, price, pt_sessions)
       VALUES (?, ?, ?, ?, ?)`,
      [name, description, duration_days, price, pt_sessions || 0]
    );

    res.redirect('/packages?msg=Tạo+gói+tập+mới+thành+công!');
  } catch (err) {
    console.error('[CREATE PACKAGE ERROR]', err);
    res.redirect('/packages?err=' + encodeURIComponent(err.message));
  }
});

// Đăng ký / Gia hạn gói tập cho hội viên
router.post('/packages/buy', isAuthenticated, async (req, res) => {
  const { user_id, package_id, payment_method } = req.body;

  try {
    const [[pkg]] = await pool.query('SELECT * FROM packages WHERE id = ?', [package_id]);
    if (!pkg) {
      return res.redirect('/packages?err=Gói+tập+không+hợp+lệ');
    }

    // Đánh dấu gói cũ nếu có thành EXPIRED
    await pool.query(
      'UPDATE memberships SET status = "EXPIRED" WHERE user_id = ? AND status = "ACTIVE"',
      [user_id]
    );

    // Kích hoạt gói mới
    await pool.query(
      `INSERT INTO memberships (user_id, package_id, start_date, end_date, remaining_pt_sessions, status)
       VALUES (?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), ?, 'ACTIVE')`,
      [user_id, pkg.id, pkg.duration_days, pkg.pt_sessions]
    );

    // Tạo hóa đơn
    const invoiceCode = 'INV-' + Date.now();
    await pool.query(
      `INSERT INTO invoices (invoice_code, user_id, package_id, amount, payment_method, payment_status, cashier_id)
       VALUES (?, ?, ?, ?, ?, 'PAID', ?)`,
      [invoiceCode, user_id, pkg.id, pkg.price, payment_method || 'CASH', req.session.user.id]
    );

    res.redirect('/packages?msg=Đăng+ký+gói+tập+thành+công!');
  } catch (err) {
    console.error('[BUY PACKAGE ERROR]', err);
    res.redirect('/packages?err=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
