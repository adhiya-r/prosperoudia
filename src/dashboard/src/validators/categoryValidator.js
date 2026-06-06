function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeOptionalBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function validateCategoryPayload(payload, { requireAll = true } = {}) {
  const errors = {};
  const code = normalizeString(payload?.code);
  const name = normalizeString(payload?.name);
  const description = normalizeOptionalString(payload?.description);
  const isActive = normalizeOptionalBoolean(payload?.is_active, true);

  if (requireAll || payload?.code !== undefined) {
    if (!code) {
      errors.code = 'Category code wajib diisi';
    }
  }

  if (requireAll || payload?.name !== undefined) {
    if (!name) {
      errors.name = 'Category name wajib diisi';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      code,
      name,
      description,
      is_active: isActive
    }
  };
}

module.exports = {
  validateCategoryPayload
};
