const express = require('express');
const dashboardController = require('../controllers/dashboardController');
const adminController = require('../controllers/adminController');
const operationsController = require('../controllers/operationsController');
const systemController = require('../controllers/systemController');
const { requireAuth } = require('../middlewares/authMiddleware');
const { requireRole, requireMinimumRole } = require('../middlewares/roleMiddleware');
const { uploadImportFile } = require('../middlewares/uploadMiddleware');

const router = express.Router();

router.use(requireAuth);

router.get('/dashboard', dashboardController.showDashboard);
router.get('/dashboard/data', dashboardController.getDashboardData);
router.get('/dashboard/events', dashboardController.streamDashboardEvents);
router.get('/monitoring', requireRole('Admin'), systemController.showMonitoringOverview);
router.get('/monitoring/health', requireRole('Admin'), systemController.showMonitoringHealth);
router.get('/monitoring/resources', requireRole('Admin'), systemController.showMonitoringResources);
router.get('/profile', systemController.showProfile);
router.post('/profile', systemController.updateProfile);
router.post('/profile/password', systemController.changePassword);
router.get('/users', requireRole('Admin'), adminController.showUsers);
router.get('/users/new', requireRole('Admin'), adminController.showUserCreate);
router.post('/users', requireRole('Admin'), adminController.createUser);
router.post('/users/:id', requireRole('Admin'), adminController.updateUser);
router.post('/users/:id/deactivate', requireRole('Admin'), adminController.deactivateUser);
router.post('/users/:id/activate', requireRole('Admin'), adminController.activateUser);
router.post('/users/:id/delete', requireRole('Admin'), adminController.deleteUser);
router.get('/audit-logs', requireRole('Admin'), operationsController.showAuditLogs);
// Master data routes are handled by the main application modules under /medicines, /categories, and /suppliers
router.get('/stock-transactions', operationsController.showStockTransactions);
router.get('/stock-transactions/new', requireMinimumRole('Warehouse Staff'), operationsController.showStockTransactionCreate);
router.post('/stock-transactions', requireMinimumRole('Warehouse Staff'), operationsController.createStockTransaction);
router.post('/stock-transactions/:id/cancel', requireMinimumRole('Warehouse Staff'), operationsController.cancelStockTransaction);
router.get('/notifications', operationsController.showNotifications);
router.post('/notifications/:id/read', operationsController.markNotificationAsRead);
router.get('/reports', operationsController.showReports);
router.get('/reports/export', requireRole('Admin'), operationsController.showReportExportCreate);
router.post('/reports/export', requireRole('Admin'), operationsController.exportReport);
router.get('/imports', requireRole('Admin'), operationsController.showImports);
router.get('/imports/products', requireRole('Admin'), operationsController.showImportProductsCreate);
router.get('/imports/products/template', requireRole('Admin'), operationsController.downloadImportProductTemplate);
router.post('/imports/products', requireRole('Admin'), uploadImportFile, operationsController.importProducts);
router.get('/error-logs', requireRole('Admin'), operationsController.showErrorLogs);

module.exports = router;
