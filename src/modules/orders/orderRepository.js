const database = require('../../config/database');

async function findCustomerByEmail(email) {
  return database('customers')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .first();
}

async function createCustomer(trx, payload) {
  const [record] = await trx('customers')
    .insert({
      full_name: payload.full_name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
      is_active: true
    })
    .returning(['id', 'full_name', 'email', 'phone', 'address']);

  return record ?? null;
}

async function updateCustomer(trx, customerId, payload) {
  const [record] = await trx('customers')
    .where('id', customerId)
    .update({
      full_name: payload.full_name,
      phone: payload.phone,
      address: payload.address,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'full_name', 'email', 'phone', 'address']);

  return record ?? null;
}

async function createOrder(trx, payload) {
  const [record] = await trx('orders')
    .insert(payload)
    .returning(['id', 'order_number']);

  return record ?? null;
}

async function createOrderItems(trx, items) {
  if (!items.length) {
    return [];
  }

  return trx('order_items')
    .insert(items)
    .returning(['id', 'order_id', 'medicine_id', 'quantity', 'unit_price', 'total_price']);
}

async function listOrders() {
  return database('orders as o')
    .innerJoin('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_number',
      'o.status',
      'o.payment_status',
      'o.payment_proof_path',
      'o.payment_proof_uploaded_at',
      'o.total_amount',
      'o.fulfillment_method',
      'o.placed_at',
      'c.full_name as customer_name',
      'c.phone as customer_phone'
    )
    .orderBy('o.created_at', 'desc');
}

async function updateOrderStatus(trx, orderId, payload) {
  const updateData = {
    status: payload.status,
    updated_at: trx.fn.now()
  };

  if (payload.confirmed_at !== undefined) {
    updateData.confirmed_at = payload.confirmed_at;
  }

  const [record] = await trx('orders')
    .where('id', orderId)
    .update(updateData)
    .returning(['id', 'status']);

  return record ?? null;
}

async function updateOrderLifecycle(trx, orderId, payload) {
  const updateData = {
    status: payload.status,
    payment_status: payload.payment_status,
    notes: payload.notes,
    updated_at: trx.fn.now()
  };

  updateData.confirmed_at = payload.status === 'confirmed' ? trx.fn.now() : null;
  updateData.completed_at = payload.status === 'completed' ? trx.fn.now() : null;
  updateData.cancelled_at = payload.status === 'cancelled' ? trx.fn.now() : null;

  const [record] = await trx('orders')
    .where('id', orderId)
    .update(updateData)
    .returning(['id', 'status', 'payment_status']);

  return record ?? null;
}

async function updateOrderPaymentProof(trx, orderId, payload) {
  const [record] = await trx('orders')
    .where('id', orderId)
    .update({
      payment_proof_path: payload.payment_proof_path,
      payment_proof_uploaded_at: payload.payment_proof_uploaded_at,
      payment_status: payload.payment_status,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'order_number', 'payment_status', 'payment_proof_path', 'payment_proof_uploaded_at']);

  return record ?? null;
}

async function findOrderWithItems(orderId) {
  const order = await database('orders as o')
    .innerJoin('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_number',
      'o.channel',
      'o.fulfillment_method',
      'o.status',
      'o.payment_status',
      'o.payment_method',
      'o.subtotal_amount',
      'o.discount_amount',
      'o.shipping_amount',
      'o.total_amount',
      'o.notes',
      'o.payment_proof_path',
      'o.payment_proof_uploaded_at',
      'o.placed_at',
      'o.confirmed_at',
      'c.full_name as customer_name',
      'c.email as customer_email',
      'c.phone as customer_phone',
      'c.address as customer_address'
    )
    .where('o.id', orderId)
    .first();

  if (!order) {
    return null;
  }

  const items = await database('order_items as oi')
    .innerJoin('medicines as m', 'm.id', 'oi.medicine_id')
    .select(
      'oi.id',
      'oi.order_id',
      'oi.medicine_id',
      'oi.medicine_sku_snapshot',
      'oi.medicine_name_snapshot',
      'oi.quantity',
      'oi.unit_price',
      'oi.total_price',
      'm.requires_prescription'
    )
    .where('oi.order_id', orderId)
    .orderBy('oi.id', 'asc');

  return {
    ...order,
    items,
    prescription: await database('prescriptions')
      .select('id', 'doctor_name', 'prescription_number', 'image_path', 'status', 'reviewed_notes', 'rejection_reason')
      .where('order_id', orderId)
      .first()
  };
}

async function getMedicineStockSummaries() {
  return database('inventory_batches')
    .select('medicine_id')
    .sum({ current_stock: 'quantity_remaining' })
    .groupBy('medicine_id');
}

async function listOrdersByEmail(email) {
  return database('orders as o')
    .innerJoin('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_number',
      'o.status',
      'o.payment_status',
      'o.payment_method',
      'o.total_amount',
      'o.fulfillment_method',
      'o.notes',
      'o.payment_proof_path',
      'o.payment_proof_uploaded_at',
      'o.placed_at',
      'o.confirmed_at',
      'o.completed_at',
      'o.cancelled_at'
    )
    .whereRaw('LOWER(c.email) = LOWER(?)', [email])
    .orderBy('o.created_at', 'desc');
}

async function findOrderByIdAndEmail(orderId, email) {
  return database('orders as o')
    .innerJoin('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_number',
      'o.status',
      'o.payment_status',
      'o.payment_method',
      'o.notes',
      'o.payment_proof_path',
      'o.payment_proof_uploaded_at',
      'c.full_name as customer_name',
      'c.email as customer_email'
    )
    .where('o.id', orderId)
    .whereRaw('LOWER(c.email) = LOWER(?)', [email])
    .first();
}

async function findPortalUserByEmail(email, trx = database) {
  return trx('users')
    .select('id', 'full_name', 'email')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .first();
}

module.exports = {
  findCustomerByEmail,
  findOrderByIdAndEmail,
  createCustomer,
  updateCustomer,
  createOrder,
  createOrderItems,
  findPortalUserByEmail,
  listOrders,
  listOrdersByEmail,
  findOrderWithItems,
  getMedicineStockSummaries,
  updateOrderPaymentProof,
  updateOrderLifecycle,
  updateOrderStatus
};
