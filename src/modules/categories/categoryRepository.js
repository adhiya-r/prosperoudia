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

module.exports = {
  listCategories,
  findByCode,
  createCategory
};
