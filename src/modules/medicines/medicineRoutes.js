const express = require('express');
const medicineController = require('./medicineController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');
const { medicineImageUpload } = require('../../shared/middlewares/uploadMiddleware');

const router = express.Router();

router.get('/', requireAuth, requireRole('Admin'), medicineController.showMedicines);
router.post('/', requireAuth, requireRole('Admin'), medicineImageUpload.single('medicine_image'), medicineController.createMedicine);
router.get('/:medicineId', medicineController.showMedicineDetail);

module.exports = router;
