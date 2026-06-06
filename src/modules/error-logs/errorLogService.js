const database = require('../../config/database');
const notificationService = require('../notifications/notificationService');
const errorLogRepository = require('./errorLogRepository');

function normalizeSeverity(severity) {
  return ['info', 'warning', 'critical'].includes(severity) ? severity : 'warning';
}

async function logError({ error, req, severity = 'warning', metadata = null }, trx = database) {
  const normalizedSeverity = normalizeSeverity(severity);
  try {
    const record = await errorLogRepository.createErrorLog(trx, {
      severity: normalizedSeverity,
      message: String(error?.message ?? 'Unknown error'),
      stack_trace: error?.stack || null,
      request_path: req?.originalUrl || req?.path || null,
      request_method: req?.method || null,
      user_id: req?.session?.user?.id || null,
      ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || null,
      user_agent: req?.get ? req.get('user-agent') : req?.headers?.['user-agent'] || null,
      metadata_json: metadata ? JSON.stringify(metadata) : null
    });

    if (normalizedSeverity === 'critical') {
      await notificationService.createNotificationsForRole(
        'Admin',
        {
          severity: 'critical',
          title: 'Error aplikasi',
          message: record?.message || 'Terjadi error aplikasi yang perlu ditinjau.',
          link_url: '/system/monitoring'
        },
        trx
      );
    }

    return record;
  } catch (loggingError) {
    console.error(loggingError);
    return null;
  }
}

module.exports = {
  logError
};
