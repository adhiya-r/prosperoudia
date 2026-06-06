exports.up = async function up(knex) {
  await knex.schema.createTable('inventory_batches', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('medicine_id').notNullable().references('id').inTable('medicines').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('batch_number', 100).notNullable();
    table.timestamp('received_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('expired_at', { useTz: true }).notNullable();
    table.integer('quantity_received').notNullable();
    table.integer('quantity_remaining').notNullable();
    table.decimal('unit_cost', 14, 2).notNullable().defaultTo(0);
    table.string('source_type', 50);
    table.bigInteger('source_id');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['medicine_id', 'batch_number']);
    table.index(['medicine_id'], 'inventory_batches_medicine_id_idx');
    table.index(['expired_at'], 'inventory_batches_expired_at_idx');
  });

  await knex.raw(`
    ALTER TABLE inventory_batches
    ADD CONSTRAINT inventory_batches_quantity_cost_check
    CHECK (
      quantity_received >= 0
      AND quantity_remaining >= 0
      AND quantity_remaining <= quantity_received
      AND unit_cost >= 0
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('inventory_batches');
};
