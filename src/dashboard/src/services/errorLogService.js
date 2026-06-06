const errorLogRepository = require('../repositories/errorLogRepository');
const userRepository = require('../repositories/userRepository');
const notificationService = require('./notificationService');

const ERROR_NOTIFICATION_TITLE = 'System Error Detected';

async function listErrorLogs(limit = 25, trx) {
  return errorLogRepository.listLatest(limit, trx);
}

function inferSeverity(error) {
  const statusCode = Number(error?.statusCode ?? error?.status ?? 500);

  if (statusCode >= 500) {
    return 'critical';
  }

  if (statusCode >= 400) {
    return 'warning';
  }

  return 'info';
}

function buildErrorPayload(error, req) {
  return {
    severity: inferSeverity(error),
    message: error?.message || 'Unknown application error',
    stack_trace: error?.stack || null,
    request_path: req?.originalUrl || req?.path || null,
    request_method: req?.method || null,
    user_id: req?.session?.user?.id ?? null,
    ip_address: req?.ip || null,
    user_agent: req?.headers?.['user-agent'] || null,
    metadata: {
      statusCode: Number(error?.statusCode ?? error?.status ?? 500),
      code: error?.code ?? null
    }
  };
}

async function logError(error, req, trx) {
  const record = await errorLogRepository.create(buildErrorPayload(error, req), trx);

  if (record && ['critical', 'warning'].includes(record.severity)) {
    try {
      const adminUsers = await userRepository.listActiveUsersByRoleName('Admin', trx);

      for (const adminUser of adminUsers) {
        await notificationService.createNotification(
          {
            user_id: adminUser.id,
            severity: record.severity,
            title: ERROR_NOTIFICATION_TITLE,
            message: `${record.request_method || 'APP'} ${record.request_path || 'unknown'}: ${record.message}`,
            entity_type: 'error_log',
            entity_id: record.id
          },
          trx
        );
      }
    } catch (notificationError) {
      console.error('Failed to write admin error notification:', notificationError);
    }
  }

  return record;
}

module.exports = {
  listErrorLogs,
  logError,
  buildErrorPayload,
  inferSeverity,
  ERROR_NOTIFICATION_TITLE
};
