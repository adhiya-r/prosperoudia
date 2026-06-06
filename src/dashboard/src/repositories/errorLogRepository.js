const database = require('../config/database');

async function create(payload, trx = database) {
  const [record] = await trx('error_logs')
    .insert({
      severity: payload.severity,
      message: payload.message,
      stack_trace: payload.stack_trace ?? null,
      request_path: payload.request_path ?? null,
      request_method: payload.request_method ?? null,
      user_id: payload.user_id ?? null,
      ip_address: payload.ip_address ?? null,
      user_agent: payload.user_agent ?? null,
      metadata: payload.metadata ?? null
    })
    .returning([
      'id',
      'severity',
      'message',
      'stack_trace',
      'request_path',
      'request_method',
      'user_id',
      'ip_address',
      'user_agent',
      'metadata',
      'created_at'
    ]);

  return record ?? null;
}

async function listLatest(limit = 25, trx = database) {
  return trx('error_logs as e')
    .leftJoin('users as u', 'u.id', 'e.user_id')
    .select(
      'e.id',
      'e.severity',
      'e.message',
      'e.request_path',
      'e.request_method',
      'e.user_id',
      'e.ip_address',
      'e.created_at',
      'u.full_name as user_full_name'
    )
    .orderBy('e.created_at', 'desc')
    .limit(limit);
}

module.exports = {
  create,
  listLatest
};
