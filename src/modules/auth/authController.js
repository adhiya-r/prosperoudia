const authService = require('./authService');

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

  req.session.user = authentication.sessionUser;
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

  req.session.user = registration.sessionUser;
  return res.redirect('/?type=success&message=Registrasi%20berhasil.%20Silakan%20lanjutkan%20belanja.');
}

async function logout(req, res) {
  await new Promise((resolve, reject) => {
    req.session.destroy((error) => {
      if (error) {
        return reject(error);
      }

      res.clearCookie('connect.sid');
      return resolve();
    });
  });

  return res.redirect('/');
}

module.exports = {
  showLogin,
  showRegister,
  login,
  register,
  logout
};
