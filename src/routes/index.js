const express = require('express');
const authRoutes = require('../modules/auth/authRoutes');
const categoryRoutes = require('../modules/categories/categoryRoutes');
const dashboardController = require('../modules/dashboard/dashboardController');
const homeRoutes = require('../modules/home/homeRoutes');
const importRoutes = require('../modules/imports/importRoutes');
const medicineRoutes = require('../modules/medicines/medicineRoutes');
const monitoringRoutes = require('../modules/monitoring/monitoringRoutes');
const cartRoutes = require('../modules/orders/cartRoutes');
const orderManagementRoutes = require('../modules/orders/orderManagementRoutes');
const prescriptionRoutes = require('../modules/prescriptions/prescriptionRoutes');
const reportRoutes = require('../modules/reports/reportRoutes');
const supplierRoutes = require('../modules/suppliers/supplierRoutes');
const userManagementRoutes = require('../modules/users/userManagementRoutes');
const { requireAuth } = require('../shared/middlewares/authMiddleware');

const router = express.Router();

router.use('/', homeRoutes);
router.use('/', authRoutes);
router.use('/', cartRoutes);
router.use('/system/imports', importRoutes);
router.use('/system/reports', reportRoutes);
router.use('/system', monitoringRoutes);
router.use('/system', userManagementRoutes);
router.use('/orders', orderManagementRoutes);
router.use('/prescriptions', prescriptionRoutes);
router.use('/categories', categoryRoutes);
router.use('/medicines', medicineRoutes);
router.use('/suppliers', supplierRoutes);

router.get('/dashboard', requireAuth, dashboardController.showDashboard);

module.exports = router;
