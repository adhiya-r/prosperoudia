const express = require('express');
const reportController = require('./reportController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), reportController.showReports);
router.post('/export', requireAuth, requireRole('Admin'), reportController.exportReport);

module.exports = router;
