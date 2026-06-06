const database = require('../config/database');

function toJsonDocument(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

async function create(payload, trx = database) {
  const [record] = await trx('warehouse_sync_jobs')
    .insert({
      job_uuid: payload.job_uuid,
      warehouse_transfer_id: payload.warehouse_transfer_id,
      event_type: payload.event_type,
      status: payload.status,
      attempt_count: payload.attempt_count ?? 0,
      payload: toJsonDocument(payload.payload),
      sync_snapshot: toJsonDocument(payload.sync_snapshot),
      error_summary: toJsonDocument(payload.error_summary),
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null
    })
    .returning([
      'id',
      'job_uuid',
      'warehouse_transfer_id',
      'event_type',
      'status',
      'attempt_count',
      'payload',
      'sync_snapshot',
      'error_summary',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const [record] = await trx('warehouse_sync_jobs')
    .where('id', id)
    .update({
      event_type: payload.event_type,
      status: payload.status,
      attempt_count: payload.attempt_count ?? 0,
      payload: toJsonDocument(payload.payload),
      sync_snapshot: toJsonDocument(payload.sync_snapshot),
      error_summary: toJsonDocument(payload.error_summary),
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'job_uuid',
      'warehouse_transfer_id',
      'event_type',
      'status',
      'attempt_count',
      'payload',
      'sync_snapshot',
      'error_summary',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function findById(id, trx = database) {
  return trx('warehouse_sync_jobs')
    .select(
      'id',
      'job_uuid',
      'warehouse_transfer_id',
      'event_type',
      'status',
      'attempt_count',
      'payload',
      'sync_snapshot',
      'error_summary',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    )
    .where('id', id)
    .first();
}

async function findNextPending(trx = database) {
  const query = trx('warehouse_sync_jobs')
    .select(
      'id',
      'job_uuid',
      'warehouse_transfer_id',
      'event_type',
      'status',
      'attempt_count',
      'payload',
      'sync_snapshot',
      'error_summary',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    )
    .where('status', 'pending')
    .orderBy('created_at', 'asc')
    .forUpdate();

  if (typeof query.skipLocked === 'function') {
    query.skipLocked();
  }

  return query.first();
}

module.exports = {
  create,
  updateById,
  findById,
  findNextPending
};
