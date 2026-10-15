const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

router.get('/invoices', isAuthenticated, async (req, res) => {
  const user = req.session.user;

  try {
    let query = `
      SELECT i.*, u.full_name as customer_name, u.phone as customer_phone,
             p.name as package_name, cashier.full_name as cashier_name
      FROM invoices i
      JOIN users u ON i.user_id = u.id
      JOIN packages p ON i.package_id = p.id
      LEFT JOIN users cashier ON i.cashier_id = cashier.id
    `;
    const params = [];

    if (user.role === 'CUSTOMER') {
      query += ` WHERE i.user_id = ?`;
      params.push(user.id);
    }

    query += ` ORDER BY i.created_at DESC`;

    const [invoices] = await pool.query(query, params);

    const [[{ totalRevenue }]] = await pool.query(
      'SELECT COALESCE(SUM(amount), 0) as totalRevenue FROM invoices WHERE payment_status = "PAID"'
    );

    res.render('invoices', {
      title: 'Hóa đơn & Doanh thu',
      user,
      invoices,
      totalRevenue,
      message: req.query.msg || null,
      error: req.query.err || null
    });
  } catch (err) {
    console.error('[INVOICES ERROR]', err);
    res.status(500).render('error', { title: 'Lỗi', message: err.message, user });
  }
});

module.exports = router;
