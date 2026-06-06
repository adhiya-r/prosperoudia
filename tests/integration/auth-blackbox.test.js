const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const { extractCsrfToken, getCsrfToken } = require('../helpers/csrf');

test('GET / renders the public home page for guests', async () => {
  const response = await supertest(app).get('/');

  assert.equal(response.status, 200);
  assert.match(response.text, /Cari obat/i);
  assert.match(response.text, /Masuk/i);
  assert.match(response.text, /Daftar/i);
});

test('GET /register renders the registration page', async () => {
  const response = await supertest(app).get('/register');

  assert.equal(response.status, 200);
  assert.match(response.text, /Daftar Sekarang/i);
  assert.match(response.text, /Google Placeholder/i);
});

test('POST /login rejects request without valid csrf token', async () => {
  const response = await supertest(app)
    .post('/login')
    .type('form')
    .send({ identifier: 'admin', password: 'Admin123!', redirect_to: '/' });

  assert.equal(response.status, 403);
  assert.match(response.text, /token keamanan tidak valid/i);
});

test('GET /dashboard redirects guests to /login', async () => {
  const response = await supertest(app).get('/dashboard');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('POST /login rejects missing credentials', async () => {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent, '/');
  const response = await agent
    .post('/login')
    .type('form')
    .send({ csrfToken, identifier: '', password: '', redirect_to: '/' });

  assert.equal(response.status, 302);
  assert.match(response.headers.location, /\/\?login=1/);
  assert.match(response.headers.location, /wajib%20diisi/i);
});

test('POST /login redirects to home on successful authentication', async () => {
  const originalAuthenticateLogin = authService.authenticateLogin;
  authService.authenticateLogin = async () => ({
    ok: true,
    sessionUser: {
      id: 1,
      full_name: 'Admin Prosperoudia',
      username: 'admin',
      email: 'admin@prosperoudia.local',
      role: 'Admin',
      primaryRole: {
        name: 'Admin',
        display_name: 'Admin'
      },
      roles: [
        {
          name: 'Admin',
          display_name: 'Admin'
        }
      ]
    }
  });

  const agent = supertest.agent(app);

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    const loginResponse = await agent
      .post('/login')
      .type('form')
      .send({ csrfToken, identifier: 'admin', password: 'Admin123!', redirect_to: '/' });

    assert.equal(loginResponse.status, 302);
    assert.equal(loginResponse.headers.location, '/');

    const homeResponse = await agent.get('/');
    assert.equal(homeResponse.status, 200);
    assert.match(homeResponse.text, /Admin Prosperoudia/);
    assert.match(homeResponse.text, /Dashboard/);
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
});

test('POST /logout clears the authenticated session', async () => {
  const originalAuthenticateLogin = authService.authenticateLogin;
  authService.authenticateLogin = async () => ({
    ok: true,
    sessionUser: {
      id: 2,
      full_name: 'Apoteker Demo',
      username: 'apoteker',
      email: 'apoteker@prosperoudia.local',
      role: 'Apoteker',
      primaryRole: {
        name: 'Apoteker',
        display_name: 'Apoteker'
      },
      roles: [
        {
          name: 'Apoteker',
          display_name: 'Apoteker'
        }
      ]
    }
  });

  const agent = supertest.agent(app);

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent
      .post('/login')
      .type('form')
      .send({ csrfToken, identifier: 'apoteker', password: 'Apoteker123!', redirect_to: '/' });

    const homeResponse = await agent.get('/');
    const logoutToken = extractCsrfToken(homeResponse.text);
    const logoutResponse = await agent.post('/logout').type('form').send({ csrfToken: logoutToken });
    assert.equal(logoutResponse.status, 302);
    assert.equal(logoutResponse.headers.location, '/');

    const dashboardResponse = await agent.get('/dashboard');
    assert.equal(dashboardResponse.status, 302);
    assert.equal(dashboardResponse.headers.location, '/login');
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
});

test('POST /register validates password policy', async () => {
  const agent = supertest.agent(app);
  const csrfToken = await getCsrfToken(agent, '/register');

  const response = await agent
    .post('/register')
    .type('form')
    .send({
      csrfToken,
      full_name: 'Rina Putri',
      username: 'rina_putri',
      email: 'rina@example.com',
      phone: '081234567890',
      password: 'abc',
      password_confirmation: 'abc'
    });

  assert.equal(response.status, 422);
  assert.match(response.text, /Password harus mengandung/i);
});

test('POST /register redirects to home on successful registration', async () => {
  const originalRegisterCustomerAccount = authService.registerCustomerAccount;
  authService.registerCustomerAccount = async () => ({
    ok: true,
    sessionUser: {
      id: 9,
      full_name: 'Rina Putri',
      username: 'rina_putri',
      email: 'rina@example.com',
      phone: '081234567890',
      role: 'Pelanggan',
      primaryRole: {
        name: 'Pelanggan',
        display_name: 'Pelanggan'
      },
      roles: [
        {
          name: 'Pelanggan',
          display_name: 'Pelanggan'
        }
      ]
    }
  });

  const agent = supertest.agent(app);

  try {
    const csrfToken = await getCsrfToken(agent, '/register');
    const response = await agent
      .post('/register')
      .type('form')
      .send({
        csrfToken,
        full_name: 'Rina Putri',
        username: 'rina_putri',
        email: 'rina@example.com',
        phone: '081234567890',
        password: 'RinaPutri123!',
        password_confirmation: 'RinaPutri123!'
      });

    assert.equal(response.status, 302);
    assert.match(response.headers.location, /^\/\?type=success/);
  } finally {
    authService.registerCustomerAccount = originalRegisterCustomerAccount;
  }
});
