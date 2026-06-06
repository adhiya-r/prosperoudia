const database = require('../../config/database');
const cartService = require('./cartService');
const orderRepository = require('./orderRepository');
const prescriptionRepository = require('../prescriptions/prescriptionRepository');

const PAYMENT_METHODS = [
  { value: 'transfer_bank', label: 'Transfer Bank' },
  { value: 'qris', label: 'QRIS' },
  { value: 'pickup_counter', label: 'Bayar di Counter' }
];

const FULFILLMENT_METHODS = [
  { value: 'pickup', label: 'Ambil di Klinik' },
  { value: 'internal', label: 'Kirim Area Klinik' }
];

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function generateOrderNumber() {
  const stamp = new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `ORD-${stamp}-${suffix}`;
}

function validateCheckoutPayload(payload = {}) {
  const fullName = String(payload.full_name ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const phone = String(payload.phone ?? '').trim();
  const address = String(payload.address ?? '').trim();
  const paymentMethod = String(payload.payment_method ?? '').trim();
  const fulfillmentMethod = String(payload.fulfillment_method ?? '').trim();
  const notes = String(payload.notes ?? '').trim();
  const doctorName = String(payload.doctor_name ?? '').trim();
  const prescriptionNumber = String(payload.prescription_number ?? '').trim();
  const prescriptionImagePath = String(payload.prescription_image_path ?? '').trim();
  const errors = {};
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[0-9+]{8,15}$/;

  if (!fullName) {
    errors.full_name = 'Nama pelanggan wajib diisi.';
  }

  if (!email) {
    errors.email = 'Email pelanggan wajib diisi.';
  } else if (!emailPattern.test(email)) {
    errors.email = 'Format email pelanggan tidak valid.';
  }

  if (!phone) {
    errors.phone = 'Nomor HP pelanggan wajib diisi.';
  } else if (!phonePattern.test(phone)) {
    errors.phone = 'Nomor HP hanya boleh angka atau tanda +, panjang 8-15 karakter.';
  }

  if (!address) {
    errors.address = 'Alamat pelanggan wajib diisi.';
  } else if (address.length < 10) {
    errors.address = 'Alamat pelanggan minimal 10 karakter.';
  }

  if (!PAYMENT_METHODS.some((method) => method.value === paymentMethod)) {
    errors.payment_method = 'Metode pembayaran wajib dipilih.';
  }

  if (!FULFILLMENT_METHODS.some((method) => method.value === fulfillmentMethod)) {
    errors.fulfillment_method = 'Metode pengambilan/pengiriman wajib dipilih.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      full_name: fullName,
      email,
      phone,
      address,
      payment_method: paymentMethod,
      fulfillment_method: fulfillmentMethod,
      notes: notes || null,
      doctor_name: doctorName,
      prescription_number: prescriptionNumber || null,
      prescription_image_path: prescriptionImagePath
    }
  };
}

function buildCheckoutDefaults(sessionUser = {}) {
  return {
    full_name: sessionUser.full_name || '',
    email: sessionUser.email || '',
    phone: sessionUser.phone || '',
    address: '',
    payment_method: '',
    fulfillment_method: 'pickup',
    notes: '',
    doctor_name: '',
    prescription_number: '',
    prescription_image_path: ''
  };
}

function buildCheckoutPageData(session, sessionUser, overrides = {}, errors = {}, flashMessage = null, flashType = 'info') {
  const cart = cartService.getCartSummary(session);

  return {
    cart,
    requiresPrescription: cart.items.some((item) => item.requires_prescription),
    paymentMethods: PAYMENT_METHODS,
    fulfillmentMethods: FULFILLMENT_METHODS,
    formValues: {
      ...buildCheckoutDefaults(sessionUser),
      ...overrides
    },
    formErrors: errors,
    flashMessage,
    flashType
  };
}

async function createOrderFromCart(session, sessionUser, payload) {
  const cart = cartService.getCartSummary(session);

  if (!cart.items.length) {
    const error = new Error('Cart masih kosong. Tambahkan produk sebelum checkout.');
    error.statusCode = 422;
    throw error;
  }

  const validation = validateCheckoutPayload(payload);

  if (!validation.valid) {
    const error = new Error('Validasi checkout gagal.');
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  const hasPrescriptionItem = cart.items.some((item) => item.requires_prescription);

  if (hasPrescriptionItem) {
    if (!validation.value.doctor_name || validation.value.doctor_name.length < 3) {
      validation.errors.doctor_name = 'Nama dokter wajib diisi untuk pesanan yang memerlukan resep.';
    }

    if (!validation.value.prescription_image_path || validation.value.prescription_image_path.length < 5) {
      validation.errors.prescription_image_path = 'Referensi resep wajib diisi untuk pesanan yang memerlukan resep.';
    }
  }

  if (Object.keys(validation.errors).length > 0) {
    const error = new Error('Validasi checkout gagal.');
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  const orderResult = await database.transaction(async (trx) => {
    const existingCustomer = await orderRepository.findCustomerByEmail(validation.value.email);
    const customer = existingCustomer
      ? await orderRepository.updateCustomer(trx, existingCustomer.id, validation.value)
      : await orderRepository.createCustomer(trx, validation.value);

    const orderStatus = hasPrescriptionItem ? 'pending_verification' : 'confirmed';
    const paymentStatus = validation.value.payment_method === 'pickup_counter' ? 'unpaid' : 'pending';
    const orderNumber = generateOrderNumber();

    const order = await orderRepository.createOrder(trx, {
      order_number: orderNumber,
      customer_id: customer.id,
      channel: 'online',
      fulfillment_method: validation.value.fulfillment_method,
      status: orderStatus,
      payment_status: paymentStatus,
      payment_method: validation.value.payment_method,
      subtotal_amount: cart.totalAmount,
      discount_amount: 0,
      shipping_amount: 0,
      total_amount: cart.totalAmount,
      notes: validation.value.notes,
      placed_at: trx.fn.now(),
      confirmed_at: hasPrescriptionItem ? null : trx.fn.now()
    });

    await orderRepository.createOrderItems(
      trx,
      cart.items.map((item) => ({
        order_id: order.id,
        medicine_id: item.medicine_id,
        medicine_sku_snapshot: item.sku,
        medicine_name_snapshot: item.name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity
      }))
    );

    if (hasPrescriptionItem) {
      await prescriptionRepository.createPrescription(trx, {
        order_id: order.id,
        customer_id: customer.id,
        uploaded_by_user_id: sessionUser.id,
        doctor_name: validation.value.doctor_name,
        prescription_number: validation.value.prescription_number,
        image_path: validation.value.prescription_image_path,
        status: 'pending'
      });
    }

    return {
      id: order.id,
      order_number: order.order_number,
      status: orderStatus
    };
  });

  cartService.clearCart(session);

  return orderResult;
}

async function getOrderConfirmation(orderId) {
  const order = await orderRepository.findOrderWithItems(orderId);

  if (!order) {
    const error = new Error('Order tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...order,
    statusLabel: order.status === 'pending_verification'
      ? 'Menunggu verifikasi resep'
      : order.status === 'confirmed'
        ? 'Terkonfirmasi'
        : order.status === 'rejected'
          ? 'Ditolak'
          : order.status,
    subtotalAmountLabel: formatCurrencyIDR(order.subtotal_amount),
    totalAmountLabel: formatCurrencyIDR(order.total_amount),
    paymentMethodLabel: PAYMENT_METHODS.find((item) => item.value === order.payment_method)?.label || order.payment_method || '-',
    fulfillmentMethodLabel: FULFILLMENT_METHODS.find((item) => item.value === order.fulfillment_method)?.label || order.fulfillment_method || '-',
    items: order.items.map((item) => ({
      ...item,
      unitPriceLabel: formatCurrencyIDR(item.unit_price),
      totalPriceLabel: formatCurrencyIDR(item.total_price)
    })),
    prescription: order.prescription
      ? {
          ...order.prescription,
          statusLabel: order.prescription.status === 'pending'
            ? 'Menunggu review apoteker'
            : order.prescription.status === 'approved'
              ? 'Disetujui'
              : 'Ditolak'
        }
      : null
  };
}

module.exports = {
  buildCheckoutPageData,
  createOrderFromCart,
  getOrderConfirmation,
  validateCheckoutPayload
};
