const database = require('../../config/database');
const notificationRepository = require('./notificationRepository');
const userManagementRepository = require('../users/userManagementRepository');

function normalizeSeverity(severity) {
  return ['info', 'warning', 'critical'].includes(severity) ? severity : 'info';
}

function getRoleNames(sessionUser = {}) {
  if (Array.isArray(sessionUser?.roles) && sessionUser.roles.length) {
    return sessionUser.roles.map((role) => role?.name).filter(Boolean);
  }

  const primaryRole = sessionUser?.primaryRole?.name ?? sessionUser?.role ?? null;
  return primaryRole ? [primaryRole] : [];
}

function buildNotificationOpenPath(notification, sessionUser = {}) {
  const roles = getRoleNames(sessionUser);
  const isInternal = roles.some((role) => ['Admin', 'Apoteker', 'Kasir'].includes(role));

  if (notification.entity_type === 'order' && notification.entity_id) {
    return isInternal ? `/orders/manage/${notification.entity_id}` : '/orders';
  }

  if (notification.entity_type === 'prescription' && notification.entity_id) {
    return isInternal ? `/prescriptions/${notification.entity_id}` : '/prescriptions';
  }

  return isInternal ? '/notifications' : '/orders';
}

function decorateNotification(notification, sessionUser = {}) {
  return {
    ...notification,
    open_url: `/notifications/${notification.id}/open`,
    target_url: buildNotificationOpenPath(notification, sessionUser)
  };
}

async function createNotification(payload, trx = database) {
  if (!payload?.user_id) {
    return null;
  }

  try {
    return await notificationRepository.createNotification(trx, {
      user_id: payload.user_id,
      severity: normalizeSeverity(payload.severity),
      title: String(payload.title ?? '').trim() || 'Notifikasi Sistem',
      message: String(payload.message ?? '').trim() || '-'
    });
  } catch (error) {
    console.error(error);
    return null;
  }
}

async function createNotificationsForRole(roleName, payload, trx = database) {
  let users = [];
  try {
    users = await userManagementRepository.findActiveUsersByRoleName(roleName, trx);
  } catch (error) {
    console.error(error);
    return [];
  }

  if (!users.length) {
    return [];
  }

  const results = [];
  for (const user of users) {
    const notification = await createNotification(
      {
        ...payload,
        user_id: user.id
      },
      trx
    );
    if (notification) {
      results.push(notification);
    }
  }

  return results;
}

async function listNotificationsForUser(userId, limit = 5, trx = database) {
  if (!userId) {
    return [];
  }

  return notificationRepository.listNotificationsByUserId(userId, limit, trx);
}

async function countUnreadNotificationsForUser(userId, trx = database) {
  if (!userId) {
    return 0;
  }

  return notificationRepository.countUnreadNotificationsByUserId(userId, trx);
}

async function markNotificationAsReadForUser(notificationId, userId, trx = database) {
  if (!notificationId || !userId) {
    return null;
  }

  return notificationRepository.markNotificationAsReadByUserId(notificationId, userId, trx);
}

async function getNotificationForUser(notificationId, userId, trx = database) {
  if (!notificationId || !userId) {
    return null;
  }

  return notificationRepository.findNotificationByIdAndUserId(notificationId, userId, trx);
}

async function markAllNotificationsAsReadForUser(userId, trx = database) {
  if (!userId) {
    return 0;
  }

  return notificationRepository.markAllNotificationsAsReadByUserId(userId, trx);
}

module.exports = {
  buildNotificationOpenPath,
  countUnreadNotificationsForUser,
  createNotification,
  createNotificationsForRole,
  decorateNotification,
  getNotificationForUser,
  listNotificationsForUser,
  markAllNotificationsAsReadForUser,
  markNotificationAsReadForUser
};
