const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('stock_movements as st')
    .leftJoin('medicines as m', 'm.id', 'st.medicine_id')
    .leftJoin('users as u', 'u.id', 'st.performed_by')
    .select(
      'st.id',
      'st.medicine_id as product_id',
      database.raw('1 as warehouse_id'),
      database.raw('UPPER(st.movement_type) as transaction_type'),
      'st.quantity',
      'st.quantity_before',
      'st.quantity_after',
      'st.unit_cost',
      database.raw('(st.unit_cost * st.quantity) as total_cost'),
      'st.quantity as remaining_quantity', // mapping stock_movements quantity
      'st.reference_type',
      'st.reference_id',
      'st.notes',
      'st.performed_by',
      'st.occurred_at',
      'st.created_at',
      'm.sku',
      'm.name as product_name',
      database.raw("'GDU-UTAMA' as warehouse_code"),
      database.raw("'Gudang Utama Klinik' as warehouse_name"),
      'u.full_name as performed_by_name'
    );
}

async function create(payload, trx = database) {
  const [record] = await trx('stock_movements')
    .insert({
      medicine_id: payload.product_id,
      batch_id: payload.batch_id ?? null,
      movement_type: String(payload.transaction_type || 'stock_in').toLowerCase(),
      quantity: payload.quantity,
      quantity_before: payload.quantity_before,
      quantity_after: payload.quantity_after,
      unit_cost: payload.unit_cost ?? 0,
      reference_type: payload.reference_type ?? null,
      reference_id: payload.reference_id ?? null,
      notes: payload.notes ?? null,
      performed_by: payload.performed_by,
      occurred_at: payload.occurred_at ?? undefined
    })
    .returning([
      'id',
      'medicine_id',
      'movement_type',
      'quantity',
      'quantity_before',
      'quantity_after',
      'unit_cost',
      'reference_type',
      'reference_id',
      'notes',
      'performed_by',
      'occurred_at',
      'created_at'
    ]);

  if (!record) return null;

  return {
    id: record.id,
    product_id: record.medicine_id,
    warehouse_id: 1,
    transaction_type: record.movement_type.toUpperCase(),
    quantity: record.quantity,
    quantity_before: record.quantity_before,
    quantity_after: record.quantity_after,
    unit_cost: record.unit_cost,
    total_cost: record.unit_cost * record.quantity,
    remaining_quantity: record.quantity,
    reference_type: record.reference_type,
    reference_id: record.reference_id,
    notes: record.notes,
    performed_by: record.performed_by,
    occurred_at: record.occurred_at,
    created_at: record.created_at
  };
}

async function listLatest(limit = 50, trx = database) {
  return baseQuery(trx).orderBy('st.occurred_at', 'desc').limit(limit);
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('st.id', id).first();
}

async function findReversalByReference(referenceId, trx = database) {
  return baseQuery(trx)
    .where('st.reference_type', 'transaction_reversal')
    .where('st.reference_id', referenceId)
    .orderBy('st.occurred_at', 'desc')
    .first();
}

async function findByIdForUpdate(id, trx = database) {
  // map to stock_movements
  return trx('stock_movements')
    .where('id', id)
    .forUpdate()
    .first();
}

async function listAvailableFifoLayers(productId, warehouseId, trx = database) {
  // Map FIFO layers to inventory_batches instead since it's batch-based
  const batches = await trx('inventory_batches')
    .select(
      'id',
      'medicine_id as product_id',
      database.raw('1 as warehouse_id'),
      database.raw("'STOCK_IN' as transaction_type"),
      'quantity_received as quantity',
      'unit_cost',
      'quantity_remaining as remaining_quantity',
      'received_at as occurred_at',
      'created_at'
    )
    .where('medicine_id', productId)
    .where('quantity_remaining', '>', 0)
    .orderBy('expired_at', 'asc')
    .orderBy('received_at', 'asc')
    .orderBy('id', 'asc')
    .forUpdate();

  return batches;
}

async function updateRemainingQuantity(id, remainingQuantity, trx = database) {
  // FIFO Layer update maps to inventory_batches
  const [record] = await trx('inventory_batches')
    .where('id', id)
    .update({
      quantity_remaining: remainingQuantity,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'medicine_id',
      'quantity_received',
      'unit_cost',
      'quantity_remaining',
      'received_at',
      'created_at'
    ]);

  if (!record) return null;

  return {
    id: record.id,
    product_id: record.medicine_id,
    warehouse_id: 1,
    transaction_type: 'STOCK_IN',
    quantity: record.quantity_received,
    unit_cost: record.unit_cost,
    remaining_quantity: record.quantity_remaining,
    occurred_at: record.received_at,
    created_at: record.created_at
  };
}

module.exports = {
  create,
  listLatest,
  findById,
  findReversalByReference,
  findByIdForUpdate,
  listAvailableFifoLayers,
  updateRemainingQuantity
};
