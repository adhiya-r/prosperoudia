function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
  }

  if (req.accepts(['html', 'json']) === 'json') {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated',
      errors: {}
    });
  }

  return res.redirect('/login');
}

function requireGuest(req, res, next) {
  if (!req.session?.user) {
    return next();
  }

  return res.redirect('/dashboard');
}

module.exports = {
  requireAuth,
  requireGuest
};
