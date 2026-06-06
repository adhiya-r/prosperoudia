const express = require('express');
const medicineController = require('./medicineController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');
const { medicineImageUpload } = require('../../shared/middlewares/uploadMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), medicineController.showMedicines);
router.get('/new', requireAuth, requireRole('Admin'), medicineController.showCreateMedicineForm);
router.post('/', requireAuth, requireRole('Admin'), medicineImageUpload.single('medicine_image'), medicineController.createMedicine);
router.get('/:medicineId', medicineController.showMedicineDetail);
router.get('/:id/edit', requireAuth, requireRole('Admin'), medicineController.showEditMedicineForm);
router.post('/:id', requireAuth, requireRole('Admin'), medicineImageUpload.single('medicine_image'), medicineController.updateMedicine);
router.post('/:id/deactivate', requireAuth, requireRole('Admin'), medicineController.deactivateMedicine);
router.post('/:id/activate', requireAuth, requireRole('Admin'), medicineController.activateMedicine);
router.post('/:id/delete', requireAuth, requireRole('Admin'), medicineController.deleteMedicine);

module.exports = router;
