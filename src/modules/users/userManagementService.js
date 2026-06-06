const database = require('../../config/database');
const userManagementRepository = require('./userManagementRepository');

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

function buildRoleLabel(role) {
  return role?.display_name || role?.name || '-';
}

function validateUserAccountPayload(payload = {}) {
  const fullName = String(payload.full_name ?? '').trim();
  const username = String(payload.username ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const phone = String(payload.phone ?? '').trim();
  const roleId = Number.parseInt(String(payload.role_id ?? ''), 10);
  const isActive = String(payload.is_active ?? 'true') !== 'false';
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[0-9+]{8,15}$/;

  if (!fullName || fullName.length < 3) {
    errors.full_name = 'Nama lengkap minimal 3 karakter.';
  }

  if (!username) {
    errors.username = 'Username wajib diisi.';
  } else if (!/^[a-z0-9._-]{4,30}$/i.test(username)) {
    errors.username = 'Username hanya boleh huruf, angka, titik, garis bawah, dan tanda hubung, minimal 4 karakter.';
  }

  if (!email) {
    errors.email = 'Email wajib diisi.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Format email tidak valid.';
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = 'Nomor HP hanya boleh angka atau tanda +, panjang 8-15 karakter.';
  }

  if (!Number.isInteger(roleId) || roleId <= 0) {
    errors.role_id = 'Peran pengguna wajib dipilih.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      full_name: fullName,
      username,
      email,
      phone: phone || null,
      role_id: roleId,
      is_active: isActive
    }
  };
}

async function listRoleOptions() {
  const roles = await userManagementRepository.listRoles();

  return roles.map((role) => ({
    value: String(role.id),
    label: role.display_name || role.name
  }));
}

async function listUserAccounts() {
  const users = await userManagementRepository.listUsersWithActiveRole();

  return users.map((user) => ({
    ...user,
    role_id: user.role_id || '',
    role_label: user.role_display_name || user.role_name || '-',
    account_group_label: user.role_name === 'Pelanggan' ? 'Pelanggan' : 'Internal',
    status_label: user.is_active ? 'Aktif' : 'Nonaktif',
    last_login_label: formatDateTime(user.last_login_at),
    created_at_label: formatDateTime(user.created_at)
  }));
}

async function updateUserAccount(targetUserId, payload, actorUser) {
  const targetUser = await userManagementRepository.findUserById(targetUserId);

  if (!targetUser) {
    const error = new Error('Akun pengguna tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const validation = validateUserAccountPayload(payload);
  if (!validation.valid) {
    const error = new Error('Validasi akun pengguna gagal.');
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  const selectedRole = await userManagementRepository.findRoleById(validation.value.role_id);
  if (!selectedRole) {
    const error = new Error('Peran pengguna tidak ditemukan.');
    error.statusCode = 422;
    error.validation = {
      valid: false,
      errors: { role_id: 'Peran pengguna tidak ditemukan.' },
      value: validation.value
    };
    throw error;
  }

  const duplicateUsername = await userManagementRepository.findUserByUsernameExcluding(validation.value.username, targetUserId);
  if (duplicateUsername) {
    const error = new Error('Username sudah dipakai pengguna lain.');
    error.statusCode = 422;
    error.validation = {
      valid: false,
      errors: { username: 'Username sudah dipakai pengguna lain.' },
      value: validation.value
    };
    throw error;
  }

  const duplicateEmail = await userManagementRepository.findUserByEmailExcluding(validation.value.email, targetUserId);
  if (duplicateEmail) {
    const error = new Error('Email sudah dipakai pengguna lain.');
    error.statusCode = 422;
    error.validation = {
      valid: false,
      errors: { email: 'Email sudah dipakai pengguna lain.' },
      value: validation.value
    };
    throw error;
  }

  const currentRole = await userManagementRepository.findActiveRoleByUserId(targetUserId);
  const isSelfEdit = Number(actorUser?.id) === Number(targetUserId);

  if (isSelfEdit && !validation.value.is_active) {
    const error = new Error('Admin tidak boleh menonaktifkan akunnya sendiri dari halaman ini.');
    error.statusCode = 422;
    error.validation = {
      valid: false,
      errors: { is_active: 'Anda tidak boleh menonaktifkan akun sendiri.' },
      value: validation.value
    };
    throw error;
  }

  if (isSelfEdit && selectedRole.name !== 'Admin') {
    const error = new Error('Admin tidak boleh mengubah perannya sendiri dari halaman ini.');
    error.statusCode = 422;
    error.validation = {
      valid: false,
      errors: { role_id: 'Anda tidak boleh mengubah peran akun sendiri.' },
      value: validation.value
    };
    throw error;
  }

  const previousState = {
    full_name: targetUser.full_name,
    username: targetUser.username,
    email: targetUser.email,
    phone: targetUser.phone,
    is_active: targetUser.is_active,
    role_id: currentRole?.role_id ?? null,
    role_name: currentRole?.name ?? null,
    role_display_name: currentRole?.display_name ?? null
  };

  const updatedUser = await database.transaction(async (trx) => {
    const user = await userManagementRepository.updateUserAccount(targetUserId, validation.value, trx);
    await userManagementRepository.syncActiveRole(targetUserId, validation.value.role_id, trx);
    return user;
  });

  return {
    user: updatedUser,
    previous: previousState,
    currentRole,
    selectedRole,
    updated: {
      ...validation.value,
      role_label: buildRoleLabel(selectedRole)
    }
  };
}

module.exports = {
  listRoleOptions,
  listUserAccounts,
  updateUserAccount,
  validateUserAccountPayload
};
