const database = require('../../config/database');

async function createNotification(trx, payload) {
  const [record] = await trx('notifications')
    .insert({
      user_id: payload.user_id,
      severity: payload.severity,
      title: payload.title,
      message: payload.message,
      entity_type: payload.entity_type || null,
      entity_id: payload.entity_id || null,
      is_read: false
    })
    .returning(['id', 'user_id', 'severity', 'title', 'message', 'entity_type', 'entity_id', 'is_read', 'created_at']);

  return record ?? null;
}

async function listNotificationsByUserId(userId, limit = 5, trx = database) {
  return trx('notifications')
    .select('id', 'user_id', 'severity', 'title', 'message', 'entity_type', 'entity_id', 'is_read', 'created_at')
    .where('user_id', userId)
    .orderBy('created_at', 'desc')
    .limit(limit);
}

async function countUnreadNotificationsByUserId(userId, trx = database) {
  const record = await trx('notifications')
    .where('user_id', userId)
    .where('is_read', false)
    .count({ total: '*' })
    .first();

  return Number(record?.total ?? 0);
}

async function markNotificationAsReadByUserId(notificationId, userId, trx = database) {
  const [record] = await trx('notifications')
    .where('id', notificationId)
    .where('user_id', userId)
    .update({
      is_read: true
    })
    .returning(['id', 'user_id', 'severity', 'title', 'message', 'entity_type', 'entity_id', 'is_read', 'created_at']);

  return record ?? null;
}

async function findNotificationByIdAndUserId(notificationId, userId, trx = database) {
  return trx('notifications')
    .select('id', 'user_id', 'severity', 'title', 'message', 'entity_type', 'entity_id', 'is_read', 'created_at')
    .where('id', notificationId)
    .where('user_id', userId)
    .first();
}

async function markAllNotificationsAsReadByUserId(userId, trx = database) {
  return trx('notifications')
    .where('user_id', userId)
    .where('is_read', false)
    .update({
      is_read: true
    });
}

module.exports = {
  countUnreadNotificationsByUserId,
  createNotification,
  findNotificationByIdAndUserId,
  listNotificationsByUserId,
  markAllNotificationsAsReadByUserId,
  markNotificationAsReadByUserId
};
