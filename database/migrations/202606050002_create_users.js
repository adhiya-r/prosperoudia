exports.up = async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.string('full_name', 150).notNullable();
    table.string('username', 100).notNullable().unique();
    table.string('email', 255).notNullable().unique();
    table.text('password_hash').notNullable();
    table.string('phone', 30);
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('last_login_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('users');
};
