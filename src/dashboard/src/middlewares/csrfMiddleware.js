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
    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(403).json({
        success: false,
        message: 'CSRF token invalid',
        errors: {}
      });
    }

    return res.status(403).render('pages/error', {
      pageTitle: 'Akses Ditolak'
    });
  }

  return next();
}

module.exports = csrfMiddleware;
