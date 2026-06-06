const prescriptionService = require('./prescriptionService');

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
    await prescriptionService.reviewPrescription(req.params.prescriptionId, req.session.user, req.body);
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
