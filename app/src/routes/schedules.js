const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const { isAuthenticated } = require('../middlewares/auth');

// Danh sách lịch tập PT
router.get('/schedules', isAuthenticated, async (req, res) => {
  const user = req.session.user;

  try {
    let query = `
      SELECT s.*, c.full_name as customer_name, c.phone as customer_phone,
             t_user.full_name as trainer_name, t.specialty
      FROM schedules s
      JOIN users c ON s.customer_id = c.id
      JOIN trainers t ON s.trainer_id = t.id
      JOIN users t_user ON t.user_id = t_user.id
    `;
    const params = [];

    // Nếu là CUSTOMER thì chỉ xem lịch của chính mình
    if (user.role === 'CUSTOMER') {
      query += ` WHERE s.customer_id = ?`;
      params.push(user.id);
    } else if (user.role === 'TRAINER') {
      // Nếu là TRAINER thì chỉ xem lịch mình phụ trách
      query += ` WHERE t.user_id = ?`;
      params.push(user.id);
    }

    query += ` ORDER BY s.schedule_date DESC, s.start_time DESC`;

    const [schedules] = await pool.query(query, params);

    // Lấy danh sách HLV
    const [trainers] = await pool.query(`
      SELECT t.id, t.specialty, u.full_name
      FROM trainers t
      JOIN users u ON t.user_id = u.id
    `);

    // Lấy danh sách hội viên
    const [customers] = await pool.query(`
      SELECT id, full_name, phone FROM users WHERE role = 'CUSTOMER'
    `);

    res.render('schedules', {
      title: 'Quản lý Lịch tập Huấn Luyện Viên',
      user,
      schedules,
      trainers,
      customers,
      message: req.query.msg || null,
      error: req.query.err || null
    });
  } catch (err) {
    console.error('[SCHEDULES ERROR]', err);
    res.status(500).render('error', { title: 'Lỗi', message: err.message, user });
  }
});

// Đặt lịch tập với HLV (Thuật toán kiểm tra NGHIÊM NGẶT chống trùng lịch)
router.post('/schedules/book', isAuthenticated, async (req, res) => {
  let customer_id = req.body.customer_id;
  const { trainer_id, schedule_date, start_time, end_time, notes } = req.body;

  // Nếu người đăng nhập là hội viên thì tự đặt cho chính mình
  if (req.session.user.role === 'CUSTOMER') {
    customer_id = req.session.user.id;
  }

  try {
    // 1. Kiểm tra định dạng thời gian: kết thúc phải sau bắt đầu
    if (start_time >= end_time) {
      return res.redirect('/schedules?err=' + encodeURIComponent('Giờ kết thúc phải lớn hơn giờ bắt đầu!'));
    }

    // 2. Thuật toán phát hiện xung đột lịch (Trùng lịch PT):
    // Một HLV không được có 2 lịch trùng nhau trong cùng một khoảng thời gian
    const [conflicts] = await pool.query(`
      SELECT s.*, u.full_name as customer_name
      FROM schedules s
      JOIN users u ON s.customer_id = u.id
      WHERE s.trainer_id = ?
        AND s.schedule_date = ?
        AND s.status IN ('PENDING', 'CONFIRMED')
        AND (
          (s.start_time < ? AND s.end_time > ?) OR
          (s.start_time >= ? AND s.start_time < ?) OR
          (s.end_time > ? AND s.end_time <= ?)
        )
    `, [trainer_id, schedule_date, end_time, start_time, start_time, end_time, start_time, end_time]);

    if (conflicts.length > 0) {
      console.warn(`[SCHEDULE CONFLICT] Phát hiện xung đột lịch tập của HLV ID=${trainer_id} vào ngày ${schedule_date}`);
      return res.redirect(
        '/schedules?err=' + encodeURIComponent(
          `XUNG ĐỘT LỊCH: Huấn luyện viên đã có lịch bận từ ${conflicts[0].start_time} đến ${conflicts[0].end_time} với hội viên khác. Vui lòng chọn khung giờ khác!`
        )
      );
    }

    // 3. Không trùng -> Lưu lịch hẹn
    await pool.query(
      `INSERT INTO schedules (customer_id, trainer_id, schedule_date, start_time, end_time, status, notes)
       VALUES (?, ?, ?, ?, ?, 'CONFIRMED', ?)`,
      [customer_id, trainer_id, schedule_date, start_time, end_time, notes || 'Đặt lịch qua hệ thống']
    );

    console.log(`[SCHEDULE] Đặt lịch thành công cho khách hàng ${customer_id} với HLV ${trainer_id}`);
    res.redirect('/schedules?msg=Đặt+lịch+tập+thành+công!');
  } catch (err) {
    console.error('[BOOK SCHEDULE ERROR]', err);
    res.redirect('/schedules?err=' + encodeURIComponent(err.message));
  }
});

// Cập nhật trạng thái lịch (Hoàn thành / Hủy)
router.post('/schedules/status/:id', isAuthenticated, async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE schedules SET status = ? WHERE id = ?', [status, req.params.id]);
    res.redirect('/schedules?msg=Cập+nhật+trạng+thái+thành+công');
  } catch (err) {
    res.redirect('/schedules?err=' + encodeURIComponent(err.message));
  }
});

module.exports = router;
