const database = require('../../config/database');
const baseDashboardService = require('./dashboardService');

function buildMetrics(summary) {
  return [
    { label: 'Total Obat', value: String(summary.totalProducts || 0) },
    { label: 'Lokasi Aktif', value: String(summary.totalWarehouses || 0) },
    { label: 'Nilai Persediaan', value: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(summary.inventoryValue || 0)) },
    { label: 'Stok Kritis', value: String(summary.lowStockItems || 0) }
  ];
}

async function getDashboardSummary() {
  const summary = await baseDashboardService.getDashboardSummary();

  return {
    totalProducts: summary.totalMedicines,
    totalWarehouses: 1,
    lowStockItems: summary.lowStockItems,
    pendingTransfers: summary.pendingPrescriptionOrders,
    recentTransactions: summary.recentOrders,
    inventoryValue: summary.inventoryValue
  };
}

async function getLowStockProducts(limit = 5) {
  const items = await baseDashboardService.getLowStockProducts(limit);
  return items.map((item) => ({
    ...item,
    current_quantity: Number(item.current_stock || 0)
  }));
}

async function getRecentTransactions(limit = 8) {
  const items = await baseDashboardService.getRecentStockMovements(limit);
  return items.map((item) => ({
    ...item,
    transaction_type: item.movement_type,
    product_name: item.medicine_name,
    warehouse_name: 'Gudang Utama Klinik'
  }));
}

async function getMovementTrend(days = 7) {
  const safeDays = Math.max(1, Math.min(Number(days) || 7, 31));
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - (safeDays - 1));

  const rows = await database('stock_movements')
    .select('movement_type', 'quantity', 'occurred_at')
    .where('occurred_at', '>=', since)
    .orderBy('occurred_at', 'asc');

  const buckets = new Map();
  const labels = [];

  for (let index = 0; index < safeDays; index += 1) {
    const currentDate = new Date(since);
    currentDate.setDate(since.getDate() + index);
    const key = currentDate.toISOString().slice(0, 10);
    buckets.set(key, { stockIn: 0, stockOut: 0 });
    labels.push({
      key,
      label: new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(currentDate)
    });
  }

  for (const row of rows) {
    const key = new Date(row.occurred_at).toISOString().slice(0, 10);
    if (!buckets.has(key)) {
      continue;
    }

    const bucket = buckets.get(key);
    const quantity = Number(row.quantity || 0);
    if (row.movement_type === 'stock_in') {
      bucket.stockIn += quantity;
    } else if (row.movement_type === 'stock_out') {
      bucket.stockOut += quantity;
    }
  }

  return {
    labels: labels.map((item) => item.label),
    stockIn: labels.map((item) => buckets.get(item.key)?.stockIn ?? 0),
    stockOut: labels.map((item) => buckets.get(item.key)?.stockOut ?? 0)
  };
}

async function getWarehouseLocations() {
  return [
    {
      id: 1,
      code: 'LOC-UTAMA',
      name: 'Klinik Makmur Jaya',
      city: 'Jakarta',
      latitude: -6.200000,
      longitude: 106.816666,
      is_active: true
    }
  ];
}

async function getRecentNotifications(limit = 5) {
  const notifications = await baseDashboardService.getRecentNotifications(limit);
  return notifications.map((notification) => ({
    ...notification,
    role_target: notification.is_read ? 'Sudah dibaca' : 'Perlu tindak lanjut'
  }));
}

async function loadDashboardState() {
  const [
    summary,
    lowStockProducts,
    recentTransactions,
    movementTrend,
    warehouseLocations,
    recentNotifications
  ] = await Promise.all([
    module.exports.getDashboardSummary(),
    module.exports.getLowStockProducts(5),
    module.exports.getRecentTransactions(6),
    module.exports.getMovementTrend(7),
    module.exports.getWarehouseLocations(),
    module.exports.getRecentNotifications(5)
  ]);

  return {
    summary,
    lowStockProducts,
    recentTransactions,
    movementTrend,
    warehouseLocations,
    recentNotifications
  };
}

module.exports = {
  buildMetrics,
  getDashboardSummary,
  getLowStockProducts,
  getRecentNotifications,
  getRecentTransactions,
  getMovementTrend,
  getWarehouseLocations,
  loadDashboardState
};
