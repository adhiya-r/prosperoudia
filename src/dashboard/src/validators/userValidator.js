function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
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

function validateCreateUserPayload(payload) {
  const errors = {};
  const fullName = normalizeString(payload?.full_name);
  const username = normalizeString(payload?.username);
  const emailValue = normalizeString(payload?.email).toLowerCase();
  const email = emailValue || null;
  const password = String(payload?.password ?? '');
  const roleId = normalizeOptionalNumber(payload?.role_id);
  const assignedWarehouseId = normalizeOptionalNumber(payload?.assigned_warehouse_id);

  if (!fullName) {
    errors.full_name = 'Nama lengkap wajib diisi';
  }

  if (!username) {
    errors.username = 'Username wajib diisi';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email tidak valid';
  }

  if (!password) {
    errors.password = 'Password wajib diisi';
  }

  if (!Number.isFinite(roleId)) {
    errors.role_id = 'Role wajib dipilih';
  }

  if (assignedWarehouseId !== null && !Number.isFinite(assignedWarehouseId)) {
    errors.assigned_warehouse_id = 'Warehouse tidak valid';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      full_name: fullName,
      username,
      email,
      password,
      role_id: Number.isFinite(roleId) ? roleId : null,
      assigned_warehouse_id: Number.isFinite(assignedWarehouseId) ? assignedWarehouseId : null
    }
  };
}

function validateAccountUpdatePayload(payload) {
  const errors = {};
  const fullName = normalizeString(payload?.full_name);
  const username = normalizeString(payload?.username);
  const emailValue = normalizeString(payload?.email).toLowerCase();
  const email = emailValue || null;
  const assignedWarehouseId = normalizeOptionalNumber(payload?.assigned_warehouse_id);

  if (!fullName) {
    errors.full_name = 'Nama lengkap wajib diisi';
  }

  if (!username) {
    errors.username = 'Username wajib diisi';
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Email tidak valid';
  }

  if (assignedWarehouseId !== null && !Number.isFinite(assignedWarehouseId)) {
    errors.assigned_warehouse_id = 'Warehouse tidak valid';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      full_name: fullName,
      username,
      email,
      assigned_warehouse_id: Number.isFinite(assignedWarehouseId) ? assignedWarehouseId : null
    }
  };
}

function validatePasswordChangePayload(payload) {
  const errors = {};
  const currentPassword = normalizeString(payload?.current_password);
  const newPassword = normalizeString(payload?.new_password);
  const passwordConfirmation = normalizeString(payload?.password_confirmation);

  if (!currentPassword) {
    errors.current_password = 'Password saat ini wajib diisi';
  }

  if (!newPassword) {
    errors.new_password = 'Password baru wajib diisi';
  }

  if (!passwordConfirmation) {
    errors.password_confirmation = 'Konfirmasi password wajib diisi';
  }

  if (newPassword && passwordConfirmation && newPassword !== passwordConfirmation) {
    errors.password_confirmation = 'Konfirmasi password tidak cocok';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      current_password: currentPassword,
      new_password: newPassword,
      password_confirmation: passwordConfirmation
    }
  };
}

function validateAdminUserUpdatePayload(payload) {
  const accountValidation = validateAccountUpdatePayload(payload);
  const errors = { ...accountValidation.errors };
  const roleId = normalizeOptionalNumber(payload?.role_id);
  const isActive = normalizeOptionalBoolean(payload?.is_active, true);
  const newPassword = normalizeString(payload?.new_password);
  const passwordConfirmation = normalizeString(payload?.password_confirmation);

  if (!Number.isFinite(roleId)) {
    errors.role_id = 'Role wajib dipilih';
  }

  if (newPassword || passwordConfirmation) {
    if (!newPassword) {
      errors.new_password = 'Password baru wajib diisi jika ingin mengganti password';
    }

    if (!passwordConfirmation) {
      errors.password_confirmation = 'Konfirmasi password wajib diisi jika ingin mengganti password';
    }

    if (newPassword && passwordConfirmation && newPassword !== passwordConfirmation) {
      errors.password_confirmation = 'Konfirmasi password tidak cocok';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      ...accountValidation.value,
      role_id: Number.isFinite(roleId) ? roleId : null,
      is_active: isActive,
      new_password: newPassword || null,
      password_confirmation: passwordConfirmation || null
    }
  };
}

module.exports = {
  validateCreateUserPayload,
  validateAccountUpdatePayload,
  validatePasswordChangePayload,
  validateAdminUserUpdatePayload
};
