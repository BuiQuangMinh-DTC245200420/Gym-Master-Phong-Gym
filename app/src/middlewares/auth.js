function isAuthenticated(req, res, next) {
  if (req.session && req.session.user) {
    res.locals.currentUser = req.session.user;
    return next();
  }
  return res.redirect('/login');
}

function requireRoles(...roles) {
  return (req, res, next) => {
    if (!req.session || !req.session.user) {
      return res.redirect('/login');
    }
    if (roles.includes(req.session.user.role)) {
      res.locals.currentUser = req.session.user;
      return next();
    }
    return res.status(403).render('error', {
      title: 'Không có quyền truy cập',
      message: 'Tài khoản của bạn không có quyền thực hiện chức năng này!',
      user: req.session.user
    });
  };
}

module.exports = {
  isAuthenticated,
  requireRoles
};
