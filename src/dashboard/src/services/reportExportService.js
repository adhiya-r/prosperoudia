const fs = require('node:fs');
const fsPromises = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const PDFDocument = require('pdfkit');

const env = require('../config/env');
const dashboardService = require('./dashboardService');
const reportJobService = require('./reportJobService');
const auditLogService = require('./auditLogService');
const notificationService = require('./notificationService');

const projectRoot = path.resolve(__dirname, '..', '..');
const reportsDir = path.resolve(projectRoot, env.REPORTS_DIR);
const REPORT_TYPE_DASHBOARD_SUMMARY = 'dashboard_summary_pdf';

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

function formatDateTime(value) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Jakarta'
  }).format(new Date(value));
}

async function ensureReportsDir() {
  await fsPromises.mkdir(reportsDir, { recursive: true });
}

function createPdfDocument(outputPath) {
  const document = new PDFDocument({ size: 'A4', margin: 40 });
  const stream = fs.createWriteStream(outputPath);
  document.pipe(stream);

  return {
    document,
    done: new Promise((resolve, reject) => {
      stream.on('finish', resolve);
      stream.on('error', reject);
      document.on('error', reject);
    })
  };
}

function drawLogo(document, x, y) {
  document.save();
  document.roundedRect(x, y, 56, 56, 14).fill('#3B82F6');
  document.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(22).text('SS', x, y + 16, {
    width: 56,
    align: 'center'
  });
  document.restore();
}

function drawMetricCard(document, x, y, width, title, value, accentColor) {
  document.save();
  document.roundedRect(x, y, width, 72, 16).fill('#F8FAFC');
  document.roundedRect(x, y, 8, 72, 16).fill(accentColor);
  document.fillColor('#475569').font('Helvetica').fontSize(10).text(title, x + 22, y + 16, { width: width - 30 });
  document.fillColor('#0F172A').font('Helvetica-Bold').fontSize(18).text(value, x + 22, y + 34, { width: width - 30 });
  document.restore();
}

function drawBarChart(document, x, y, width, height, labels, primaryData, secondaryData) {
  const maxValue = Math.max(1, ...primaryData, ...secondaryData);
  const columnWidth = width / Math.max(labels.length, 1);

  document.save();
  document.roundedRect(x, y, width, height, 16).fill('#EFF6FF');
  document.fillColor('#0F172A').font('Helvetica-Bold').fontSize(12).text('Movement Trend (7 days)', x + 16, y + 14);
  document.font('Helvetica').fontSize(9).fillColor('#475569');
  document.text('Stock In', x + width - 120, y + 14);
  document.fillColor('#22C55E').circle(x + width - 132, y + 20, 4).fill();
  document.fillColor('#475569').text('Stock Out', x + width - 60, y + 14);
  document.fillColor('#EF4444').circle(x + width - 72, y + 20, 4).fill();

  for (let index = 0; index < labels.length; index += 1) {
    const baseX = x + 16 + index * columnWidth;
    const chartBaseY = y + height - 28;
    const innerWidth = Math.max(10, columnWidth - 12);
    const barWidth = innerWidth / 2 - 2;
    const stockInHeight = ((primaryData[index] || 0) / maxValue) * (height - 70);
    const stockOutHeight = ((secondaryData[index] || 0) / maxValue) * (height - 70);

    document.fillColor('#DBEAFE').rect(baseX, y + 42, innerWidth, height - 70).fill();
    document.fillColor('#22C55E').rect(baseX + 1, chartBaseY - stockInHeight, barWidth, stockInHeight).fill();
    document.fillColor('#EF4444').rect(baseX + barWidth + 5, chartBaseY - stockOutHeight, barWidth, stockOutHeight).fill();
    document.fillColor('#334155').fontSize(8).text(labels[index], baseX - 2, chartBaseY + 6, {
      width: innerWidth + 4,
      align: 'center'
    });
  }

  document.restore();
}

function drawTable(document, x, y, width, columns, rows, options = {}) {
  const headerHeight = 26;
  const rowHeight = options.rowHeight ?? 24;
  let cursorY = y;
  const totalFlex = columns.reduce((sum, column) => sum + column.width, 0);
  const resolvedColumns = columns.map((column) => ({
    ...column,
    pixelWidth: (column.width / totalFlex) * width
  }));

  document.save();
  document.roundedRect(x, cursorY, width, headerHeight, 10).fill(options.headerColor ?? '#1D4ED8');
  let cursorX = x;

  resolvedColumns.forEach((column) => {
    document.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(10).text(column.label, cursorX + 8, cursorY + 8, {
      width: column.pixelWidth - 16,
      align: column.align ?? 'left'
    });
    cursorX += column.pixelWidth;
  });

  cursorY += headerHeight;

  rows.forEach((row, rowIndex) => {
    document.fillColor(rowIndex % 2 === 0 ? '#F8FAFC' : '#E2E8F0').rect(x, cursorY, width, rowHeight).fill();
    let cellX = x;

    resolvedColumns.forEach((column) => {
      document.fillColor('#0F172A').font('Helvetica').fontSize(9).text(String(row[column.key] ?? '-'), cellX + 8, cursorY + 7, {
        width: column.pixelWidth - 16,
        align: column.align ?? 'left'
      });
      cellX += column.pixelWidth;
    });

    cursorY += rowHeight;
  });

  document.restore();
  return cursorY;
}

async function generateDashboardSummaryPdf({ createdBy, sessionUser, requestContext }) {
  await ensureReportsDir();

  const job = await reportJobService.createReportJob({
    job_uuid: crypto.randomUUID(),
    report_type: REPORT_TYPE_DASHBOARD_SUMMARY,
    filters: { scope: 'dashboard_summary' },
    status: 'processing',
    created_by: createdBy,
    started_at: new Date().toISOString()
  });

  try {
    const [summary, trend, lowStock, recentTransactions, warehouseSummary] = await Promise.all([
      dashboardService.getDashboardSummary(),
      dashboardService.getMovementTrend(7),
      dashboardService.getLowStockProducts(5),
      dashboardService.getRecentTransactions(6),
      dashboardService.getWarehouseStockSummary()
    ]);

    const fileName = `report-dashboard-summary-${Date.now()}.pdf`;
    const absoluteOutputPath = path.join(reportsDir, fileName);
    const publicOutputPath = `/reports/${fileName}`;
    const { document, done } = createPdfDocument(absoluteOutputPath);

    drawLogo(document, 40, 36);
    document.fillColor('#1E293B').font('Helvetica-Bold').fontSize(24).text('SmartStock Pro', 110, 44);
    document.fillColor('#475569').font('Helvetica').fontSize(11).text('Dashboard Summary Report', 110, 73);
    document.text(`Generated: ${formatDateTime(new Date())}`, 110, 90);
    document.text(`Generated by: ${sessionUser?.full_name || sessionUser?.username || 'System'}`, 110, 106);

    drawMetricCard(document, 40, 140, 122, 'Total Products', formatNumber(summary.totalProducts), '#3B82F6');
    drawMetricCard(document, 174, 140, 122, 'Warehouses', formatNumber(summary.totalWarehouses), '#14B8A6');
    drawMetricCard(document, 308, 140, 122, 'Low Stock', formatNumber(summary.lowStockItems), '#F59E0B');
    drawMetricCard(document, 442, 140, 122, 'Inventory Value', formatCurrencyIDR(summary.inventoryValue), '#8B5CF6');

    drawBarChart(document, 40, 230, 525, 180, trend.labels, trend.stockIn, trend.stockOut);

    document.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text('Warehouse Summary', 40, 434);
    let nextY = drawTable(
      document,
      40,
      456,
      525,
      [
        { key: 'warehouse', label: 'Warehouse', width: 2.5 },
        { key: 'city', label: 'City', width: 1.5 },
        { key: 'total_stock', label: 'Stock', width: 1.2, align: 'right' },
        { key: 'inventory_value', label: 'Value', width: 2, align: 'right' }
      ],
      warehouseSummary.slice(0, 5).map((item) => ({
        warehouse: item.name,
        city: item.city,
        total_stock: formatNumber(item.total_stock),
        inventory_value: formatCurrencyIDR(item.inventory_value)
      })),
      { rowHeight: 26 }
    );

    nextY += 18;
    document.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text('Low Stock Watchlist', 40, nextY);
    nextY = drawTable(
      document,
      40,
      nextY + 22,
      525,
      [
        { key: 'sku', label: 'SKU', width: 1.4 },
        { key: 'name', label: 'Product', width: 2.6 },
        { key: 'category', label: 'Category', width: 1.8 },
        { key: 'stock', label: 'Current / Threshold', width: 1.8, align: 'right' }
      ],
      lowStock.map((item) => ({
        sku: item.sku,
        name: item.name,
        category: item.category_name || '-',
        stock: `${formatNumber(item.current_quantity)} / ${formatNumber(item.threshold)}`
      })),
      { headerColor: '#B45309', rowHeight: 24 }
    );

    if (nextY > 720) {
      document.addPage();
      nextY = 40;
    } else {
      nextY += 18;
    }

    document.fillColor('#0F172A').font('Helvetica-Bold').fontSize(14).text('Recent Transactions', 40, nextY);
    drawTable(
      document,
      40,
      nextY + 22,
      525,
      [
        { key: 'time', label: 'Time', width: 1.6 },
        { key: 'product', label: 'Product', width: 2.4 },
        { key: 'warehouse', label: 'Warehouse', width: 2.1 },
        { key: 'type', label: 'Type', width: 1.4 },
        { key: 'quantity', label: 'Qty', width: 0.8, align: 'right' }
      ],
      recentTransactions.map((item) => ({
        time: formatDateTime(item.occurred_at),
        product: `${item.sku} - ${item.product_name}`,
        warehouse: item.warehouse_name,
        type: item.transaction_type,
        quantity: formatNumber(item.quantity)
      })),
      { headerColor: '#0F766E', rowHeight: 24 }
    );

    document.end();
    await done;

    const completedJob = await reportJobService.updateReportJob(job.id, {
      ...job,
      report_type: REPORT_TYPE_DASHBOARD_SUMMARY,
      filters: { scope: 'dashboard_summary' },
      status: 'completed',
      output_file_path: publicOutputPath,
      error_summary: null,
      completed_at: new Date().toISOString()
    });

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(sessionUser ?? null, requestContext, {
        action: 'REPORT_GENERATED',
        entity_type: 'report_job',
        entity_id: completedJob.id,
        old_value: null,
        new_value: {
          report_type: REPORT_TYPE_DASHBOARD_SUMMARY,
          output_file_path: publicOutputPath
        }
      })
    );

    await notificationService.createNotification({
      user_id: createdBy,
      severity: 'info',
      title: 'Report Ready',
      message: 'PDF dashboard summary berhasil dibuat.',
      entity_type: 'report_job',
      entity_id: completedJob.id
    });

    return completedJob;
  } catch (error) {
    await reportJobService.updateReportJob(job.id, {
      ...job,
      report_type: REPORT_TYPE_DASHBOARD_SUMMARY,
      filters: { scope: 'dashboard_summary' },
      status: 'failed',
      error_summary: [{ message: error.message || 'PDF export failed' }],
      completed_at: new Date().toISOString()
    });

    throw error;
  }
}

module.exports = {
  REPORT_TYPE_DASHBOARD_SUMMARY,
  generateDashboardSummaryPdf
};
