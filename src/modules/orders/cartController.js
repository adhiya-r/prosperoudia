const cartService = require('./cartService');

function showCart(req, res) {
  const cart = cartService.getCartSummary(req.session);

  return res.render('pages/orders/cart', {
    pageTitle: 'Keranjang Belanja',
    cart,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  });
}

async function addCartItem(req, res) {
  const medicineId = req.body?.medicine_id;
  const quantity = req.body?.quantity;
  const redirectTo = String(req.body?.redirect_to ?? '/cart').trim() || '/cart';

  try {
    await cartService.addItemToCart(req.session, medicineId, quantity);
    return res.redirect(`${redirectTo}${redirectTo.includes('?') ? '&' : '?'}type=success&message=Produk%20ditambahkan%20ke%20cart`);
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Gagal menambahkan produk ke cart.');
    return res.redirect(`/cart?type=danger&message=${message}`);
  }
}

function updateCartItem(req, res) {
  try {
    cartService.updateCartItemQuantity(req.session, req.params.medicineId, req.body?.quantity);
    return res.redirect('/cart?type=success&message=Jumlah%20item%20cart%20diperbarui');
  } catch (error) {
    const message = encodeURIComponent(error.message || 'Gagal memperbarui item cart.');
    return res.redirect(`/cart?type=danger&message=${message}`);
  }
}

function removeCartItem(req, res) {
  cartService.removeCartItem(req.session, req.params.medicineId);
  return res.redirect('/cart?type=success&message=Item%20dihapus%20dari%20cart');
}

module.exports = {
  showCart,
  addCartItem,
  updateCartItem,
  removeCartItem
};
