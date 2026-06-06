function requireAuth(req, res, next) {
  if (req.session?.user) {
    return next();
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
