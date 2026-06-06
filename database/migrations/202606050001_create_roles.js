exports.up = async function up(knex) {
  await knex.schema.createTable('roles', (table) => {
    table.bigIncrements('id').primary();
    table.string('name', 50).notNullable().unique();
    table.string('display_name', 100).notNullable();
    table.text('description');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('roles');
};
