exports.up = async function up(knex) {
  await knex.schema.alterTable('prescriptions', (table) => {
    table.bigInteger('order_id').unique().references('id').inTable('orders').onDelete('CASCADE').onUpdate('CASCADE');
  });

  await knex.schema.alterTable('prescriptions', (table) => {
    table.index(['order_id'], 'prescriptions_order_id_idx');
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('prescriptions', (table) => {
    table.dropIndex(['order_id'], 'prescriptions_order_id_idx');
    table.dropColumn('order_id');
  });
};
