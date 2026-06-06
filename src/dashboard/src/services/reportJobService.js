const reportJobRepository = require('../repositories/reportJobRepository');

async function listReportJobs(limit = 25, trx) {
  return reportJobRepository.listLatest(limit, trx);
}

async function createReportJob(payload, trx) {
  return reportJobRepository.create(payload, trx);
}

async function updateReportJob(id, payload, trx) {
  return reportJobRepository.updateById(id, payload, trx);
}

module.exports = {
  listReportJobs,
  createReportJob,
  updateReportJob
};
