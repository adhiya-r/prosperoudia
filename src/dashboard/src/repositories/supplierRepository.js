const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('suppliers').select(
    'suppliers.id',
    'suppliers.code',
    'suppliers.name',
    database.raw('NULL as contact_name'),
    'suppliers.email',
    'suppliers.phone',
    'suppliers.address',
    'suppliers.is_active',
    'suppliers.created_at',
    'suppliers.updated_at'
  );
}

async function listAll({ includeInactive = false } = {}, trx = database) {
  const query = baseQuery(trx).orderBy('suppliers.name', 'asc');

  if (!includeInactive) {
    query.where('suppliers.is_active', true);
  }

  return query;
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('suppliers.id', id).first();
}

async function findByCode(code, trx = database) {
  return baseQuery(trx).whereRaw('LOWER(suppliers.code) = LOWER(?)', [code]).first();
}

async function create(payload, trx = database) {
  const [record] = await trx('suppliers')
    .insert({
      code: payload.code,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      is_active: payload.is_active ?? true
    })
    .returning([
      'id',
      'code',
      'name',
      'email',
      'phone',
      'address',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const [record] = await trx('suppliers')
    .where('id', id)
    .update({
      code: payload.code,
      name: payload.name,
      email: payload.email ?? null,
      phone: payload.phone ?? null,
      address: payload.address ?? null,
      is_active: payload.is_active ?? true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'code',
      'name',
      'email',
      'phone',
      'address',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function deactivateById(id, trx = database) {
  return updateById(
    id,
    {
      is_active: false
    },
    trx
  );
}

async function activateById(id, trx = database) {
  return updateById(
    id,
    {
      is_active: true
    },
    trx
  );
}

async function countUsage(id, trx = database) {
  const [products] = await Promise.all([
    trx('medicines').where('supplier_id', id).count('* as count').first()
  ]);

  return {
    products: Number(products?.count ?? 0)
  };
}

async function deleteById(id, trx = database) {
  return trx('suppliers').where('id', id).del();
}

module.exports = {
  listAll,
  findById,
  findByCode,
  create,
  updateById,
  deactivateById,
  activateById,
  countUsage,
  deleteById
};
