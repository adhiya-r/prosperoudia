const express = require('express');
const importController = require('./importController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');
const { importFileUpload } = require('../../shared/middlewares/uploadMiddleware');

const router = express.Router();

router.get('/medicines', requireAuth, requireRole('Admin'), importController.showMedicineImports);
router.post(
  '/medicines',
  requireAuth,
  requireRole('Admin'),
  importFileUpload.single('import_file'),
  importController.submitMedicineImport
);

module.exports = router;
