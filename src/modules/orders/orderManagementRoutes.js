const express = require('express');
const orderManagementController = require('./orderManagementController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/manage', requireAuth, requireRole('Admin', 'Apoteker', 'Kasir'), orderManagementController.showOrderList);
router.get('/manage/:orderId', requireAuth, requireRole('Admin', 'Apoteker', 'Kasir'), orderManagementController.showOrderDetail);
router.post('/manage/:orderId/status', requireAuth, requireRole('Admin', 'Apoteker', 'Kasir'), orderManagementController.submitOrderStatus);

module.exports = router;
