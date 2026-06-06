exports.up = async function up(knex) {
  await knex.schema.createTable('customers', (table) => {
    table.bigIncrements('id').primary();
    table.string('full_name', 150).notNullable();
    table.string('email', 255).notNullable().unique();
    table.string('phone', 30).notNullable();
    table.text('address').notNullable();
    table.string('identity_number', 100);
    table.date('date_of_birth');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('customers');
};
