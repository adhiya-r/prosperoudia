function getRoleNames(sessionUser) {
  if (!sessionUser) {
    return [];
  }

  if (Array.isArray(sessionUser.roles)) {
    return sessionUser.roles
      .map((role) => role?.name ?? null)
      .filter(Boolean);
  }

  const roleName = sessionUser.primaryRole?.name ?? sessionUser.role ?? null;
  return roleName ? [roleName] : [];
}

function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    const currentRoles = getRoleNames(req.session?.user);

    if (currentRoles.some((roleName) => allowedRoles.includes(roleName))) {
      return next();
    }

    return res.status(403).render('pages/error', {
      pageTitle: 'Akses Ditolak',
      message: 'Role Anda tidak memiliki akses ke halaman ini.'
    });
  };
}

module.exports = {
  requireRole,
  getRoleNames
};
