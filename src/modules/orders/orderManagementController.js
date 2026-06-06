const orderManagementService = require('./orderManagementService');
const auditLogService = require('../audit-logs/auditLogService');
const notificationService = require('../notifications/notificationService');

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
    const result = await orderManagementService.updateOrderStatus(req.params.orderId, req.body, req.session.user);
    if (result?.order?.id && result?.previous && result?.updated) {
      await auditLogService.recordAuditLog(
        auditLogService.buildAuditPayload(req.session.user, req, {
          action: 'update_order_status',
          entity_type: 'order',
          entity_id: result.order.id,
          old_value: {
            status: result.previous.status,
            payment_status: result.previous.payment_status,
            notes: result.previous.notes
          },
          new_value: {
            status: result.updated.status,
            payment_status: result.updated.payment_status,
            notes: result.updated.notes
          }
        })
      );
      await notificationService.createNotificationsForRole('Admin', {
        severity: 'info',
        title: 'Status order diperbarui',
        message: `Order ${result.order.order_number} diubah menjadi ${result.updated.status}.`,
        entity_type: 'order',
        entity_id: result.order.id
      });
      if (result.order.customer_user_id) {
        await notificationService.createNotification({
          user_id: result.order.customer_user_id,
          severity: 'info',
          title: 'Status pesanan diperbarui',
          message: `Order ${result.order.order_number} sekarang berstatus ${result.updated.status} dengan pembayaran ${result.updated.payment_status}.`,
          entity_type: 'order',
          entity_id: result.order.id
        });
      }
    }
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

async function sendOrderReminder(req, res) {
  try {
    const { order, customerUser } = await orderManagementService.getReminderContext(req.params.orderId);
    const reminderType = String(req.body?.reminder_type ?? '').trim();
    const actorRole = req.session?.user?.primaryRole?.name ?? req.session?.user?.role ?? '';

    if (reminderType === 'customer_payment_proof') {
      if (!customerUser?.id) {
        return res.redirect(`/orders/manage/${order.id}?type=danger&message=Akun%20pelanggan%20untuk%20order%20ini%20tidak%20ditemukan.`);
      }

      await notificationService.createNotification({
        user_id: customerUser.id,
        severity: 'warning',
        title: 'Lengkapi bukti pembayaran',
        message: `Mohon unggah bukti pembayaran untuk order ${order.order_number} agar tim klinik dapat memproses pesanan lebih cepat.`,
        entity_type: 'order',
        entity_id: order.id
      });
    } else if (reminderType === 'cashier_payment_review') {
      if (!['Admin', 'Apoteker'].includes(actorRole)) {
        return res.redirect(`/orders/manage/${order.id}?type=danger&message=Role%20Anda%20tidak%20boleh%20mengirim%20reminder%20ini.`);
      }

      await notificationService.createNotificationsForRole('Kasir', {
        severity: 'info',
        title: 'Cek pembayaran pelanggan',
        message: `Order ${order.order_number} sudah siap dicek pembayarannya oleh kasir.`,
        entity_type: 'order',
        entity_id: order.id
      });
    } else {
      return res.redirect(`/orders/manage/${order.id}?type=danger&message=Tipe%20reminder%20tidak%20valid.`);
    }

    await auditLogService.recordAuditLog(
      auditLogService.buildAuditPayload(req.session.user, req, {
        action: 'send_order_reminder',
        entity_type: 'order',
        entity_id: order.id,
        new_value: {
          reminder_type: reminderType,
          order_number: order.order_number
        }
      })
    );

    return res.redirect(`/orders/manage/${order.id}?type=success&message=Reminder%20berhasil%20dikirim`);
  } catch (error) {
    return res.redirect(`/orders/manage/${req.params.orderId}?type=danger&message=${encodeURIComponent(error.message || 'Gagal mengirim reminder.')}`);
  }
}

module.exports = {
  showOrderList,
  showOrderDetail,
  sendOrderReminder,
  submitOrderStatus
};
