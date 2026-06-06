const database = require('../../config/database');

function trxOrDatabase(trx) {
  return trx || database;
}

async function listAvailableBatchesForMedicine(trx, medicineId) {
  return trxOrDatabase(trx)('inventory_batches')
    .select(
      'id',
      'medicine_id',
      'batch_number',
      'received_at',
      'expired_at',
      'quantity_received',
      'quantity_remaining',
      'unit_cost'
    )
    .where('medicine_id', medicineId)
    .where('quantity_remaining', '>', 0)
    .orderBy('expired_at', 'asc')
    .orderBy('received_at', 'asc')
    .forUpdate();
}

async function updateBatchQuantity(trx, batchId, quantityRemaining) {
  const [record] = await trx('inventory_batches')
    .where('id', batchId)
    .update({
      quantity_remaining: quantityRemaining,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'quantity_remaining']);

  return record ?? null;
}

async function createStockMovement(trx, payload) {
  const [record] = await trx('stock_movements')
    .insert({
      medicine_id: payload.medicine_id,
      batch_id: payload.batch_id,
      movement_type: payload.movement_type,
      quantity: payload.quantity,
      quantity_before: payload.quantity_before,
      quantity_after: payload.quantity_after,
      unit_cost: payload.unit_cost,
      reference_type: payload.reference_type,
      reference_id: payload.reference_id,
      notes: payload.notes || null,
      performed_by: payload.performed_by || null,
      occurred_at: payload.occurred_at || trx.fn.now()
    })
    .returning(['id']);

  return record ?? null;
}

async function findStockMovementsByReference(trx, referenceType, referenceId) {
  return trxOrDatabase(trx)('stock_movements')
    .select('id', 'medicine_id', 'batch_id', 'movement_type', 'quantity')
    .where('reference_type', referenceType)
    .where('reference_id', referenceId)
    .orderBy('id', 'asc');
}

module.exports = {
  createStockMovement,
  findStockMovementsByReference,
  listAvailableBatchesForMedicine,
  updateBatchQuantity
};
