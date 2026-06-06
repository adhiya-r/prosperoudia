const importJobRepository = require('../repositories/importJobRepository');

async function listImportJobs(limit = 25, trx) {
  return importJobRepository.listLatest(limit, trx);
}

async function createImportJob(payload, trx) {
  return importJobRepository.create(payload, trx);
}

async function updateImportJob(id, payload, trx) {
  return importJobRepository.updateById(id, payload, trx);
}

module.exports = {
  listImportJobs,
  createImportJob,
  updateImportJob
};
