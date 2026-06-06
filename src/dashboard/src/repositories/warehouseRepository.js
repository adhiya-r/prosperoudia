const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('warehouses').select(
    'warehouses.id',
    'warehouses.code',
    'warehouses.name',
    'warehouses.city',
    'warehouses.address',
    'warehouses.latitude',
    'warehouses.longitude',
    'warehouses.phone',
    'warehouses.is_active',
    'warehouses.created_at',
    'warehouses.updated_at'
  );
}

async function listAll({ includeInactive = false } = {}, trx = database) {
  const query = baseQuery(trx).orderBy('warehouses.city', 'asc').orderBy('warehouses.name', 'asc');

  if (!includeInactive) {
    query.where('warehouses.is_active', true);
  }

  return query;
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('warehouses.id', id).first();
}

async function findByCode(code, trx = database) {
  return baseQuery(trx).whereRaw('LOWER(warehouses.code) = LOWER(?)', [code]).first();
}

async function create(payload, trx = database) {
  const [record] = await trx('warehouses')
    .insert({
      code: payload.code,
      name: payload.name,
      city: payload.city,
      address: payload.address ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      phone: payload.phone ?? null,
      is_active: payload.is_active ?? true
    })
    .returning([
      'id',
      'code',
      'name',
      'city',
      'address',
      'latitude',
      'longitude',
      'phone',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const [record] = await trx('warehouses')
    .where('id', id)
    .update({
      code: payload.code,
      name: payload.name,
      city: payload.city,
      address: payload.address ?? null,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      phone: payload.phone ?? null,
      is_active: payload.is_active ?? true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'code',
      'name',
      'city',
      'address',
      'latitude',
      'longitude',
      'phone',
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
  const [balances, transactions, sourceTransfers, destinationTransfers, assignedUsers] = await Promise.all([
    trx('inventory_balances').where('warehouse_id', id).count('* as count').first(),
    trx('stock_transactions').where('warehouse_id', id).count('* as count').first(),
    trx('warehouse_transfers').where('source_warehouse_id', id).count('* as count').first(),
    trx('warehouse_transfers').where('destination_warehouse_id', id).count('* as count').first(),
    trx('users').where('assigned_warehouse_id', id).count('* as count').first()
  ]);

  return {
    inventory_balances: Number(balances?.count ?? 0),
    stock_transactions: Number(transactions?.count ?? 0),
    source_transfers: Number(sourceTransfers?.count ?? 0),
    destination_transfers: Number(destinationTransfers?.count ?? 0),
    assigned_users: Number(assignedUsers?.count ?? 0)
  };
}

async function deleteById(id, trx = database) {
  return trx('warehouses').where('id', id).del();
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
