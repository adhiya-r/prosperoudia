const inventoryBalanceRepository = require('../repositories/inventoryBalanceRepository');
const stockTransactionRepository = require('../repositories/stockTransactionRepository');

const TRANSACTION_DIRECTION = {
  STOCK_IN: 1,
  IMPORT: 1,
  TRANSFER_IN: 1,
  STOCK_OUT: -1,
  TRANSFER_OUT: -1,
  ADJUSTMENT: 0
};

function getDirection(transactionType) {
  if (transactionType === 'ADJUSTMENT') {
    return 1;
  }

  return TRANSACTION_DIRECTION[transactionType] ?? null;
}

function isIncomingTransaction(transactionType) {
  return ['STOCK_IN', 'IMPORT', 'TRANSFER_IN'].includes(transactionType);
}

function isOutgoingTransaction(transactionType) {
  return ['STOCK_OUT', 'TRANSFER_OUT'].includes(transactionType);
}

async function consumeSpecificLayer(layerId, quantity, trx) {
  const layer = await stockTransactionRepository.findByIdForUpdate(layerId, trx);

  if (!layer || !isIncomingTransaction(layer.transaction_type)) {
    const error = new Error('Layer stok referensi tidak valid');
    error.statusCode = 409;
    throw error;
  }

  const currentRemaining = Number(layer.remaining_quantity ?? 0);
  if (currentRemaining < quantity) {
    const error = new Error('Stok pada layer referensi tidak cukup untuk reversal');
    error.statusCode = 409;
    throw error;
  }

  const nextRemaining = currentRemaining - quantity;
  await stockTransactionRepository.updateRemainingQuantity(layer.id, nextRemaining, trx);

  return {
    totalCost: Number(layer.unit_cost ?? 0) * quantity,
    consumedQuantity: quantity
  };
}

async function consumeFifoLayers(productId, warehouseId, quantity, trx) {
  const layers = await stockTransactionRepository.listAvailableFifoLayers(productId, warehouseId, trx);
  let quantityToConsume = quantity;
  let totalCost = 0;

  for (const layer of layers) {
    if (quantityToConsume <= 0) {
      break;
    }

    const availableQuantity = Number(layer.remaining_quantity ?? 0);
    if (availableQuantity <= 0) {
      continue;
    }

    const consumedQuantity = Math.min(availableQuantity, quantityToConsume);
    const nextRemaining = availableQuantity - consumedQuantity;
    await stockTransactionRepository.updateRemainingQuantity(layer.id, nextRemaining, trx);

    totalCost += Number(layer.unit_cost ?? 0) * consumedQuantity;
    quantityToConsume -= consumedQuantity;
  }

  if (quantityToConsume > 0) {
    const error = new Error('Layer FIFO tidak cukup untuk memenuhi pengurangan stok');
    error.statusCode = 409;
    throw error;
  }

  return {
    totalCost,
    consumedQuantity: quantity
  };
}

async function reconcileAdjustmentLayers(payload, quantityBefore, quantityAfter, trx) {
  const delta = quantityAfter - quantityBefore;

  if (delta === 0) {
    return {
      remainingQuantity: null,
      totalCost: payload.total_cost ?? 0,
      unitCost: payload.unit_cost ?? null
    };
  }

  if (delta > 0) {
    const normalizedUnitCost = payload.unit_cost ?? null;
    return {
      remainingQuantity: delta,
      totalCost: normalizedUnitCost != null ? Number(normalizedUnitCost) * delta : payload.total_cost ?? null,
      unitCost: normalizedUnitCost
    };
  }

  const consumed = await consumeFifoLayers(payload.product_id, payload.warehouse_id, Math.abs(delta), trx);
  return {
    remainingQuantity: null,
    totalCost: consumed.totalCost,
    unitCost: consumed.consumedQuantity > 0
      ? Number((consumed.totalCost / consumed.consumedQuantity).toFixed(2))
      : payload.unit_cost ?? null
  };
}

async function getOrCreateBalance(productId, warehouseId, trx) {
  const existing = await inventoryBalanceRepository.findByProductAndWarehouseForUpdate(productId, warehouseId, trx);
  if (existing) {
    return existing;
  }

  return inventoryBalanceRepository.create(
    {
      product_id: productId,
      warehouse_id: warehouseId,
      current_quantity: 0,
      last_transaction_at: null
    },
    trx
  );
}

async function recordStockMovement(payload, trx) {
  const direction = getDirection(payload.transaction_type);

  if (direction === null) {
    const error = new Error('Unsupported transaction type');
    error.statusCode = 400;
    throw error;
  }

  const balance = await getOrCreateBalance(payload.product_id, payload.warehouse_id, trx);
  const quantityBefore = Number(balance.current_quantity ?? 0);
  const movementQuantity = Number(payload.quantity ?? 0);

  if (!Number.isInteger(movementQuantity) || movementQuantity <= 0) {
    const error = new Error('Quantity harus lebih besar dari 0');
    error.statusCode = 400;
    throw error;
  }

  const quantityAfter = direction === 0 ? movementQuantity : quantityBefore + movementQuantity * direction;

  if (quantityAfter < 0) {
    const error = new Error('Stock tidak cukup');
    error.statusCode = 409;
    throw error;
  }

  let resolvedRemainingQuantity = payload.remaining_quantity ?? null;
  let resolvedTotalCost = payload.total_cost ?? null;
  let resolvedUnitCost = payload.unit_cost ?? null;
  let targetBatchId = payload.batch_id ?? null;

  // Insert to inventory_batches transparently for real DB transactions
  if (isIncomingTransaction(payload.transaction_type) && trx && typeof trx === 'function') {
    resolvedRemainingQuantity = movementQuantity;
    const batchNumber = payload.batch_number ?? ('BAT-' + Date.now());
    const expiredAt = payload.expired_at ?? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

    const [newBatch] = await trx('inventory_batches')
      .insert({
        medicine_id: payload.product_id,
        batch_number: batchNumber,
        received_at: payload.occurred_at ?? trx.fn.now(),
        expired_at: expiredAt,
        quantity_received: movementQuantity,
        quantity_remaining: movementQuantity,
        unit_cost: payload.unit_cost ?? 0,
        source_type: payload.reference_type ?? 'manual',
        source_id: payload.reference_id ?? null
      })
      .returning(['id']);

    targetBatchId = newBatch?.id ?? null;
  }

  if (isIncomingTransaction(payload.transaction_type) && payload.remaining_quantity === undefined) {
    resolvedRemainingQuantity = movementQuantity;
  }

  if (isOutgoingTransaction(payload.transaction_type)) {
    const isReversalOfIncoming = payload.reference_type === 'transaction_reversal' && Number.isInteger(Number(payload.reference_id));
    const consumed = isReversalOfIncoming
      ? await consumeSpecificLayer(Number(payload.reference_id), movementQuantity, trx)
      : await consumeFifoLayers(payload.product_id, payload.warehouse_id, movementQuantity, trx);

    resolvedRemainingQuantity = null;
    resolvedTotalCost = consumed.totalCost;
    resolvedUnitCost = consumed.consumedQuantity > 0
      ? Number((consumed.totalCost / consumed.consumedQuantity).toFixed(2))
      : payload.unit_cost ?? null;
  }

  if (payload.transaction_type === 'ADJUSTMENT') {
    const adjustmentResolution = await reconcileAdjustmentLayers(payload, quantityBefore, quantityAfter, trx);
    resolvedRemainingQuantity = adjustmentResolution.remainingQuantity;
    resolvedTotalCost = adjustmentResolution.totalCost;
    resolvedUnitCost = adjustmentResolution.unitCost;
  }

  const stockTransaction = await stockTransactionRepository.create(
    {
      product_id: payload.product_id,
      batch_id: targetBatchId,
      transaction_type: payload.transaction_type,
      quantity: movementQuantity,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: resolvedUnitCost,
      total_cost: resolvedTotalCost,
      remaining_quantity: resolvedRemainingQuantity,
      reference_type: payload.reference_type ?? null,
      reference_id: payload.reference_id ?? null,
      notes: payload.notes ?? null,
      performed_by: payload.performed_by,
      occurred_at: payload.occurred_at ?? undefined
    },
    trx
  );

  const updatedBalance = await inventoryBalanceRepository.updateQuantity(
    balance.id,
    {
      current_quantity: quantityAfter,
      last_transaction_at: payload.occurred_at ?? null
    },
    trx
  );

  return {
    balance_before: quantityBefore,
    balance_after: quantityAfter,
    transaction: stockTransaction,
    inventory_balance: updatedBalance
  };
}

async function reserveStockForTransfer({
  product_id: productId,
  source_warehouse_id: sourceWarehouseId,
  quantity,
  performed_by: performedBy,
  reference_type: referenceType = 'warehouse_transfer',
  reference_id: referenceId = null,
  notes = null
}, trx) {
  return recordStockMovement(
    {
      product_id: productId,
      warehouse_id: sourceWarehouseId,
      transaction_type: 'TRANSFER_OUT',
      quantity,
      performed_by: performedBy,
      reference_type: referenceType,
      reference_id: referenceId,
      notes
    },
    trx
  );
}

async function receiveStockForTransfer({
  product_id: productId,
  destination_warehouse_id: destinationWarehouseId,
  quantity,
  performed_by: performedBy,
  reference_type: referenceType = 'warehouse_transfer',
  reference_id: referenceId = null,
  notes = null
}, trx) {
  return recordStockMovement(
    {
      product_id: productId,
      warehouse_id: destinationWarehouseId,
      transaction_type: 'TRANSFER_IN',
      quantity,
      performed_by: performedBy,
      reference_type: referenceType,
      reference_id: referenceId,
      notes
    },
    trx
  );
}

module.exports = {
  recordStockMovement,
  reserveStockForTransfer,
  receiveStockForTransfer,
  getOrCreateBalance,
  consumeFifoLayers
};
