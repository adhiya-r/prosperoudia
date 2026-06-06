exports.up = async function up(knex) {
  await knex.schema.createTable('suppliers', (table) => {
    table.bigIncrements('id').primary();
    table.string('code', 50).notNullable().unique();
    table.string('name', 150).notNullable();
    table.string('phone', 30);
    table.string('email', 255);
    table.text('address');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('suppliers');
};
