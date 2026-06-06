const express = require('express');
const monitoringController = require('./monitoringController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/monitoring', requireAuth, requireRole('Admin'), monitoringController.showMonitoringPage);

module.exports = router;
