const authRepository = require('./authRepository');
const database = require('../../config/database');
const { hashPassword, verifyPassword } = require('../../shared/utils/password');
const { assertStrongPassword } = require('../../shared/utils/passwordPolicy');

function buildSessionUser(user, roles) {
  const primaryRole = roles[0] ?? null;

  return {
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    phone: user.phone,
    avatar_url: user.avatar_url ?? null,
    assigned_warehouse_id: null,
    role: primaryRole?.name ?? null,
    primaryRole,
    roles
  };
}

function validateRegistrationPayload(payload = {}) {
  const fullName = String(payload.full_name ?? '').trim();
  const username = String(payload.username ?? '').trim();
  const email = String(payload.email ?? '').trim().toLowerCase();
  const phone = String(payload.phone ?? '').trim();
  const password = String(payload.password ?? '');
  const passwordConfirmation = String(payload.password_confirmation ?? '');
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

  if (!phone) {
    errors.phone = 'Nomor HP wajib diisi.';
  } else if (!phonePattern.test(phone)) {
    errors.phone = 'Nomor HP hanya boleh angka atau tanda +, panjang 8-15 karakter.';
  }

  if (!password) {
    errors.password = 'Password wajib diisi.';
  } else {
    try {
      assertStrongPassword(password);
    } catch (error) {
      errors.password = error.message;
    }
  }

  if (!passwordConfirmation) {
    errors.password_confirmation = 'Konfirmasi password wajib diisi.';
  } else if (password !== passwordConfirmation) {
    errors.password_confirmation = 'Konfirmasi password harus sama dengan password.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      full_name: fullName,
      username,
      email,
      phone,
      password
    }
  };
}

async function authenticateLogin(identifier, password) {
  const user = await authRepository.findUserByIdentifier(identifier);

  if (!user) {
    return {
      ok: false,
      message: 'Username atau password salah.'
    };
  }

  if (!user.is_active) {
    return {
      ok: false,
      message: 'Akun tidak aktif.'
    };
  }

  const passwordMatches = verifyPassword(password, user.password_hash);
  if (!passwordMatches) {
    return {
      ok: false,
      message: 'Username atau password salah.'
    };
  }

  const roles = await authRepository.findRolesByUserId(user.id);
  await authRepository.updateLastLoginAt(user.id);

  return {
    ok: true,
    sessionUser: buildSessionUser(user, roles)
  };
}

async function registerCustomerAccount(payload) {
  const validation = validateRegistrationPayload(payload);

  if (!validation.valid) {
    return {
      ok: false,
      validation
    };
  }

  const existingUsername = await authRepository.findUserByUsername(validation.value.username);
  if (existingUsername) {
    validation.errors.username = 'Username sudah dipakai.';
  }

  const existingEmail = await authRepository.findUserByEmail(validation.value.email);
  if (existingEmail) {
    validation.errors.email = 'Email sudah terdaftar.';
  }

  if (Object.keys(validation.errors).length > 0) {
    return {
      ok: false,
      validation: {
        ...validation,
        valid: false
      }
    };
  }

  const customerRole = await authRepository.findRoleByName('Pelanggan');
  if (!customerRole) {
    throw new Error('Role pelanggan belum tersedia.');
  }

  const result = await database.transaction(async (trx) => {
    const passwordHash = hashPassword(validation.value.password);
    const user = await authRepository.createUser(trx, {
      ...validation.value,
      password_hash: passwordHash
    });

    await authRepository.assignRoleToUser(trx, user.id, customerRole.id);

    return {
      user,
      roles: [customerRole]
    };
  });

  return {
    ok: true,
    sessionUser: buildSessionUser(result.user, result.roles)
  };
}

async function generateUniqueUsername(email, fullName) {
  let base = String(email.split('@')[0]).toLowerCase().replace(/[^a-z0-9]/g, '');
  if (base.length < 4) {
    base = base + 'user';
  }
  let username = base;
  let suffix = 1;
  while (true) {
    const existing = await authRepository.findUserByUsername(username);
    if (!existing) {
      break;
    }
    username = `${base}${suffix}`;
    suffix++;
  }
  return username;
}

async function registerOrLoginGoogleUser(email, fullName) {
  const existingUser = await authRepository.findUserByEmail(email);

  if (existingUser) {
    const userDetails = await authRepository.findUserByIdentifier(existingUser.username);
    if (!userDetails.is_active) {
      return {
        ok: false,
        message: 'Akun dengan email ini tidak aktif.'
      };
    }

    const roles = await authRepository.findRolesByUserId(userDetails.id);
    await authRepository.updateLastLoginAt(userDetails.id);

    return {
      ok: true,
      isNew: false,
      sessionUser: buildSessionUser(userDetails, roles)
    };
  }

  // Create new customer account
  const customerRole = await authRepository.findRoleByName('Pelanggan');
  if (!customerRole) {
    throw new Error('Role pelanggan belum tersedia.');
  }

  const username = await generateUniqueUsername(email, fullName);
  const randomPassword = require('crypto').randomBytes(16).toString('hex') + 'A1!';
  const passwordHash = hashPassword(randomPassword);

  const result = await database.transaction(async (trx) => {
    const user = await authRepository.createUser(trx, {
      full_name: fullName || email.split('@')[0],
      username,
      email,
      phone: null,
      password_hash: passwordHash
    });

    await authRepository.assignRoleToUser(trx, user.id, customerRole.id);

    return {
      user,
      roles: [customerRole]
    };
  });

  return {
    ok: true,
    isNew: true,
    sessionUser: buildSessionUser(result.user, result.roles)
  };
}

module.exports = {
  authenticateLogin,
  registerCustomerAccount,
  validateRegistrationPayload,
  registerOrLoginGoogleUser
};
