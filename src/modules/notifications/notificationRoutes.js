const express = require('express');
const notificationController = require('./notificationController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');

const router = express.Router();

router.get('/notifications/:notificationId/open', requireAuth, notificationController.openNotification);
router.post('/notifications/read-all', requireAuth, notificationController.markAllNotificationsAsRead);

module.exports = router;
