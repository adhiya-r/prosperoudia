const database = require('../../config/database');
const inventoryService = require('../inventory/inventoryService');
const orderRepository = require('./orderRepository');
const { hasOpenableFileReference, normalizeFileReference } = require('../../shared/utils/fileReference');

const ORDER_STATUS_OPTIONS = [
  { value: 'pending_verification', label: 'Menunggu Verifikasi Resep' },
  { value: 'confirmed', label: 'Terkonfirmasi' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' }
];

const PAYMENT_STATUS_OPTIONS = [
  { value: 'unpaid', label: 'Belum Dibayar' },
  { value: 'pending', label: 'Menunggu Pembayaran' },
  { value: 'paid', label: 'Sudah Dibayar' },
  { value: 'failed', label: 'Pembayaran Gagal' }
];

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatDateTimeID(date) {
  if (!date) {
    return '-';
  }

  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toStatusLabel(status) {
  return {
    pending_verification: 'Menunggu Verifikasi Resep',
    confirmed: 'Terkonfirmasi',
    completed: 'Selesai',
    cancelled: 'Dibatalkan',
    draft: 'Draft'
  }[status] || status;
}

function toPaymentStatusLabel(status) {
  return {
    unpaid: 'Belum Dibayar',
    pending: 'Menunggu Pembayaran',
    paid: 'Sudah Dibayar',
    failed: 'Pembayaran Gagal'
  }[status] || status;
}

function validateOrderStatusPayload(payload = {}, order = null) {
  const status = String(payload.status ?? '').trim();
  const paymentStatus = String(payload.payment_status ?? '').trim();
  const notes = String(payload.notes ?? '').trim();
  const errors = {};

  if (!ORDER_STATUS_OPTIONS.some((item) => item.value === status)) {
    errors.status = 'Status order tidak valid.';
  }

  if (!PAYMENT_STATUS_OPTIONS.some((item) => item.value === paymentStatus)) {
    errors.payment_status = 'Status pembayaran tidak valid.';
  }

  if (order?.status === 'pending_verification' && !['pending_verification', 'cancelled'].includes(status)) {
    errors.status = 'Order resep yang belum direview hanya bisa tetap pending atau dibatalkan.';
  }

  if (status === 'completed' && paymentStatus !== 'paid') {
    errors.payment_status = 'Order yang selesai harus sudah dibayar.';
  }

  if (order?.status === 'completed' && status !== 'completed') {
    errors.status = 'Order yang sudah selesai tidak dapat diubah kembali.';
  }

  if (order?.status === 'cancelled' && status !== 'cancelled') {
    errors.status = 'Order yang sudah dibatalkan tidak dapat diaktifkan kembali.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      status,
      payment_status: paymentStatus,
      notes: notes || null
    }
  };
}

async function listOrders() {
  const orders = await orderRepository.listOrders();

  return orders.map((order) => ({
    ...order,
    payment_proof_path: normalizeFileReference(order.payment_proof_path),
    total_amount_label: formatCurrencyIDR(order.total_amount),
    statusLabel: toStatusLabel(order.status),
    paymentStatusLabel: toPaymentStatusLabel(order.payment_status),
    hasPaymentProof: hasOpenableFileReference(order.payment_proof_path),
    paymentProofStatusLabel: hasOpenableFileReference(order.payment_proof_path) ? 'Sudah Upload' : 'Belum Upload'
  }));
}

async function getOrderDetail(orderId) {
  const order = await orderRepository.findOrderWithItems(orderId);

  if (!order) {
    const error = new Error('Order tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...order,
    payment_proof_path: normalizeFileReference(order.payment_proof_path),
    statusLabel: toStatusLabel(order.status),
    paymentStatusLabel: toPaymentStatusLabel(order.payment_status),
    totalAmountLabel: formatCurrencyIDR(order.total_amount),
    subtotalAmountLabel: formatCurrencyIDR(order.subtotal_amount),
    paymentProofUploadedAtLabel: formatDateTimeID(order.payment_proof_uploaded_at),
    hasPaymentProof: hasOpenableFileReference(order.payment_proof_path),
    items: order.items.map((item) => ({
      ...item,
      totalPriceLabel: formatCurrencyIDR(item.total_price),
      unitPriceLabel: formatCurrencyIDR(item.unit_price)
    })),
    prescription: order.prescription
      ? {
          ...order.prescription,
          image_path: normalizeFileReference(order.prescription.image_path),
          hasOpenableFile: hasOpenableFileReference(order.prescription.image_path),
          statusLabel: {
            pending: 'Menunggu review apoteker',
            approved: 'Disetujui',
            rejected: 'Ditolak'
          }[order.prescription.status] || order.prescription.status
        }
      : null
  };
}

async function updateOrderStatus(orderId, payload, actorUser) {
  const order = await orderRepository.findOrderWithItems(orderId);

  if (!order) {
    const error = new Error('Order tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const validation = validateOrderStatusPayload(payload, order);
  if (!validation.valid) {
    const error = new Error('Validasi status order gagal.');
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  const previousState = {
    status: order.status,
    payment_status: order.payment_status,
    notes: order.notes
  };

  await database.transaction(async (trx) => {
    if (validation.value.status === 'completed' && order.status !== 'completed') {
      await inventoryService.allocateOrderStock(trx, order, actorUser?.id ?? null);
    }

    await orderRepository.updateOrderLifecycle(trx, orderId, validation.value);
  });

  const customerUser = order.customer_email
    ? await orderRepository.findPortalUserByEmail(order.customer_email)
    : null;

  return {
    ok: true,
    order: {
      id: order.id,
      order_number: order.order_number,
      customer_email: order.customer_email,
      customer_user_id: customerUser?.id ?? null
    },
    previous: previousState,
    updated: validation.value
  };
}

async function getReminderContext(orderId) {
  const order = await orderRepository.findOrderWithItems(orderId);

  if (!order) {
    const error = new Error('Order tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const customerUser = order.customer_email
    ? await orderRepository.findPortalUserByEmail(order.customer_email)
    : null;

  return {
    order,
    customerUser
  };
}

function getOrderStatusOptions() {
  return ORDER_STATUS_OPTIONS;
}

function getPaymentStatusOptions() {
  return PAYMENT_STATUS_OPTIONS;
}

module.exports = {
  getOrderDetail,
  getOrderStatusOptions,
  getPaymentStatusOptions,
  listOrders,
  getReminderContext,
  updateOrderStatus,
  validateOrderStatusPayload
};
