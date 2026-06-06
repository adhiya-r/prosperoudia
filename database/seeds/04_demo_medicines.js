const { medicines } = require('../seed-data/halodocCatalog');

exports.seed = async function seed(knex) {
  await knex('stock_movements').del();
  await knex('inventory_batches').del();
  await knex('medicines').del();

  await knex('medicines').insert(medicines);
};
