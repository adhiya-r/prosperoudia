const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('warehouse_transfer_items').select(
    'warehouse_transfer_items.id',
    'warehouse_transfer_items.warehouse_transfer_id',
    'warehouse_transfer_items.product_id',
    'warehouse_transfer_items.requested_quantity',
    'warehouse_transfer_items.approved_quantity',
    'warehouse_transfer_items.received_quantity',
    'warehouse_transfer_items.unit_cost_snapshot',
    'warehouse_transfer_items.notes',
    'warehouse_transfer_items.created_at',
    'warehouse_transfer_items.updated_at'
  );
}

async function listByTransferId(warehouseTransferId, trx = database) {
  return baseQuery(trx)
    .where('warehouse_transfer_items.warehouse_transfer_id', warehouseTransferId)
    .orderBy('warehouse_transfer_items.id', 'asc');
}

async function createMany(items, trx = database) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const records = await trx('warehouse_transfer_items')
    .insert(
      items.map((item) => ({
        warehouse_transfer_id: item.warehouse_transfer_id,
        product_id: item.product_id,
        requested_quantity: item.requested_quantity,
        approved_quantity: item.approved_quantity ?? null,
        received_quantity: item.received_quantity ?? null,
        unit_cost_snapshot: item.unit_cost_snapshot ?? null,
        notes: item.notes ?? null
      }))
    )
    .returning([
      'id',
      'warehouse_transfer_id',
      'product_id',
      'requested_quantity',
      'approved_quantity',
      'received_quantity',
      'unit_cost_snapshot',
      'notes',
      'created_at',
      'updated_at'
    ]);

  return records;
}

async function updateByTransferAndProduct(warehouseTransferId, productId, payload, trx = database) {
  const [record] = await trx('warehouse_transfer_items')
    .where('warehouse_transfer_id', warehouseTransferId)
    .where('product_id', productId)
    .update({
      approved_quantity: payload.approved_quantity ?? undefined,
      received_quantity: payload.received_quantity ?? undefined,
      unit_cost_snapshot: payload.unit_cost_snapshot ?? undefined,
      notes: payload.notes ?? undefined,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'warehouse_transfer_id',
      'product_id',
      'requested_quantity',
      'approved_quantity',
      'received_quantity',
      'unit_cost_snapshot',
      'notes',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

module.exports = {
  listByTransferId,
  createMany,
  updateByTransferAndProduct
};
