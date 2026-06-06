const database = require('../config/database');

function applyAudienceFilter(query, audience = {}) {
  const userId = Number(audience.userId ?? 0);
  const roleNames = Array.isArray(audience.roleNames) ? audience.roleNames.filter(Boolean) : [];

  query.andWhere(function filterAudience() {
    if (userId > 0) {
      this.orWhere('n.user_id', userId);
    }

    if (roleNames.length) {
      this.orWhereIn('n.role_target', roleNames);
    }
  });

  return query;
}

async function listLatest(limit = 25, trx = database) {
  return trx('notifications as n')
    .leftJoin('users as u', 'u.id', 'n.user_id')
    .select(
      'n.id',
      'n.user_id',
      'n.role_target',
      'n.severity',
      'n.title',
      'n.message',
      'n.entity_type',
      'n.entity_id',
      'n.is_read',
      'n.read_at',
      'n.created_at',
      'u.full_name as user_full_name'
    )
    .orderBy('n.created_at', 'desc')
    .limit(limit);
}

async function listLatestForAudience(limit = 25, audience = {}, trx = database) {
  const query = trx('notifications as n')
    .leftJoin('users as u', 'u.id', 'n.user_id')
    .select(
      'n.id',
      'n.user_id',
      'n.role_target',
      'n.severity',
      'n.title',
      'n.message',
      'n.entity_type',
      'n.entity_id',
      'n.is_read',
      'n.read_at',
      'n.created_at',
      'u.full_name as user_full_name'
    );

  applyAudienceFilter(query, audience);

  return query.orderBy('n.created_at', 'desc').limit(limit);
}

async function create(payload, trx = database) {
  const [record] = await trx('notifications')
    .insert({
      user_id: payload.user_id ?? null,
      role_target: payload.role_target ?? null,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      entity_type: payload.entity_type ?? null,
      entity_id: payload.entity_id ?? null,
      is_read: payload.is_read ?? false,
      read_at: payload.read_at ?? null
    })
    .returning([
      'id',
      'user_id',
      'role_target',
      'severity',
      'title',
      'message',
      'entity_type',
      'entity_id',
      'is_read',
      'read_at',
      'created_at'
    ]);

  return record ?? null;
}

async function findUnreadByEntityAndRole({
  entityType,
  entityId,
  roleTarget,
  title
}, trx = database) {
  return trx('notifications')
    .where({
      entity_type: entityType,
      entity_id: entityId,
      role_target: roleTarget,
      title,
      is_read: false
    })
    .orderBy('created_at', 'desc')
    .first();
}

async function findById(id, trx = database) {
  return trx('notifications as n')
    .leftJoin('users as u', 'u.id', 'n.user_id')
    .select(
      'n.id',
      'n.user_id',
      'n.role_target',
      'n.severity',
      'n.title',
      'n.message',
      'n.entity_type',
      'n.entity_id',
      'n.is_read',
      'n.read_at',
      'n.created_at',
      'u.full_name as user_full_name'
    )
    .where('n.id', id)
    .first();
}

async function findByIdForAudience(id, audience = {}, trx = database) {
  const query = trx('notifications as n')
    .leftJoin('users as u', 'u.id', 'n.user_id')
    .select(
      'n.id',
      'n.user_id',
      'n.role_target',
      'n.severity',
      'n.title',
      'n.message',
      'n.entity_type',
      'n.entity_id',
      'n.is_read',
      'n.read_at',
      'n.created_at',
      'u.full_name as user_full_name'
    )
    .where('n.id', id);

  applyAudienceFilter(query, audience);

  return query.first();
}

async function markAsRead(id, trx = database) {
  const [record] = await trx('notifications')
    .where('id', id)
    .update({
      is_read: true,
      read_at: trx.fn.now()
    })
    .returning([
      'id',
      'user_id',
      'role_target',
      'severity',
      'title',
      'message',
      'entity_type',
      'entity_id',
      'is_read',
      'read_at',
      'created_at'
    ]);

  return record ?? null;
}

module.exports = {
  listLatest,
  listLatestForAudience,
  create,
  findUnreadByEntityAndRole,
  findById,
  findByIdForAudience,
  markAsRead
};
