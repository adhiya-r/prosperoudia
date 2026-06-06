const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('audit_logs').select(
    'audit_logs.id',
    'audit_logs.user_id',
    'audit_logs.user_role',
    'audit_logs.action',
    'audit_logs.entity_type',
    'audit_logs.entity_id',
    'audit_logs.old_value',
    'audit_logs.new_value',
    'audit_logs.ip_address',
    'audit_logs.user_agent',
    'audit_logs.created_at'
  );
}

async function create(payload, trx = database) {
  const [record] = await trx('audit_logs')
    .insert({
      user_id: payload.user_id ?? null,
      user_role: payload.user_role ?? null,
      action: payload.action,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      old_value: payload.old_value ?? null,
      new_value: payload.new_value ?? null,
      ip_address: payload.ip_address ?? null,
      user_agent: payload.user_agent ?? null
    })
    .returning([
      'id',
      'user_id',
      'user_role',
      'action',
      'entity_type',
      'entity_id',
      'old_value',
      'new_value',
      'ip_address',
      'user_agent',
      'created_at'
    ]);

  return record ?? null;
}

async function listLatest(limit = 50, trx = database) {
  return baseQuery(trx).orderBy('audit_logs.created_at', 'desc').limit(limit);
}

module.exports = {
  create,
  listLatest
};
