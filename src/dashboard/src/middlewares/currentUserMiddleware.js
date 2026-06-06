function currentUserMiddleware(req, res, next) {
  const currentUser = req.session?.user ?? null;
  const currentRoles = Array.isArray(currentUser?.roles) ? currentUser.roles : [];
  const primaryRoleName = currentUser?.primaryRole?.name ?? currentUser?.role ?? null;

  res.locals.currentUser = currentUser;
  res.locals.isAuthenticated = Boolean(currentUser);
  res.locals.currentRole = primaryRoleName;
  res.locals.currentRoles = currentRoles;

  next();
}

module.exports = currentUserMiddleware;
