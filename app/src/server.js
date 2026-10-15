require('dotenv').config();
const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const path = require('path');

const { testConnection } = require('./config/db');
const { register, metricsMiddleware } = require('./config/metrics');

// Khởi tạo app
const app = express();
const PORT = process.env.PORT || 3000;

// Cấu hình View Engine (EJS)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '../public')));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'gym_super_secret_session_key_2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 // 1 ngày
  }
}));

// Tích hợp Prometheus Metrics Middleware cho mọi HTTP request
app.use(metricsMiddleware);

// Middleware truyền thông tin user đăng nhập vào tất cả view
app.use((req, res, next) => {
  res.locals.currentUser = req.session ? req.session.user : null;
  res.locals.currentPath = req.path;
  next();
});

// Endpoint giám sát sức khỏe (Health Check)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Endpoint xuất Metrics chuẩn cho Prometheus
app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

// Mount Routes
app.use('/', require('./routes/auth'));
app.use('/', require('./routes/dashboard'));
app.use('/', require('./routes/members'));
app.use('/', require('./routes/packages'));
app.use('/', require('./routes/attendance'));
app.use('/', require('./routes/schedules'));
app.use('/', require('./routes/invoices'));

// 404 Handler
app.use((req, res) => {
  res.status(404).render('error', {
    title: '404 - Không tìm thấy trang',
    message: 'Trang bạn đang tìm kiếm không tồn tại trên hệ thống Gym.',
    user: req.session ? req.session.user : null
  });
});

// 500 Handler
app.use((err, req, res, next) => {
  console.error('[UNCAUGHT ERROR]', err);
  res.status(500).render('error', {
    title: '500 - Lỗi hệ thống nội bộ',
    message: err.message || 'Đã xảy ra lỗi ngoài ý muốn trên máy chủ.',
    user: req.session ? req.session.user : null
  });
});

// Khởi động server sau khi kiểm tra kết nối CSDL
async function startServer() {
  console.log('[SYSTEM] Đang khởi động Gym Management System...');
  await testConnection();

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(`🚀 Ứng dụng Gym System đang chạy tại cổng http://0.0.0.0:${PORT}`);
    console.log(`📊 Prometheus Metrics sẵn sàng tại http://0.0.0.0:${PORT}/metrics`);
    console.log(`💓 Health check sẵn sàng tại http://0.0.0.0:${PORT}/health`);
    console.log(`=======================================================`);
  });
}

startServer();
