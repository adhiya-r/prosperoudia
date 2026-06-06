const { categories, suppliers } = require('../seed-data/halodocCatalog');

exports.seed = async function seed(knex) {
  await knex('stock_movements').del();
  await knex('inventory_batches').del();
  await knex('medicines').del();
  await knex('medicine_categories').del();
  await knex('suppliers').del();

  await knex('medicine_categories').insert(categories.map((category) => ({
    ...category,
    is_active: true
  })));

  await knex('suppliers').insert(suppliers.map((supplier) => ({
    ...supplier,
    is_active: true
  })));
};
