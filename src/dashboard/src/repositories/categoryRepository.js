const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('medicine_categories').select(
    'medicine_categories.id',
    'medicine_categories.code',
    'medicine_categories.name',
    'medicine_categories.description',
    'medicine_categories.is_active',
    'medicine_categories.created_at',
    'medicine_categories.updated_at'
  );
}

async function listAll({ includeInactive = false } = {}, trx = database) {
  const query = baseQuery(trx).orderBy('medicine_categories.name', 'asc');

  if (!includeInactive) {
    query.where('medicine_categories.is_active', true);
  }

  return query;
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('medicine_categories.id', id).first();
}

async function findByCode(code, trx = database) {
  return baseQuery(trx).whereRaw('LOWER(medicine_categories.code) = LOWER(?)', [code]).first();
}

async function create(payload, trx = database) {
  const [record] = await trx('medicine_categories')
    .insert({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true
    })
    .returning([
      'id',
      'code',
      'name',
      'description',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const [record] = await trx('medicine_categories')
    .where('id', id)
    .update({
      code: payload.code,
      name: payload.name,
      description: payload.description ?? null,
      is_active: payload.is_active ?? true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'code',
      'name',
      'description',
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
    trx('medicines').where('category_id', id).count('* as count').first()
  ]);

  return {
    products: Number(products?.count ?? 0)
  };
}

async function deleteById(id, trx = database) {
  return trx('medicine_categories').where('id', id).del();
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
