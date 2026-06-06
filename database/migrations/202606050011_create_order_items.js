exports.up = async function up(knex) {
  await knex.schema.createTable('order_items', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('order_id').notNullable().references('id').inTable('orders').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('medicine_id').notNullable().references('id').inTable('medicines').onDelete('RESTRICT').onUpdate('CASCADE');
    table.string('medicine_sku_snapshot', 50).notNullable();
    table.string('medicine_name_snapshot', 200).notNullable();
    table.integer('quantity').notNullable();
    table.decimal('unit_price', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_price', 14, 2).notNullable().defaultTo(0);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['order_id'], 'order_items_order_id_idx');
    table.index(['medicine_id'], 'order_items_medicine_id_idx');
  });

  await knex.raw(`
    ALTER TABLE order_items
    ADD CONSTRAINT order_items_quantity_price_check
    CHECK (
      quantity > 0
      AND unit_price >= 0
      AND total_price >= 0
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('order_items');
};
