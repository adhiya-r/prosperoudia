const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const categoryService = require('../../src/modules/categories/categoryService');
const supplierService = require('../../src/modules/suppliers/supplierService');
const userManagementService = require('../../src/modules/users/userManagementService');
const { getCsrfToken } = require('../helpers/csrf');

async function loginAsAdmin(agent) {
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

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent.post('/login').type('form').send({ csrfToken, identifier: 'admin', password: 'Admin123!', redirect_to: '/' });
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
}

test('GET /categories redirects guests to /login', async () => {
  const response = await supertest(app).get('/categories');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('GET /categories renders category page for admin', async () => {
  const originalListCategories = categoryService.listCategories;
  categoryService.listCategories = async () => ([
    { id: 1, code: 'OBT-BEBAS', name: 'Obat Bebas', description: 'Demo', is_active: true }
  ]);

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const response = await agent.get('/categories');

    assert.equal(response.status, 200);
    assert.match(response.text, /Kategori Obat/);
    assert.match(response.text, /OBT-BEBAS/);
  } finally {
    categoryService.listCategories = originalListCategories;
  }
});

test('POST /categories rejects invalid input', async () => {
  const originalListCategories = categoryService.listCategories;
  categoryService.listCategories = async () => [];

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/categories');
    const response = await agent.post('/categories').type('form').send({ csrfToken, code: 'ab_', name: 'x' });

    assert.equal(response.status, 422);
    assert.match(response.text, /huruf kapital, angka, dan tanda hubung/i);
    assert.match(response.text, /minimal 3 karakter/i);
  } finally {
    categoryService.listCategories = originalListCategories;
  }
});

test('POST /categories redirects on successful create', async () => {
  const originalCreateCategory = categoryService.createCategory;
  categoryService.createCategory = async () => ({ id: 10 });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/categories');
    const response = await agent
      .post('/categories')
      .type('form')
      .send({ csrfToken, code: 'HERBAL', name: 'Herbal', description: 'Obat herbal' });

    assert.equal(response.status, 302);
    assert.match(response.headers.location, /\/categories\?type=success/);
  } finally {
    categoryService.createCategory = originalCreateCategory;
  }
});

test('GET /suppliers renders supplier page for admin', async () => {
  const originalListSuppliers = supplierService.listSuppliers;
  supplierService.listSuppliers = async () => ([
    { id: 1, code: 'SUP-001', name: 'PT Sehat Sentosa', phone: '0812', email: 'demo@test.local', address: 'Jakarta', is_active: true }
  ]);

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const response = await agent.get('/suppliers');

    assert.equal(response.status, 200);
    assert.match(response.text, /Supplier/);
    assert.match(response.text, /SUP-001/);
  } finally {
    supplierService.listSuppliers = originalListSuppliers;
  }
});

test('POST /suppliers rejects invalid input', async () => {
  const originalListSuppliers = supplierService.listSuppliers;
  supplierService.listSuppliers = async () => [];

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/suppliers');
    const response = await agent.post('/suppliers').type('form').send({ csrfToken, code: 'ab_', name: 'x', phone: '08abc', email: 'invalid' });

    assert.equal(response.status, 422);
    assert.match(response.text, /huruf kapital, angka, dan tanda hubung/i);
    assert.match(response.text, /minimal 3 karakter/i);
    assert.match(response.text, /Nomor telepon hanya boleh angka/i);
    assert.match(response.text, /Format email supplier tidak valid/i);
  } finally {
    supplierService.listSuppliers = originalListSuppliers;
  }
});

test('POST /suppliers redirects on successful create', async () => {
  const originalCreateSupplier = supplierService.createSupplier;
  supplierService.createSupplier = async () => ({ id: 20 });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/suppliers');
    const response = await agent
      .post('/suppliers')
      .type('form')
      .send({ csrfToken, code: 'SUP-002', name: 'PT Farma Demo', email: 'supplier@test.local' });

    assert.equal(response.status, 302);
    assert.match(response.headers.location, /\/suppliers\?type=success/);
  } finally {
    supplierService.createSupplier = originalCreateSupplier;
  }
});

test('GET /system/users renders account management page for admin without warehouse info', async () => {
  const originalListUserAccounts = userManagementService.listUserAccounts;
  const originalListRoleOptions = userManagementService.listRoleOptions;
  userManagementService.listUserAccounts = async () => ([
    {
      id: 1,
      full_name: 'Admin Prosperoudia',
      username: 'admin',
      email: 'admin@prosperoudia.local',
      phone: '081100000001',
      role_id: 1,
      role_label: 'Admin',
      account_group_label: 'Internal',
      is_active: true,
      status_label: 'Aktif',
      last_login_label: '6 Jun 2026 10.00',
      created_at_label: '5 Jun 2026 09.00',
      created_at: '2026-06-05T09:00:00.000Z',
      last_login_at: '2026-06-06T10:00:00.000Z'
    }
  ]);
  userManagementService.listRoleOptions = async () => ([
    { value: '1', label: 'Admin' },
    { value: '2', label: 'Apoteker' },
    { value: '3', label: 'Kasir' },
    { value: '4', label: 'Pelanggan' }
  ]);

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const response = await agent.get('/system/users');

    assert.equal(response.status, 200);
    assert.match(response.text, /Kelola akun aplikasi yang aktif dipakai pada operasional apotek/i);
    assert.match(response.text, /Kelola Akun/);
    assert.doesNotMatch(response.text, /warehouse/i);
  } finally {
    userManagementService.listUserAccounts = originalListUserAccounts;
    userManagementService.listRoleOptions = originalListRoleOptions;
  }
});

test('POST /system/users/:id redirects on successful account update', async () => {
  const originalUpdateUserAccount = userManagementService.updateUserAccount;
  userManagementService.updateUserAccount = async () => ({
    user: {
      id: 1,
      full_name: 'Admin Baru',
      username: 'adminbaru',
      email: 'adminbaru@prosperoudia.local',
      phone: '081100000099',
      is_active: true
    },
    previous: {
      full_name: 'Admin Prosperoudia',
      username: 'admin',
      email: 'admin@prosperoudia.local'
    },
    selectedRole: {
      id: 1,
      name: 'Admin',
      display_name: 'Admin'
    },
    updated: {
      full_name: 'Admin Baru',
      username: 'adminbaru',
      email: 'adminbaru@prosperoudia.local',
      phone: '081100000099',
      role_id: 1,
      is_active: true,
      role_label: 'Admin'
    }
  });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/system/users');
    const response = await agent
      .post('/system/users/1')
      .type('form')
      .send({
        csrfToken,
        full_name: 'Admin Baru',
        username: 'adminbaru',
        email: 'adminbaru@prosperoudia.local',
        phone: '081100000099',
        role_id: '1',
        is_active: 'true'
      });

    assert.equal(response.status, 302);
    assert.match(response.headers.location, /\/system\/users\?message=Data\+akun\+berhasil\+diperbarui&type=success/);
  } finally {
    userManagementService.updateUserAccount = originalUpdateUserAccount;
  }
});
