const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const medicineService = require('../../src/modules/medicines/medicineService');
const orderService = require('../../src/modules/orders/orderService');
const { getCsrfToken } = require('../helpers/csrf');

async function loginAsCustomer(agent) {
  const originalAuthenticateLogin = authService.authenticateLogin;
  authService.authenticateLogin = async () => ({
    ok: true,
    sessionUser: {
      id: 4,
      full_name: 'Pelanggan Demo',
      username: 'pelanggan',
      email: 'pelanggan@prosperoudia.local',
      phone: '081100000004',
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

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent.post('/login').type('form').send({ csrfToken, identifier: 'pelanggan', password: 'Pelanggan123!', redirect_to: '/' });
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
}

async function addDemoCartItem(agent) {
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

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken, medicine_id: '1', quantity: '1', redirect_to: '/cart' });
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
}

test('GET /checkout redirects guest to /login', async () => {
  const response = await supertest(app).get('/checkout');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('GET /checkout renders checkout page for logged in user with cart', async () => {
  const agent = supertest.agent(app);

  await loginAsCustomer(agent);
  await addDemoCartItem(agent);

  const response = await agent.get('/checkout');

  assert.equal(response.status, 200);
  assert.match(response.text, /Data Pemesanan/i);
  assert.match(response.text, /Paracetamol 500 mg/);
});

test('POST /checkout validates required fields', async () => {
  const agent = supertest.agent(app);

  await loginAsCustomer(agent);
  await addDemoCartItem(agent);

  const csrfToken = await getCsrfToken(agent, '/checkout');
  const response = await agent.post('/checkout').type('form').send({
    csrfToken,
    full_name: '',
    email: 'invalid',
    phone: '08abc',
    address: 'pendek',
    payment_method: '',
    fulfillment_method: ''
  });

  assert.equal(response.status, 422);
  assert.match(response.text, /Nama pelanggan wajib diisi/i);
  assert.match(response.text, /Format email pelanggan tidak valid/i);
  assert.match(response.text, /Nomor HP hanya boleh angka/i);
  assert.match(response.text, /Alamat pelanggan minimal 10 karakter/i);
});

test('POST /checkout creates order from cart and clears cart', async () => {
  const originalCreateOrderFromCart = orderService.createOrderFromCart;
  const originalGetOrderConfirmation = orderService.getOrderConfirmation;
  orderService.createOrderFromCart = async (session) => {
    session.cart = { items: [] };
    return { id: 99, order_number: 'ORD-DEMO-99' };
  };
  orderService.getOrderConfirmation = async () => ({
    id: 99,
    order_number: 'ORD-DEMO-99',
    status: 'confirmed',
    payment_status: 'pending',
    customer_name: 'Pelanggan Demo',
    customer_email: 'pelanggan@prosperoudia.local',
    customer_phone: '081100000004',
    paymentMethodLabel: 'QRIS',
    fulfillmentMethodLabel: 'Ambil di Klinik',
    totalAmountLabel: 'Rp12.500',
    items: [
      {
        medicine_name_snapshot: 'Paracetamol 500 mg',
        medicine_sku_snapshot: 'OBT-PCT-500',
        requires_prescription: false,
        totalPriceLabel: 'Rp12.500',
        unitPriceLabel: 'Rp12.500',
        quantity: 1
      }
    ]
  });

  const agent = supertest.agent(app);

  try {
    await loginAsCustomer(agent);
    await addDemoCartItem(agent);

    const csrfToken = await getCsrfToken(agent, '/checkout');
    const checkoutResponse = await agent.post('/checkout').type('form').send({
      csrfToken,
      full_name: 'Pelanggan Demo',
      email: 'pelanggan@prosperoudia.local',
      phone: '081100000004',
      address: 'Jl. Demo Pelanggan No. 10, Jakarta',
      payment_method: 'qris',
      fulfillment_method: 'pickup',
      notes: 'Tolong siapkan cepat'
    });

    assert.equal(checkoutResponse.status, 302);
    assert.equal(checkoutResponse.headers.location, '/orders/confirmation/99?type=success&message=Pesanan%20berhasil%20dibuat');

    const confirmationResponse = await agent.get('/orders/confirmation/99');
    assert.equal(confirmationResponse.status, 200);
    assert.match(confirmationResponse.text, /ORD-DEMO-99/);

    const cartResponse = await agent.get('/cart');
    assert.match(cartResponse.text, /Keranjang masih kosong/i);
  } finally {
    orderService.createOrderFromCart = originalCreateOrderFromCart;
    orderService.getOrderConfirmation = originalGetOrderConfirmation;
  }
});

test('POST /checkout requires prescription fields when cart contains prescription item', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 5,
    sku: 'OMZ-20',
    name: 'Omeprazole 20 mg',
    category_name: 'Pencernaan',
    unit_price: 32000,
    price_label: 'Rp32.000',
    requires_prescription: true
  });

  const agent = supertest.agent(app);

  try {
    await loginAsCustomer(agent);

    const addToken = await getCsrfToken(agent, '/');
    await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken: addToken, medicine_id: '5', quantity: '1', redirect_to: '/cart' });

    const csrfToken = await getCsrfToken(agent, '/checkout');
    const response = await agent.post('/checkout').type('form').send({
      csrfToken,
      full_name: 'Pelanggan Demo',
      email: 'pelanggan@prosperoudia.local',
      phone: '081100000004',
      address: 'Jl. Demo Pelanggan No. 10, Jakarta',
      payment_method: 'qris',
      fulfillment_method: 'pickup',
      notes: 'Mohon diproses',
      doctor_name: '',
      prescription_number: '',
      prescription_image_path: ''
    });

    assert.equal(response.status, 422);
    assert.match(response.text, /Nama dokter wajib diisi/i);
    assert.match(response.text, /Upload file resep atau isi link resep yang valid/i);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});

test('POST /checkout rejects invalid prescription file reference when prescription item requires review', async () => {
  const originalGetMedicineDetail = medicineService.getMedicineDetail;
  medicineService.getMedicineDetail = async () => ({
    id: 5,
    sku: 'OMZ-20',
    name: 'Omeprazole 20 mg',
    category_name: 'Pencernaan',
    unit_price: 32000,
    price_label: 'Rp32.000',
    requires_prescription: true
  });

  const agent = supertest.agent(app);

  try {
    await loginAsCustomer(agent);

    const addToken = await getCsrfToken(agent, '/');
    await agent
      .post('/cart/items')
      .type('form')
      .send({ csrfToken: addToken, medicine_id: '5', quantity: '1', redirect_to: '/cart' });

    const csrfToken = await getCsrfToken(agent, '/checkout');
    const response = await agent.post('/checkout').type('form').send({
      csrfToken,
      full_name: 'Pelanggan Demo',
      email: 'pelanggan@prosperoudia.local',
      phone: '081100000004',
      address: 'Jl. Demo Pelanggan No. 10, Jakarta',
      payment_method: 'qris',
      fulfillment_method: 'pickup',
      notes: 'Mohon diproses',
      doctor_name: 'dr. Demo',
      prescription_number: 'RX-001',
      prescription_image_path: 'alskdjflaksfjdl'
    });

    assert.equal(response.status, 422);
    assert.match(response.text, /Upload file resep atau isi link resep yang valid/i);
  } finally {
    medicineService.getMedicineDetail = originalGetMedicineDetail;
  }
});
