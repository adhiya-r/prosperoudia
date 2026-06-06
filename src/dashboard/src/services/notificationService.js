const notificationRepository = require('../repositories/notificationRepository');
const LOW_STOCK_NOTIFICATION_TITLE = 'Low Stock Alert';
const LOW_STOCK_NOTIFICATION_ROLES = ['Admin', 'Warehouse Manager'];

function getAudience(sessionUser) {
  if (!sessionUser) {
    return {
      userId: null,
      roleNames: []
    };
  }

  const roleNames = Array.isArray(sessionUser.roles)
    ? sessionUser.roles.map((role) => role?.name ?? null).filter(Boolean)
    : [sessionUser.primaryRole?.name ?? sessionUser.role ?? null].filter(Boolean);

  return {
    userId: sessionUser.id ?? null,
    roleNames
  };
}

async function listNotifications(limit = 25, trx) {
  return notificationRepository.listLatest(limit, trx);
}

async function listNotificationsForUser(sessionUser, limit = 25, trx) {
  const audience = getAudience(sessionUser);

  if (!audience.userId && !audience.roleNames.length) {
    return [];
  }

  return notificationRepository.listLatestForAudience(limit, audience, trx);
}

async function createNotification(payload, trx) {
  if (!payload?.severity || !payload?.title || !payload?.message) {
    const error = new Error('Notification payload tidak lengkap');
    error.statusCode = 400;
    throw error;
  }

  if (!payload.user_id && !payload.role_target) {
    const error = new Error('Notification harus punya target user atau role');
    error.statusCode = 400;
    throw error;
  }

  return notificationRepository.create(payload, trx);
}

async function getNotificationById(id, trx) {
  return notificationRepository.findById(id, trx);
}

async function getNotificationByIdForUser(id, sessionUser, trx) {
  const audience = getAudience(sessionUser);

  if (!audience.userId && !audience.roleNames.length) {
    return null;
  }

  return notificationRepository.findByIdForAudience(id, audience, trx);
}

async function markNotificationAsRead(id, sessionUser, trx) {
  const current = await getNotificationByIdForUser(id, sessionUser, trx);

  if (!current) {
    return null;
  }

  if (current.is_read) {
    return current;
  }

  return notificationRepository.markAsRead(id, trx);
}

async function ensureLowStockAlerts(lowStockProducts = [], trx) {
  const createdNotifications = [];

  for (const product of lowStockProducts) {
    const currentQuantity = Number(product.current_quantity ?? 0);
    const threshold = Number(product.threshold ?? 0);

    for (const roleTarget of LOW_STOCK_NOTIFICATION_ROLES) {
      const existing = await notificationRepository.findUnreadByEntityAndRole(
        {
          entityType: 'product',
          entityId: product.id,
          roleTarget,
          title: LOW_STOCK_NOTIFICATION_TITLE
        },
        trx
      );

      if (existing) {
        continue;
      }

      const notification = await createNotification(
        {
          role_target: roleTarget,
          severity: 'warning',
          title: LOW_STOCK_NOTIFICATION_TITLE,
          message: `Produk ${product.name} (${product.sku}) berada di bawah batas minimum: ${currentQuantity} / ${threshold}`,
          entity_type: 'product',
          entity_id: product.id
        },
        trx
      );

      createdNotifications.push(notification);
    }
  }

  return createdNotifications;
}

module.exports = {
  listNotifications,
  listNotificationsForUser,
  createNotification,
  ensureLowStockAlerts,
  LOW_STOCK_NOTIFICATION_TITLE,
  getNotificationById,
  getNotificationByIdForUser,
  getAudience,
  markNotificationAsRead
};
