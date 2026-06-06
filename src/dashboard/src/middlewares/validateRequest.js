function validateRequest(validator, source = 'body') {
  return function validationMiddleware(req, res, next) {
    const payload = source === 'query' ? req.query : source === 'params' ? req.params : req.body;
    const result = validator(payload);

    if (result.valid) {
      req.validatedBody = result.value;
      req.validationErrors = null;
      return next();
    }

    req.validatedBody = null;
    req.validationErrors = result.errors;

    if (req.accepts(['html', 'json']) === 'json') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: result.errors
      });
    }

    return res.status(400).render('pages/error', {
      pageTitle: 'Validasi Gagal'
    });
  };
}

module.exports = validateRequest;
