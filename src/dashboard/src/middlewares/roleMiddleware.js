const ROLE_PRIORITY = {
  Admin: 4,
  Apoteker: 3,
  'Warehouse Manager': 3,
  Kasir: 2,
  'Warehouse Staff': 2,
  Viewer: 1,
  Pelanggan: 1
};

const ROLE_ALIASES = {
  'Warehouse Manager': ['Warehouse Manager', 'Apoteker'],
  'Warehouse Staff': ['Warehouse Staff', 'Kasir'],
  Viewer: ['Viewer', 'Pelanggan'],
  Admin: ['Admin']
};

function expandAllowedRoles(allowedRoles) {
  const expanded = new Set();

  allowedRoles.forEach((roleName) => {
    const aliases = ROLE_ALIASES[roleName] || [roleName];
    aliases.forEach((alias) => expanded.add(alias));
  });

  return expanded;
}

function getRoleName(sessionUser) {
  return sessionUser?.primaryRole?.name ?? sessionUser?.role ?? sessionUser?.role_name ?? null;
}

function getRoleNames(sessionUser) {
  if (!sessionUser) {
    return [];
  }

  if (Array.isArray(sessionUser.roles)) {
    return sessionUser.roles
      .map((role) => role?.name ?? null)
      .filter(Boolean);
  }

  const roleName = getRoleName(sessionUser);
  return roleName ? [roleName] : [];
}

function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    const roleNames = getRoleNames(req.session?.user);
    const expandedAllowedRoles = expandAllowedRoles(allowedRoles);

    if (roleNames.some((roleName) => expandedAllowedRoles.has(roleName))) {
      return next();
    }

    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        errors: {}
      });
    }

    return res.status(403).render('pages/error', {
      pageTitle: 'Akses Ditolak'
    });
  };
}

function requireMinimumRole(minimumRole) {
  return function minimumRoleGuard(req, res, next) {
    const roleNames = getRoleNames(req.session?.user);
    const currentPriority = roleNames.reduce((highest, roleName) => {
      const rolePriority = ROLE_PRIORITY[roleName] ?? 0;
      return Math.max(highest, rolePriority);
    }, 0);
    const requiredPriority = ROLE_PRIORITY[minimumRole] ?? Infinity;

    if (currentPriority >= requiredPriority) {
      return next();
    }

    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden',
        errors: {}
      });
    }

    return res.status(403).render('pages/error', {
      pageTitle: 'Akses Ditolak'
    });
  };
}

module.exports = {
  requireRole,
  requireMinimumRole
};
