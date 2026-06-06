const database = require('../../config/database');
const auditLogRepository = require('./auditLogRepository');

function extractRequestContext(req) {
  return {
    ip_address: req?.ip || req?.headers?.['x-forwarded-for'] || null,
    user_agent: req?.get ? req.get('user-agent') : req?.headers?.['user-agent'] || null
  };
}

function buildAuditPayload(sessionUser, req, payload = {}) {
  return {
    user_id: sessionUser?.id || null,
    user_role: sessionUser?.role || null,
    action: payload.action,
    entity_type: payload.entity_type,
    entity_id: payload.entity_id || null,
    old_value_json: payload.old_value ? JSON.stringify(payload.old_value) : null,
    new_value_json: payload.new_value ? JSON.stringify(payload.new_value) : null,
    ...extractRequestContext(req)
  };
}

async function recordAuditLog(payload, trx = database) {
  if (!payload?.action || !payload?.entity_type) {
    return null;
  }

  try {
    return await auditLogRepository.createAuditLog(trx, payload);
  } catch (error) {
    console.error(error);
    return null;
  }
}

module.exports = {
  buildAuditPayload,
  extractRequestContext,
  recordAuditLog
};
