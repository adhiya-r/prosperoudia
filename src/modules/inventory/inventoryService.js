const inventoryRepository = require('./inventoryRepository');

async function allocateMedicineFIFO(trx, item, performedByUserId, orderId) {
  const batches = await inventoryRepository.listAvailableBatchesForMedicine(trx, item.medicine_id);
  let quantityToAllocate = Number(item.quantity);

  if (!batches.length) {
    const error = new Error(`Stok untuk ${item.medicine_name_snapshot} tidak tersedia.`);
    error.statusCode = 422;
    throw error;
  }

  const totalAvailable = batches.reduce((sum, batch) => sum + Number(batch.quantity_remaining), 0);
  if (totalAvailable < quantityToAllocate) {
    const error = new Error(`Stok ${item.medicine_name_snapshot} tidak mencukupi untuk menyelesaikan order.`);
    error.statusCode = 422;
    throw error;
  }

  for (const batch of batches) {
    if (quantityToAllocate <= 0) {
      break;
    }

    const quantityBefore = Number(batch.quantity_remaining);
    const quantityUsed = Math.min(quantityBefore, quantityToAllocate);
    const quantityAfter = quantityBefore - quantityUsed;

    await inventoryRepository.updateBatchQuantity(trx, batch.id, quantityAfter);
    await inventoryRepository.createStockMovement(trx, {
      medicine_id: item.medicine_id,
      batch_id: batch.id,
      movement_type: 'stock_out',
      quantity: quantityUsed,
      quantity_before: quantityBefore,
      quantity_after: quantityAfter,
      unit_cost: batch.unit_cost,
      reference_type: 'order_completion',
      reference_id: orderId,
      notes: `FIFO allocation for ${item.medicine_name_snapshot}`,
      performed_by: performedByUserId
    });

    quantityToAllocate -= quantityUsed;
  }
}

async function allocateOrderStock(trx, order, performedByUserId) {
  const existingMovements = await inventoryRepository.findStockMovementsByReference(trx, 'order_completion', order.id);

  if (existingMovements.length > 0) {
    return {
      allocated: false,
      reason: 'already_allocated'
    };
  }

  for (const item of order.items) {
    await allocateMedicineFIFO(trx, item, performedByUserId, order.id);
  }

  return {
    allocated: true
  };
}

module.exports = {
  allocateOrderStock
};
