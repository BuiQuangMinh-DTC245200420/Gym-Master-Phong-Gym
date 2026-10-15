const client = require('prom-client');

// Khởi tạo Registry Prometheus
const register = new client.Registry();

// Bật các metrics mặc định của Node.js (CPU, RAM, Event Loop, GC)
client.collectDefaultMetrics({
  register,
  prefix: 'gym_app_'
});

// Custom metric: Tổng số lượt HTTP request
const httpRequestCounter = new client.Counter({
  name: 'gym_http_requests_total',
  help: 'Tổng số HTTP requests nhận được',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// Custom metric: Thời gian phản hồi HTTP request
const httpRequestDuration = new client.Histogram({
  name: 'gym_http_request_duration_seconds',
  help: 'Thời gian xử lý HTTP request (giây)',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register]
});

// Custom metric: Số lượt check-in hôm nay
const activeAttendanceGauge = new client.Gauge({
  name: 'gym_active_checkins_total',
  help: 'Số lượt hội viên đang tập luyện trong phòng gym',
  registers: [register]
});

// Middleware ghi nhận metrics cho mỗi request
function metricsMiddleware(req, res, next) {
  const start = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(start);
    const durationInSeconds = diff[0] + diff[1] / 1e9;
    const route = req.baseUrl + (req.route ? req.route.path : req.path);

    httpRequestCounter.inc({
      method: req.method,
      route: route || req.path,
      status_code: res.statusCode
    });

    httpRequestDuration.observe({
      method: req.method,
      route: route || req.path,
      status_code: res.statusCode
    }, durationInSeconds);
  });

  next();
}

module.exports = {
  register,
  metricsMiddleware,
  activeAttendanceGauge
};
