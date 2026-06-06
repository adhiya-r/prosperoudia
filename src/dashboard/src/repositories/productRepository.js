const database = require('../config/database');

function baseQuery(trx = database) {
  return trx('medicines as p')
    .leftJoin('medicine_categories as c', 'c.id', 'p.category_id')
    .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
    .select(
      'p.id',
      'p.sku',
      'p.name',
      'p.description',
      'p.category_id',
      'p.supplier_id',
      'p.unit_price',
      'p.minimum_stock_threshold',
      'p.image_path',
      'p.is_active',
      'p.created_at',
      'p.updated_at',
      'p.brand_name',
      'p.composition',
      'p.dosage',
      'p.dosage_form',
      'p.strength',
      'p.side_effects',
      'p.requires_prescription',
      'c.name as category_name',
      's.name as supplier_name'
    );
}

async function listAll({ includeInactive = false } = {}, trx = database) {
  const query = baseQuery(trx).orderBy('p.name', 'asc');

  if (!includeInactive) {
    query.where('p.is_active', true);
  }

  return query;
}

async function listWithStockSummary({ includeInactive = false } = {}, trx = database) {
  const stockSummary = trx('inventory_batches')
    .select('inventory_batches.medicine_id as product_id')
    .sum({ total_stock: 'inventory_batches.quantity_remaining' })
    .groupBy('inventory_batches.medicine_id')
    .as('stock_summary');

  const query = trx('medicines as p')
    .leftJoin('medicine_categories as c', 'c.id', 'p.category_id')
    .leftJoin('suppliers as s', 's.id', 'p.supplier_id')
    .leftJoin(stockSummary, 'stock_summary.product_id', 'p.id')
    .select(
      'p.id',
      'p.sku',
      'p.name',
      'p.description',
      'p.category_id',
      'p.supplier_id',
      'p.unit_price',
      'p.minimum_stock_threshold',
      'p.image_path',
      'p.is_active',
      'p.created_at',
      'p.updated_at',
      'c.name as category_name',
      's.name as supplier_name',
      trx.raw('COALESCE(stock_summary.total_stock, 0)::integer as total_stock')
    )
    .orderBy('p.name', 'asc');

  if (!includeInactive) {
    query.where('p.is_active', true);
  }

  return query;
}

async function findById(id, trx = database) {
  return baseQuery(trx).where('p.id', id).first();
}

async function findBySku(sku, trx = database) {
  return baseQuery(trx).whereRaw('LOWER(p.sku) = LOWER(?)', [sku]).first();
}

async function create(payload, trx = database) {
  const [record] = await trx('medicines')
    .insert({
      sku: payload.sku,
      name: payload.name,
      description: payload.description ?? null,
      category_id: payload.category_id,
      supplier_id: payload.supplier_id,
      unit_price: payload.unit_price,
      minimum_stock_threshold: payload.minimum_stock_threshold,
      image_path: payload.image_path ?? null,
      is_active: payload.is_active ?? true
    })
    .returning([
      'id',
      'sku',
      'name',
      'description',
      'category_id',
      'supplier_id',
      'unit_price',
      'minimum_stock_threshold',
      'image_path',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateById(id, payload, trx = database) {
  const [record] = await trx('medicines')
    .where('id', id)
    .update({
      sku: payload.sku,
      name: payload.name,
      description: payload.description ?? null,
      category_id: payload.category_id,
      supplier_id: payload.supplier_id,
      unit_price: payload.unit_price,
      minimum_stock_threshold: payload.minimum_stock_threshold,
      image_path: payload.image_path ?? null,
      is_active: payload.is_active ?? true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'sku',
      'name',
      'description',
      'category_id',
      'supplier_id',
      'unit_price',
      'minimum_stock_threshold',
      'image_path',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function deactivateById(id, trx = database) {
  const [record] = await trx('medicines')
    .where('id', id)
    .update({
      is_active: false,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'sku',
      'name',
      'description',
      'category_id',
      'supplier_id',
      'unit_price',
      'minimum_stock_threshold',
      'image_path',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function activateById(id, trx = database) {
  const [record] = await trx('medicines')
    .where('id', id)
    .update({
      is_active: true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'sku',
      'name',
      'description',
      'category_id',
      'supplier_id',
      'unit_price',
      'minimum_stock_threshold',
      'image_path',
      'is_active',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function countUsage(id, trx = database) {
  const [balances, transactions, transferItems] = await Promise.all([
    trx('inventory_batches').where('medicine_id', id).count('* as count').first(),
    trx('stock_movements').where('medicine_id', id).count('* as count').first(),
    database.raw('SELECT 0::bigint AS count')
  ]);

  return {
    inventory_balances: Number(balances?.count ?? 0),
    stock_transactions: Number(transactions?.count ?? 0),
    warehouse_transfer_items: Number(transferItems?.rows?.[0]?.count ?? transferItems?.count ?? 0)
  };
}

async function deleteById(id, trx = database) {
  return trx('medicines').where('id', id).del();
}

module.exports = {
  listAll,
  listWithStockSummary,
  findById,
  findBySku,
  create,
  updateById,
  deactivateById,
  activateById,
  countUsage,
  deleteById
};
