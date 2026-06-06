const database = require('../../config/database');

function baseMedicineQuery() {
  const stockSummaryQuery = database('inventory_batches')
    .select('medicine_id')
    .sum({ current_stock: 'quantity_remaining' })
    .groupBy('medicine_id')
    .as('stock_summary');

  return database('medicines as m')
    .leftJoin('medicine_categories as c', 'c.id', 'm.category_id')
    .leftJoin('suppliers as s', 's.id', 'm.supplier_id')
    .leftJoin(stockSummaryQuery, 'stock_summary.medicine_id', 'm.id');
}

async function listMedicines() {
  return baseMedicineQuery()
    .select(
      'm.id',
      'm.sku',
      'm.name',
      'm.brand_name',
      'm.description',
      'm.composition',
      'm.dosage',
      'm.dosage_form',
      'm.strength',
      'm.side_effects',
      'm.unit_price',
      'm.minimum_stock_threshold',
      'm.image_path',
      database.raw('COALESCE(stock_summary.current_stock, 0) as current_stock'),
      'm.requires_prescription',
      'm.is_active',
      'm.created_at',
      'm.updated_at',
      'c.id as category_id',
      'c.name as category_name',
      's.id as supplier_id',
      's.name as supplier_name'
    )
    .orderBy('m.name', 'asc');
}

async function listPublicMedicines(searchQuery = '', limit = 8, options = {}) {
  const query = baseMedicineQuery()
    .select(
      'm.id',
      'm.sku',
      'm.name',
      'm.brand_name',
      'm.description',
      'm.composition',
      'm.dosage',
      'm.dosage_form',
      'm.strength',
      'm.side_effects',
      'm.unit_price',
      'm.minimum_stock_threshold',
      'm.image_path',
      database.raw('COALESCE(stock_summary.current_stock, 0) as current_stock'),
      'm.requires_prescription',
      'c.name as category_name'
    )
    .where('m.is_active', true)
    .orderBy('m.name', 'asc');

  if (limit) {
    query.limit(limit);
  }

  const normalizedQuery = String(searchQuery ?? '').trim();
  const normalizedCategory = String(options.category ?? '').trim();

  if (normalizedQuery) {
    query.andWhere((builder) => {
      builder
        .whereILike('m.name', `%${normalizedQuery}%`)
        .orWhereILike('m.sku', `%${normalizedQuery}%`)
        .orWhereILike('c.name', `%${normalizedQuery}%`)
        .orWhereILike('m.brand_name', `%${normalizedQuery}%`);
    });
  }

  if (normalizedCategory) {
    query.andWhere((builder) => {
      builder
        .whereILike('c.code', normalizedCategory)
        .orWhereILike('c.name', normalizedCategory);
    });
  }

  return query;
}

async function listSearchSuggestions(searchQuery = '', limit = 8) {
  const normalizedQuery = String(searchQuery ?? '').trim();

  const query = baseMedicineQuery()
    .select(
      'm.id',
      'm.sku',
      'm.name',
      'm.brand_name',
      'm.dosage_form',
      'm.strength',
      'm.image_path',
      'm.requires_prescription',
      'c.name as category_name'
    )
    .where('m.is_active', true)
    .orderBy('m.name', 'asc')
    .limit(limit);

  if (normalizedQuery) {
    query.andWhere((builder) => {
      builder
        .whereILike('m.name', `%${normalizedQuery}%`)
        .orWhereILike('m.sku', `%${normalizedQuery}%`)
        .orWhereILike('m.brand_name', `%${normalizedQuery}%`)
        .orWhereILike('c.name', `%${normalizedQuery}%`);
    });
  }

  return query;
}

async function findBySku(sku) {
  return database('medicines')
    .whereRaw('LOWER(sku) = LOWER(?)', [sku])
    .first();
}

async function findById(id) {
  return baseMedicineQuery()
    .select(
      'm.id',
      'm.sku',
      'm.name',
      'm.brand_name',
      'm.description',
      'm.composition',
      'm.dosage',
      'm.dosage_form',
      'm.strength',
      'm.side_effects',
      'm.unit_price',
      'm.minimum_stock_threshold',
      'm.image_path',
      database.raw('COALESCE(stock_summary.current_stock, 0) as current_stock'),
      'm.requires_prescription',
      'm.is_active',
      'm.created_at',
      'm.updated_at',
      'c.id as category_id',
      'c.name as category_name',
      's.id as supplier_id',
      's.name as supplier_name'
    )
    .where('m.id', id)
    .first();
}

async function createMedicine(payload) {
  const [record] = await database('medicines')
    .insert({
      sku: payload.sku,
      name: payload.name,
      brand_name: payload.brand_name,
      category_id: payload.category_id,
      supplier_id: payload.supplier_id,
      description: payload.description,
      composition: payload.composition,
      dosage: payload.dosage,
      dosage_form: payload.dosage_form,
      strength: payload.strength,
      side_effects: payload.side_effects,
      unit_price: payload.unit_price,
      minimum_stock_threshold: payload.minimum_stock_threshold,
      image_path: payload.image_path,
      requires_prescription: payload.requires_prescription,
      is_active: payload.is_active
    })
    .returning(['id']);

  return record ?? null;
}

module.exports = {
  listMedicines,
  listPublicMedicines,
  listSearchSuggestions,
  findBySku,
  findById,
  createMedicine
};
