const database = require('../../config/database');

function toJsonDocument(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

async function listLatest(limit = 25, trx = database) {
  return trx('import_jobs as i')
    .leftJoin('users as u', 'u.id', 'i.created_by')
    .select(
      'i.id',
      'i.job_uuid',
      'i.file_name',
      'i.file_type',
      'i.status',
      'i.total_rows',
      'i.successful_rows',
      'i.failed_rows',
      'i.started_at',
      'i.completed_at',
      'i.created_at',
      'u.full_name as creator_name'
    )
    .orderBy('i.created_at', 'desc')
    .limit(limit);
}

async function create(payload, trx = database) {
  const [record] = await trx('import_jobs')
    .insert({
      job_uuid: payload.job_uuid,
      queue_job_id: payload.queue_job_id ?? null,
      file_name: payload.file_name,
      file_path: payload.file_path ?? null,
      file_type: payload.file_type,
      status: payload.status,
      total_rows: payload.total_rows ?? null,
      successful_rows: payload.successful_rows ?? null,
      failed_rows: payload.failed_rows ?? null,
      error_summary: toJsonDocument(payload.error_summary),
      created_by: payload.created_by,
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null
    })
    .returning([
      'id',
      'job_uuid',
      'queue_job_id',
      'file_name',
      'file_path',
      'file_type',
      'status',
      'total_rows',
      'successful_rows',
      'failed_rows',
      'error_summary',
      'created_by',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const updatePayload = {
    status: payload.status,
    updated_at: trx.fn.now()
  };

  if (Object.prototype.hasOwnProperty.call(payload, 'queue_job_id')) {
    updatePayload.queue_job_id = payload.queue_job_id ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'file_name')) {
    updatePayload.file_name = payload.file_name;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'file_path')) {
    updatePayload.file_path = payload.file_path ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'file_type')) {
    updatePayload.file_type = payload.file_type;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'total_rows')) {
    updatePayload.total_rows = payload.total_rows ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'successful_rows')) {
    updatePayload.successful_rows = payload.successful_rows ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'failed_rows')) {
    updatePayload.failed_rows = payload.failed_rows ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'error_summary')) {
    updatePayload.error_summary = toJsonDocument(payload.error_summary);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'started_at')) {
    updatePayload.started_at = payload.started_at ?? null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'completed_at')) {
    updatePayload.completed_at = payload.completed_at ?? null;
  }

  const [record] = await trx('import_jobs')
    .where('id', id)
    .update(updatePayload)
    .returning([
      'id',
      'job_uuid',
      'queue_job_id',
      'file_name',
      'file_path',
      'file_type',
      'status',
      'total_rows',
      'successful_rows',
      'failed_rows',
      'error_summary',
      'created_by',
      'started_at',
      'completed_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

module.exports = {
  listLatest,
  create,
  updateById
};
