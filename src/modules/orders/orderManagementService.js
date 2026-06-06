const database = require('../../config/database');
const inventoryService = require('../inventory/inventoryService');
const orderRepository = require('./orderRepository');

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
    total_amount_label: formatCurrencyIDR(order.total_amount),
    statusLabel: toStatusLabel(order.status),
    paymentStatusLabel: toPaymentStatusLabel(order.payment_status)
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
    statusLabel: toStatusLabel(order.status),
    paymentStatusLabel: toPaymentStatusLabel(order.payment_status),
    totalAmountLabel: formatCurrencyIDR(order.total_amount),
    subtotalAmountLabel: formatCurrencyIDR(order.subtotal_amount),
    items: order.items.map((item) => ({
      ...item,
      totalPriceLabel: formatCurrencyIDR(item.total_price),
      unitPriceLabel: formatCurrencyIDR(item.unit_price)
    })),
    prescription: order.prescription
      ? {
          ...order.prescription,
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

  await database.transaction(async (trx) => {
    if (validation.value.status === 'completed' && order.status !== 'completed') {
      await inventoryService.allocateOrderStock(trx, order, actorUser?.id ?? null);
    }

    await orderRepository.updateOrderLifecycle(trx, orderId, validation.value);
  });

  return {
    ok: true
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
  updateOrderStatus,
  validateOrderStatusPayload
};
