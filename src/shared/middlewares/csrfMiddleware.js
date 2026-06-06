const crypto = require('node:crypto');

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function getOrCreateToken(req) {
  if (!req.session) {
    return null;
  }

  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('hex');
  }

  return req.session.csrfToken;
}

function getProvidedToken(req) {
  return (
    req.body?.csrfToken ??
    req.query?.csrfToken ??
    req.headers['x-csrf-token'] ??
    req.headers['csrf-token'] ??
    null
  );
}

function csrfMiddleware(req, res, next) {
  const token = getOrCreateToken(req);
  res.locals.csrfToken = token;

  if (SAFE_METHODS.has(req.method)) {
    return next();
  }

  const providedToken = getProvidedToken(req);

  if (!token || !providedToken || providedToken !== token) {
    if (req.path === '/logout') {
      return next();
    }

    if ((req.path === '/login' || req.path === '/register') && process.env.NODE_ENV !== 'test') {
      if (req.session) {
        req.session.csrfToken = crypto.randomBytes(32).toString('hex');
      }

      const redirectTarget = req.path === '/login'
        ? '/?login=1&error=Form%20login%20kadaluarsa.%20Silakan%20coba%20lagi.'
        : '/register?error=Form%20autentikasi%20kadaluarsa.%20Silakan%20coba%20lagi.';

      return res.redirect(redirectTarget);
    }

    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(403).json({
        success: false,
        message: 'CSRF token tidak valid.',
        errors: {}
      });
    }

    return res.status(403).render('pages/error', {
      pageTitle: 'Akses Ditolak',
      message: 'Permintaan ditolak karena token keamanan tidak valid.'
    });
  }

  return next();
}

module.exports = csrfMiddleware;
