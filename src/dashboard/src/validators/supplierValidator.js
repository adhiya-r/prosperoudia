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

function validateSupplierPayload(payload, { requireAll = true } = {}) {
  const errors = {};
  const code = normalizeString(payload?.code);
  const name = normalizeString(payload?.name);
  const contactName = normalizeOptionalString(payload?.contact_name);
  const email = normalizeOptionalString(payload?.email);
  const phone = normalizeOptionalString(payload?.phone);
  const address = normalizeOptionalString(payload?.address);
  const isActive = normalizeOptionalBoolean(payload?.is_active, true);

  if (requireAll || payload?.code !== undefined) {
    if (!code) {
      errors.code = 'Supplier code wajib diisi';
    }
  }

  if (requireAll || payload?.name !== undefined) {
    if (!name) {
      errors.name = 'Supplier name wajib diisi';
    }
  }

  if (email && !email.includes('@')) {
    errors.email = 'Format email tidak valid';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      code,
      name,
      contact_name: contactName,
      email,
      phone,
      address,
      is_active: isActive
    }
  };
}

module.exports = {
  validateSupplierPayload
};
