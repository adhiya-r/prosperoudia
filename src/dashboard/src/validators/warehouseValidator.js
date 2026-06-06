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

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function validateWarehousePayload(payload, { requireAll = true } = {}) {
  const errors = {};
  const code = normalizeString(payload?.code);
  const name = normalizeString(payload?.name);
  const city = normalizeString(payload?.city);
  const address = normalizeOptionalString(payload?.address);
  const latitude = normalizeOptionalNumber(payload?.latitude);
  const longitude = normalizeOptionalNumber(payload?.longitude);
  const phone = normalizeOptionalString(payload?.phone);
  const isActive = normalizeOptionalBoolean(payload?.is_active, true);

  if (requireAll || payload?.code !== undefined) {
    if (!code) {
      errors.code = 'Warehouse code wajib diisi';
    }
  }

  if (requireAll || payload?.name !== undefined) {
    if (!name) {
      errors.name = 'Warehouse name wajib diisi';
    }
  }

  if (requireAll || payload?.city !== undefined) {
    if (!city) {
      errors.city = 'City wajib diisi';
    }
  }

  if (payload?.latitude !== undefined && Number.isNaN(latitude)) {
    errors.latitude = 'Latitude harus berupa angka';
  }

  if (payload?.longitude !== undefined && Number.isNaN(longitude)) {
    errors.longitude = 'Longitude harus berupa angka';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      code,
      name,
      city,
      address,
      latitude: Number.isNaN(latitude) ? null : latitude,
      longitude: Number.isNaN(longitude) ? null : longitude,
      phone,
      is_active: isActive
    }
  };
}

module.exports = {
  validateWarehousePayload
};
