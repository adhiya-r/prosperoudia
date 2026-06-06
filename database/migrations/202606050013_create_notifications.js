const severities = ['info', 'warning', 'critical'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('notifications', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('user_id').references('id').inTable('users').onDelete('CASCADE').onUpdate('CASCADE');
    table.string('severity', 30).notNullable().defaultTo('info');
    table.string('title', 150).notNullable();
    table.text('message').notNullable();
    table.string('entity_type', 50);
    table.bigInteger('entity_id');
    table.boolean('is_read').notNullable().defaultTo(false);
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['user_id'], 'notifications_user_id_idx');
    table.index(['is_read'], 'notifications_is_read_idx');
    table.index(['severity'], 'notifications_severity_idx');
  });

  await knex.raw(`
    ALTER TABLE notifications
    ADD CONSTRAINT notifications_severity_check
    CHECK (severity IN (${sqlStringList(severities)}))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('notifications');
};
