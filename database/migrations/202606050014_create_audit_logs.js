exports.up = async function up(knex) {
  await knex.schema.createTable('audit_logs', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('user_role', 100);
    table.string('action', 100).notNullable();
    table.string('entity_type', 100);
    table.bigInteger('entity_id');
    table.jsonb('old_value_json');
    table.jsonb('new_value_json');
    table.string('ip_address', 100);
    table.text('user_agent');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id'], 'audit_logs_user_id_idx');
    table.index(['action'], 'audit_logs_action_idx');
    table.index(['entity_type', 'entity_id'], 'audit_logs_entity_idx');
    table.index(['created_at'], 'audit_logs_created_at_idx');
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('audit_logs');
};
