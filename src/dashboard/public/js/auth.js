(() => {
  const body = document.body;
  const langButtons = document.querySelectorAll('[data-lang-option]');
  const themeButtons = document.querySelectorAll('[data-theme-option]');
  const passwordToggle = document.querySelector('[data-password-toggle]');
  const passwordInput = document.querySelector('#password');

  const translations = {
    id: {
      'lang.id': 'Indonesia',
      'lang.en': 'English',
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'topbar.language_switch': 'Ganti bahasa',
      'topbar.theme_switch': 'Ganti tema',
      'auth.username.label': 'Username',
      'auth.username.placeholder': 'nama_pengguna',
      'auth.password.label': 'Password',
      'auth.password.placeholder': 'Masukkan password',
      'auth.no_account': 'Belum punya akun? Hubungi admin',
      'auth.submit': 'Masuk',
      'auth.show_password': 'Tampilkan password',
      'auth.hide_password': 'Sembunyikan password'
    },
    en: {
      'lang.id': 'Indonesian',
      'lang.en': 'English',
      'theme.light': 'Light',
      'theme.dark': 'Dark',
      'topbar.language_switch': 'Switch language',
      'topbar.theme_switch': 'Switch theme',
      'auth.username.label': 'Username',
      'auth.username.placeholder': 'your_username',
      'auth.password.label': 'Password',
      'auth.password.placeholder': 'Enter your password',
      'auth.no_account': "Don't have an account? Contact admin",
      'auth.submit': 'Sign in',
      'auth.show_password': 'Show password',
      'auth.hide_password': 'Hide password'
    }
  };

  function setLanguage(lang) {
    const map = translations[lang] || translations.id;

    document.documentElement.lang = lang === 'en' ? 'en' : 'id';

    document.querySelectorAll('[data-i18n]').forEach((element) => {
      const key = element.getAttribute('data-i18n');
      if (map[key]) {
        element.textContent = map[key];
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
      const key = element.getAttribute('data-i18n-placeholder');
      if (map[key]) {
        element.setAttribute('placeholder', map[key]);
      }
    });

    document.querySelectorAll('[data-i18n-label]').forEach((element) => {
      const key = element.getAttribute('data-i18n-label');
      if (map[key]) {
        element.setAttribute('aria-label', map[key]);
      }
    });

    langButtons.forEach((button) => {
      const isActive = button.dataset.langOption === lang;
      button.setAttribute('aria-pressed', String(isActive));
    });

    localStorage.setItem('smartstock-lang', lang);
  }

  function setTheme(theme) {
    body.setAttribute('data-theme', theme);

    themeButtons.forEach((button) => {
      const isActive = button.dataset.themeOption === theme;
      button.setAttribute('aria-pressed', String(isActive));
    });

    localStorage.setItem('smartstock-theme', theme);
  }

  langButtons.forEach((button) => {
    button.addEventListener('click', () => setLanguage(button.dataset.langOption));
  });

  themeButtons.forEach((button) => {
    button.addEventListener('click', () => setTheme(button.dataset.themeOption));
  });

  if (passwordToggle && passwordInput) {
    passwordToggle.addEventListener('click', () => {
      const hidden = passwordInput.type === 'password';
      passwordInput.type = hidden ? 'text' : 'password';
      passwordToggle.setAttribute('aria-pressed', String(hidden));
      const currentLang = document.documentElement.lang === 'en' ? 'en' : 'id';
      passwordToggle.setAttribute('aria-label', hidden ? translations[currentLang]['auth.hide_password'] : translations[currentLang]['auth.show_password']);
      passwordToggle.querySelector('.password-field__icon--show').style.display = hidden ? 'none' : 'block';
      passwordToggle.querySelector('.password-field__icon--hide').style.display = hidden ? 'block' : 'none';
    });
  }

  const preferredLang = localStorage.getItem('smartstock-lang') || 'id';
  const preferredTheme = localStorage.getItem('smartstock-theme') || 'light';

  setLanguage(preferredLang);
  setTheme(preferredTheme);
})();
