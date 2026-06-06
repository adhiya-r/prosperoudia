const auditLogRepository = require('../repositories/auditLogListRepository');

async function listAuditLogs(limit = 25, trx) {
  return auditLogRepository.listLatest(limit, trx);
}

module.exports = {
  listAuditLogs
};
