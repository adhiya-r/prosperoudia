const database = require('../config/database');

function getDashboardQuery(trx = database) {
  return trx;
}

async function getDashboardSummary(trx = database) {
  const db = getDashboardQuery(trx);
  const lowStockSubquery = db('products as p')
    .leftJoin('inventory_balances as ib', 'ib.product_id', 'p.id')
    .groupBy('p.id', 'p.minimum_stock_threshold')
    .havingRaw('COALESCE(SUM(ib.current_quantity), 0) <= p.minimum_stock_threshold')
    .select('p.id');

  const [
    productCountResult,
    warehouseCountResult,
    lowStockCountResult,
    pendingTransferCountResult,
    recentTransactionCountResult,
    inventoryValueResult
  ] = await Promise.all([
    db('products').count({ total: '*' }).first(),
    db('warehouses').count({ total: '*' }).first(),
    db.from(lowStockSubquery.as('low_stock_products'))
      .count({ total: '*' })
      .first(),
    db('warehouse_transfers')
      .whereIn('status', ['REQUESTED', 'APPROVED', 'IN_TRANSIT'])
      .count({ total: '*' })
      .first(),
    db('stock_transactions')
      .whereRaw("occurred_at >= NOW() - INTERVAL '7 days'")
      .count({ total: '*' })
      .first(),
    db('inventory_balances as ib')
      .innerJoin('products as p', 'p.id', 'ib.product_id')
      .select(db.raw('COALESCE(SUM(COALESCE(ib.current_quantity, 0) * COALESCE(p.unit_price, 0)), 0) as total_value'))
      .first()
  ]);

  return {
    totalProducts: Number(productCountResult?.total ?? 0),
    totalWarehouses: Number(warehouseCountResult?.total ?? 0),
    lowStockItems: Number(lowStockCountResult?.total ?? 0),
    pendingTransfers: Number(pendingTransferCountResult?.total ?? 0),
    recentTransactions: Number(recentTransactionCountResult?.total ?? 0),
    inventoryValue: Number(inventoryValueResult?.total_value ?? 0)
  };
}

async function getLowStockProducts(limit = 5, trx = database) {
  const db = getDashboardQuery(trx);
  return db('products as p')
    .leftJoin('inventory_balances as ib', 'ib.product_id', 'p.id')
    .leftJoin('categories as c', 'c.id', 'p.category_id')
    .groupBy('p.id', 'p.sku', 'p.name', 'p.minimum_stock_threshold', 'c.name')
    .select(
      'p.id',
      'p.sku',
      'p.name',
      'c.name as category_name',
      'p.minimum_stock_threshold as threshold'
    )
    .select(db.raw('COALESCE(SUM(ib.current_quantity), 0) as current_quantity'))
    .havingRaw('COALESCE(SUM(ib.current_quantity), 0) <= p.minimum_stock_threshold')
    .orderBy('current_quantity', 'asc')
    .orderBy('p.name', 'asc')
    .limit(limit);
}

async function getRecentTransactions(limit = 8, trx = database) {
  const db = getDashboardQuery(trx);
  return db('stock_transactions as st')
    .innerJoin('products as p', 'p.id', 'st.product_id')
    .innerJoin('warehouses as w', 'w.id', 'st.warehouse_id')
    .leftJoin('users as u', 'u.id', 'st.performed_by')
    .select(
      'st.id',
      'st.transaction_type',
      'st.quantity',
      'st.quantity_before',
      'st.quantity_after',
      'st.occurred_at',
      'p.sku',
      'p.name as product_name',
      'w.name as warehouse_name',
      'u.full_name as performed_by_name'
    )
    .orderBy('st.occurred_at', 'desc')
    .orderBy('st.id', 'desc')
    .limit(limit);
}

async function getMovementTrend(days = 7, trx = database) {
  const db = getDashboardQuery(trx);
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 31));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (safeDays - 1));

  const rows = await db('stock_transactions')
    .select('transaction_type', 'quantity', 'occurred_at')
    .where('occurred_at', '>=', since)
    .orderBy('occurred_at', 'asc');

  const buckets = new Map();
  const labels = [];

  for (let index = 0; index < safeDays; index += 1) {
    const currentDate = new Date(since);
    currentDate.setDate(since.getDate() + index);
    const isoDate = currentDate.toISOString().slice(0, 10);
    buckets.set(isoDate, { stockIn: 0, stockOut: 0 });
    labels.push({
      key: isoDate,
      label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(currentDate)
    });
  }

  for (const row of rows) {
    const bucketKey = new Date(row.occurred_at).toISOString().slice(0, 10);
    if (!buckets.has(bucketKey)) {
      continue;
    }

    const quantity = Number(row.quantity ?? 0);
    const bucket = buckets.get(bucketKey);
    if (['STOCK_IN', 'IMPORT', 'TRANSFER_IN'].includes(row.transaction_type)) {
      bucket.stockIn += quantity;
    } else if (['STOCK_OUT', 'TRANSFER_OUT'].includes(row.transaction_type)) {
      bucket.stockOut += quantity;
    }
  }

  return {
    labels: labels.map((item) => item.label),
    stockIn: labels.map((item) => buckets.get(item.key)?.stockIn ?? 0),
    stockOut: labels.map((item) => buckets.get(item.key)?.stockOut ?? 0)
  };
}

async function getWarehouseLocations(trx = database) {
  const db = getDashboardQuery(trx);
  return db('warehouses')
    .select('id', 'code', 'name', 'city', 'latitude', 'longitude', 'is_active')
    .where('is_active', true)
    .orderBy('city', 'asc')
    .orderBy('name', 'asc');
}

async function getWarehouseStockSummary(trx = database) {
  const db = getDashboardQuery(trx);
  return db('warehouses as w')
    .leftJoin('inventory_balances as ib', 'ib.warehouse_id', 'w.id')
    .leftJoin('products as p', 'p.id', 'ib.product_id')
    .groupBy('w.id', 'w.code', 'w.name', 'w.city')
    .select(
      'w.id',
      'w.code',
      'w.name',
      'w.city'
    )
    .select(db.raw('COALESCE(SUM(ib.current_quantity), 0)::integer as total_stock'))
    .select(db.raw('COALESCE(SUM(COALESCE(ib.current_quantity, 0) * COALESCE(p.unit_price, 0)), 0)::bigint as inventory_value'))
    .orderBy('w.city', 'asc')
    .orderBy('w.name', 'asc');
}

module.exports = {
  getDashboardSummary,
  getLowStockProducts,
  getRecentTransactions,
  getMovementTrend,
  getWarehouseLocations,
  getWarehouseStockSummary
};
