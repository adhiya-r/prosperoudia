const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const categoryService = require('../../src/modules/categories/categoryService');
const supplierService = require('../../src/modules/suppliers/supplierService');
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
