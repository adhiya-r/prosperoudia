const express = require('express');
const categoryController = require('./categoryController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), categoryController.showCategories);
router.get('/new', requireAuth, requireRole('Admin'), categoryController.showCreateCategoryForm);
router.post('/', requireAuth, requireRole('Admin'), categoryController.createCategory);
router.get('/:id/edit', requireAuth, requireRole('Admin'), categoryController.showEditCategoryForm);
router.post('/:id', requireAuth, requireRole('Admin'), categoryController.updateCategory);
router.post('/:id/deactivate', requireAuth, requireRole('Admin'), categoryController.deactivateCategory);
router.post('/:id/activate', requireAuth, requireRole('Admin'), categoryController.activateCategory);
router.post('/:id/delete', requireAuth, requireRole('Admin'), categoryController.deleteCategory);

module.exports = router;
