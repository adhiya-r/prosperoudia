const express = require('express');
const userManagementController = require('./userManagementController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/users', requireAuth, requireRole('Admin'), userManagementController.showUserList);

module.exports = router;
