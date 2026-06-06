exports.up = async function up(knex) {
  await knex.schema.createTable('user_roles', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT').onUpdate('CASCADE');
    table.boolean('is_active').notNullable().defaultTo(true);
    table.timestamp('assigned_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(['user_id', 'role_id']);
    table.index(['user_id'], 'user_roles_user_id_idx');
    table.index(['role_id'], 'user_roles_role_id_idx');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('user_roles');
};
