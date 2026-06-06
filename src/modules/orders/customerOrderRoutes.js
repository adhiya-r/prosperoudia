const express = require('express');
const customerOrderController = require('./customerOrderController');
const { paymentProofUpload } = require('../../shared/middlewares/uploadMiddleware');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');

const router = express.Router();

router.get('/orders', requireAuth, customerOrderController.showMyOrders);
router.post('/orders/:orderId/payment-proof', requireAuth, paymentProofUpload.single('payment_proof'), customerOrderController.uploadPaymentProof);
router.get('/prescriptions', requireAuth, customerOrderController.showMyPrescriptions);

module.exports = router;
