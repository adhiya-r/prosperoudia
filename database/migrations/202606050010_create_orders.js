const orderChannels = ['online', 'counter'];
const fulfillmentMethods = ['pickup', 'internal'];
const orderStatuses = ['draft', 'pending_verification', 'confirmed', 'completed', 'cancelled'];
const paymentStatuses = ['unpaid', 'pending', 'paid', 'failed'];

function sqlStringList(values) {
  return values.map((value) => `'${value.replace(/'/g, "''")}'`).join(', ');
}

exports.up = async function up(knex) {
  await knex.schema.createTable('orders', (table) => {
    table.bigIncrements('id').primary();
    table.string('order_number', 100).notNullable().unique();
    table.bigInteger('customer_id').notNullable().references('id').inTable('customers').onDelete('RESTRICT').onUpdate('CASCADE');
    table.bigInteger('prescription_id').references('id').inTable('prescriptions').onDelete('SET NULL').onUpdate('CASCADE');
    table.string('channel', 30).notNullable().defaultTo('online');
    table.string('fulfillment_method', 30).notNullable().defaultTo('pickup');
    table.string('status', 50).notNullable().defaultTo('draft');
    table.string('payment_status', 30).notNullable().defaultTo('unpaid');
    table.string('payment_method', 50);
    table.decimal('subtotal_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('discount_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('shipping_amount', 14, 2).notNullable().defaultTo(0);
    table.decimal('total_amount', 14, 2).notNullable().defaultTo(0);
    table.text('notes');
    table.timestamp('placed_at', { useTz: true });
    table.timestamp('confirmed_at', { useTz: true });
    table.timestamp('cancelled_at', { useTz: true });
    table.timestamp('completed_at', { useTz: true });
    table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.index(['customer_id'], 'orders_customer_id_idx');
    table.index(['prescription_id'], 'orders_prescription_id_idx');
    table.index(['status'], 'orders_status_idx');
    table.index(['payment_status'], 'orders_payment_status_idx');
  });

  await knex.raw(`
    ALTER TABLE orders
    ADD CONSTRAINT orders_enum_amount_check
    CHECK (
      channel IN (${sqlStringList(orderChannels)})
      AND fulfillment_method IN (${sqlStringList(fulfillmentMethods)})
      AND status IN (${sqlStringList(orderStatuses)})
      AND payment_status IN (${sqlStringList(paymentStatuses)})
      AND subtotal_amount >= 0
      AND discount_amount >= 0
      AND shipping_amount >= 0
      AND total_amount >= 0
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists('orders');
};
