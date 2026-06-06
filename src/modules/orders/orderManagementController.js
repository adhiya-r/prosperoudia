const orderManagementService = require('./orderManagementService');

async function showOrderList(req, res) {
  const orders = await orderManagementService.listOrders();

  return res.render('pages/orders/manage/index', {
    pageTitle: 'Manajemen Order',
    orders,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  });
}

async function showOrderDetail(req, res) {
  try {
    const order = await orderManagementService.getOrderDetail(req.params.orderId);

    return res.render('pages/orders/manage/show', {
      pageTitle: `Order ${order.order_number}`,
      order,
      orderStatusOptions: orderManagementService.getOrderStatusOptions(),
      paymentStatusOptions: orderManagementService.getPaymentStatusOptions(),
      formValues: {
        status: order.status,
        payment_status: order.payment_status,
        notes: order.notes || ''
      },
      formErrors: {},
      flashMessage: req.query.message ?? null,
      flashType: req.query.type ?? 'info'
    });
  } catch (error) {
    return res.status(error.statusCode ?? 500).render('pages/error', {
      pageTitle: error.statusCode === 404 ? 'Order Tidak Ditemukan' : 'Terjadi Kesalahan',
      message: error.message || 'Data order tidak dapat ditampilkan.'
    });
  }
}

async function submitOrderStatus(req, res) {
  try {
    await orderManagementService.updateOrderStatus(req.params.orderId, req.body, req.session.user);
    return res.redirect(`/orders/manage/${req.params.orderId}?type=success&message=Status%20order%20berhasil%20diperbarui`);
  } catch (error) {
    if (error.statusCode === 422 && error.validation) {
      const order = await orderManagementService.getOrderDetail(req.params.orderId);

      return res.status(422).render('pages/orders/manage/show', {
        pageTitle: `Order ${order.order_number}`,
        order,
        orderStatusOptions: orderManagementService.getOrderStatusOptions(),
        paymentStatusOptions: orderManagementService.getPaymentStatusOptions(),
        formValues: {
          status: String(req.body?.status ?? '').trim(),
          payment_status: String(req.body?.payment_status ?? '').trim(),
          notes: String(req.body?.notes ?? '').trim()
        },
        formErrors: error.validation.errors,
        flashMessage: 'Validasi status order gagal.',
        flashType: 'danger'
      });
    }

    return res.redirect(`/orders/manage?type=danger&message=${encodeURIComponent(error.message || 'Gagal memperbarui order.')}`);
  }
}

module.exports = {
  showOrderList,
  showOrderDetail,
  submitOrderStatus
};
