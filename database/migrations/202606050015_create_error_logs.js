const severities = ['info', 'warning', 'critical'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('error_logs', (table) => {
    table.bigIncrements('id').primary();
    table.string('severity', 30).notNullable().defaultTo('warning');
    table.text('message').notNullable();
    table.text('stack_trace');
    table.text('request_path');
    table.string('request_method', 20);
    table.bigInteger('user_id').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('ip_address', 100);
    table.text('user_agent');
    table.jsonb('metadata_json');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['severity'], 'error_logs_severity_idx');
    table.index(['user_id'], 'error_logs_user_id_idx');
    table.index(['created_at'], 'error_logs_created_at_idx');
  });

  await knex.raw(`
    ALTER TABLE error_logs
    ADD CONSTRAINT error_logs_severity_check
    CHECK (severity IN (${sqlStringList(severities)}))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('error_logs');
};
