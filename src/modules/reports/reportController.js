const reportJobService = require('./reportJobService');
const reportExportService = require('./reportExportService');

async function showReports(req, res) {
  const jobs = await reportJobService.listLatestReportJobs(25);

  return res.render('pages/system/reports/index', {
    pageTitle: 'Laporan',
    jobs,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  });
}

async function exportReport(req, res) {
  const reportType = String(req.body?.report_type || '').trim();

  if (reportType !== reportExportService.REPORT_TYPE_PHARMACY_SUMMARY) {
    return res.redirect('/system/reports?type=danger&message=Tipe%20report%20belum%20didukung');
  }

  try {
    await reportExportService.generatePharmacySummaryPdf({
      createdBy: req.session.user.id,
      sessionUser: req.session.user
    });

    return res.redirect('/system/reports?type=success&message=PDF%20report%20berhasil%20dibuat');
  } catch (error) {
    return res.redirect(`/system/reports?type=danger&message=${encodeURIComponent(error.message || 'PDF report gagal dibuat')}`);
  }
}

module.exports = {
  showReports,
  exportReport
};
