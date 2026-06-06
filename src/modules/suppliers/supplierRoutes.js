const express = require('express');
const supplierController = require('./supplierController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), supplierController.showSuppliers);
router.get('/new', requireAuth, requireRole('Admin'), supplierController.showCreateSupplierForm);
router.post('/', requireAuth, requireRole('Admin'), supplierController.createSupplier);
router.get('/:id/edit', requireAuth, requireRole('Admin'), supplierController.showEditSupplierForm);
router.post('/:id', requireAuth, requireRole('Admin'), supplierController.updateSupplier);
router.post('/:id/deactivate', requireAuth, requireRole('Admin'), supplierController.deactivateSupplier);
router.post('/:id/activate', requireAuth, requireRole('Admin'), supplierController.activateSupplier);
router.post('/:id/delete', requireAuth, requireRole('Admin'), supplierController.deleteSupplier);

module.exports = router;
