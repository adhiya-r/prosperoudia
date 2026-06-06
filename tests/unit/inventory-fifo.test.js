const test = require('node:test');
const assert = require('node:assert/strict');

const inventoryRepository = require('../../src/modules/inventory/inventoryRepository');
const inventoryService = require('../../src/modules/inventory/inventoryService');

test('allocateOrderStock consumes earliest expiry batches first', async () => {
  const originalListAvailableBatchesForMedicine = inventoryRepository.listAvailableBatchesForMedicine;
  const originalUpdateBatchQuantity = inventoryRepository.updateBatchQuantity;
  const originalCreateStockMovement = inventoryRepository.createStockMovement;
  const originalFindStockMovementsByReference = inventoryRepository.findStockMovementsByReference;

  const updatedBatches = [];
  const createdMovements = [];

  inventoryRepository.findStockMovementsByReference = async () => [];
  inventoryRepository.listAvailableBatchesForMedicine = async () => ([
    { id: 11, medicine_id: 1, batch_number: 'BATCH-OLD', quantity_remaining: 2, unit_cost: 5000 },
    { id: 12, medicine_id: 1, batch_number: 'BATCH-NEW', quantity_remaining: 5, unit_cost: 5500 }
  ]);
  inventoryRepository.updateBatchQuantity = async (trx, batchId, quantityRemaining) => {
    updatedBatches.push({ batchId, quantityRemaining });
    return { id: batchId, quantity_remaining: quantityRemaining };
  };
  inventoryRepository.createStockMovement = async (trx, payload) => {
    createdMovements.push(payload);
    return { id: createdMovements.length };
  };

  try {
    const result = await inventoryService.allocateOrderStock(
      { fn: { now: () => new Date() } },
      {
        id: 99,
        items: [
          {
            medicine_id: 1,
            medicine_name_snapshot: 'Paracetamol 500 mg',
            quantity: 3
          }
        ]
      },
      3
    );

    assert.equal(result.allocated, true);
    assert.deepEqual(updatedBatches, [
      { batchId: 11, quantityRemaining: 0 },
      { batchId: 12, quantityRemaining: 4 }
    ]);
    assert.equal(createdMovements.length, 2);
    assert.equal(createdMovements[0].quantity, 2);
    assert.equal(createdMovements[1].quantity, 1);
  } finally {
    inventoryRepository.listAvailableBatchesForMedicine = originalListAvailableBatchesForMedicine;
    inventoryRepository.updateBatchQuantity = originalUpdateBatchQuantity;
    inventoryRepository.createStockMovement = originalCreateStockMovement;
    inventoryRepository.findStockMovementsByReference = originalFindStockMovementsByReference;
  }
});

test('allocateOrderStock rejects when stock is insufficient', async () => {
  const originalListAvailableBatchesForMedicine = inventoryRepository.listAvailableBatchesForMedicine;
  const originalFindStockMovementsByReference = inventoryRepository.findStockMovementsByReference;

  inventoryRepository.findStockMovementsByReference = async () => [];
  inventoryRepository.listAvailableBatchesForMedicine = async () => ([
    { id: 21, medicine_id: 3, batch_number: 'BATCH-ONE', quantity_remaining: 1, unit_cost: 7000 }
  ]);

  try {
    await assert.rejects(
      inventoryService.allocateOrderStock(
        { fn: { now: () => new Date() } },
        {
          id: 100,
          items: [
            {
              medicine_id: 3,
              medicine_name_snapshot: 'Omeprazole 20 mg',
              quantity: 2
            }
          ]
        },
        2
      ),
      /tidak mencukupi/i
    );
  } finally {
    inventoryRepository.listAvailableBatchesForMedicine = originalListAvailableBatchesForMedicine;
    inventoryRepository.findStockMovementsByReference = originalFindStockMovementsByReference;
  }
});
