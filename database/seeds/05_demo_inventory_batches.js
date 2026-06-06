const { medicines } = require('../seed-data/halodocCatalog');

function createBatchRows() {
  let nextId = 1;

  return medicines.flatMap((medicine, index) => {
    const baseQuantity = medicine.requires_prescription ? 18 : 24;
    const thresholdBuffer = Math.max(6, medicine.minimum_stock_threshold);

    const firstBatch = {
      id: nextId,
      medicine_id: medicine.id,
      batch_number: `${medicine.sku}-A`,
      received_at: `2026-05-${String((index % 9) + 1).padStart(2, '0')}T08:00:00Z`,
      expired_at: medicine.category_id === 4
        ? '2028-12-31T00:00:00Z'
        : `2027-${String(((index % 9) + 1)).padStart(2, '0')}-28T00:00:00Z`,
      quantity_received: baseQuantity,
      quantity_remaining: Math.max(4, thresholdBuffer - (index % 3)),
      unit_cost: Math.max(1000, Math.round(Number(medicine.unit_price) * 0.72)),
      source_type: 'purchase',
      source_id: 2000 + medicine.id
    };

    nextId += 1;

    const secondBatch = {
      id: nextId,
      medicine_id: medicine.id,
      batch_number: `${medicine.sku}-B`,
      received_at: `2026-05-${String((index % 9) + 12).padStart(2, '0')}T08:00:00Z`,
      expired_at: medicine.category_id === 4
        ? '2029-12-31T00:00:00Z'
        : `2027-${String(((index % 9) + 3)).padStart(2, '0')}-28T00:00:00Z`,
      quantity_received: baseQuantity + 8,
      quantity_remaining: baseQuantity + 8,
      unit_cost: Math.max(1000, Math.round(Number(medicine.unit_price) * 0.75)),
      source_type: 'purchase',
      source_id: 3000 + medicine.id
    };

    nextId += 1;
    return [firstBatch, secondBatch];
  });
}

exports.seed = async function seed(knex) {
  await knex('stock_movements').del();
  await knex('inventory_batches').del();

  await knex('inventory_batches').insert(createBatchRows());
};
