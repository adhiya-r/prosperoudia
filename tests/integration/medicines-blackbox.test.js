const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const medicineService = require('../../src/modules/medicines/medicineService');
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

test('GET /medicines redirects guests to /login', async () => {
  const response = await supertest(app).get('/medicines');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('GET /medicines renders medicine page for admin', async () => {
  const originalListMedicines = medicineService.listMedicines;
  const originalListMedicineOptions = medicineService.listMedicineOptions;
  medicineService.listMedicines = async () => ([
    {
      id: 1,
      sku: 'OBT-PCT-500',
      name: 'Paracetamol 500 mg',
      brand_name: 'Sanbe',
      category_name: 'Obat Bebas',
      supplier_name: 'PT Farma Sentosa',
      price_label: 'Rp12.500',
      requires_prescription: false,
      is_active: true
    }
  ]);
  medicineService.listMedicineOptions = async () => ({
    categories: [{ id: 1, name: 'Obat Bebas', is_active: true }],
    suppliers: [{ id: 1, name: 'PT Farma Sentosa', is_active: true }]
  });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const response = await agent.get('/medicines');

    assert.equal(response.status, 200);
    assert.match(response.text, /Tambah Obat/i);
    assert.match(response.text, /OBT-PCT-500/);
  } finally {
    medicineService.listMedicines = originalListMedicines;
    medicineService.listMedicineOptions = originalListMedicineOptions;
  }
});

test('POST /medicines rejects invalid input', async () => {
  const originalListMedicines = medicineService.listMedicines;
  const originalListMedicineOptions = medicineService.listMedicineOptions;
  medicineService.listMedicines = async () => [];
  medicineService.listMedicineOptions = async () => ({
    categories: [{ id: 1, name: 'Obat Bebas', is_active: true }],
    suppliers: [{ id: 1, name: 'PT Farma Sentosa', is_active: true }]
  });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/medicines');
    const response = await agent.post('/medicines').type('form').send({
      csrfToken,
      sku: 'ab_',
      name: 'x',
      category_id: '',
      supplier_id: '',
      unit_price: '-100'
    });

    assert.equal(response.status, 422);
    assert.match(response.text, /SKU obat hanya boleh/i);
    assert.match(response.text, /Nama obat minimal 3 karakter/i);
    assert.match(response.text, /Kategori obat wajib dipilih/i);
    assert.match(response.text, /Supplier obat wajib dipilih/i);
    assert.match(response.text, /Harga jual harus berupa angka/i);
  } finally {
    medicineService.listMedicines = originalListMedicines;
    medicineService.listMedicineOptions = originalListMedicineOptions;
  }
});

test('POST /medicines redirects on successful create', async () => {
  const originalCreateMedicine = medicineService.createMedicine;
  medicineService.createMedicine = async () => ({ id: 8 });

  const agent = supertest.agent(app);

  try {
    await loginAsAdmin(agent);
    const csrfToken = await getCsrfToken(agent, '/medicines');
    const response = await agent.post('/medicines').type('form').send({
      csrfToken,
      sku: 'OBT-PCT-500',
      name: 'Paracetamol 500 mg',
      category_id: '1',
      supplier_id: '1',
      unit_price: '12500',
      minimum_stock_threshold: '10'
    });

    assert.equal(response.status, 302);
    assert.match(response.headers.location, /\/medicines\?type=success/);
  } finally {
    medicineService.createMedicine = originalCreateMedicine;
  }
});

test('GET /medicines/:id renders public medicine detail page', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 1,
    sku: 'OBT-PCT-500',
    name: 'Paracetamol 500 mg',
    brand_name: 'Sanbe',
    category_name: 'Obat Bebas',
    supplier_name: 'PT Farma Sentosa',
    description: 'Obat penurun demam.',
    composition: 'Paracetamol 500 mg',
    dosage: '3 kali sehari',
    dosage_form: 'Tablet',
    strength: '500 mg',
    side_effects: 'Mual ringan',
    price_label: 'Rp12.500',
    requires_prescription: false
  });

  try {
    const response = await supertest(app).get('/medicines/1');

    assert.equal(response.status, 200);
    assert.match(response.text, /Paracetamol 500 mg/);
    assert.match(response.text, /Informasi Farmasi/i);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});
