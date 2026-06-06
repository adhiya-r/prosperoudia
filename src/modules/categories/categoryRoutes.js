const express = require('express');
const categoryController = require('./categoryController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), categoryController.showCategories);
router.post('/', requireAuth, requireRole('Admin'), categoryController.createCategory);

module.exports = router;
