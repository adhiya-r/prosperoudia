const test = require('node:test');
const assert = require('node:assert/strict');
const supertest = require('supertest');

const app = require('../../src/app');
const authService = require('../../src/modules/auth/authService');
const prescriptionService = require('../../src/modules/prescriptions/prescriptionService');
const { getCsrfToken } = require('../helpers/csrf');

async function loginAsPharmacist(agent) {
  const originalAuthenticateLogin = authService.authenticateLogin;
  authService.authenticateLogin = async () => ({
    ok: true,
    sessionUser: {
      id: 2,
      full_name: 'Apoteker Demo',
      username: 'apoteker',
      email: 'apoteker@prosperoudia.local',
      phone: '081200000002',
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

  try {
    const csrfToken = await getCsrfToken(agent, '/');
    await agent.post('/login').type('form').send({ csrfToken, identifier: 'apoteker', password: 'Apoteker123!', redirect_to: '/' });
  } finally {
    authService.authenticateLogin = originalAuthenticateLogin;
  }
}

test('GET /prescriptions/review redirects guests to /login', async () => {
  const response = await supertest(app).get('/prescriptions/review');

  assert.equal(response.status, 302);
  assert.equal(response.headers.location, '/login');
});

test('GET /prescriptions/review renders pending prescription list for apoteker', async () => {
  const originalListPending = prescriptionService.listPendingPrescriptions;
  prescriptionService.listPendingPrescriptions = async () => ([
    {
      id: 10,
      order_id: 99,
      order_number: 'ORD-DEMO-99',
      customer_name: 'Pelanggan Demo',
      customer_phone: '081100000004',
      doctor_name: 'dr. Andi',
      prescription_number: 'RX-001',
      status: 'pending',
      total_amount_label: 'Rp32.000'
    }
  ]);

  const agent = supertest.agent(app);

  try {
    await loginAsPharmacist(agent);
    const response = await agent.get('/prescriptions/review');

    assert.equal(response.status, 200);
    assert.match(response.text, /Verifikasi Resep/i);
    assert.match(response.text, /ORD-DEMO-99/);
    assert.match(response.text, /dr\. Andi/);
  } finally {
    prescriptionService.listPendingPrescriptions = originalListPending;
  }
});

test('POST /prescriptions/:id/review validates rejection reason', async () => {
  const originalGetDetail = prescriptionService.getPrescriptionDetail;
  const originalReview = prescriptionService.reviewPrescription;
  prescriptionService.getPrescriptionDetail = async () => ({
    id: 10,
    order_id: 99,
    order_number: 'ORD-DEMO-99',
    customer_name: 'Pelanggan Demo',
    customer_email: 'pelanggan@prosperoudia.local',
    doctor_name: 'dr. Andi',
    image_path: '/uploads/resep-demo.jpg',
    total_amount_label: 'Rp32.000',
    items: [
      {
        medicine_name_snapshot: 'Omeprazole 20 mg',
        medicine_sku_snapshot: 'OMZ-20',
        quantity: 1,
        total_price_label: 'Rp32.000'
      }
    ]
  });
  prescriptionService.reviewPrescription = async () => {
    const error = new Error('Validasi review resep gagal.');
    error.statusCode = 422;
    error.validation = {
      errors: {
        rejection_reason: 'Alasan penolakan minimal 5 karakter.'
      }
    };
    throw error;
  };

  const agent = supertest.agent(app);

  try {
    await loginAsPharmacist(agent);
    const csrfToken = await getCsrfToken(agent, '/prescriptions/10');
    const response = await agent
      .post('/prescriptions/10/review')
      .type('form')
      .send({
        csrfToken,
        decision: 'rejected',
        reviewed_notes: 'Data resep tidak terbaca',
        rejection_reason: 'abc'
      });

    assert.equal(response.status, 422);
    assert.match(response.text, /Alasan penolakan minimal 5 karakter/i);
  } finally {
    prescriptionService.getPrescriptionDetail = originalGetDetail;
    prescriptionService.reviewPrescription = originalReview;
  }
});

test('POST /prescriptions/:id/review redirects on successful review', async () => {
  const originalGetDetail = prescriptionService.getPrescriptionDetail;
  const originalReview = prescriptionService.reviewPrescription;
  prescriptionService.getPrescriptionDetail = async () => ({
    id: 10,
    order_id: 99,
    order_number: 'ORD-DEMO-99',
    customer_name: 'Pelanggan Demo',
    customer_email: 'pelanggan@prosperoudia.local',
    doctor_name: 'dr. Andi',
    image_path: '/uploads/resep-demo.jpg',
    total_amount_label: 'Rp32.000',
    items: [
      {
        medicine_name_snapshot: 'Omeprazole 20 mg',
        medicine_sku_snapshot: 'OMZ-20',
        quantity: 1,
        total_price_label: 'Rp32.000'
      }
    ]
  });
  prescriptionService.reviewPrescription = async () => ({ id: 10, status: 'approved' });

  const agent = supertest.agent(app);

  try {
    await loginAsPharmacist(agent);
    const csrfToken = await getCsrfToken(agent, '/prescriptions/10');
    const response = await agent
      .post('/prescriptions/10/review')
      .type('form')
      .send({
        csrfToken,
        decision: 'approved',
        reviewed_notes: 'Resep valid dan dapat diproses.',
        rejection_reason: ''
      });

    assert.equal(response.status, 302);
    assert.equal(response.headers.location, '/prescriptions/review?type=success&message=Review%20resep%20berhasil%20disimpan');
  } finally {
    prescriptionService.getPrescriptionDetail = originalGetDetail;
    prescriptionService.reviewPrescription = originalReview;
  }
});
