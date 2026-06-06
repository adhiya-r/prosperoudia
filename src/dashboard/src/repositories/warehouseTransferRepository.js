const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('warehouse_transfers').select(
    'warehouse_transfers.id',
    'warehouse_transfers.transfer_number',
    'warehouse_transfers.source_warehouse_id',
    'warehouse_transfers.destination_warehouse_id',
    'warehouse_transfers.status',
    'warehouse_transfers.requested_by',
    'warehouse_transfers.approved_by',
    'warehouse_transfers.completed_by',
    'warehouse_transfers.requested_at',
    'warehouse_transfers.approved_at',
    'warehouse_transfers.completed_at',
    'warehouse_transfers.rejected_at',
    'warehouse_transfers.cancelled_at',
    'warehouse_transfers.request_notes',
    'warehouse_transfers.decision_notes',
    'warehouse_transfers.created_at',
    'warehouse_transfers.updated_at'
  );
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('warehouse_transfers.id', id).first();
}

async function listLatest(limit = 20, trx = database) {
  return trx('warehouse_transfers as wt')
    .leftJoin('warehouses as sw', 'sw.id', 'wt.source_warehouse_id')
    .leftJoin('warehouses as dw', 'dw.id', 'wt.destination_warehouse_id')
    .select(
      'wt.id',
      'wt.transfer_number',
      'wt.status',
      'wt.requested_at',
      'wt.approved_at',
      'wt.completed_at',
      'wt.request_notes',
      'sw.name as source_warehouse_name',
      'dw.name as destination_warehouse_name'
    )
    .orderBy('wt.requested_at', 'desc')
    .limit(limit);
}

async function findByTransferNumber(transferNumber, trx = database) {
  return baseQuery(trx).where('warehouse_transfers.transfer_number', transferNumber).first();
}

async function findByIdForUpdate(id, trx = database) {
  return trx('warehouse_transfers').where('id', id).forUpdate().first();
}

async function create(payload, trx = database) {
  const [record] = await trx('warehouse_transfers')
    .insert({
      transfer_number: payload.transfer_number,
      source_warehouse_id: payload.source_warehouse_id,
      destination_warehouse_id: payload.destination_warehouse_id,
      status: payload.status ?? 'DRAFT',
      requested_by: payload.requested_by,
      approved_by: payload.approved_by ?? null,
      completed_by: payload.completed_by ?? null,
      request_notes: payload.request_notes ?? null,
      decision_notes: payload.decision_notes ?? null,
      requested_at: payload.requested_at ?? undefined,
      approved_at: payload.approved_at ?? null,
      completed_at: payload.completed_at ?? null,
      rejected_at: payload.rejected_at ?? null,
      cancelled_at: payload.cancelled_at ?? null
    })
    .returning([
      'id',
      'transfer_number',
      'source_warehouse_id',
      'destination_warehouse_id',
      'status',
      'requested_by',
      'approved_by',
      'completed_by',
      'requested_at',
      'approved_at',
      'completed_at',
      'rejected_at',
      'cancelled_at',
      'request_notes',
      'decision_notes',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateStatusById(id, payload, trx = database) {
  const [record] = await trx('warehouse_transfers')
    .where('id', id)
    .update({
      status: payload.status,
      approved_by: payload.approved_by ?? undefined,
      completed_by: payload.completed_by ?? undefined,
      requested_by: payload.requested_by ?? undefined,
      approved_at: payload.approved_at ?? undefined,
      completed_at: payload.completed_at ?? undefined,
      rejected_at: payload.rejected_at ?? undefined,
      cancelled_at: payload.cancelled_at ?? undefined,
      request_notes: payload.request_notes ?? undefined,
      decision_notes: payload.decision_notes ?? undefined,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'transfer_number',
      'source_warehouse_id',
      'destination_warehouse_id',
      'status',
      'requested_by',
      'approved_by',
      'completed_by',
      'requested_at',
      'approved_at',
      'completed_at',
      'rejected_at',
      'cancelled_at',
      'request_notes',
      'decision_notes',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

module.exports = {
  findById,
  findByTransferNumber,
  findByIdForUpdate,
  listLatest,
  create,
  updateStatusById
};
