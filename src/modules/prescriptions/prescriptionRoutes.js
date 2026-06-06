const express = require('express');
const prescriptionController = require('./prescriptionController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { requireRole } = require('../../shared/middlewares/roleMiddleware');

const router = express.Router();

router.get('/review', requireAuth, requireRole('Admin', 'Apoteker'), prescriptionController.showPendingPrescriptions);
router.get('/:prescriptionId', requireAuth, requireRole('Admin', 'Apoteker'), prescriptionController.showPrescriptionReview);
router.post('/:prescriptionId/review', requireAuth, requireRole('Admin', 'Apoteker'), prescriptionController.submitPrescriptionReview);

module.exports = router;
