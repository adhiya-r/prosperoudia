const database = require('../../config/database');
const orderRepository = require('../orders/orderRepository');
const prescriptionRepository = require('./prescriptionRepository');
const { hasOpenableFileReference, normalizeFileReference } = require('../../shared/utils/fileReference');

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatDateTimeID(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function validatePrescriptionReview(payload = {}) {
  const decision = String(payload.decision ?? '').trim().toLowerCase();
  const reviewedNotes = String(payload.reviewed_notes ?? '').trim();
  const rejectionReason = String(payload.rejection_reason ?? '').trim();
  const errors = {};

  if (!['approved', 'rejected'].includes(decision)) {
    errors.decision = 'Keputusan review resep wajib dipilih.';
  }

  if (reviewedNotes && reviewedNotes.length < 5) {
    errors.reviewed_notes = 'Catatan review minimal 5 karakter bila diisi.';
  }

  if (decision === 'rejected' && rejectionReason.length < 5) {
    errors.rejection_reason = 'Alasan penolakan minimal 5 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      decision,
      reviewed_notes: reviewedNotes || null,
      rejection_reason: rejectionReason || null
    }
  };
}

async function listPendingPrescriptions() {
  const records = await prescriptionRepository.findPendingPrescriptions();

  return records.map((record) => ({
    ...record,
    total_amount_label: formatCurrencyIDR(record.total_amount)
  }));
}

async function getPrescriptionDetail(prescriptionId) {
  const normalizedPrescriptionId = Number.parseInt(String(prescriptionId), 10);

  if (!Number.isInteger(normalizedPrescriptionId) || normalizedPrescriptionId <= 0) {
    const error = new Error('Resep tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  const record = await prescriptionRepository.findPrescriptionById(normalizedPrescriptionId);

  if (!record) {
    const error = new Error('Resep tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...record,
    image_path: normalizeFileReference(record.image_path),
    hasOpenablePrescriptionFile: hasOpenableFileReference(record.image_path),
    payment_proof_path: normalizeFileReference(record.payment_proof_path),
    total_amount_label: formatCurrencyIDR(record.total_amount),
    hasPaymentProof: hasOpenableFileReference(record.payment_proof_path),
    paymentProofUploadedAtLabel: formatDateTimeID(record.payment_proof_uploaded_at),
    items: record.items.map((item) => ({
      ...item,
      total_price_label: formatCurrencyIDR(item.total_price)
    }))
  };
}

async function reviewPrescription(prescriptionId, reviewerUser, payload) {
  const validation = validatePrescriptionReview(payload);

  if (!validation.valid) {
    const error = new Error('Validasi review resep gagal.');
    error.statusCode = 422;
    error.validation = validation;
    throw error;
  }

  const prescription = await prescriptionRepository.findPrescriptionById(prescriptionId);
  if (!prescription) {
    const error = new Error('Resep tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (prescription.status !== 'pending') {
    const error = new Error('Resep ini sudah pernah direview.');
    error.statusCode = 422;
    throw error;
  }

  const nextPrescriptionStatus = validation.value.decision;
  const nextOrderStatus = nextPrescriptionStatus === 'approved' ? 'confirmed' : 'cancelled';

  return database.transaction(async (trx) => {
    const reviewed = await prescriptionRepository.updatePrescriptionReview(trx, prescriptionId, {
      status: nextPrescriptionStatus,
      reviewed_notes: validation.value.reviewed_notes,
      rejection_reason: validation.value.rejection_reason,
      verified_by_user_id: reviewerUser.id,
      verified_at: trx.fn.now()
    });

    await orderRepository.updateOrderStatus(trx, prescription.order_id, {
      status: nextOrderStatus,
      confirmed_at: nextPrescriptionStatus === 'approved' ? trx.fn.now() : null
    });

    const customerUser = prescription.customer_email
      ? await orderRepository.findPortalUserByEmail(prescription.customer_email, trx)
      : null;

    return {
      prescription: reviewed,
      order_id: prescription.order_id,
      order_number: prescription.order_number,
      order_status: nextOrderStatus,
      customer_user_id: customerUser?.id ?? null
    };
  });
}

module.exports = {
  listPendingPrescriptions,
  getPrescriptionDetail,
  reviewPrescription,
  validatePrescriptionReview
};
