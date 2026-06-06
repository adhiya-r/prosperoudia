const database = require('../../config/database');
const orderRepository = require('./orderRepository');
const prescriptionRepository = require('../prescriptions/prescriptionRepository');
const auditLogService = require('../audit-logs/auditLogService');
const notificationService = require('../notifications/notificationService');
const { hasOpenableFileReference, normalizeFileReference } = require('../../shared/utils/fileReference');

const STATUS_LABELS = {
  pending_verification: 'Menunggu Verifikasi Resep',
  confirmed: 'Terkonfirmasi',
  completed: 'Selesai',
  cancelled: 'Dibatalkan'
};

const PAYMENT_STATUS_LABELS = {
  unpaid: 'Belum Dibayar',
  pending: 'Menunggu Pembayaran',
  paid: 'Sudah Dibayar',
  failed: 'Pembayaran Gagal',
  refunded: 'Direfund'
};

const STATUS_TONES = {
  pending_verification: 'warning',
  confirmed: 'info',
  completed: 'success',
  cancelled: 'danger'
};

function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount ?? 0);
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatDateTime(date) {
  if (!date) return '-';
  return new Date(date).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

async function showMyOrders(req, res) {
  const userEmail = req.session?.user?.email;
  if (!userEmail) {
    return res.redirect('/');
  }

  const rawOrders = await orderRepository.listOrdersByEmail(userEmail);
  const orders = rawOrders.map((o) => ({
    ...o,
    payment_proof_path: normalizeFileReference(o.payment_proof_path),
    statusLabel: STATUS_LABELS[o.status] ?? o.status,
    statusTone: STATUS_TONES[o.status] ?? 'neutral',
    paymentStatusLabel: PAYMENT_STATUS_LABELS[o.payment_status] ?? o.payment_status,
    totalAmountLabel: formatCurrency(o.total_amount),
    placedAtLabel: formatDate(o.placed_at),
    paymentProofUploadedAtLabel: formatDateTime(o.payment_proof_uploaded_at),
    canUploadPaymentProof: !['completed', 'cancelled'].includes(o.status),
    hasPaymentProof: hasOpenableFileReference(o.payment_proof_path)
  }));

  const activeOrders = orders.filter((o) => !['completed', 'cancelled'].includes(o.status));
  const historyOrders = orders.filter((o) => ['completed', 'cancelled'].includes(o.status));

  return res.render('pages/orders/my-orders', {
    pageTitle: 'Pesanan Saya',
    activeOrders,
    historyOrders,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  });
}

async function uploadPaymentProof(req, res) {
  const userEmail = req.session?.user?.email;
  if (!userEmail) {
    return res.redirect('/login');
  }

  const paymentProofPath = req.uploadedFiles?.payment_proof || '';
  if (!paymentProofPath) {
    return res.redirect('/orders?type=danger&message=File%20bukti%20pembayaran%20wajib%20diunggah.');
  }

  const order = await orderRepository.findOrderByIdAndEmail(req.params.orderId, userEmail);
  if (!order) {
    return res.redirect('/orders?type=danger&message=Pesanan%20tidak%20ditemukan.');
  }

  if (['completed', 'cancelled'].includes(order.status)) {
    return res.redirect('/orders?type=danger&message=Pesanan%20ini%20sudah%20ditutup%20dan%20tidak%20bisa%20diubah.');
  }

  const updated = await orderRepository.updateOrderPaymentProof(database, order.id, {
    payment_proof_path: paymentProofPath,
    payment_proof_uploaded_at: new Date(),
    payment_status: order.payment_status === 'paid' ? 'paid' : 'pending'
  });

  if (updated?.id) {
    await auditLogService.recordAuditLog(
      auditLogService.buildAuditPayload(req.session.user, req, {
        action: 'upload_payment_proof',
        entity_type: 'order',
        entity_id: updated.id,
        old_value: {
          payment_proof_path: order.payment_proof_path,
          payment_status: order.payment_status
        },
        new_value: {
          payment_proof_path: updated.payment_proof_path,
          payment_status: updated.payment_status
        }
      })
    );

    await notificationService.createNotificationsForRole('Kasir', {
      severity: 'info',
      title: 'Bukti pembayaran baru',
      message: `Pelanggan mengunggah bukti pembayaran untuk order ${updated.order_number}.`,
      entity_type: 'order',
      entity_id: updated.id
    });

    await notificationService.createNotificationsForRole('Admin', {
      severity: 'info',
      title: 'Bukti pembayaran diterima',
      message: `Order ${updated.order_number} sudah memiliki bukti pembayaran baru dari pelanggan.`,
      entity_type: 'order',
      entity_id: updated.id
    });
  }

  return res.redirect('/orders?type=success&message=Bukti%20pembayaran%20berhasil%20diunggah.');
}

async function showMyPrescriptions(req, res) {
  const userEmail = req.session?.user?.email;
  if (!userEmail) {
    return res.redirect('/');
  }

  const rawPrescriptions = await prescriptionRepository.findPrescriptionsByEmail(userEmail);
  const PRESCRIPTION_STATUS_LABELS = {
    pending: 'Menunggu Verifikasi',
    approved: 'Disetujui',
    rejected: 'Ditolak'
  };
  const PRESCRIPTION_STATUS_TONES = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  };

  const prescriptions = rawPrescriptions.map((p) => ({
    ...p,
    image_path: normalizeFileReference(p.image_path),
    hasOpenableFile: hasOpenableFileReference(p.image_path),
    statusLabel: PRESCRIPTION_STATUS_LABELS[p.status] ?? p.status,
    statusTone: PRESCRIPTION_STATUS_TONES[p.status] ?? 'neutral',
    createdAtLabel: formatDate(p.created_at)
  }));

  return res.render('pages/prescriptions/my-prescriptions', {
    pageTitle: 'Resep Saya',
    prescriptions
  });
}

module.exports = {
  showMyOrders,
  showMyPrescriptions,
  uploadPaymentProof
};
