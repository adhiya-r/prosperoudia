const notificationService = require('./notificationService');

function getFallbackPath(sessionUser = {}) {
  const roles = Array.isArray(sessionUser?.roles) ? sessionUser.roles.map((role) => role?.name).filter(Boolean) : [];
  const primaryRole = sessionUser?.primaryRole?.name ?? sessionUser?.role ?? null;
  const roleNames = roles.length ? roles : primaryRole ? [primaryRole] : [];
  return roleNames.some((role) => ['Admin', 'Apoteker', 'Kasir'].includes(role)) ? '/notifications' : '/orders';
}

async function openNotification(req, res) {
  const userId = req.session?.user?.id ?? null;
  const notificationId = Number.parseInt(String(req.params.notificationId), 10);

  if (!notificationId || !userId) {
    return res.redirect('/login');
  }

  const notification = await notificationService.getNotificationForUser(notificationId, userId);
  if (!notification) {
    return res.redirect(`${getFallbackPath(req.session?.user)}?type=danger&message=Notifikasi%20tidak%20ditemukan.`);
  }

  if (!notification.is_read) {
    await notificationService.markNotificationAsReadForUser(notificationId, userId);
  }

  const target = notificationService.buildNotificationOpenPath(notification, req.session?.user ?? {});
  return res.redirect(target);
}

async function markAllNotificationsAsRead(req, res) {
  const userId = req.session?.user?.id ?? null;
  const redirectTarget = String(req.body?.redirect_to ?? req.query?.redirect_to ?? '').trim() || getFallbackPath(req.session?.user);

  if (!userId) {
    return res.redirect('/login');
  }

  await notificationService.markAllNotificationsAsReadForUser(userId);
  return res.redirect(redirectTarget);
}

module.exports = {
  markAllNotificationsAsRead,
  openNotification
};
