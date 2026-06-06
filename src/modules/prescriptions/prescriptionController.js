const prescriptionService = require('./prescriptionService');
const auditLogService = require('../audit-logs/auditLogService');
const notificationService = require('../notifications/notificationService');

async function showPendingPrescriptions(req, res) {
  const prescriptions = await prescriptionService.listPendingPrescriptions();

  return res.render('pages/prescriptions/index', {
    pageTitle: 'Verifikasi Resep',
    prescriptions,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  });
}

async function showPrescriptionReview(req, res) {
  try {
    const prescription = await prescriptionService.getPrescriptionDetail(req.params.prescriptionId);

    return res.render('pages/prescriptions/show', {
      pageTitle: 'Review Resep',
      prescription,
      formValues: {
        decision: '',
        reviewed_notes: '',
        rejection_reason: ''
      },
      formErrors: {},
      flashMessage: req.query.message ?? null,
      flashType: req.query.type ?? 'info'
    });
  } catch (error) {
    return res.status(error.statusCode ?? 500).render('pages/error', {
      pageTitle: error.statusCode === 404 ? 'Resep Tidak Ditemukan' : 'Terjadi Kesalahan',
      message: error.message || 'Data resep tidak dapat ditampilkan.'
    });
  }
}

async function submitPrescriptionReview(req, res) {
  try {
    const review = await prescriptionService.reviewPrescription(req.params.prescriptionId, req.session.user, req.body);
    if (review?.prescription?.id) {
      await auditLogService.recordAuditLog(
        auditLogService.buildAuditPayload(req.session.user, req, {
          action: 'review_prescription',
          entity_type: 'prescription',
          entity_id: review.prescription.id,
          old_value: {
            status: 'pending'
          },
          new_value: {
            status: review.prescription.status,
            order_status: review.order_status,
            rejection_reason: review.prescription.rejection_reason
          }
        })
      );
      await notificationService.createNotificationsForRole('Admin', {
        severity: review.prescription.status === 'approved' ? 'info' : 'warning',
        title: 'Review resep selesai',
        message: `Resep untuk order ${review.order_number} ${review.prescription.status === 'approved' ? 'disetujui' : 'ditolak'}.`,
        entity_type: 'prescription',
        entity_id: review.prescription.id
      });
      if (review.customer_user_id) {
        await notificationService.createNotification({
          user_id: review.customer_user_id,
          severity: review.prescription.status === 'approved' ? 'info' : 'warning',
          title: review.prescription.status === 'approved' ? 'Resep Anda disetujui' : 'Resep Anda ditolak',
          message: review.prescription.status === 'approved'
            ? `Resep untuk order ${review.order_number} sudah disetujui. Silakan lanjutkan pembayaran dan unggah bukti bila tersedia.`
            : `Resep untuk order ${review.order_number} ditolak. Silakan cek catatan apoteker atau unggah resep yang benar.`,
          entity_type: 'prescription',
          entity_id: review.prescription.id
        });
      }
      if (review.prescription.status === 'approved') {
        await notificationService.createNotificationsForRole('Kasir', {
          severity: 'info',
          title: 'Order siap dicek pembayaran',
          message: `Order ${review.order_number} sudah lolos verifikasi resep dan siap dicek pembayarannya.`,
          entity_type: 'order',
          entity_id: review.order_id
        });
      }
    }
    return res.redirect('/prescriptions/review?type=success&message=Review%20resep%20berhasil%20disimpan');
  } catch (error) {
    if (error.statusCode === 422 && error.validation) {
      const prescription = await prescriptionService.getPrescriptionDetail(req.params.prescriptionId);

      return res.status(422).render('pages/prescriptions/show', {
        pageTitle: 'Review Resep',
        prescription,
        formValues: {
          decision: String(req.body?.decision ?? '').trim(),
          reviewed_notes: String(req.body?.reviewed_notes ?? '').trim(),
          rejection_reason: String(req.body?.rejection_reason ?? '').trim()
        },
        formErrors: error.validation.errors,
        flashMessage: 'Validasi review resep gagal.',
        flashType: 'danger'
      });
    }

    return res.redirect(`/prescriptions/review?type=danger&message=${encodeURIComponent(error.message || 'Review resep gagal.')}`);
  }
}

module.exports = {
  showPendingPrescriptions,
  showPrescriptionReview,
  submitPrescriptionReview
};
