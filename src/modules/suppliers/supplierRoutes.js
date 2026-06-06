const express = require('express');
const supplierController = require('./supplierController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), supplierController.showSuppliers);
router.post('/', requireAuth, requireRole('Admin'), supplierController.createSupplier);

module.exports = router;
