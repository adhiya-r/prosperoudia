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

module.exports = {
  listSuppliers,
  findByCode,
  createSupplier
};
