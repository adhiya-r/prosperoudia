const database = require('../../config/database');

async function createAuditLog(trx, payload) {
  const [record] = await trx('audit_logs')
    .insert({
      user_id: payload.user_id || null,
      user_role: payload.user_role || null,
      action: payload.action,
      entity_type: payload.entity_type,
      entity_id: payload.entity_id || null,
      old_value_json: payload.old_value_json || null,
      new_value_json: payload.new_value_json || null,
      ip_address: payload.ip_address || null,
      user_agent: payload.user_agent || null
    })
    .returning(['id', 'action', 'entity_type', 'entity_id', 'created_at']);

  return record ?? null;
}

module.exports = {
  createAuditLog
};
