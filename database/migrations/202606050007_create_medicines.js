exports.up = async function up(knex) {
  await knex.schema.createTable('medicines', (table) => {
    table.bigIncrements('id').primary();
    table.string('sku', 50).notNullable().unique();
    table.string('name', 200).notNullable();
    table.string('brand_name', 150);
    table.bigInteger('category_id').notNullable().references('id').inTable('medicine_categories').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('supplier_id').notNullable().references('id').inTable('suppliers').onDelete('RESTRICT').onUpdate('CASCADE');
    table.text('description');
    table.text('composition');
    table.text('dosage');
    table.string('dosage_form', 100);
    table.string('strength', 100);
    table.text('side_effects');
    table.decimal('unit_price', 14, 2).notNullable().defaultTo(0);
    table.boolean('requires_prescription').notNullable().defaultTo(false);
    table.integer('minimum_stock_threshold').notNullable().defaultTo(0);
    table.text('image_path');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['category_id'], 'medicines_category_id_idx');
    table.index(['supplier_id'], 'medicines_supplier_id_idx');
    table.index(['is_active'], 'medicines_is_active_idx');
  });

  await knex.raw(`
    ALTER TABLE medicines
    ADD CONSTRAINT medicines_price_threshold_check
    CHECK (
      unit_price >= 0
      AND minimum_stock_threshold >= 0
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('medicines');
};
