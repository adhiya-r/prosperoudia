const authService = require('./authService');
const auditLogService = require('../audit-logs/auditLogService');
const env = require('../../config/env');

async function regenerateAuthenticatedSession(req, sessionUser) {
  const previousCart = req.session?.cart ?? { items: [] };

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }

      req.session.user = sessionUser;
      req.session.cart = previousCart;
      return resolve();
    });
  });
}

function showLogin(req, res) {
  return res.redirect('/?login=1');
}

function showRegister(req, res) {
  const mode = String(req.query.mode ?? 'register').trim() === 'login' ? 'login' : 'register';
  return res.render('pages/auth/register', {
    pageTitle: mode === 'login' ? 'Masuk' : 'Daftar',
    mode,
    formValues: {},
    formErrors: {},
    flashMessage: null,
    loginError: String(req.query.error ?? '').trim() || null,
    loginFormValues: {
      identifier: String(req.query.identifier ?? '').trim()
    }
  });
}

async function login(req, res) {
  const redirectTo = String(req.body?.redirect_to ?? '/').trim() || '/';
  const identifier = String(req.body?.identifier ?? req.body?.username ?? '').trim();
  const password = String(req.body?.password ?? '');
  const authSurface = String(req.body?.auth_surface ?? '').trim();
  const loginRedirectBase = authSurface === 'register-page' ? '/register?mode=login' : '/?login=1';

  if (!identifier || !password) {
    return res.redirect(`${loginRedirectBase}&error=${encodeURIComponent('Email/username dan password wajib diisi.')}&identifier=${encodeURIComponent(identifier)}`);
  }

  const authentication = await authService.authenticateLogin(identifier, password);

  if (!authentication.ok) {
    return res.redirect(`${loginRedirectBase}&error=${encodeURIComponent(authentication.message)}&identifier=${encodeURIComponent(identifier)}`);
  }

  await regenerateAuthenticatedSession(req, authentication.sessionUser);
  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(authentication.sessionUser, req, {
      action: 'login',
      entity_type: 'user',
      entity_id: authentication.sessionUser.id,
      new_value: {
        identifier,
        redirect_to: redirectTo
      }
    })
  );
  return res.redirect(redirectTo);
}

async function register(req, res) {
  const registration = await authService.registerCustomerAccount(req.body);

  if (!registration.ok) {
    return res.status(422).render('pages/auth/register', {
      pageTitle: 'Daftar',
      mode: 'register',
      formValues: {
        full_name: String(req.body?.full_name ?? '').trim(),
        username: String(req.body?.username ?? '').trim(),
        email: String(req.body?.email ?? '').trim(),
        phone: String(req.body?.phone ?? '').trim()
      },
      formErrors: registration.validation?.errors ?? {},
      flashMessage: 'Validasi registrasi gagal.',
      loginError: null,
      loginFormValues: {
        identifier: ''
      }
    });
  }

  await regenerateAuthenticatedSession(req, registration.sessionUser);
  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(registration.sessionUser, req, {
      action: 'register_customer_account',
      entity_type: 'user',
      entity_id: registration.sessionUser.id,
      new_value: {
        username: registration.sessionUser.username,
        email: registration.sessionUser.email
      }
    })
  );
  return res.redirect('/?type=success&message=Registrasi%20berhasil.%20Silakan%20lanjutkan%20belanja.');
}

async function logout(req, res) {
  const sessionUser = req.session?.user ?? null;
  if (sessionUser) {
    await auditLogService.recordAuditLog(
      auditLogService.buildAuditPayload(sessionUser, req, {
        action: 'logout',
        entity_type: 'user',
        entity_id: sessionUser.id
      })
    );
  }

  await new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        return reject(error);
      }

      res.clearCookie('connect.sid');
      return resolve();
    });
  });

  return res.redirect('/');
}

function googleAuthStart(req, res) {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET || !env.GOOGLE_CALLBACK_URL) {
    return res.status(500).render('pages/error', {
      pageTitle: 'Konfigurasi Google SSO Belum Lengkap',
      message: 'Google SSO memerlukan variabel lingkungan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, dan GOOGLE_CALLBACK_URL di file .env Anda.'
    });
  }

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(env.GOOGLE_CALLBACK_URL)}&response_type=code&scope=${encodeURIComponent('email profile')}`;
  return res.redirect(authUrl);
}

async function googleAuthCallback(req, res) {
  const { code, error } = req.query;

  if (error) {
    return res.redirect(`/?login=1&error=${encodeURIComponent(`Google OAuth Error: ${error}`)}`);
  }

  if (!code) {
    return res.redirect('/?login=1&error=Authorization+code+missing.');
  }

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        code,
        client_id: env.GOOGLE_CLIENT_ID,
        client_secret: env.GOOGLE_CLIENT_SECRET,
        redirect_uri: env.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      })
    });

    if (!tokenResponse.ok) {
      const errorBody = await tokenResponse.text();
      console.error('Google token exchange failed:', errorBody);
      return res.redirect(`/?login=1&error=${encodeURIComponent('Gagal menukarkan kode akses Google.')}`);
    }

    const tokens = await tokenResponse.json();

    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    if (!userInfoResponse.ok) {
      console.error('Google fetch userinfo failed');
      return res.redirect(`/?login=1&error=${encodeURIComponent('Gagal mengambil profil pengguna dari Google.')}`);
    }

    const profile = await userInfoResponse.json();
    const email = String(profile.email || '').trim().toLowerCase();
    const fullName = String(profile.name || '').trim();

    if (!email) {
      return res.redirect(`/?login=1&error=${encodeURIComponent('Email Google tidak ditemukan.')}`);
    }

    const loginResult = await authService.registerOrLoginGoogleUser(email, fullName);

    if (!loginResult.ok) {
      return res.redirect(`/?login=1&error=${encodeURIComponent(loginResult.message)}`);
    }

    await regenerateAuthenticatedSession(req, loginResult.sessionUser);

    await auditLogService.recordAuditLog(
      auditLogService.buildAuditPayload(loginResult.sessionUser, req, {
        action: loginResult.isNew ? 'google_sso_register' : 'google_sso_login',
        entity_type: 'user',
        entity_id: loginResult.sessionUser.id,
        new_value: {
          email,
          username: loginResult.sessionUser.username
        }
      })
    );

    const message = loginResult.isNew
      ? 'Registrasi sukses dengan Google. Selamat berbelanja!'
      : 'Berhasil masuk dengan Google.';
    return res.redirect(`/?type=success&message=${encodeURIComponent(message)}`);
  } catch (err) {
    console.error('Error during Google SSO callback:', err);
    return res.redirect(`/?login=1&error=${encodeURIComponent('Terjadi kesalahan sistem selama login Google.')}`);
  }
}

module.exports = {
  showLogin,
  showRegister,
  login,
  register,
  logout,
  googleAuthStart,
  googleAuthCallback
};
