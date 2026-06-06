const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const medicineService = require('../../src/modules/medicines/medicineService');
const { getCsrfToken } = require('../helpers/csrf');

test('GET /cart renders empty cart for guest', async () => {
  const response = await supertest(app).get('/cart');

  assert.equal(response.status, 200);
  assert.match(response.text, /Keranjang Belanja/i);
  assert.match(response.text, /Keranjang masih kosong/i);
});

test('POST /cart/items adds product to session cart and redirects back', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 1,
    sku: 'OBT-PCT-500',
    name: 'Paracetamol 500 mg',
    category_name: 'Obat Bebas',
    unit_price: 12500,
    price_label: 'Rp12.500',
    requires_prescription: false
  });

  const agent = supertest.agent(app);

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    const addResponse = await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken, medicine_id: '1', quantity: '1', redirect_to: '/' });

    assert.equal(addResponse.status, 302);
    assert.match(addResponse.headers.location, /type=success/);

    const cartResponse = await agent.get('/cart');
    assert.equal(cartResponse.status, 200);
    assert.match(cartResponse.text, /Paracetamol 500 mg/);
    assert.match(cartResponse.text, /Rp12.500/);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});

test('POST /cart/items/:medicineId/update updates item quantity', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 2,
    sku: 'VIT-C1000',
    name: 'Vitamin C 1000 mg',
    category_name: 'Vitamin & Suplemen',
    unit_price: 28500,
    price_label: 'Rp28.500',
    requires_prescription: false
  });

  const agent = supertest.agent(app);

  try {
    const addToken = await getCsrfToken(agent, '/');
    await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken: addToken, medicine_id: '2', quantity: '1', redirect_to: '/cart' });

    const updateToken = await getCsrfToken(agent, '/cart');
    const updateResponse = await agent
      .post('/cart/items/2/update')
      .type('form')
      .send({ csrfToken: updateToken, quantity: '3' });

    assert.equal(updateResponse.status, 302);
    assert.match(updateResponse.headers.location, /diperbarui/);

    const cartResponse = await agent.get('/cart');
    assert.match(cartResponse.text, /85\.500/);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});

test('POST /cart/items/:medicineId/remove removes item from cart', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 3,
    sku: 'OMZ-20',
    name: 'Omeprazole 20 mg',
    category_name: 'Pencernaan',
    unit_price: 32000,
    price_label: 'Rp32.000',
    requires_prescription: true
  });

  const agent = supertest.agent(app);

  try {
    const addToken = await getCsrfToken(agent, '/');
    await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken: addToken, medicine_id: '3', quantity: '1', redirect_to: '/cart' });

    const removeToken = await getCsrfToken(agent, '/cart');
    const removeResponse = await agent.post('/cart/items/3/remove').type('form').send({ csrfToken: removeToken });
    assert.equal(removeResponse.status, 302);
    assert.match(removeResponse.headers.location, /Item%20dihapus/);

    const cartResponse = await agent.get('/cart');
    assert.match(cartResponse.text, /Keranjang masih kosong/i);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});
