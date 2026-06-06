const database = require('../config/database');
const warehouseTransferRepository = require('../repositories/warehouseTransferRepository');
const warehouseTransferItemRepository = require('../repositories/warehouseTransferItemRepository');
const inventoryService = require('./inventoryService');
const warehouseSyncJobService = require('./warehouseSyncJobService');
const { validateWarehouseTransferPayload } = require('../validators/warehouseTransferValidator');

const ALLOWED_STATUS_TRANSITIONS = {
  DRAFT: ['REQUESTED', 'CANCELLED'],
  REQUESTED: ['APPROVED', 'REJECTED', 'CANCELLED'],
  APPROVED: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['COMPLETED']
};

function normalizeWarehouseTransferPayload(payload) {
  const validation = validateWarehouseTransferPayload(payload);

  if (!validation.valid) {
    const error = new Error('Warehouse transfer validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  return validation.value;
}

async function createWarehouseTransfer(payload, items = [], trx = database) {
  const value = normalizeWarehouseTransferPayload(payload);

  const transfer = await database.transaction(async (innerTrx) => {
    const transfer = await warehouseTransferRepository.create(value, innerTrx);

    if (Array.isArray(items) && items.length > 0) {
      await warehouseTransferItemRepository.createMany(
        items.map((item) => ({
          warehouse_transfer_id: transfer.id,
          product_id: item.product_id,
          requested_quantity: item.requested_quantity,
          approved_quantity: item.approved_quantity ?? null,
          received_quantity: item.received_quantity ?? null,
          unit_cost_snapshot: item.unit_cost_snapshot ?? null,
          notes: item.notes ?? null
        })),
        innerTrx
      );
    }

    await warehouseSyncJobService.enqueueTransferCreatedSync(transfer, innerTrx);

    return transfer;
  });

  void warehouseSyncJobService.processPendingSyncJobsInBackground(10, trx);

  return transfer;
}

async function requestTransfer(transferId, trx = database) {
  const transfer = await warehouseTransferRepository.findByIdForUpdate(transferId, trx);

  if (!transfer) {
    return null;
  }

  return warehouseTransferRepository.updateStatusById(
    transferId,
    {
      status: 'REQUESTED',
      request_notes: transfer.request_notes ?? null
    },
    trx
  );
}

async function executeWithinTransaction(trx, handler) {
  if (trx && trx !== database && typeof trx === 'object') {
    return handler(trx);
  }

  return database.transaction(handler);
}

function assertAllowedStatusTransition(currentStatus, nextStatus) {
  const allowedStatuses = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];

  if (!allowedStatuses.includes(nextStatus)) {
    const error = new Error(`Transfer dengan status ${currentStatus} tidak dapat diubah ke ${nextStatus}`);
    error.statusCode = 409;
    throw error;
  }
}

function buildStatusUpdatePayload(existingTransfer, nextStatus, performedBy, decisionNotes, trx) {
  const payload = {
    status: nextStatus,
    requested_by: existingTransfer.requested_by,
    request_notes: existingTransfer.request_notes,
    approved_by: existingTransfer.approved_by,
    approved_at: existingTransfer.approved_at,
    completed_by: existingTransfer.completed_by,
    completed_at: existingTransfer.completed_at,
    rejected_at: existingTransfer.rejected_at,
    cancelled_at: existingTransfer.cancelled_at,
    decision_notes: decisionNotes ?? existingTransfer.decision_notes ?? null
  };

  if (nextStatus === 'APPROVED') {
    payload.approved_by = performedBy;
    payload.approved_at = trx.fn.now();
    payload.rejected_at = null;
    payload.cancelled_at = null;
  }

  if (nextStatus === 'REJECTED') {
    payload.rejected_at = trx.fn.now();
    payload.cancelled_at = null;
  }

  if (nextStatus === 'CANCELLED') {
    payload.cancelled_at = trx.fn.now();
    payload.rejected_at = null;
  }

  if (nextStatus === 'IN_TRANSIT') {
    payload.rejected_at = null;
    payload.cancelled_at = null;
  }

  return payload;
}

async function completeTransferInTransaction(transfer, performedBy, decisionNotes, innerTrx) {
  const items = await warehouseTransferItemRepository.listByTransferId(transfer.id, innerTrx);

  for (const item of items) {
    const approvedQuantity = Number(item.approved_quantity ?? item.requested_quantity);

    if (!Number.isInteger(approvedQuantity) || approvedQuantity <= 0) {
      const error = new Error('Approved quantity tidak valid');
      error.statusCode = 400;
      throw error;
    }

    await inventoryService.reserveStockForTransfer(
      {
        product_id: item.product_id,
        source_warehouse_id: transfer.source_warehouse_id,
        quantity: approvedQuantity,
        performed_by: performedBy,
        reference_id: transfer.id,
        notes: transfer.request_notes ?? null
      },
      innerTrx
    );

    await inventoryService.receiveStockForTransfer(
      {
        product_id: item.product_id,
        destination_warehouse_id: transfer.destination_warehouse_id,
        quantity: approvedQuantity,
        performed_by: performedBy,
        reference_id: transfer.id,
        notes: transfer.request_notes ?? null
      },
      innerTrx
    );

    await warehouseTransferItemRepository.updateByTransferAndProduct(
      transfer.id,
      item.product_id,
      {
        approved_quantity: approvedQuantity,
        received_quantity: approvedQuantity
      },
      innerTrx
    );
  }

  return warehouseTransferRepository.updateStatusById(
    transfer.id,
    {
      status: 'COMPLETED',
      approved_by: transfer.approved_by,
      approved_at: transfer.approved_at,
      completed_by: performedBy,
      completed_at: innerTrx.fn.now(),
      requested_by: transfer.requested_by,
      request_notes: transfer.request_notes,
      decision_notes: decisionNotes ?? transfer.decision_notes ?? null,
      rejected_at: null,
      cancelled_at: null
    },
    innerTrx
  );
}

async function transitionTransferStatus(transferId, { nextStatus, performedBy, decisionNotes = null }, trx = database) {
  const result = await executeWithinTransaction(trx, async (innerTrx) => {
    const transfer = await warehouseTransferRepository.findByIdForUpdate(transferId, innerTrx);

    if (!transfer) {
      return null;
    }

    assertAllowedStatusTransition(transfer.status, nextStatus);

    if (nextStatus === 'COMPLETED') {
      const completedTransfer = await completeTransferInTransaction(
        transfer,
        performedBy,
        decisionNotes,
        innerTrx
      );

      await warehouseSyncJobService.enqueueTransferStatusSync(completedTransfer, transfer, innerTrx);

      return {
        previousTransfer: transfer,
        transfer: completedTransfer
      };
    }

    const updatedTransfer = await warehouseTransferRepository.updateStatusById(
      transferId,
      buildStatusUpdatePayload(transfer, nextStatus, performedBy, decisionNotes, innerTrx),
      innerTrx
    );

    await warehouseSyncJobService.enqueueTransferStatusSync(updatedTransfer, transfer, innerTrx);

    return {
      previousTransfer: transfer,
      transfer: updatedTransfer
    };
  });

  if (result?.transfer) {
    void warehouseSyncJobService.processPendingSyncJobsInBackground(10, trx);
  }

  return result;
}

async function completeTransfer(transferId, performedBy, decisionNotes = null, trx = database) {
  const result = await transitionTransferStatus(
    transferId,
    {
      nextStatus: 'COMPLETED',
      performedBy,
      decisionNotes
    },
    trx
  );

  return result?.transfer ?? null;
}

module.exports = {
  ALLOWED_STATUS_TRANSITIONS,
  normalizeWarehouseTransferPayload,
  createWarehouseTransfer,
  requestTransfer,
  completeTransfer,
  transitionTransferStatus,
  assertAllowedStatusTransition
};
