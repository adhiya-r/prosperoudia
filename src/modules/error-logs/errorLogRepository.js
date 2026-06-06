const database = require('../../config/database');

async function createErrorLog(trx, payload) {
  const [record] = await trx('error_logs')
    .insert({
      severity: payload.severity,
      message: payload.message,
      stack_trace: payload.stack_trace || null,
      request_path: payload.request_path || null,
      request_method: payload.request_method || null,
      user_id: payload.user_id || null,
      ip_address: payload.ip_address || null,
      user_agent: payload.user_agent || null,
      metadata_json: payload.metadata_json || null
    })
    .returning(['id', 'severity', 'message', 'request_path', 'request_method', 'created_at']);

  return record ?? null;
}

module.exports = {
  createErrorLog
};
