const stockMovementTypes = ['stock_in', 'stock_out', 'adjustment', 'order_allocation', 'order_reversal'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('stock_movements', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('medicine_id').notNullable().references('id').inTable('medicines').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('batch_id').references('id').inTable('inventory_batches').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('movement_type', 50).notNullable();
    table.integer('quantity').notNullable();
    table.integer('quantity_before').notNullable();
    table.integer('quantity_after').notNullable();
    table.decimal('unit_cost', 14, 2).defaultTo(0);
    table.string('reference_type', 50);
    table.bigInteger('reference_id');
    table.text('notes');
    table.bigInteger('performed_by').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamp('occurred_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['medicine_id'], 'stock_movements_medicine_id_idx');
    table.index(['batch_id'], 'stock_movements_batch_id_idx');
    table.index(['occurred_at'], 'stock_movements_occurred_at_idx');
    table.index(['reference_type', 'reference_id'], 'stock_movements_reference_idx');
  });

  await knex.raw(`
    ALTER TABLE stock_movements
    ADD CONSTRAINT stock_movements_type_quantity_check
    CHECK (
      movement_type IN (${sqlStringList(stockMovementTypes)})
      AND quantity > 0
      AND quantity_before >= 0
      AND quantity_after >= 0
      AND unit_cost >= 0
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('stock_movements');
};
