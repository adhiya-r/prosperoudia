const express = require('express');
const cartController = require('./cartController');
const orderController = require('./orderController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');
const { checkoutUpload } = require('../../shared/middlewares/uploadMiddleware');

const router = express.Router();

router.get('/cart', cartController.showCart);
router.post('/cart/items', cartController.addCartItem);
router.post('/cart/items/:medicineId/update', cartController.updateCartItem);
router.post('/cart/items/:medicineId/remove', cartController.removeCartItem);
router.get('/checkout', requireAuth, orderController.showCheckout);
router.post(
  '/checkout',
  requireAuth,
  checkoutUpload.fields([
    { name: 'prescription_image', maxCount: 1 },
    { name: 'payment_proof', maxCount: 1 }
  ]),
  orderController.submitCheckout
);
router.get('/orders/confirmation/:orderId', requireAuth, orderController.showOrderConfirmation);

module.exports = router;
