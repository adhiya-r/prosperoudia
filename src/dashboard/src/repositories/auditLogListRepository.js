const database = require('../config/database');

async function listLatest(limit = 25, trx = database) {
  return trx('audit_logs as a')
    .leftJoin('users as u', 'u.id', 'a.user_id')
    .select(
      'a.id',
      'a.user_id',
      'a.user_role',
      'a.action',
      'a.entity_type',
      'a.entity_id',
      'a.created_at',
      'u.full_name as user_full_name'
    )
    .orderBy('a.created_at', 'desc')
    .limit(limit);
}

module.exports = {
  listLatest
};
