const monitoringService = require('./monitoringService');

async function showMonitoringPage(req, res) {
  const monitoringState = await monitoringService.getMonitoringState();

  return res.render('pages/system/monitoring', {
    pageTitle: 'Monitoring Sistem',
    currentPath: '/system/monitoring',
    monitoringDescription: 'Pantau kesehatan aplikasi, koneksi database, alert operasional, dan kapasitas runtime dari satu halaman.',
    primaryPanelTitle: 'Status Runtime',
    primaryPanelDescription: 'Ringkasan layanan aplikasi dan lingkungan server yang sedang dipakai.',
    secondaryPanelTitle: 'Alert Operasional',
    secondaryPanelDescription: 'Indikator cepat untuk backlog order, error log, dan notifikasi yang perlu ditindak.',
    ...monitoringState
  });
}

module.exports = {
  showMonitoringPage
};
