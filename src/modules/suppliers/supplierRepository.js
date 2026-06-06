const database = require('../../config/database');

async function listSuppliers() {
  return database('suppliers')
    .select('id', 'code', 'name', 'phone', 'email', 'address', 'is_active', 'created_at', 'updated_at')
    .orderBy('name', 'asc');
}

async function findByCode(code) {
  return database('suppliers')
    .whereRaw('LOWER(code) = LOWER(?)', [code])
    .first();
}

async function createSupplier(payload) {
  const [record] = await database('suppliers')
    .insert({
      code: payload.code,
      name: payload.name,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      is_active: payload.is_active ?? true
    })
    .returning(['id', 'code', 'name', 'phone', 'email', 'address', 'is_active', 'created_at', 'updated_at']);

  return record ?? null;
}

async function findById(id) {
  return database('suppliers')
    .where('id', id)
    .first();
}

async function updateById(id, payload) {
  const [record] = await database('suppliers')
    .where('id', id)
    .update({
      code: payload.code,
      name: payload.name,
      phone: payload.phone ?? null,
      email: payload.email ?? null,
      address: payload.address ?? null,
      is_active: payload.is_active ?? true,
      updated_at: database.fn.now()
    })
    .returning(['id', 'code', 'name', 'phone', 'email', 'address', 'is_active', 'created_at', 'updated_at']);

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
    database('medicines').where('supplier_id', id).count('* as count').first()
  ]);

  return {
    products: Number(products?.count ?? 0)
  };
}

async function deleteById(id) {
  return database('suppliers').where('id', id).del();
}

module.exports = {
  listSuppliers,
  findByCode,
  createSupplier,
  findById,
  updateById,
  deactivateById,
  activateById,
  countUsage,
  deleteById
};
