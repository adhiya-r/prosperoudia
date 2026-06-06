const database = require('../../config/database');

async function listCategories() {
  return database('medicine_categories')
    .select('id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at')
    .orderBy('name', 'asc');
}

async function findByCode(code) {
  return database('medicine_categories')
    .whereRaw('LOWER(code) = LOWER(?)', [code])
    .first();
}

async function createCategory(payload) {
  const [record] = await database('medicine_categories')
    .insert({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true
    })
    .returning(['id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at']);

  return record ?? null;
}

async function findById(id) {
  return database('medicine_categories')
    .where('id', id)
    .first();
}

async function updateById(id, payload) {
  const [record] = await database('medicine_categories')
    .where('id', id)
    .update({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true,
      updated_at: database.fn.now()
    })
    .returning(['id', 'code', 'name', 'description', 'is_active', 'created_at', 'updated_at']);

  return record ?? null;
}

async function deactivateById(id) {
  return updateById(id, { is_active: false });
}

async function activateById(id) {
  return updateById(id, { is_active: true });
}

async function countUsage(id) {
  const [products] = await Promise.all([
    database('medicines').where('category_id', id).count('* as count').first()
  ]);

  return {
    products: Number(products?.count ?? 0)
  };
}

async function deleteById(id) {
  return database('medicine_categories').where('id', id).del();
}

module.exports = {
  listCategories,
  findByCode,
  createCategory,
  findById,
  updateById,
  deactivateById,
  activateById,
  countUsage,
  deleteById
};
