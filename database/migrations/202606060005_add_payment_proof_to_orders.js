exports.up = async function up(knex) {
  await knex.schema.alterTable('orders', (table) => {
    table.string('payment_proof_path', 255);
    table.timestamp('payment_proof_uploaded_at', { useTz: true });
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable('orders', (table) => {
    table.dropColumn('payment_proof_uploaded_at');
    table.dropColumn('payment_proof_path');
  });
};
