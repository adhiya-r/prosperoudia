const crypto = require('node:crypto');

const database = require('../config/database');
const warehouseSyncJobRepository = require('../repositories/warehouseSyncJobRepository');
const warehouseTransferRepository = require('../repositories/warehouseTransferRepository');

function isExternalTransaction(trx) {
  return Boolean(trx && trx !== database && typeof trx === 'object');
}

function buildTransferSnapshot(transfer, eventType, payload = {}) {
  if (!transfer) {
    return null;
  }

  return {
    event_type: eventType,
    transfer_id: transfer.id,
    transfer_number: transfer.transfer_number,
    source_warehouse_id: transfer.source_warehouse_id,
    destination_warehouse_id: transfer.destination_warehouse_id,
    status: transfer.status,
    requested_by: transfer.requested_by,
    approved_by: transfer.approved_by,
    completed_by: transfer.completed_by,
    payload
  };
}

async function createSyncJob({
  warehouseTransferId,
  eventType,
  payload = {},
  status = 'pending'
}, trx = database) {
  return warehouseSyncJobRepository.create(
    {
      job_uuid: crypto.randomUUID(),
      warehouse_transfer_id: warehouseTransferId,
      event_type: eventType,
      status,
      attempt_count: 0,
      payload,
      sync_snapshot: null,
      error_summary: null,
      started_at: null,
      completed_at: null
    },
    trx
  );
}

async function enqueueTransferCreatedSync(transfer, trx = database) {
  if (!transfer?.id) {
    return null;
  }

  return createSyncJob(
    {
      warehouseTransferId: transfer.id,
      eventType: 'TRANSFER_CREATED',
      payload: {
        status: transfer.status,
        requested_by: transfer.requested_by ?? null
      }
    },
    trx
  );
}

async function enqueueTransferStatusSync(transfer, previousTransfer = null, trx = database) {
  if (!transfer?.id) {
    return null;
  }

  return createSyncJob(
    {
      warehouseTransferId: transfer.id,
      eventType: 'TRANSFER_STATUS_CHANGED',
      payload: {
        previous_status: previousTransfer?.status ?? null,
        next_status: transfer.status,
        approved_by: transfer.approved_by ?? null,
        completed_by: transfer.completed_by ?? null
      }
    },
    trx
  );
}

async function processNextPendingSyncJob(trx = database) {
  const queuedJob = await warehouseSyncJobRepository.findNextPending(trx);

  if (!queuedJob) {
    return null;
  }

  const processingJob = await warehouseSyncJobRepository.updateById(
    queuedJob.id,
    {
      ...queuedJob,
      status: 'processing',
      attempt_count: Number(queuedJob.attempt_count ?? 0) + 1,
      error_summary: null,
      started_at: new Date().toISOString(),
      completed_at: null
    },
    trx
  );

  try {
    const transfer = await warehouseTransferRepository.findById(queuedJob.warehouse_transfer_id, trx);

    if (!transfer) {
      const error = new Error('Warehouse transfer untuk sinkronisasi tidak ditemukan');
      error.statusCode = 404;
      throw error;
    }

    return warehouseSyncJobRepository.updateById(
      processingJob.id,
      {
        ...processingJob,
        status: 'completed',
        sync_snapshot: buildTransferSnapshot(transfer, processingJob.event_type, processingJob.payload),
        error_summary: null,
        completed_at: new Date().toISOString()
      },
      trx
    );
  } catch (error) {
    return warehouseSyncJobRepository.updateById(
      processingJob.id,
      {
        ...processingJob,
        status: 'failed',
        error_summary: {
          message: error.message || 'Warehouse sync job gagal diproses',
          statusCode: Number(error.statusCode ?? 500)
        },
        completed_at: new Date().toISOString()
      },
      trx
    );
  }
}

async function processPendingSyncJobs(limit = 10, trx = database) {
  const jobs = [];

  for (let index = 0; index < limit; index += 1) {
    const processedJob = await processNextPendingSyncJob(trx);

    if (!processedJob) {
      break;
    }

    jobs.push(processedJob);
  }

  return jobs;
}

async function processPendingSyncJobsInBackground(limit = 10, trx = database) {
  if (isExternalTransaction(trx)) {
    return;
  }

  try {
    await processPendingSyncJobs(limit, trx);
  } catch (error) {
    console.error('Failed to process warehouse sync jobs:', error);
  }
}

module.exports = {
  buildTransferSnapshot,
  createSyncJob,
  enqueueTransferCreatedSync,
  enqueueTransferStatusSync,
  processNextPendingSyncJob,
  processPendingSyncJobs,
  processPendingSyncJobsInBackground
};
