const database = require('../../config/database');

function toJsonDocument(value) {
  if (value === undefined || value === null) {
    return null;
  }

  return JSON.stringify(value);
}

async function listLatest(limit = 25, trx = database) {
  return trx('report_jobs as r')
    .leftJoin('users as u', 'u.id', 'r.created_by')
    .select(
      'r.id',
      'r.job_uuid',
      'r.report_type',
      'r.status',
      'r.output_file_path',
      'r.started_at',
      'r.completed_at',
      'r.created_at',
      'u.full_name as creator_name'
    )
    .orderBy('r.created_at', 'desc')
    .limit(limit);
}

async function create(payload, trx = database) {
  const [record] = await trx('report_jobs')
    .insert({
      job_uuid: payload.job_uuid,
      queue_job_id: payload.queue_job_id ?? null,
      report_type: payload.report_type,
      filters: toJsonDocument(payload.filters),
      status: payload.status,
      output_file_path: payload.output_file_path ?? null,
      error_summary: toJsonDocument(payload.error_summary),
      created_by: payload.created_by,
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null
    })
    .returning([
      'id',
      'job_uuid',
      'queue_job_id',
      'report_type',
      'filters',
      'status',
      'output_file_path',
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

  if (Object.prototype.hasOwnProperty.call(payload, 'report_type')) {
    updatePayload.report_type = payload.report_type;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'filters')) {
    updatePayload.filters = toJsonDocument(payload.filters);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'output_file_path')) {
    updatePayload.output_file_path = payload.output_file_path ?? null;
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

  const [record] = await trx('report_jobs')
    .where('id', id)
    .update(updatePayload)
    .returning([
      'id',
      'job_uuid',
      'queue_job_id',
      'report_type',
      'filters',
      'status',
      'output_file_path',
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
