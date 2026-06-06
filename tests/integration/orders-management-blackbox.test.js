const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const orderManagementService = require('../../src/modules/orders/orderManagementService');
const { getCsrfToken } = require('../helpers/csrf');

async function loginAsCashier(agent) {
  const originalAuthenticateLogin = authService.authenticateLogin;
  authService.authenticateLogin = async () => ({
    ok: true,
    sessionUser: {
      id: 3,
      full_name: 'Kasir Demo',
      username: 'kasir',
      email: 'kasir@prosperoudia.local',
      phone: '081300000003',
      role: 'Kasir',
      primaryRole: {
        name: 'Kasir',
        display_name: 'Kasir'
      },
      roles: [
        {
          name: 'Kasir',
          display_name: 'Kasir'
        }
      ]
    }
  });

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent.post('/login').type('form').send({ csrfToken, identifier: 'kasir', password: 'Kasir123!', redirect_to: '/' });
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
}

test('GET /orders/manage redirects guests to /login', async () => {
  const response = await supertest(app).get('/orders/manage');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('GET /orders/manage renders internal order list', async () => {
  const originalListOrders = orderManagementService.listOrders;
  orderManagementService.listOrders = async () => ([
    {
      id: 99,
      order_number: 'ORD-DEMO-99',
      customer_name: 'Pelanggan Demo',
      customer_phone: '081100000004',
      total_amount_label: 'Rp12.500',
      status: 'confirmed',
      statusLabel: 'Terkonfirmasi',
      paymentStatusLabel: 'Menunggu Pembayaran'
    }
  ]);

  const agent = supertest.agent(app);

  try {
    await loginAsCashier(agent);
    const response = await agent.get('/orders/manage');

    assert.equal(response.status, 200);
    assert.match(response.text, /Manajemen Order/i);
    assert.match(response.text, /ORD-DEMO-99/);
  } finally {
    orderManagementService.listOrders = originalListOrders;
  }
});

test('POST /orders/manage/:id/status validates completed order payment status', async () => {
  const originalGetOrderDetail = orderManagementService.getOrderDetail;
  const originalUpdateOrderStatus = orderManagementService.updateOrderStatus;
  orderManagementService.getOrderDetail = async () => ({
    id: 99,
    order_number: 'ORD-DEMO-99',
    customer_name: 'Pelanggan Demo',
    customer_email: 'pelanggan@prosperoudia.local',
    customer_phone: '081100000004',
    status: 'confirmed',
    statusLabel: 'Terkonfirmasi',
    payment_status: 'pending',
    paymentStatusLabel: 'Menunggu Pembayaran',
    totalAmountLabel: 'Rp12.500',
    items: []
  });
  orderManagementService.updateOrderStatus = async () => {
    const error = new Error('Validasi status order gagal.');
    error.statusCode = 422;
    error.validation = {
      errors: {
        payment_status: 'Order yang selesai harus sudah dibayar.'
      }
    };
    throw error;
  };

  const agent = supertest.agent(app);

  try {
    await loginAsCashier(agent);
    const csrfToken = await getCsrfToken(agent, '/orders/manage/99');
    const response = await agent.post('/orders/manage/99/status').type('form').send({
      csrfToken,
      status: 'completed',
      payment_status: 'pending',
      notes: 'Belum lunas'
    });

    assert.equal(response.status, 422);
    assert.match(response.text, /Order yang selesai harus sudah dibayar/i);
  } finally {
    orderManagementService.getOrderDetail = originalGetOrderDetail;
    orderManagementService.updateOrderStatus = originalUpdateOrderStatus;
  }
});

test('POST /orders/manage/:id/status redirects on successful update', async () => {
  const originalGetOrderDetail = orderManagementService.getOrderDetail;
  const originalUpdateOrderStatus = orderManagementService.updateOrderStatus;
  orderManagementService.getOrderDetail = async () => ({
    id: 99,
    order_number: 'ORD-DEMO-99',
    customer_name: 'Pelanggan Demo',
    customer_email: 'pelanggan@prosperoudia.local',
    customer_phone: '081100000004',
    status: 'confirmed',
    statusLabel: 'Terkonfirmasi',
    payment_status: 'pending',
    paymentStatusLabel: 'Menunggu Pembayaran',
    totalAmountLabel: 'Rp12.500',
    items: []
  });
  orderManagementService.updateOrderStatus = async () => ({ ok: true });

  const agent = supertest.agent(app);

  try {
    await loginAsCashier(agent);
    const csrfToken = await getCsrfToken(agent, '/orders/manage/99');
    const response = await agent.post('/orders/manage/99/status').type('form').send({
      csrfToken,
      status: 'confirmed',
      payment_status: 'paid',
      notes: 'Lunas'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.location, '/orders/manage/99?type=success&message=Status%20order%20berhasil%20diperbarui');
  } finally {
    orderManagementService.getOrderDetail = originalGetOrderDetail;
    orderManagementService.updateOrderStatus = originalUpdateOrderStatus;
  }
});
