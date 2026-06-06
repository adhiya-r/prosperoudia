const { randomUUID } = require('node:crypto');
const reportJobRepository = require('./reportJobRepository');

async function queueReportJob(payload, trx) {
  return reportJobRepository.create(
    {
      job_uuid: payload.job_uuid ?? randomUUID(),
      queue_job_id: payload.queue_job_id ?? null,
      report_type: payload.report_type,
      filters: payload.filters ?? null,
      status: payload.status ?? 'queued',
      output_file_path: payload.output_file_path ?? null,
      error_summary: payload.error_summary ?? null,
      created_by: payload.created_by,
      started_at: payload.started_at ?? null,
      completed_at: payload.completed_at ?? null
    },
    trx
  );
}

async function markReportJobProcessing(jobId, trx) {
  return reportJobRepository.updateById(
    jobId,
    {
      status: 'processing',
      started_at: new Date(),
      completed_at: null
    },
    trx
  );
}

async function markReportJobCompleted(jobId, payload, trx) {
  return reportJobRepository.updateById(
    jobId,
    {
      status: 'completed',
      output_file_path: payload.output_file_path ?? null,
      error_summary: payload.error_summary ?? null,
      completed_at: new Date()
    },
    trx
  );
}

async function markReportJobFailed(jobId, payload, trx) {
  return reportJobRepository.updateById(
    jobId,
    {
      status: 'failed',
      error_summary: payload.error_summary ?? null,
      completed_at: new Date()
    },
    trx
  );
}

async function listLatestReportJobs(limit = 25, trx) {
  return reportJobRepository.listLatest(limit, trx);
}

module.exports = {
  listLatestReportJobs,
  markReportJobCompleted,
  markReportJobFailed,
  markReportJobProcessing,
  queueReportJob
};
