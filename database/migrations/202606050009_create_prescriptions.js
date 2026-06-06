const prescriptionStatuses = ['pending', 'approved', 'rejected'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('prescriptions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('customer_id').notNullable().references('id').inTable('customers').onDelete('CASCADE').onUpdate('CASCADE');
    table.bigInteger('uploaded_by_user_id').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('doctor_name', 150).notNullable();
    table.string('prescription_number', 100);
    table.text('image_path').notNullable();
    table.string('status', 30).notNullable().defaultTo('pending');
    table.text('reviewed_notes');
    table.bigInteger('verified_by_user_id').references('id').inTable('users').onDelete('SET NULL').onUpdate('CASCADE');
    table.timestamp('verified_at', { useTz: true });
    table.text('rejection_reason');
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['customer_id'], 'prescriptions_customer_id_idx');
    table.index(['status'], 'prescriptions_status_idx');
  });

  await knex.raw(`
    ALTER TABLE prescriptions
    ADD CONSTRAINT prescriptions_status_check
    CHECK (status IN (${sqlStringList(prescriptionStatuses)}))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('prescriptions');
};
