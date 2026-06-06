function isCustomerUser(sessionUser) {
  const roles = Array.isArray(sessionUser?.roles) ? sessionUser.roles.map((role) => role?.name).filter(Boolean) : [];
  const primaryRole = sessionUser?.primaryRole?.name ?? sessionUser?.role ?? null;
  const roleNames = roles.length ? roles : primaryRole ? [primaryRole] : [];
  return roleNames.includes('Pelanggan');
}

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

  return res.redirect(isCustomerUser(req.session.user) ? '/' : '/dashboard');
}

module.exports = {
  isCustomerUser,
  requireAuth,
  requireGuest
};
