const dashboardService = require('./dashboardService');

async function showDashboard(req, res) {
  const [
    summary,
    lowStockProducts,
    recentOrders,
    recentStockMovements,
    orderTrend,
    recentNotifications,
    recentErrorLogs
  ] = await Promise.all([
    dashboardService.getDashboardSummary(),
    dashboardService.getLowStockProducts(5),
    dashboardService.getRecentOrders(6),
    dashboardService.getRecentStockMovements(6),
    dashboardService.getOrderTrend(7),
    dashboardService.getRecentNotifications(5),
    dashboardService.getRecentErrorLogs(5)
  ]);

  return res.render('pages/dashboard', {
    pageTitle: 'Dashboard',
    currentRole: req.session.user.primaryRole?.display_name || req.session.user.role || '-',
    metrics: dashboardService.buildMetrics(summary),
    dashboardState: {
      summary,
      lowStockProducts,
      recentOrders,
      recentStockMovements,
      orderTrend,
      recentNotifications,
      recentErrorLogs
    }
  });
}

module.exports = {
  showDashboard
};
