const database = require('../../config/database');

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
}

async function getDashboardSummary(trx = database) {
  const lowStockSubquery = trx('medicines as m')
    .leftJoin('inventory_batches as ib', 'ib.medicine_id', 'm.id')
    .groupBy('m.id', 'm.minimum_stock_threshold')
    .havingRaw('COALESCE(SUM(ib.quantity_remaining), 0) <= m.minimum_stock_threshold')
    .select('m.id');

  const [
    medicinesResult,
    lowStockResult,
    pendingPrescriptionOrdersResult,
    recentOrdersResult,
    inventoryValueResult,
    revenueResult
  ] = await Promise.all([
    trx('medicines').where('is_active', true).count({ total: '*' }).first(),
    trx.from(lowStockSubquery.as('low_stock')).count({ total: '*' }).first(),
    trx('orders').where('status', 'pending_verification').count({ total: '*' }).first(),
    trx('orders')
      .whereRaw("placed_at >= NOW() - INTERVAL '7 days'")
      .count({ total: '*' })
      .first(),
    trx('inventory_batches as ib')
      .innerJoin('medicines as m', 'm.id', 'ib.medicine_id')
      .select(trx.raw('COALESCE(SUM(COALESCE(ib.quantity_remaining, 0) * COALESCE(m.unit_price, 0)), 0) as total_value'))
      .first(),
    trx('orders')
      .whereIn('status', ['confirmed', 'completed'])
      .select(trx.raw('COALESCE(SUM(total_amount), 0) as total_revenue'))
      .first()
  ]);

  return {
    totalMedicines: Number(medicinesResult?.total ?? 0),
    lowStockItems: Number(lowStockResult?.total ?? 0),
    pendingPrescriptionOrders: Number(pendingPrescriptionOrdersResult?.total ?? 0),
    recentOrders: Number(recentOrdersResult?.total ?? 0),
    inventoryValue: Number(inventoryValueResult?.total_value ?? 0),
    totalRevenue: Number(revenueResult?.total_revenue ?? 0)
  };
}

async function getLowStockProducts(limit = 5, trx = database) {
  return trx('medicines as m')
    .leftJoin('inventory_batches as ib', 'ib.medicine_id', 'm.id')
    .leftJoin('medicine_categories as c', 'c.id', 'm.category_id')
    .groupBy('m.id', 'm.sku', 'm.name', 'm.minimum_stock_threshold', 'c.name')
    .select(
      'm.id',
      'm.sku',
      'm.name',
      'c.name as category_name',
      'm.minimum_stock_threshold as threshold'
    )
    .select(trx.raw('COALESCE(SUM(ib.quantity_remaining), 0) as current_stock'))
    .havingRaw('COALESCE(SUM(ib.quantity_remaining), 0) <= m.minimum_stock_threshold')
    .orderBy('current_stock', 'asc')
    .orderBy('m.name', 'asc')
    .limit(limit);
}

async function getRecentOrders(limit = 6, trx = database) {
  return trx('orders as o')
    .innerJoin('customers as c', 'c.id', 'o.customer_id')
    .select(
      'o.id',
      'o.order_number',
      'o.status',
      'o.payment_status',
      'o.total_amount',
      'o.fulfillment_method',
      'o.placed_at',
      'c.full_name as customer_name'
    )
    .orderBy('o.placed_at', 'desc')
    .limit(limit);
}

async function getRecentStockMovements(limit = 6, trx = database) {
  return trx('stock_movements as sm')
    .innerJoin('medicines as m', 'm.id', 'sm.medicine_id')
    .leftJoin('users as u', 'u.id', 'sm.performed_by')
    .select(
      'sm.id',
      'sm.movement_type',
      'sm.quantity',
      'sm.quantity_before',
      'sm.quantity_after',
      'sm.occurred_at',
      'm.sku',
      'm.name as medicine_name',
      'u.full_name as performed_by_name'
    )
    .orderBy('sm.occurred_at', 'desc')
    .orderBy('sm.id', 'desc')
    .limit(limit);
}

async function getOrderTrend(days = 7, trx = database) {
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 31));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (safeDays - 1));

  const rows = await trx('orders')
    .select('placed_at', 'total_amount')
    .where('placed_at', '>=', since)
    .orderBy('placed_at', 'asc');

  const buckets = new Map();
  const labels = [];

  for (let index = 0; index < safeDays; index += 1) {
    const currentDate = new Date(since);
    currentDate.setDate(since.getDate() + index);
    const key = currentDate.toISOString().slice(0, 10);
    buckets.set(key, { orders: 0, revenue: 0 });
    labels.push({
      key,
      label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(currentDate)
    });
  }

  for (const row of rows) {
    const bucketKey = new Date(row.placed_at).toISOString().slice(0, 10);
    if (!buckets.has(bucketKey)) {
      continue;
    }

    const bucket = buckets.get(bucketKey);
    bucket.orders += 1;
    bucket.revenue += Number(row.total_amount ?? 0);
  }

  return {
    labels: labels.map((item) => item.label),
    orders: labels.map((item) => buckets.get(item.key)?.orders ?? 0),
    revenue: labels.map((item) => buckets.get(item.key)?.revenue ?? 0)
  };
}

async function getRecentNotifications(limit = 5, trx = database) {
  return trx('notifications')
    .select('id', 'severity', 'title', 'message', 'is_read', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(limit);
}

async function getRecentErrorLogs(limit = 5, trx = database) {
  return trx('error_logs')
    .select('id', 'severity', 'message', 'request_path', 'created_at')
    .orderBy('created_at', 'desc')
    .limit(limit);
}

function buildMetrics(summary) {
  return [
    { label: 'Total Obat', value: formatNumber(summary.totalMedicines) },
    { label: 'Low Stock', value: formatNumber(summary.lowStockItems) },
    { label: 'Order 7 Hari', value: formatNumber(summary.recentOrders) },
    { label: 'Pending Resep', value: formatNumber(summary.pendingPrescriptionOrders) },
    { label: 'Nilai Persediaan', value: formatCurrencyIDR(summary.inventoryValue) },
    { label: 'Pendapatan', value: formatCurrencyIDR(summary.totalRevenue) }
  ];
}

module.exports = {
  buildMetrics,
  getDashboardSummary,
  getLowStockProducts,
  getOrderTrend,
  getRecentErrorLogs,
  getRecentNotifications,
  getRecentOrders,
  getRecentStockMovements
};
