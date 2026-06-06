const os = require('os');
const database = require('../../config/database');

function formatCount(value) {
  return new Intl.NumberFormat('id-ID').format(Number(value ?? 0));
}

function formatBytes(value) {
  const size = Number(value ?? 0);

  if (size <= 0) {
    return '0 MB';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let unitIndex = 0;
  let current = size;

  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }

  return `${current.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function formatPercent(value) {
  return `${Number(value ?? 0).toFixed(1)}%`;
}

function formatDuration(seconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(seconds ?? 0)));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (days > 0) {
    return `${days}h ${hours}j ${minutes}m`;
  }

  if (hours > 0) {
    return `${hours}j ${minutes}m`;
  }

  return `${minutes}m`;
}

async function checkDatabaseHealth() {
  try {
    await database.raw('select 1');
    return { label: 'Database', value: 'Online', tone: 'info' };
  } catch (error) {
    return { label: 'Database', value: 'Offline', tone: 'critical' };
  }
}

async function getLowStockCount() {
  const result = await database('medicines as m')
    .leftJoin('inventory_batches as ib', 'ib.medicine_id', 'm.id')
    .groupBy('m.id', 'm.minimum_stock_threshold')
    .havingRaw('COALESCE(SUM(ib.quantity_remaining), 0) <= m.minimum_stock_threshold')
    .countDistinct({ total: 'm.id' })
    .first();

  return Number(result?.total ?? 0);
}

async function getMonitoringState() {
  const [
    activeUsersResult,
    pendingOrdersResult,
    unreadNotificationsResult,
    errorLogsResult,
    lowStockCount,
    databaseHealth
  ] = await Promise.all([
    database('users').where('is_active', true).count({ total: '*' }).first(),
    database('orders').whereIn('status', ['pending', 'pending_verification']).count({ total: '*' }).first(),
    database('notifications').where('is_read', false).count({ total: '*' }).first(),
    database('error_logs')
      .whereRaw("created_at >= NOW() - INTERVAL '24 hours'")
      .count({ total: '*' })
      .first(),
    getLowStockCount(),
    checkDatabaseHealth()
  ]);

  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;

  return {
    monitoringMetrics: [
      { label: 'App Uptime', value: formatDuration(process.uptime()) },
      { label: 'Memory Used', value: formatBytes(usedMemory) },
      { label: 'Unread Alert', value: formatCount(unreadNotificationsResult?.total) },
      { label: 'Low Stock', value: formatCount(lowStockCount) }
    ],
    primaryRows: [
      databaseHealth,
      { label: 'Node.js', value: process.version, tone: 'neutral' },
      { label: 'Platform', value: `${os.platform()} ${os.arch()}`, tone: 'neutral' },
      { label: 'CPU Core', value: formatCount(os.cpus().length), tone: 'neutral' },
      { label: 'Hostname', value: os.hostname(), tone: 'neutral' }
    ],
    secondaryRows: [
      { label: 'User Aktif', value: formatCount(activeUsersResult?.total), tone: 'info' },
      { label: 'Order Pending', value: formatCount(pendingOrdersResult?.total), tone: 'warning' },
      { label: 'Error 24 Jam', value: formatCount(errorLogsResult?.total), tone: Number(errorLogsResult?.total ?? 0) > 0 ? 'critical' : 'neutral' },
      { label: 'Total RAM', value: formatBytes(totalMemory), tone: 'neutral' },
      { label: 'RAM Tersedia', value: `${formatBytes(freeMemory)} (${formatPercent((freeMemory / totalMemory) * 100)})`, tone: 'neutral' }
    ]
  };
}

module.exports = {
  getMonitoringState
};
