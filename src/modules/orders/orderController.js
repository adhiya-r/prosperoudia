const orderService = require('./orderService');

function showCheckout(req, res) {
  const cart = req.session?.cart?.items ?? [];

  if (!cart.length) {
    return res.redirect('/cart?type=danger&message=Cart%20masih%20kosong.%20Tambahkan%20produk%20sebelum%20checkout.');
  }

  const pageData = orderService.buildCheckoutPageData(req.session, req.session.user);

    return res.render('pages/orders/checkout', {
      pageTitle: 'Checkout',
      ...pageData
    });
}

async function submitCheckout(req, res) {
  try {
    const order = await orderService.createOrderFromCart(req.session, req.session.user, {
      ...req.body,
      prescription_image_path: req.uploadedFiles?.prescription_image || req.body?.prescription_image_path || ''
    });
    return res.redirect(`/orders/confirmation/${order.id}?type=success&message=Pesanan%20berhasil%20dibuat`);
  } catch (error) {
    if (error.statusCode === 422 && error.validation) {
      const pageData = orderService.buildCheckoutPageData(
        req.session,
        req.session.user,
        {
          ...req.body,
          prescription_image_path: req.uploadedFiles?.prescription_image || req.body?.prescription_image_path || ''
        },
        error.validation.errors,
        'Validasi checkout gagal.',
        'danger'
      );

      return res.status(422).render('pages/orders/checkout', {
        pageTitle: 'Checkout',
        ...pageData
      });
    }

    return res.redirect(`/cart?type=danger&message=${encodeURIComponent(error.message || 'Checkout gagal.')}`);
  }
}

async function showOrderConfirmation(req, res) {
  try {
    const order = await orderService.getOrderConfirmation(req.params.orderId);

    return res.render('pages/orders/confirmation', {
      pageTitle: 'Konfirmasi Pesanan',
      order,
      flashMessage: req.query.message ?? null,
      flashType: req.query.type ?? 'info'
    });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    return res.status(statusCode).render('pages/error', {
      pageTitle: statusCode === 404 ? 'Pesanan Tidak Ditemukan' : 'Terjadi Kesalahan',
      message: error.message || 'Pesanan tidak dapat ditampilkan.'
    });
  }
}

module.exports = {
  showCheckout,
  submitCheckout,
  showOrderConfirmation
};
