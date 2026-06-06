const profileRepository = require('./profileRepository');
const database = require('../../config/database');
const { hashPassword, verifyPassword } = require('../../shared/utils/password');
const { assertStrongPassword } = require('../../shared/utils/passwordPolicy');

function validateProfilePayload(payload, currentUser) {
  const fullName = String(payload.full_name ?? '').trim();
  const username = String(payload.username ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const phone = String(payload.phone ?? '').trim();
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

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: { full_name: fullName, username, email, phone }
  };
}

async function getProfile(userId) {
  const user = await profileRepository.findUserById(userId);
  if (!user) throw new Error('Pengguna tidak ditemukan.');
  return user;
}

async function updateProfile(userId, payload) {
  const validation = validateProfilePayload(payload);

  if (!validation.valid) {
    return { ok: false, validation };
  }

  // Cek duplikat username (selain milik sendiri)
  const existingUsername = await profileRepository.findUserByUsernameExcluding(validation.value.username, userId);
  if (existingUsername) {
    validation.errors.username = 'Username sudah dipakai oleh pengguna lain.';
  }

  // Cek duplikat email (selain milik sendiri)
  const existingEmail = await profileRepository.findUserByEmailExcluding(validation.value.email, userId);
  if (existingEmail) {
    validation.errors.email = 'Email sudah terdaftar oleh pengguna lain.';
  }

  if (Object.keys(validation.errors).length > 0) {
    return { ok: false, validation: { ...validation, valid: false } };
  }

  const updated = await profileRepository.updateUserProfile(userId, validation.value);

  return {
    ok: true,
    user: updated
  };
}

async function changePassword(userId, payload) {
  const currentPassword = String(payload.current_password ?? '');
  const newPassword = String(payload.new_password ?? '');
  const confirmPassword = String(payload.confirm_password ?? '');
  const errors = {};

  if (!currentPassword) {
    errors.current_password = 'Password saat ini wajib diisi.';
  }

  if (!newPassword) {
    errors.new_password = 'Password baru wajib diisi.';
  } else {
    try {
      assertStrongPassword(newPassword);
    } catch (e) {
      errors.new_password = e.message;
    }
  }

  if (!confirmPassword) {
    errors.confirm_password = 'Konfirmasi password wajib diisi.';
  } else if (newPassword !== confirmPassword) {
    errors.confirm_password = 'Konfirmasi password tidak cocok.';
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  // Verifikasi password lama
  const fullUser = await database('users').select('password_hash').where({ id: userId }).first();

  if (!fullUser || !verifyPassword(currentPassword, fullUser.password_hash)) {
    return { ok: false, errors: { current_password: 'Password saat ini salah.' } };
  }

  await profileRepository.updateUserPassword(userId, hashPassword(newPassword));

  return { ok: true };
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
};
