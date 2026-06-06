const { randomUUID } = require('node:crypto');
const importJobRepository = require('./importJobRepository');

async function queueImportJob(payload, trx) {
  return importJobRepository.create(
    {
      job_uuid: payload.job_uuid ?? randomUUID(),
      queue_job_id: payload.queue_job_id ?? null,
      file_name: payload.file_name,
      file_path: payload.file_path ?? null,
      file_type: payload.file_type,
      status: payload.status ?? 'queued',
      total_rows: payload.total_rows ?? null,
      successful_rows: payload.successful_rows ?? null,
      failed_rows: payload.failed_rows ?? null,
      error_summary: payload.error_summary ?? null,
      created_by: payload.created_by,
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null
    },
    trx
  );
}

async function markImportJobProcessing(jobId, trx) {
  return importJobRepository.updateById(
    jobId,
    {
      status: 'processing',
      started_at: new Date(),
      completed_at: null
    },
    trx
  );
}

async function markImportJobCompleted(jobId, payload, trx) {
  return importJobRepository.updateById(
    jobId,
    {
      status: 'completed',
      total_rows: payload.total_rows ?? null,
      successful_rows: payload.successful_rows ?? null,
      failed_rows: payload.failed_rows ?? null,
      error_summary: payload.error_summary ?? null,
      completed_at: new Date()
    },
    trx
  );
}

async function markImportJobFailed(jobId, payload, trx) {
  return importJobRepository.updateById(
    jobId,
    {
      status: 'failed',
      total_rows: payload.total_rows ?? null,
      successful_rows: payload.successful_rows ?? null,
      failed_rows: payload.failed_rows ?? null,
      error_summary: payload.error_summary ?? null,
      completed_at: new Date()
    },
    trx
  );
}

async function listLatestImportJobs(limit = 25, trx) {
  return importJobRepository.listLatest(limit, trx);
}

module.exports = {
  listLatestImportJobs,
  markImportJobCompleted,
  markImportJobFailed,
  markImportJobProcessing,
  queueImportJob
};
