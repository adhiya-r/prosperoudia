const dashboardService = require('../../../modules/dashboard/dashboardBackofficeService');
const dashboardRealtimeService = require('../services/dashboardRealtimeService');

async function showDashboard(req, res) {
  const currentUser = req.session?.user ?? null;
  const dashboardState = await dashboardService.loadDashboardState(currentUser);
  const currentRole = currentUser?.primaryRole?.display_name ?? currentUser?.primaryRole?.name ?? currentUser?.role ?? 'User';
  const welcomeName = currentUser?.full_name ?? currentUser?.username ?? 'User';

  res.render('pages/dashboard', {
    pageTitle: 'Dashboard',
    currentUser,
    currentRole,
    welcomeName,
    metrics: dashboardService.buildMetrics(dashboardState.summary),
    pendingTransfersCount: dashboardState.summary.pendingTransfers,
    lowStockProducts: dashboardState.lowStockProducts,
    recentTransactions: dashboardState.recentTransactions,
    recentNotifications: dashboardState.recentNotifications,
    dashboardState: {
      summary: dashboardState.summary,
      movementTrend: dashboardState.movementTrend,
      warehouseLocations: dashboardState.warehouseLocations,
      lowStockProducts: dashboardState.lowStockProducts,
      recentTransactions: dashboardState.recentTransactions,
      recentNotifications: dashboardState.recentNotifications
    }
  });
}

async function getDashboardData(req, res) {
  const dashboardState = await dashboardService.loadDashboardState(req.session?.user ?? null);

  return res.json({
    success: true,
    message: 'Dashboard data loaded',
    data: dashboardState
  });
}

async function streamDashboardEvents(req, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');

  if (typeof res.flushHeaders === 'function') {
    res.flushHeaders();
  }

  res.write('event: connected\n');
  res.write(`data: ${JSON.stringify({ ok: true })}\n\n`);

  const unsubscribe = dashboardRealtimeService.subscribe((event) => {
    res.write(`event: ${event.event}\n`);
    res.write(`data: ${JSON.stringify(event.data || {})}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
    res.end();
  });
}

module.exports = {
  showDashboard,
  getDashboardData,
  streamDashboardEvents
};
