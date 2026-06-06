const database = require('../config/database');
const ExcelJS = require('exceljs');
const productService = require('../services/productService');
const warehouseService = require('../services/warehouseService');
const inventoryService = require('../services/inventoryService');
const warehouseTransferService = require('../services/warehouseTransferService');
const dashboardService = require('../services/dashboardService');
const stockTransactionRepository = require('../repositories/stockTransactionRepository');
const warehouseTransferRepository = require('../repositories/warehouseTransferRepository');
const inventoryBalanceRepository = require('../repositories/inventoryBalanceRepository');
const notificationService = require('../services/notificationService');
const auditTrailService = require('../services/auditTrailService');
const errorLogService = require('../services/errorLogService');
const importJobService = require('../services/importJobService');
const productImportService = require('../services/productImportService');
const reportJobService = require('../services/reportJobService');
const reportExportService = require('../services/reportExportService');
const auditLogService = require('../services/auditLogService');
const dashboardRealtimeService = require('../services/dashboardRealtimeService');
const pharmacyNotificationService = require('../../../modules/notifications/notificationService');
const { validateStockTransactionPayload } = require('../validators/stockTransactionValidator');
const { validateImportFilePayload } = require('../validators/importValidator');

const STOCK_TRANSACTION_TYPES = [
  { value: 'STOCK_IN', label: 'Stock In' },
  { value: 'STOCK_OUT', label: 'Stock Out' },
  { value: 'ADJUSTMENT', label: 'Adjustment' },
  { value: 'IMPORT', label: 'Import' }
];

const TRANSFER_STATUSES = [
  { value: 'REQUESTED', label: 'Requested' }
];

const TRANSFER_ACTION_LABELS = {
  APPROVED: 'Approve',
  REJECTED: 'Reject',
  CANCELLED: 'Cancel',
  IN_TRANSIT: 'Mark In Transit',
  COMPLETED: 'Complete'
};

const REVERSIBLE_TRANSACTION_TYPES = ['STOCK_IN', 'STOCK_OUT', 'IMPORT'];
const IMPORT_PRODUCT_TEMPLATE_HEADERS = [
  'sku',
  'product_name',
  'category',
  'supplier',
  'warehouse',
  'quantity',
  'minimum_stock_threshold',
  'unit_price',
  'description',
  'is_active'
];

function parseId(value) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function mapOptions(records, labelGetter) {
  return records.map((record) => ({
    value: String(record.id),
    label: labelGetter(record)
  }));
}

async function syncLowStockNotifications(trx = database) {
  const lowStockProducts = await dashboardService.getLowStockProducts(25, trx);
  await notificationService.ensureLowStockAlerts(lowStockProducts, trx);
  return lowStockProducts;
}

function withFieldErrors(fields, errors = {}) {
  return fields.map((field) => ({
    ...field,
    error: errors[field.name] ?? null
  }));
}

function getErrorSummary(errors = {}) {
  return Object.values(errors).filter(Boolean);
}

function getRoleNames(sessionUser) {
  if (!sessionUser) {
    return [];
  }

  if (Array.isArray(sessionUser.roles)) {
    return sessionUser.roles
      .map((role) => role?.name ?? null)
      .filter(Boolean);
  }

  const primaryRoleName = sessionUser.primaryRole?.name ?? sessionUser.role ?? null;
  return primaryRoleName ? [primaryRoleName] : [];
}

function hasAnyRole(sessionUser, allowedRoles = []) {
  const roleNames = getRoleNames(sessionUser);
  return roleNames.some((roleName) => allowedRoles.includes(roleName));
}

function usesPharmacyBackofficeNotifications(sessionUser) {
  return hasAnyRole(sessionUser, ['Admin', 'Apoteker', 'Kasir']);
}

function canManageStockTransactions(sessionUser) {
  return hasAnyRole(sessionUser, ['Admin', 'Warehouse Manager', 'Warehouse Staff']);
}

function canCreateWarehouseTransfer(sessionUser) {
  return hasAnyRole(sessionUser, ['Admin', 'Warehouse Manager', 'Warehouse Staff']);
}

function canExportReports(sessionUser) {
  return hasAnyRole(sessionUser, ['Admin']);
}

function getFlash(req) {
  return {
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  };
}

function buildQueryUrl(basePath, params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function paginateRecords(records, currentPage, perPage) {
  const totalItems = records.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / perPage));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const startIndex = (safePage - 1) * perPage;
  const endIndex = Math.min(startIndex + perPage, totalItems);

  return {
    items: records.slice(startIndex, endIndex),
    currentPage: safePage,
    totalItems,
    totalPages,
    startIndex: totalItems ? startIndex + 1 : 0,
    endIndex
  };
}

async function safeList(loader, fallback = []) {
  try {
    return await loader();
  } catch (error) {
    console.error('Failed to load operational list:', error);
    return fallback;
  }
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Date(value).toLocaleString('id-ID');
}

function buildTransferStatusActions(transfer, sessionUser) {
  const actions = [];
  const canManageTransfer = hasAnyRole(sessionUser, ['Admin', 'Warehouse Manager']);
  const canCompleteTransfer = hasAnyRole(sessionUser, ['Admin', 'Warehouse Manager', 'Warehouse Staff']);

  if (transfer.status === 'REQUESTED' && canManageTransfer) {
    actions.push(
      {
        type: 'form',
        label: TRANSFER_ACTION_LABELS.APPROVED,
        action: `/warehouse-transfers/${transfer.id}/approve`,
        variant: 'secondary',
        confirmMessage: `Approve transfer ${transfer.transfer_number}?`
      },
      {
        type: 'form',
        label: TRANSFER_ACTION_LABELS.REJECTED,
        action: `/warehouse-transfers/${transfer.id}/reject`,
        variant: 'danger',
        confirmMessage: `Reject transfer ${transfer.transfer_number}?`
      },
      {
        type: 'form',
        label: TRANSFER_ACTION_LABELS.CANCELLED,
        action: `/warehouse-transfers/${transfer.id}/cancel`,
        variant: 'danger',
        confirmMessage: `Cancel transfer ${transfer.transfer_number}?`
      }
    );
  }

  if (transfer.status === 'APPROVED' && canManageTransfer) {
    actions.push(
      {
        type: 'form',
        label: TRANSFER_ACTION_LABELS.IN_TRANSIT,
        action: `/warehouse-transfers/${transfer.id}/dispatch`,
        variant: 'secondary',
        confirmMessage: `Pindahkan transfer ${transfer.transfer_number} ke status IN_TRANSIT?`
      },
      {
        type: 'form',
        label: TRANSFER_ACTION_LABELS.CANCELLED,
        action: `/warehouse-transfers/${transfer.id}/cancel`,
        variant: 'danger',
        confirmMessage: `Cancel transfer ${transfer.transfer_number}?`
      }
    );
  }

  if (transfer.status === 'IN_TRANSIT' && canCompleteTransfer) {
    actions.push({
      type: 'form',
      label: TRANSFER_ACTION_LABELS.COMPLETED,
      action: `/warehouse-transfers/${transfer.id}/complete`,
      variant: 'secondary',
      confirmMessage: `Selesaikan transfer ${transfer.transfer_number} dan mutasikan stok sekarang?`
    });
  }

  return actions;
}

function buildStockTransactionFields(products, warehouses, values = {}, errors = {}) {
  const isInitialStockFlow = values.initial_stock === '1';

  return withFieldErrors(
    [
      {
        name: 'transaction_type',
        label: 'Transaction Type',
        type: 'select',
        options: STOCK_TRANSACTION_TYPES,
        required: true,
        value: values.transaction_type ?? 'STOCK_IN'
      },
      {
        name: 'product_id',
        label: 'Product',
        type: 'select',
        options: [
          { value: '', label: 'Select product' },
          ...mapOptions(
            products,
            (product) => `${product.sku} - ${product.name} (stok total: ${Number(product.total_stock ?? 0)})`
          )
        ],
        required: true,
        value: values.product_id ?? ''
      },
      {
        name: 'warehouse_id',
        label: 'Warehouse',
        type: 'select',
        options: [{ value: '', label: 'Select warehouse' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
        required: true,
        value: values.warehouse_id ?? ''
      },
      { name: 'quantity', label: 'Quantity', type: 'number', placeholder: '10', required: true, value: values.quantity ?? '' },
      {
        name: 'unit_cost',
        label: 'Transaction Unit Cost',
        type: 'number',
        placeholder: '150000',
        required: false,
        value: values.unit_cost ?? '',
        helpText: isInitialStockFlow
          ? 'Harga transaksi awal sudah mengikuti harga master product, tapi masih bisa diubah bila perlu.'
          : 'Ini adalah biaya pada transaksi ini. Boleh berbeda dari harga master product.'
      },
      { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Catatan movement', required: false, value: values.notes ?? '' }
    ],
    errors
  );
}

function getReverseTransactionType(transactionType) {
  switch (transactionType) {
    case 'STOCK_IN':
    case 'IMPORT':
      return 'STOCK_OUT';
    case 'STOCK_OUT':
      return 'STOCK_IN';
    default:
      return null;
  }
}

function isReversibleTransaction(transaction, reversal) {
  return (
    transaction.reference_type === 'manual_entry'
    && REVERSIBLE_TRANSACTION_TYPES.includes(transaction.transaction_type)
    && !reversal
  );
}

function buildStockTransactionReferenceLabel(transaction) {
  if (transaction.reference_type === 'warehouse_transfer' && transaction.reference_id) {
    return `Transfer #${transaction.reference_id}`;
  }

  if (transaction.reference_type === 'transaction_reversal' && transaction.reference_id) {
    return `Reversal of #${transaction.reference_id}`;
  }

  if (transaction.reference_type === 'manual_entry') {
    return 'Manual Entry';
  }

  return transaction.reference_type || '-';
}

function buildWarehouseTransferFields(productsByWarehouse, warehouses, values = {}, errors = {}) {
  const selectedSourceWarehouseId = String(values.source_warehouse_id ?? '');
  const productOptions = selectedSourceWarehouseId && productsByWarehouse[selectedSourceWarehouseId]
    ? productsByWarehouse[selectedSourceWarehouseId]
    : [];

  return withFieldErrors(
    [
      {
        name: 'transfer_number',
        label: 'Transfer Number',
        type: 'text',
        placeholder: 'TRF-20260527-001',
        required: true,
        value: values.transfer_number ?? '',
        readOnly: true,
        helpText: 'Nomor ini dibuat otomatis oleh server berdasarkan waktu WIB dan tidak bisa diedit.'
      },
      {
        name: 'source_warehouse_id',
        label: 'Source Warehouse',
        type: 'select',
        options: [{ value: '', label: 'Select source warehouse' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
        required: true,
        value: values.source_warehouse_id ?? ''
      },
      {
        name: 'destination_warehouse_id',
        label: 'Destination Warehouse',
        type: 'select',
        options: [{ value: '', label: 'Select destination warehouse' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
        required: true,
        value: values.destination_warehouse_id ?? ''
      },
      {
        name: 'product_id',
        label: 'Product',
        type: 'select',
        options: [{ value: '', label: 'Select product' }, ...productOptions],
        required: true,
        value: values.product_id ?? '',
        dataAttributes: {
          transferProductSelect: 'true'
        }
      },
      {
        name: 'requested_quantity',
        label: 'Requested Quantity',
        type: 'number',
        placeholder: '10',
        required: true,
        value: values.requested_quantity ?? ''
      },
      { name: 'request_notes', label: 'Request Notes', type: 'textarea', placeholder: 'Catatan transfer', required: false, value: values.request_notes ?? '' }
    ],
    errors
  );
}

function buildDefaultTransferNumber() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(new Date());

  const partMap = parts.reduce((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }

    return accumulator;
  }, {});

  const datePart = [partMap.year, partMap.month, partMap.day].join('');
  const timePart = [partMap.hour, partMap.minute, partMap.second].join('');

  return `TRF-${datePart}-${timePart}`;
}

function getWarehouseTransferDraftNumber(req) {
  if (!req.session) {
    return buildDefaultTransferNumber();
  }

  if (req.session.warehouseTransferDraftNumber) {
    return String(req.session.warehouseTransferDraftNumber);
  }

  const draftNumber = buildDefaultTransferNumber();
  req.session.warehouseTransferDraftNumber = draftNumber;
  return draftNumber;
}

function renderModulePage(res, config) {
  return res.render('pages/module', {
    pageTitle: config.pageTitle,
    moduleSlug: config.moduleSlug,
    moduleTitle: config.moduleTitle,
    moduleDescription: config.moduleDescription,
    moduleStatus: config.moduleStatus,
    extraActions: config.extraActions ?? [],
    metrics: config.metrics,
    noteItems: config.noteItems,
    tableHeaders: config.tableHeaders,
    tableRows: config.tableRows,
    hasActions: config.hasActions ?? false,
    createPath: config.createPath,
    emptyMessage: config.emptyMessage,
    flashMessage: config.flashMessage ?? null,
    flashType: config.flashType ?? 'info',
    moduleNote: config.moduleNote ?? 'Fitur ini masih pada tahap awal.',
    stateLabel: config.stateLabel ?? 'Aktif',
    stateNote: config.stateNote ?? 'Siap digunakan.',
    quickActionNote: config.quickActionNote ?? 'Gunakan tombol create untuk menambah data.',
    notesBadge: config.notesBadge ?? 'Overview',
    tableHeading: config.tableHeading ?? 'Data Table',
    tableBadge: config.tableBadge ?? 'Records',
    listControls: config.listControls ?? null,
    pagination: config.pagination ?? null,
    createLabel: config.createLabel ?? 'Tambah Baru'
  });
}

function renderFormPage(res, config) {
  return res.render('pages/module-form', {
    pageTitle: config.pageTitle,
    moduleSlug: config.moduleSlug,
    moduleTitle: config.moduleTitle,
    moduleDescription: config.moduleDescription,
    moduleStatus: config.moduleStatus,
    formMode: config.formMode,
    formAction: config.formAction,
    formMethod: config.formMethod,
    submitLabel: config.submitLabel,
    fields: config.fields,
    helperNotes: config.helperNotes,
    dangerActions: config.dangerActions ?? [],
    flashMessage: config.flashMessage ?? null,
    flashType: config.flashType ?? 'info',
    formErrors: config.formErrors ?? {},
    errorSummary: config.errorSummary ?? [],
    formContext: config.formContext ?? null,
    formStatusNote: config.formStatusNote ?? 'Validation dasar sudah aktif.',
    heroStatusNote: config.heroStatusNote ?? 'Form ini terhubung ke flow operasional.',
    panelBadge: config.panelBadge ?? 'Aktif',
    downloadTemplatePath: config.downloadTemplatePath ?? null,
    downloadTemplateLabel: config.downloadTemplateLabel ?? null
  });
}

function buildImportProductFields(values = {}, errors = {}) {
  return withFieldErrors(
    [
      {
        name: 'import_file',
        label: 'Spreadsheet File',
        type: 'file',
        required: true,
        accept: '.csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        helpText: 'Gunakan file CSV atau XLSX dengan header: sku, product_name, category, supplier, warehouse, quantity, minimum_stock_threshold, unit_price, description, is_active.'
      }
    ],
    errors
  );
}

function buildReportExportFields(values = {}, errors = {}) {
  return withFieldErrors(
    [
      {
        name: 'report_type',
        label: 'Report Type',
        type: 'select',
        required: true,
        options: [
          {
            value: reportExportService.REPORT_TYPE_DASHBOARD_SUMMARY,
            label: 'Dashboard Summary PDF'
          }
        ],
        value: values.report_type ?? reportExportService.REPORT_TYPE_DASHBOARD_SUMMARY,
        helpText: 'PDF ini berisi logo, grafik movement trend, KPI cards, dan tabel berwarna.'
      }
    ],
    errors
  );
}

function getImportFailureMessage(error) {
  const message = String(error?.message || '').trim();

  if (!message) {
    return 'Import gagal diproses';
  }

  if (
    message.includes('insert into') ||
    message.includes('update "') ||
    message.includes('invalid input syntax') ||
    message.includes('violates') ||
    message.includes('CURRENT_TIMESTAMP')
  ) {
    return 'Import gagal diproses. Periksa kecocokan master data dan format file, lalu coba lagi.';
  }

  return message;
}

async function createImportProductTemplateWorkbook() {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SmartStock Pro';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet('Product Import');

  worksheet.addRow(IMPORT_PRODUCT_TEMPLATE_HEADERS);
  worksheet.getRow(1).font = { bold: true };
  worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  worksheet.autoFilter = `A1:${String.fromCharCode(64 + IMPORT_PRODUCT_TEMPLATE_HEADERS.length)}1`;

  worksheet.columns = IMPORT_PRODUCT_TEMPLATE_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(18, header.length + 2)
  }));

  worksheet.addRow([
    'SKU-001',
    'Sample Product',
    'Electronics',
    'Supplier A',
    'Jakarta',
    10,
    5,
    150000,
    'Optional description',
    'true'
  ]);

  worksheet.getRow(2).font = { italic: true, color: { argb: 'FF666666' } };

  const instructions = workbook.addWorksheet('Instructions');
  instructions.columns = [
    { header: 'Field', key: 'field', width: 24 },
    { header: 'Requirement', key: 'requirement', width: 90 }
  ];
  instructions.addRows([
    ['sku', 'Wajib diisi dan unik.'],
    ['product_name', 'Nama product.'],
    ['category', 'Cocokkan dengan code atau nama category yang sudah ada.'],
    ['supplier', 'Cocokkan dengan code atau nama supplier yang sudah ada.'],
    ['warehouse', 'Cocokkan dengan code atau nama warehouse yang sudah ada.'],
    ['quantity', 'Opening stock harus lebih dari 0.'],
    ['minimum_stock_threshold', 'Angka 0 atau lebih.'],
    ['unit_price', 'Angka 0 atau lebih.'],
    ['description', 'Opsional.'],
    ['is_active', 'Opsional, gunakan true/false. Default true jika kosong.']
  ]);
  instructions.getRow(1).font = { bold: true };

  return workbook;
}

async function loadWarehouseTransferFormDependencies() {
  const warehouses = await warehouseService.listWarehouses({ includeInactive: false });
  const transferableEntries = await Promise.all(
    warehouses.map(async (warehouse) => ({
      warehouseId: Number(warehouse.id),
      products: await inventoryBalanceRepository.listTransferableByWarehouse(warehouse.id)
    }))
  );
  const productsByWarehouse = Object.fromEntries(
    transferableEntries.map((entry) => [
      String(entry.warehouseId),
      entry.products.map((product) => ({
        value: String(product.product_id),
        label: `${product.sku} - ${product.name}${product.is_active ? '' : ' (nonaktif)'} (stok: ${Number(product.current_quantity ?? 0)})`
      }))
    ])
  );
  const products = transferableEntries.flatMap((entry) => entry.products);

  return {
    products,
    warehouses,
    productsByWarehouse
  };
}

async function showStockTransactions(req, res) {
  const transactions = await safeList(() => stockTransactionRepository.listLatest(100));
  const sessionUser = req.session?.user ?? null;
  const canManageTransactions = canManageStockTransactions(sessionUser);
  const reversalIndex = new Map();
  for (const transaction of transactions) {
    if (transaction.reference_type === 'transaction_reversal' && transaction.reference_id) {
      reversalIndex.set(Number(transaction.reference_id), transaction);
    }
  }
  const searchQuery = String(req.query.q ?? '').trim();
  const warehouseFilter = String(req.query.warehouse ?? 'all').trim() || 'all';
  const productFilter = String(req.query.product ?? 'all').trim() || 'all';
  const transactionTypeFilter = String(req.query.transactionType ?? 'all').trim() || 'all';
  const statusFilter = String(req.query.status ?? 'all').trim() || 'all';
  const sortKey = ['occurred_at', 'type', 'quantity'].includes(String(req.query.sort))
    ? String(req.query.sort)
    : 'occurred_at';
  const sortDirection = String(req.query.direction) === 'asc' ? 'asc' : 'desc';
  const requestedPerPage = Number.parseInt(String(req.query.perPage ?? '8'), 10);
  const perPage = [8, 12, 24].includes(requestedPerPage) ? requestedPerPage : 8;

  const warehouseOptions = Array.from(
    new Map(
      transactions
        .filter((transaction) => transaction.warehouse_id && transaction.warehouse_name)
        .map((transaction) => [
          String(transaction.warehouse_id),
          {
            value: String(transaction.warehouse_id),
            label: `${transaction.warehouse_code || '-'} - ${transaction.warehouse_name}`
          }
        ])
    ).values()
  ).sort((left, right) => left.label.localeCompare(right.label, 'id', { sensitivity: 'base' }));

  const productOptions = Array.from(
    new Map(
      transactions
        .filter((transaction) => transaction.product_id && transaction.product_name)
        .map((transaction) => [
          String(transaction.product_id),
          {
            value: String(transaction.product_id),
            label: `${transaction.sku || '-'} - ${transaction.product_name}`
          }
        ])
    ).values()
  ).sort((left, right) => left.label.localeCompare(right.label, 'id', { sensitivity: 'base' }));

  const filteredTransactions = transactions.filter((transaction) => {
    const isCancelled = reversalIndex.has(Number(transaction.id));

    if (warehouseFilter !== 'all' && String(transaction.warehouse_id ?? '') !== warehouseFilter) {
      return false;
    }

    if (productFilter !== 'all' && String(transaction.product_id ?? '') !== productFilter) {
      return false;
    }

    if (transactionTypeFilter !== 'all' && String(transaction.transaction_type ?? '') !== transactionTypeFilter) {
      return false;
    }

    if (statusFilter === 'active' && isCancelled) {
      return false;
    }

    if (statusFilter === 'cancelled' && !isCancelled) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const haystack = [
      transaction.transaction_type,
      transaction.product_name,
      transaction.sku,
      transaction.warehouse_name,
      transaction.notes,
      transaction.reference_type,
      transaction.reference_id
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    return haystack.includes(searchQuery.toLowerCase());
  });

  const sortComparators = {
    occurred_at: (left, right) =>
      new Date(left.occurred_at ?? left.created_at ?? 0).getTime() -
      new Date(right.occurred_at ?? right.created_at ?? 0).getTime(),
    type: (left, right) =>
      String(left.transaction_type ?? '').localeCompare(String(right.transaction_type ?? ''), 'id', {
        sensitivity: 'base'
      }),
    quantity: (left, right) => Number(left.quantity ?? 0) - Number(right.quantity ?? 0)
  };

  filteredTransactions.sort((left, right) => {
    const comparison = sortComparators[sortKey](left, right);
    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });

  const pagination = paginateRecords(
    filteredTransactions,
    Number.parseInt(String(req.query.page ?? '1'), 10) || 1,
    perPage
  );

  const tableRows = pagination.items.map((transaction) => {
    const reversal = reversalIndex.get(Number(transaction.id)) ?? null;

    return {
      cells: [
        transaction.occurred_at ? new Date(transaction.occurred_at).toLocaleString('id-ID') : '-',
        transaction.transaction_type,
        transaction.product_name ? `${transaction.sku} - ${transaction.product_name}` : '-',
        transaction.warehouse_name ? `${transaction.warehouse_code || '-'} - ${transaction.warehouse_name}` : '-',
        buildStockTransactionReferenceLabel(transaction),
        String(transaction.quantity),
        String(transaction.quantity_before),
        String(transaction.quantity_after),
        reversal ? 'Cancelled' : 'Active',
        transaction.notes || '-'
      ],
      actions: canManageTransactions && isReversibleTransaction(transaction, reversal)
        ? [
            {
              type: 'form',
              label: 'Cancel',
              action: `/stock-transactions/${transaction.id}/cancel`,
              variant: 'danger',
              confirmMessage: `Batalkan transaction #${transaction.id} dengan reversal stok?`
            }
          ]
        : []
    };
  });

  return renderModulePage(res, {
    pageTitle: 'Stock Transactions',
    moduleSlug: 'stock-transactions',
    moduleTitle: 'Stock Transactions',
    moduleDescription: 'Pencatatan stock-in, stock-out, adjustment, dan import movement.',
    moduleStatus: 'Operations',
    metrics: [
      { label: 'Visible Moves', value: String(filteredTransactions.length) },
      { label: 'Stock In', value: String(filteredTransactions.filter((item) => item.transaction_type === 'STOCK_IN').length) },
      { label: 'Stock Out', value: String(filteredTransactions.filter((item) => item.transaction_type === 'STOCK_OUT').length) }
    ],
    noteItems: ['Transactional update', 'Negative stock prevention', 'Audit log ready', 'FIFO-ready history'],
    tableHeaders: ['Occurred At', 'Type', 'Product', 'Warehouse', 'Reference', 'Qty', 'Before', 'After', 'Status', 'Notes'],
    tableRows,
    hasActions: tableRows.some((row) => row.actions && row.actions.length),
    createPath: canManageTransactions ? '/stock-transactions/new' : null,
    emptyMessage: 'Belum ada stock transaction yang tercatat.',
    listControls: {
      action: '/stock-transactions',
      searchValue: searchQuery,
      sortValue: sortKey,
      directionValue: sortDirection,
      perPageValue: perPage,
      sortOptions: [
        { value: 'occurred_at', label: 'Tanggal' },
        { value: 'type', label: 'Type' },
        { value: 'quantity', label: 'Quantity' }
      ],
      directionOptions: [
        { value: 'desc', label: 'Desc' },
        { value: 'asc', label: 'Asc' }
      ],
      pageSizeOptions: [
        { value: '8', label: '8' },
        { value: '12', label: '12' },
        { value: '24', label: '24' }
      ],
      extraFields: [
        {
          name: 'warehouse',
          label: 'Warehouse Filter',
          value: warehouseFilter,
          options: [
            { value: 'all', label: 'All Warehouses' },
            ...warehouseOptions
          ]
        },
        {
          name: 'product',
          label: 'Product Filter',
          value: productFilter,
          options: [
            { value: 'all', label: 'All Products' },
            ...productOptions
          ]
        },
        {
          name: 'transactionType',
          label: 'Type Filter',
          value: transactionTypeFilter,
          options: [
            { value: 'all', label: 'All Types' },
            ...STOCK_TRANSACTION_TYPES
          ]
        },
        {
          name: 'status',
          label: 'Status Filter',
          value: statusFilter,
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'active', label: 'Active' },
            { value: 'cancelled', label: 'Cancelled' }
          ]
        }
      ]
    },
    pagination: {
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
      prevUrl:
        pagination.currentPage > 1
          ? buildQueryUrl('/stock-transactions', {
              q: searchQuery,
              warehouse: warehouseFilter !== 'all' ? warehouseFilter : null,
              product: productFilter !== 'all' ? productFilter : null,
              transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter : null,
              status: statusFilter !== 'all' ? statusFilter : null,
              sort: sortKey,
              direction: sortDirection,
              perPage,
              page: pagination.currentPage - 1
            })
          : null,
      nextUrl:
        pagination.currentPage < pagination.totalPages
          ? buildQueryUrl('/stock-transactions', {
              q: searchQuery,
              warehouse: warehouseFilter !== 'all' ? warehouseFilter : null,
              product: productFilter !== 'all' ? productFilter : null,
              transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter : null,
              status: statusFilter !== 'all' ? statusFilter : null,
              sort: sortKey,
              direction: sortDirection,
              perPage,
              page: pagination.currentPage + 1
            })
          : null,
      pages: Array.from({ length: pagination.totalPages }, (_, index) => {
        const page = index + 1;
        return {
          page,
          url: buildQueryUrl('/stock-transactions', {
            q: searchQuery,
            warehouse: warehouseFilter !== 'all' ? warehouseFilter : null,
            product: productFilter !== 'all' ? productFilter : null,
            transactionType: transactionTypeFilter !== 'all' ? transactionTypeFilter : null,
            status: statusFilter !== 'all' ? statusFilter : null,
            sort: sortKey,
            direction: sortDirection,
            perPage,
            page
          }),
          isCurrent: page === pagination.currentPage
        };
      })
    },
    ...getFlash(req)
  });
}

async function showStockTransactionCreate(req, res) {
  const [products, warehouses] = await Promise.all([
    productService.listProducts({ includeInactive: false }),
    warehouseService.listWarehouses({ includeInactive: false })
  ]);
  const requestedProductId = parseId(req.query.product_id);
  const requestedWarehouseId = parseId(req.query.warehouse_id);
  const assignedWarehouseId = parseId(req.session?.user?.assigned_warehouse_id);
  const defaultWarehouseId = requestedWarehouseId
    ?? assignedWarehouseId
    ?? (warehouses.length === 1 ? Number(warehouses[0].id) : null);
  const selectedProduct = requestedProductId
    ? products.find((product) => Number(product.id) === requestedProductId) ?? null
    : null;
  const defaultValues = {
    transaction_type: String(req.query.transaction_type ?? 'STOCK_IN'),
    product_id: requestedProductId ? String(requestedProductId) : '',
    warehouse_id: defaultWarehouseId ? String(defaultWarehouseId) : '',
    quantity: '',
    unit_cost: req.query.initial_stock === '1' && selectedProduct?.unit_price != null
      ? String(selectedProduct.unit_price)
      : '',
    initial_stock: String(req.query.initial_stock ?? ''),
    notes: req.query.initial_stock === '1'
      ? 'Initial stock untuk product baru'
      : ''
  };

  return renderFormPage(res, {
    pageTitle: 'Create Stock Transaction',
    moduleSlug: 'stock-transactions',
    moduleTitle: 'Create Stock Transaction',
    moduleDescription: 'Tambahkan stock movement baru.',
    moduleStatus: 'Operations',
    formMode: 'create',
    formAction: '/stock-transactions',
    formMethod: 'post',
    submitLabel: 'Save Transaction',
    fields: buildStockTransactionFields(products, warehouses, defaultValues),
    helperNotes: [
      'User pelaksana diambil dari sesi login',
      'Negative stock tidak diizinkan',
      req.query.initial_stock === '1'
        ? 'Flow ini dipakai untuk mengisi stok awal product baru'
        : 'Transaction type sudah dibatasi',
      'Harga master product dan biaya transaksi bisa berbeda'
    ],
    ...getFlash(req)
  });
}

async function createStockTransaction(req, res) {
  const requestPayload = {
    ...req.body,
    performed_by: req.session?.user?.id ?? req.body.performed_by
  };
  const validation = validateStockTransactionPayload(requestPayload);
  const [products, warehouses] = await Promise.all([
    productService.listProducts({ includeInactive: false }),
    warehouseService.listWarehouses({ includeInactive: false })
  ]);

  if (!validation.valid) {
    return renderFormPage(res, {
      pageTitle: 'Create Stock Transaction',
      moduleSlug: 'stock-transactions',
      moduleTitle: 'Create Stock Transaction',
      moduleDescription: 'Tambahkan stock movement baru.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/stock-transactions',
      formMethod: 'post',
      submitLabel: 'Save Transaction',
      fields: buildStockTransactionFields(products, warehouses, req.body, validation.errors),
      helperNotes: ['User pelaksana diambil dari sesi login', 'Negative stock tidak diizinkan', 'Transaction type sudah dibatasi'],
      flashMessage: 'Validation failed',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: getErrorSummary(validation.errors)
    });
  }

  const productId = parseId(validation.value.product_id);
  const warehouseId = parseId(validation.value.warehouse_id);

  if (!productId || !warehouseId) {
    return renderFormPage(res, {
      pageTitle: 'Create Stock Transaction',
      moduleSlug: 'stock-transactions',
      moduleTitle: 'Create Stock Transaction',
      moduleDescription: 'Tambahkan stock movement baru.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/stock-transactions',
      formMethod: 'post',
      submitLabel: 'Save Transaction',
      fields: withFieldErrors(
        [
          {
            name: 'transaction_type',
            label: 'Transaction Type',
            type: 'select',
            options: STOCK_TRANSACTION_TYPES,
            required: true,
            value: req.body.transaction_type ?? 'STOCK_IN'
          },
          {
            name: 'product_id',
            label: 'Product',
            type: 'select',
            options: [{ value: '', label: 'Select product' }, ...mapOptions(products, (product) => `${product.sku} - ${product.name}`)],
            required: true,
            value: req.body.product_id ?? ''
          },
          {
            name: 'warehouse_id',
            label: 'Warehouse',
            type: 'select',
            options: [{ value: '', label: 'Select warehouse' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
            required: true,
            value: req.body.warehouse_id ?? ''
          },
          { name: 'quantity', label: 'Quantity', type: 'number', placeholder: '10', required: true, value: req.body.quantity ?? '' },
          { name: 'unit_cost', label: 'Unit Cost', type: 'number', placeholder: '150000', required: false, value: req.body.unit_cost ?? '' },
          { name: 'notes', label: 'Notes', type: 'textarea', placeholder: 'Catatan movement', required: false, value: req.body.notes ?? '' },
          {
            name: 'performed_by',
            label: 'Performed By User ID',
            type: 'number',
            placeholder: '1',
            required: true,
            value: req.body.performed_by ?? ''
          }
        ],
        {
          product_id: productId ? undefined : 'Product wajib dipilih',
          warehouse_id: warehouseId ? undefined : 'Warehouse wajib dipilih'
        }
      ),
      helperNotes: ['Stock change selalu dicatat ke stock_transactions', 'Negative stock tidak diizinkan', 'Transaction type sudah dibatasi'],
      flashMessage: 'Validation failed',
      flashType: 'danger',
      formErrors: {
        product_id: productId ? undefined : 'Product wajib dipilih',
        warehouse_id: warehouseId ? undefined : 'Warehouse wajib dipilih'
      },
      errorSummary: ['Product wajib dipilih', 'Warehouse wajib dipilih'].filter(Boolean)
    });
  }

  const product = await productService.getProductById(productId);
  const warehouse = await warehouseService.getWarehouseById(warehouseId);

  if (!product || !warehouse) {
    return res.status(400).render('pages/error', { pageTitle: 'Data master tidak ditemukan' });
  }

  const performedBy = parseId(requestPayload.performed_by);
  if (!performedBy) {
    return res.status(400).render('pages/error', { pageTitle: 'User pelaksana tidak valid' });
  }

  try {
    const result = await database.transaction(async (trx) => {
      const movement = await inventoryService.recordStockMovement(
        {
          product_id: productId,
          warehouse_id: warehouseId,
          transaction_type: validation.value.transaction_type,
          quantity: validation.value.quantity,
          performed_by: performedBy,
          unit_cost: validation.value.unit_cost,
          notes: validation.value.notes,
          reference_type: 'manual_entry',
          reference_id: null
        },
        trx
      );

      await auditLogService.logAction(
        auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
          action: 'STOCK_MOVEMENT_CREATED',
          entity_type: 'stock_transaction',
          entity_id: movement.transaction.id,
          old_value: null,
          new_value: movement.transaction
        }),
        trx
      );

      const lowStockProducts = await syncLowStockNotifications(trx);

      return {
        movement,
        lowStockProducts
      };
    });

    dashboardRealtimeService.publishLowStockUpdate({
      source: 'stock_transaction_created',
      lowStockCount: result.lowStockProducts.length
    });

    return res.redirect(`/stock-transactions?type=success&message=${encodeURIComponent(`Movement ${result.movement.transaction.transaction_type} berhasil disimpan`)}`);
  } catch (error) {
    const formErrors = {};
    if (error.statusCode === 409) {
      formErrors.quantity = error.message;
    }

    return renderFormPage(res, {
      pageTitle: 'Create Stock Transaction',
      moduleSlug: 'stock-transactions',
      moduleTitle: 'Create Stock Transaction',
      moduleDescription: 'Tambahkan stock movement baru.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/stock-transactions',
      formMethod: 'post',
      submitLabel: 'Save Transaction',
      fields: buildStockTransactionFields(products, warehouses, req.body, formErrors),
      helperNotes: ['User pelaksana diambil dari sesi login', 'Negative stock tidak diizinkan', 'Transaction type sudah dibatasi'],
      flashMessage: error.message || 'Gagal menyimpan stock transaction',
      flashType: 'danger',
      formErrors,
      errorSummary: getErrorSummary(formErrors)
    });
  }
}

async function cancelStockTransaction(req, res) {
  const transactionId = parseId(req.params.id);
  const performedBy = parseId(req.session?.user?.id);

  if (!transactionId || !performedBy) {
    return res.status(400).render('pages/error', { pageTitle: 'Data transaction tidak valid' });
  }

  try {
    const result = await database.transaction(async (trx) => {
      const current = await stockTransactionRepository.findById(transactionId, trx);

      if (!current) {
        return { notFound: true };
      }

      const existingReversal = await stockTransactionRepository.findReversalByReference(transactionId, trx);
      if (!isReversibleTransaction(current, existingReversal)) {
        const error = new Error('Transaction ini tidak bisa dibatalkan');
        error.statusCode = 400;
        throw error;
      }

      const reverseType = getReverseTransactionType(current.transaction_type);
      if (!reverseType) {
        const error = new Error('Tipe transaction ini tidak punya reversal otomatis');
        error.statusCode = 400;
        throw error;
      }

      const reversal = await inventoryService.recordStockMovement(
        {
          product_id: current.product_id,
          warehouse_id: current.warehouse_id,
          transaction_type: reverseType,
          quantity: current.quantity,
          performed_by: performedBy,
          unit_cost: current.unit_cost,
          notes: `Reversal untuk transaction #${current.id}`,
          reference_type: 'transaction_reversal',
          reference_id: current.id
        },
        trx
      );

      await auditLogService.logAction(
        auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
          action: 'STOCK_TRANSACTION_REVERSED',
          entity_type: 'stock_transaction',
          entity_id: current.id,
          old_value: current,
          new_value: reversal.transaction
        }),
        trx
      );

      const lowStockProducts = await syncLowStockNotifications(trx);

      return {
        current,
        reversal: reversal.transaction,
        lowStockProducts
      };
    });

    if (result?.notFound) {
      return res.status(404).render('pages/not-found', { pageTitle: 'Transaction Not Found' });
    }

    dashboardRealtimeService.publishLowStockUpdate({
      source: 'stock_transaction_reversed',
      lowStockCount: result.lowStockProducts.length
    });

    return res.redirect(
      `/stock-transactions?type=success&message=${encodeURIComponent(`Transaction #${result.current.id} berhasil dibatalkan dengan reversal`)}`);
  } catch (error) {
    return res.status(error.statusCode === 409 ? 409 : 400).render('pages/error', {
      pageTitle: error.message || 'Gagal membatalkan transaction'
    });
  }
}

async function showWarehouseTransfers(req, res) {
  const transfers = await safeList(() => warehouseTransferRepository.listLatest(100));
  const sessionUser = req.session?.user ?? null;
  const canCreateTransfer = canCreateWarehouseTransfer(sessionUser);
  const searchQuery = String(req.query.q ?? '').trim();
  const sortKey = ['requested_at', 'status', 'source', 'destination'].includes(String(req.query.sort))
    ? String(req.query.sort)
    : 'requested_at';
  const sortDirection = String(req.query.direction) === 'asc' ? 'asc' : 'desc';
  const requestedPerPage = Number.parseInt(String(req.query.perPage ?? '8'), 10);
  const perPage = [8, 12, 24].includes(requestedPerPage) ? requestedPerPage : 8;

  const filteredTransfers = transfers.filter((transfer) => {
    if (!searchQuery) {
      return true;
    }

    const haystack = [
      transfer.transfer_number,
      transfer.source_warehouse_name,
      transfer.destination_warehouse_name,
      transfer.status,
      transfer.request_notes
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    return haystack.includes(searchQuery.toLowerCase());
  });

  const sortComparators = {
    requested_at: (left, right) =>
      new Date(left.requested_at ?? left.created_at ?? 0).getTime() -
      new Date(right.requested_at ?? right.created_at ?? 0).getTime(),
    status: (left, right) =>
      String(left.status ?? '').localeCompare(String(right.status ?? ''), 'id', {
        sensitivity: 'base'
      }),
    source: (left, right) =>
      String(left.source_warehouse_name ?? '').localeCompare(String(right.source_warehouse_name ?? ''), 'id', {
        sensitivity: 'base'
      }),
    destination: (left, right) =>
      String(left.destination_warehouse_name ?? '').localeCompare(
        String(right.destination_warehouse_name ?? ''),
        'id',
        { sensitivity: 'base' }
      )
  };

  filteredTransfers.sort((left, right) => {
    const comparison = sortComparators[sortKey](left, right);
    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });

  const pagination = paginateRecords(
    filteredTransfers,
    Number.parseInt(String(req.query.page ?? '1'), 10) || 1,
    perPage
  );

  const tableRows = pagination.items.map((transfer) => ({
    cells: [
      transfer.transfer_number,
      transfer.source_warehouse_name || '-',
      transfer.destination_warehouse_name || '-',
      transfer.status,
      transfer.request_notes || '-'
    ],
    actions: buildTransferStatusActions(transfer, sessionUser)
  }));

  return renderModulePage(res, {
    pageTitle: 'Warehouse Transfers',
    moduleSlug: 'warehouse-transfers',
    moduleTitle: 'Warehouse Transfer Workflow',
    moduleDescription: 'Request transfer stock antar warehouse.',
    moduleStatus: 'Operations',
    metrics: [
      { label: 'Recent Transfers', value: String(transfers.length) },
      { label: 'Requested', value: String(transfers.filter((item) => item.status === 'REQUESTED').length) },
      { label: 'Completed', value: String(transfers.filter((item) => item.status === 'COMPLETED').length) }
    ],
    noteItems: ['Source warehouse', 'Destination warehouse', 'Status tracking', 'Audit trail'],
    tableHeaders: ['Transfer No', 'Source', 'Destination', 'Status', 'Notes'],
    tableRows,
    hasActions: tableRows.some((row) => Array.isArray(row.actions) && row.actions.length > 0),
    createPath: canCreateTransfer ? '/warehouse-transfers/new' : null,
    emptyMessage: 'Belum ada warehouse transfer yang tercatat.',
    listControls: {
      action: '/warehouse-transfers',
      searchValue: searchQuery,
      sortValue: sortKey,
      directionValue: sortDirection,
      perPageValue: perPage,
      sortOptions: [
        { value: 'requested_at', label: 'Tanggal' },
        { value: 'status', label: 'Status' },
        { value: 'source', label: 'Source' },
        { value: 'destination', label: 'Destination' }
      ],
      directionOptions: [
        { value: 'desc', label: 'Desc' },
        { value: 'asc', label: 'Asc' }
      ],
      pageSizeOptions: [
        { value: '8', label: '8' },
        { value: '12', label: '12' },
        { value: '24', label: '24' }
      ]
    },
    pagination: {
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      startIndex: pagination.startIndex,
      endIndex: pagination.endIndex,
      prevUrl:
        pagination.currentPage > 1
          ? buildQueryUrl('/warehouse-transfers', {
              q: searchQuery,
              sort: sortKey,
              direction: sortDirection,
              perPage,
              page: pagination.currentPage - 1
            })
          : null,
      nextUrl:
        pagination.currentPage < pagination.totalPages
          ? buildQueryUrl('/warehouse-transfers', {
              q: searchQuery,
              sort: sortKey,
              direction: sortDirection,
              perPage,
              page: pagination.currentPage + 1
            })
          : null,
      pages: Array.from({ length: pagination.totalPages }, (_, index) => {
        const page = index + 1;
        return {
          page,
          url: buildQueryUrl('/warehouse-transfers', {
            q: searchQuery,
            sort: sortKey,
            direction: sortDirection,
            perPage,
            page
          }),
          isCurrent: page === pagination.currentPage
        };
      })
    },
    ...getFlash(req)
  });
}

async function showWarehouseTransferCreate(req, res) {
  try {
    const { productsByWarehouse, warehouses } = await loadWarehouseTransferFormDependencies();
    const defaultValues = {
      transfer_number: getWarehouseTransferDraftNumber(req)
    };
    const flash = getFlash(req);
    const hasTransferableProducts = Object.values(productsByWarehouse).some((items) => items.length > 0);
    const missingDependencies = !hasTransferableProducts || warehouses.length < 2;

    return renderFormPage(res, {
      pageTitle: 'Create Warehouse Transfer',
      moduleSlug: 'warehouse-transfers',
      moduleTitle: 'Create Warehouse Transfer',
      moduleDescription: 'Tambahkan request transfer antar warehouse.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/warehouse-transfers',
      formMethod: 'post',
      submitLabel: 'Save Transfer',
      fields: buildWarehouseTransferFields(productsByWarehouse, warehouses, defaultValues),
      helperNotes: ['Pemohon diambil dari sesi login', 'Status awal selalu REQUESTED', 'Item transfer tetap sederhana di skeleton awal'],
      formContext: {
        transferProductsByWarehouse: productsByWarehouse
      },
      flashMessage: flash.flashMessage ?? (
        missingDependencies
          ? 'Siapkan minimal 1 product aktif dan 2 warehouse aktif sebelum membuat transfer.'
          : null
      ),
      flashType: flash.flashMessage ? flash.flashType : 'warning'
    });
  } catch (error) {
    return res.status(500).render('pages/error', { pageTitle: 'Form transfer tidak dapat dimuat' });
  }
}

async function createWarehouseTransfer(req, res) {
  let productsByWarehouse;
  let warehouses;

  try {
    const dependencies = await loadWarehouseTransferFormDependencies();
    productsByWarehouse = dependencies.productsByWarehouse;
    warehouses = dependencies.warehouses;
  } catch (error) {
    return res.status(500).render('pages/error', { pageTitle: 'Form transfer tidak dapat dimuat' });
  }

  const requestPayload = {
    ...req.body,
    requested_by: req.session?.user?.id ?? req.body.requested_by,
    status: 'REQUESTED',
    transfer_number: getWarehouseTransferDraftNumber(req)
  };

  let transferInput;

  try {
    transferInput = warehouseTransferService.normalizeWarehouseTransferPayload(requestPayload);
  } catch (error) {
    return renderFormPage(res, {
      pageTitle: 'Create Warehouse Transfer',
      moduleSlug: 'warehouse-transfers',
      moduleTitle: 'Create Warehouse Transfer',
      moduleDescription: 'Tambahkan request transfer antar warehouse.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/warehouse-transfers',
      formMethod: 'post',
      submitLabel: 'Save Transfer',
      fields: buildWarehouseTransferFields(productsByWarehouse, warehouses, req.body, error.errors ?? {}),
      helperNotes: ['Pemohon diambil dari sesi login', 'Status awal selalu REQUESTED', 'Item transfer tetap sederhana di skeleton awal'],
      formContext: {
        transferProductsByWarehouse: productsByWarehouse
      },
      flashMessage: 'Validation failed',
      flashType: 'danger',
      formErrors: error.errors ?? {},
      errorSummary: getErrorSummary(error.errors ?? {})
    });
  }

  const productId = parseId(req.body.product_id);
  const requestedQuantity = parseId(req.body.requested_quantity);

  if (!Number.isInteger(productId) || !Number.isInteger(requestedQuantity)) {
    return res.status(400).render('pages/error', { pageTitle: 'Data transfer tidak valid' });
  }

  if (productId && requestedQuantity) {
    const [product, sourceWarehouse, destinationWarehouse] = await Promise.all([
      productService.getProductById(productId),
      warehouseService.getWarehouseById(parseId(transferInput.source_warehouse_id)),
      warehouseService.getWarehouseById(parseId(transferInput.destination_warehouse_id))
    ]);

    if (!product || !sourceWarehouse || !destinationWarehouse) {
      return res.status(400).render('pages/error', { pageTitle: 'Data master transfer tidak ditemukan' });
    }
  }

  const requestedBy = parseId(requestPayload.requested_by);
  if (!requestedBy) {
    return res.status(400).render('pages/error', { pageTitle: 'User pemohon tidak valid' });
  }

  const hasTransferableProducts = Object.values(productsByWarehouse).some((items) => items.length > 0);

  if (!hasTransferableProducts || warehouses.length < 2) {
    return renderFormPage(res, {
      pageTitle: 'Create Warehouse Transfer',
      moduleSlug: 'warehouse-transfers',
      moduleTitle: 'Create Warehouse Transfer',
      moduleDescription: 'Tambahkan request transfer antar warehouse.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/warehouse-transfers',
      formMethod: 'post',
      submitLabel: 'Save Transfer',
      fields: buildWarehouseTransferFields(productsByWarehouse, warehouses, req.body),
      helperNotes: ['Pemohon diambil dari sesi login', 'Status awal selalu REQUESTED', 'Item transfer tetap sederhana di skeleton awal'],
      formContext: {
        transferProductsByWarehouse: productsByWarehouse
      },
      flashMessage: 'Siapkan minimal 1 product aktif dan 2 warehouse aktif sebelum membuat transfer.',
      flashType: 'warning',
      formErrors: {},
      errorSummary: []
    });
  }

  try {
    const transfer = await warehouseTransferService.createWarehouseTransfer(
      {
        transfer_number: transferInput.transfer_number,
        source_warehouse_id: transferInput.source_warehouse_id,
        destination_warehouse_id: transferInput.destination_warehouse_id,
        requested_by: requestedBy,
        status: 'REQUESTED',
        request_notes: transferInput.request_notes
      },
      [
        {
          product_id: productId,
          requested_quantity: requestedQuantity,
          approved_quantity: requestedQuantity,
          received_quantity: 0
        }
      ]
    );

    await database.transaction(async (trx) => {
      await auditLogService.logAction(
        auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
          action: 'TRANSFER_REQUEST_CREATED',
          entity_type: 'warehouse_transfer',
          entity_id: transfer.id,
          old_value: null,
          new_value: transfer
        }),
        trx
      );
    });

    if (req.session) {
      delete req.session.warehouseTransferDraftNumber;
    }

    return res.redirect(`/warehouse-transfers?type=success&message=${encodeURIComponent(`Transfer ${transfer.transfer_number} berhasil disimpan`)}`);
  } catch (error) {
    const formErrors = {};
    if (String(error.message || '').toLowerCase().includes('duplicate') || String(error.code || '') === '23505') {
      formErrors.transfer_number = 'Transfer number sudah digunakan';
    }

    return renderFormPage(res, {
      pageTitle: 'Create Warehouse Transfer',
      moduleSlug: 'warehouse-transfers',
      moduleTitle: 'Create Warehouse Transfer',
      moduleDescription: 'Tambahkan request transfer antar warehouse.',
      moduleStatus: 'Operations',
      formMode: 'create',
      formAction: '/warehouse-transfers',
      formMethod: 'post',
      submitLabel: 'Save Transfer',
      fields: buildWarehouseTransferFields(productsByWarehouse, warehouses, req.body, formErrors),
      helperNotes: ['Pemohon diambil dari sesi login', 'Status awal selalu REQUESTED', 'Item transfer tetap sederhana di skeleton awal'],
      formContext: {
        transferProductsByWarehouse: productsByWarehouse
      },
      flashMessage: Object.keys(formErrors).length ? 'Validation failed' : error.message || 'Gagal menyimpan transfer',
      flashType: 'danger',
      formErrors,
      errorSummary: getErrorSummary(formErrors)
    });
  }
}

function getTransferActionMeta(nextStatus) {
  switch (nextStatus) {
    case 'APPROVED':
      return { action: 'TRANSFER_APPROVED', message: 'Transfer berhasil di-approve' };
    case 'REJECTED':
      return { action: 'TRANSFER_REJECTED', message: 'Transfer berhasil ditolak' };
    case 'CANCELLED':
      return { action: 'TRANSFER_CANCELLED', message: 'Transfer berhasil dibatalkan' };
    case 'IN_TRANSIT':
      return { action: 'TRANSFER_IN_TRANSIT', message: 'Transfer dipindahkan ke status in transit' };
    case 'COMPLETED':
      return { action: 'TRANSFER_COMPLETED', message: 'Transfer berhasil diselesaikan' };
    default:
      return { action: 'TRANSFER_STATUS_UPDATED', message: 'Status transfer berhasil diperbarui' };
  }
}

async function handleTransferStatusUpdate(req, res, nextStatus) {
  const transferId = parseId(req.params.id);
  const performedBy = parseId(req.session?.user?.id);

  if (!transferId || !performedBy) {
    return res.status(400).render('pages/error', { pageTitle: 'Data transfer tidak valid' });
  }

  try {
    const result = await warehouseTransferService.transitionTransferStatus(transferId, {
      nextStatus,
      performedBy
    });

    if (!result?.transfer) {
      return res.status(404).render('pages/error', { pageTitle: 'Transfer tidak ditemukan' });
    }

    const meta = getTransferActionMeta(nextStatus);

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: meta.action,
        entity_type: 'warehouse_transfer',
        entity_id: result.transfer.id,
        old_value: result.previousTransfer,
        new_value: result.transfer
      }),
      database
    );

    if (nextStatus === 'COMPLETED') {
      const lowStockProducts = await syncLowStockNotifications(database);
      dashboardRealtimeService.publishLowStockUpdate({
        source: 'warehouse_transfer_completed',
        lowStockCount: lowStockProducts.length
      });
    }

    return res.redirect(
      `/warehouse-transfers?type=success&message=${encodeURIComponent(
        `${meta.message}: ${result.transfer.transfer_number}`
      )}`
    );
  } catch (error) {
    const statusCode = error.statusCode === 409 ? 409 : 400;

    return res.status(statusCode).render('pages/error', {
      pageTitle: error.message || 'Gagal memperbarui status transfer'
    });
  }
}

async function approveWarehouseTransfer(req, res) {
  return handleTransferStatusUpdate(req, res, 'APPROVED');
}

async function rejectWarehouseTransfer(req, res) {
  return handleTransferStatusUpdate(req, res, 'REJECTED');
}

async function cancelWarehouseTransfer(req, res) {
  return handleTransferStatusUpdate(req, res, 'CANCELLED');
}

async function dispatchWarehouseTransfer(req, res) {
  return handleTransferStatusUpdate(req, res, 'IN_TRANSIT');
}

async function completeWarehouseTransfer(req, res) {
  return handleTransferStatusUpdate(req, res, 'COMPLETED');
}

async function showNotifications(req, res) {
  const notifications = usesPharmacyBackofficeNotifications(req.session?.user)
    ? await safeList(() => pharmacyNotificationService.listNotificationsForUser(req.session?.user?.id ?? null, 200))
    : await safeList(() => notificationService.listNotificationsForUser(req.session?.user ?? null, 200));
  const searchQuery = String(req.query.q ?? '').trim().toLowerCase();
  const severityFilter = ['all', 'critical', 'warning', 'info'].includes(String(req.query.severity))
    ? String(req.query.severity)
    : 'all';
  const readFilter = ['all', 'read', 'unread'].includes(String(req.query.readStatus))
    ? String(req.query.readStatus)
    : 'all';
  const sortKey = ['created_at', 'severity', 'status', 'title'].includes(String(req.query.sort))
    ? String(req.query.sort)
    : 'created_at';
  const sortDirection = String(req.query.direction) === 'asc' ? 'asc' : 'desc';
  const requestedPerPage = Number.parseInt(String(req.query.perPage ?? '8'), 10);
  const perPage = [8, 12, 24].includes(requestedPerPage) ? requestedPerPage : 8;

  const filteredNotifications = notifications.filter((notification) => {
    if (severityFilter !== 'all' && notification.severity !== severityFilter) {
      return false;
    }

    if (readFilter === 'read' && !notification.is_read) {
      return false;
    }

    if (readFilter === 'unread' && notification.is_read) {
      return false;
    }

    if (!searchQuery) {
      return true;
    }

    const haystack = [
      notification.title,
      notification.message,
      notification.severity,
      notification.role_target,
      notification.user_full_name
    ]
      .map((value) => String(value ?? '').toLowerCase())
      .join(' ');

    return haystack.includes(searchQuery);
  });

  const severityRank = {
    critical: 3,
    warning: 2,
    info: 1
  };

  const sortComparators = {
    created_at: (left, right) =>
      new Date(left.created_at ?? 0).getTime() - new Date(right.created_at ?? 0).getTime(),
    severity: (left, right) => (severityRank[left.severity] ?? 0) - (severityRank[right.severity] ?? 0),
    status: (left, right) => Number(Boolean(left.is_read)) - Number(Boolean(right.is_read)),
    title: (left, right) =>
      String(left.title ?? '').localeCompare(String(right.title ?? ''), 'id', {
        sensitivity: 'base'
      })
  };

  filteredNotifications.sort((left, right) => {
    const comparison = sortComparators[sortKey](left, right);
    return sortDirection === 'desc' ? comparison * -1 : comparison;
  });

  const pagination = paginateRecords(
    filteredNotifications,
    Number.parseInt(String(req.query.page ?? '1'), 10) || 1,
    perPage
  );

  const tableRows = pagination.items.map((notification) => ({
    cells: [
      formatDateTime(notification.created_at),
      notification.severity,
      {
        type: 'link',
        href: `/notifications/${notification.id}/open`,
        label: notification.title
      },
      notification.user_full_name || notification.role_target || (usesPharmacyBackofficeNotifications(req.session?.user) ? 'User Saat Ini' : '-'),
      notification.is_read ? 'Read' : 'Unread'
    ],
    actions: notification.is_read
      ? [
          {
            type: 'link',
            label: 'Buka',
            href: `/notifications/${notification.id}/open`,
            variant: 'secondary'
          }
        ]
      : [
          {
            type: 'link',
            label: 'Buka',
            href: `/notifications/${notification.id}/open`,
            variant: 'secondary'
          },
          {
            type: 'form',
            label: 'Mark Read',
            action: `/notifications/${notification.id}/read`,
            variant: 'secondary'
          }
        ]
  }));

  return renderModulePage(res, {
    pageTitle: 'Notifications',
    moduleSlug: 'notifications',
    moduleTitle: 'Notifications',
    moduleDescription: 'Daftar notifikasi in-app untuk alert, transfer, import, dan error.',
    moduleStatus: 'Operations',
    extraActions: filteredNotifications.some((item) => !item.is_read)
      ? [
          {
            type: 'form',
            label: 'Tandai Semua Dibaca',
            action: '/notifications/read-all',
            variant: 'secondary',
            hiddenFields: [
              {
                name: 'redirect_to',
                value: '/notifications'
              }
            ]
          }
        ]
      : [],
    metrics: [
      { label: 'Total Notifications', value: String(filteredNotifications.length) },
      { label: 'Unread', value: String(filteredNotifications.filter((item) => !item.is_read).length) },
      { label: 'Critical', value: String(filteredNotifications.filter((item) => item.severity === 'critical').length) }
    ],
    noteItems: ['Low stock alert', 'Transfer status update', 'Import result', 'Error notification'],
    tableHeaders: ['Created At', 'Severity', 'Title', 'Target', 'Status'],
    tableRows,
    hasActions: tableRows.some((row) => row.actions && row.actions.length),
    emptyMessage: 'Belum ada notification yang tercatat.',
    listControls: {
      action: '/notifications',
      searchValue: String(req.query.q ?? ''),
      sortValue: sortKey,
      directionValue: sortDirection,
      perPageValue: perPage,
      sortOptions: [
        { value: 'created_at', label: 'Created At' },
        { value: 'severity', label: 'Severity' },
        { value: 'status', label: 'Status' },
        { value: 'title', label: 'Title' }
      ],
      directionOptions: [
        { value: 'desc', label: 'Desc' },
        { value: 'asc', label: 'Asc' }
      ],
      pageSizeOptions: [
        { value: '8', label: '8' },
        { value: '12', label: '12' },
        { value: '24', label: '24' }
      ],
      extraFields: [
        {
          name: 'severity',
          label: 'Severity Filter',
          value: severityFilter,
          options: [
            { value: 'all', label: 'All Severity' },
            { value: 'critical', label: 'Critical' },
            { value: 'warning', label: 'Warning' },
            { value: 'info', label: 'Info' }
          ]
        },
        {
          name: 'readStatus',
          label: 'Read Filter',
          value: readFilter,
          options: [
            { value: 'all', label: 'All Status' },
            { value: 'unread', label: 'Unread' },
            { value: 'read', label: 'Read' }
          ]
        }
      ]
    },
    pagination: {
      ...pagination,
      prevUrl: pagination.currentPage > 1
        ? buildQueryUrl('/notifications', {
            q: req.query.q,
            sort: sortKey,
            direction: sortDirection,
            perPage,
            severity: severityFilter,
            readStatus: readFilter,
            page: pagination.currentPage - 1
          })
        : null,
      nextUrl: pagination.currentPage < pagination.totalPages
        ? buildQueryUrl('/notifications', {
            q: req.query.q,
            sort: sortKey,
            direction: sortDirection,
            perPage,
            severity: severityFilter,
            readStatus: readFilter,
            page: pagination.currentPage + 1
          })
        : null,
      pages: Array.from({ length: pagination.totalPages }, (_, index) => ({
        page: index + 1,
        isCurrent: index + 1 === pagination.currentPage,
        url: buildQueryUrl('/notifications', {
          q: req.query.q,
          sort: sortKey,
          direction: sortDirection,
          perPage,
          severity: severityFilter,
          readStatus: readFilter,
          page: index + 1
        })
      }))
    },
    ...getFlash(req)
  });
}

async function markNotificationAsRead(req, res) {
  const notificationId = parseId(req.params.id);

  if (!notificationId) {
    return res.status(404).render('pages/not-found', { pageTitle: 'Notification Not Found' });
  }

  const updatedNotification = usesPharmacyBackofficeNotifications(req.session?.user)
    ? await pharmacyNotificationService.markNotificationAsReadForUser(notificationId, req.session?.user?.id ?? null)
    : await notificationService.markNotificationAsRead(notificationId, req.session?.user ?? null);

  if (!updatedNotification) {
    return res.status(404).render('pages/not-found', { pageTitle: 'Notification Not Found' });
  }

  return res.redirect('/notifications?type=success&message=Notification%20berhasil%20ditandai%20sebagai%20read');
}

async function showAuditLogs(req, res) {
  const auditLogs = await safeList(() => auditTrailService.listAuditLogs(25));

  const tableRows = auditLogs.map((entry) => ({
    cells: [
      formatDateTime(entry.created_at),
      entry.action,
      entry.entity_type || '-',
      entry.user_full_name || entry.user_role || '-'
    ]
  }));

  return renderModulePage(res, {
    pageTitle: 'Audit Logs',
    moduleSlug: 'audit-logs',
    moduleTitle: 'Audit Logs',
    moduleDescription: 'Jejak aktivitas penting untuk traceability dan compliance.',
    moduleStatus: 'Compliance',
    metrics: [
      { label: 'Recent Entries', value: String(auditLogs.length) },
      { label: 'Tracked Actions', value: String(new Set(auditLogs.map((item) => item.action)).size) }
    ],
    noteItems: ['Login event', 'Stock change', 'Transfer event', 'Role change'],
    tableHeaders: ['Time', 'Action', 'Entity', 'User'],
    tableRows,
    emptyMessage: 'Belum ada audit log yang tercatat.',
    ...getFlash(req)
  });
}

async function showErrorLogs(req, res) {
  const errorLogs = await safeList(() => errorLogService.listErrorLogs(25));

  const tableRows = errorLogs.map((entry) => ({
    cells: [
      formatDateTime(entry.created_at),
      entry.severity,
      entry.message,
      entry.request_path || '-',
      entry.user_full_name || '-'
    ]
  }));

  return renderModulePage(res, {
    pageTitle: 'Error Logs',
    moduleSlug: 'error-logs',
    moduleTitle: 'Error Logs',
    moduleDescription: 'Daftar error yang siap dipakai untuk monitoring admin.',
    moduleStatus: 'Operations',
    metrics: [
      { label: 'Critical', value: String(errorLogs.filter((item) => item.severity === 'critical').length) },
      { label: 'Warnings', value: String(errorLogs.filter((item) => item.severity === 'warning').length) }
    ],
    noteItems: ['Severity', 'Request path', 'User context', 'Stack trace safe view'],
    tableHeaders: ['Time', 'Severity', 'Message', 'Path', 'User'],
    tableRows,
    emptyMessage: 'Belum ada error log yang tercatat.',
    ...getFlash(req)
  });
}

async function showImports(req, res) {
  const imports = await safeList(() => importJobService.listImportJobs(25));

  const tableRows = imports.map((job) => ({
    cells: [
      formatDateTime(job.created_at),
      job.file_name,
      job.file_type,
      job.status,
      `${job.successful_rows ?? 0}/${job.total_rows ?? 0}`
    ]
  }));

  return renderModulePage(res, {
    pageTitle: 'Imports',
    moduleSlug: 'imports',
    moduleTitle: 'Spreadsheet Import',
    moduleDescription: 'Riwayat import CSV dan Excel untuk migrasi data.',
    moduleStatus: 'Async Jobs',
    metrics: [
      { label: 'Recent Jobs', value: String(imports.length) },
      { label: 'Failed', value: String(imports.filter((item) => item.status === 'failed').length) }
    ],
    noteItems: ['CSV import', 'Excel import', 'Row validation', 'Duplicate detection'],
    tableHeaders: ['Created At', 'File', 'Type', 'Status', 'Rows'],
    tableRows,
    emptyMessage: 'Belum ada import job yang tercatat.',
    createPath: '/imports/products',
    createLabel: 'Upload Spreadsheet',
    ...getFlash(req)
  });
}

async function showImportProductsCreate(req, res) {
  return renderFormPage(res, {
    pageTitle: 'Import Products',
    moduleSlug: 'imports',
    moduleTitle: 'Product Spreadsheet Import',
    moduleDescription: 'Upload CSV atau XLSX untuk import master product dan opening balance stock.',
    moduleStatus: 'Async Jobs',
    formMode: 'create',
    formAction: '/imports/products',
    formMethod: 'post',
    submitLabel: 'Upload and Import',
    fields: buildImportProductFields(),
    helperNotes: [
      'CSV atau XLSX wajib memakai header yang sudah ditentukan',
      'Category, Supplier, dan Warehouse dicocokkan dari nama atau kode',
      'Quantity dipakai sebagai opening balance stock',
      'Bulk import belum menyertakan product image'
    ],
    downloadTemplatePath: '/imports/products/template',
    downloadTemplateLabel: 'Download Template XLSX',
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formErrors: {},
    errorSummary: [],
    panelBadge: 'Spreadsheet'
  });
}

async function importProducts(req, res) {
  if (req.uploadError) {
    return renderFormPage(res, {
      pageTitle: 'Import Products',
      moduleSlug: 'imports',
      moduleTitle: 'Product Spreadsheet Import',
      moduleDescription: 'Upload CSV atau XLSX untuk import master product dan opening balance stock.',
      moduleStatus: 'Async Jobs',
      formMode: 'create',
      formAction: '/imports/products',
      formMethod: 'post',
      submitLabel: 'Upload and Import',
      fields: buildImportProductFields({}, { import_file: req.uploadError.message }),
      helperNotes: [
        'CSV atau XLSX wajib memakai header yang sudah ditentukan',
        'Category, Supplier, dan Warehouse dicocokkan dari nama atau kode',
        'Quantity dipakai sebagai opening balance stock',
        'Bulk import belum menyertakan product image'
      ],
      flashMessage: req.uploadError.message,
      flashType: 'danger',
      formErrors: { import_file: req.uploadError.message },
      errorSummary: [req.uploadError.message],
      panelBadge: 'Spreadsheet'
    });
  }

  if (!req.file) {
    return renderFormPage(res, {
      pageTitle: 'Import Products',
      moduleSlug: 'imports',
      moduleTitle: 'Product Spreadsheet Import',
      moduleDescription: 'Upload CSV atau XLSX untuk import master product dan opening balance stock.',
      moduleStatus: 'Async Jobs',
      formMode: 'create',
      formAction: '/imports/products',
      formMethod: 'post',
      submitLabel: 'Upload and Import',
      fields: buildImportProductFields({}, { import_file: 'File spreadsheet wajib dipilih' }),
      helperNotes: [
        'CSV atau XLSX wajib memakai header yang sudah ditentukan',
        'Category, Supplier, dan Warehouse dicocokkan dari nama atau kode',
        'Quantity dipakai sebagai opening balance stock',
        'Bulk import belum menyertakan product image'
      ],
      flashMessage: 'File spreadsheet wajib dipilih',
      flashType: 'danger',
      formErrors: { import_file: 'File spreadsheet wajib dipilih' },
      errorSummary: ['File spreadsheet wajib dipilih'],
      panelBadge: 'Spreadsheet'
    });
  }

  const uploadFileType = String(req.file.originalname || '').toLowerCase().endsWith('.xlsx') ? 'xlsx' : 'csv';

  const validation = validateImportFilePayload({
    file_name: req.file.originalname,
    file_path: req.file.path,
    file_type: uploadFileType
  });

  if (!validation.valid) {
    return renderFormPage(res, {
      pageTitle: 'Import Products',
      moduleSlug: 'imports',
      moduleTitle: 'Product Spreadsheet Import',
      moduleDescription: 'Upload CSV atau XLSX untuk import master product dan opening balance stock.',
      moduleStatus: 'Async Jobs',
      formMode: 'create',
      formAction: '/imports/products',
      formMethod: 'post',
      submitLabel: 'Upload and Import',
      fields: buildImportProductFields({}, validation.errors),
      helperNotes: [
        'CSV atau XLSX wajib memakai header yang sudah ditentukan',
        'Category, Supplier, dan Warehouse dicocokkan dari nama atau kode',
        'Quantity dipakai sebagai opening balance stock',
        'Bulk import belum menyertakan product image'
      ],
      flashMessage: 'Validation failed',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: Object.values(validation.errors),
      panelBadge: 'Spreadsheet'
    });
  }

  try {
    const result = await productImportService.processProductImport({
      filePath: req.file.path,
      fileName: req.file.originalname,
      fileType: uploadFileType,
      createdBy: req.session?.user?.id,
      sessionUser: req.session?.user ?? null,
      requestContext: req
    });

    const lowStockProducts = await syncLowStockNotifications(database);
    dashboardRealtimeService.publishLowStockUpdate({
      source: 'product_import_completed',
      lowStockCount: lowStockProducts.length
    });

    const redirectType = result.failedRows > 0 ? 'warning' : 'success';
    const redirectMessage = result.failedRows > 0
      ? `Import selesai dengan ${result.successfulRows} row sukses dan ${result.failedRows} row gagal`
      : `Import selesai. ${result.successfulRows} row berhasil diproses`;

    return res.redirect(`/imports?type=${redirectType}&message=${encodeURIComponent(redirectMessage)}`);
  } catch (error) {
    const failureMessage = getImportFailureMessage(error);

    return renderFormPage(res, {
      pageTitle: 'Import Products',
      moduleSlug: 'imports',
      moduleTitle: 'Product Spreadsheet Import',
      moduleDescription: 'Upload CSV atau XLSX untuk import master product dan opening balance stock.',
      moduleStatus: 'Async Jobs',
      formMode: 'create',
      formAction: '/imports/products',
      formMethod: 'post',
      submitLabel: 'Upload and Import',
      fields: buildImportProductFields({}, { import_file: failureMessage }),
      helperNotes: [
        'CSV atau XLSX wajib memakai header yang sudah ditentukan',
        'Category, Supplier, dan Warehouse dicocokkan dari nama atau kode',
        'Quantity dipakai sebagai opening balance stock',
        'Bulk import belum menyertakan product image'
      ],
      flashMessage: failureMessage,
      flashType: 'danger',
      formErrors: { import_file: failureMessage },
      errorSummary: [failureMessage],
      panelBadge: 'Spreadsheet'
    });
  }
}

async function downloadImportProductTemplate(req, res) {
  const workbook = await createImportProductTemplateWorkbook();
  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = 'smartstock-product-import-template.xlsx';

  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

  return res.send(Buffer.from(buffer));
}

async function showReports(req, res) {
  const reports = await safeList(() => reportJobService.listReportJobs(25));
  const canExport = canExportReports(req.session?.user ?? null);

  const tableRows = reports.map((job) => ({
    cells: [
      formatDateTime(job.created_at),
      job.report_type,
      job.status,
      job.output_file_path || '-',
      job.creator_name || '-'
    ],
    actions: job.output_file_path
      ? [
          {
            type: 'link',
            href: job.output_file_path,
            label: 'Download PDF',
            variant: 'secondary'
          }
        ]
      : []
  }));

  return renderModulePage(res, {
    pageTitle: 'Reports',
    moduleSlug: 'reports',
    moduleTitle: 'Reports',
    moduleDescription: 'Riwayat report job yang akan dipakai untuk export PDF dan summary.',
    moduleStatus: 'Reporting',
    metrics: [
      { label: 'Recent Reports', value: String(reports.length) },
      { label: 'Queued', value: String(reports.filter((item) => item.status === 'queued').length) }
    ],
    noteItems: ['Current stock by warehouse', 'Low stock products', 'Transfer history', 'Inventory valuation'],
    tableHeaders: ['Created At', 'Type', 'Status', 'Output', 'By'],
    tableRows,
    hasActions: true,
    emptyMessage: 'Belum ada report job yang tercatat.',
    createPath: canExport ? '/reports/export' : null,
    createLabel: 'Export PDF',
    ...getFlash(req)
  });
}

async function showReportExportCreate(req, res) {
  return renderFormPage(res, {
    pageTitle: 'Export Report',
    moduleSlug: 'reports',
    moduleTitle: 'Export Report PDF',
    moduleDescription: 'Buat PDF visual untuk kebutuhan demo dan presentasi.',
    moduleStatus: 'Reporting',
    formMode: 'create',
    formAction: '/reports/export',
    formMethod: 'post',
    submitLabel: 'Generate PDF',
    fields: buildReportExportFields(),
    helperNotes: [
      'Output PDF akan disimpan ke folder reports publik',
      'Visual mencakup logo, grafik, KPI cards, dan tabel berwarna',
      'Versi awal fokus pada dashboard summary report'
    ],
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formErrors: {},
    errorSummary: [],
    panelBadge: 'PDF'
  });
}

async function exportReport(req, res) {
  const reportType = String(req.body?.report_type || '').trim();

  if (reportType !== reportExportService.REPORT_TYPE_DASHBOARD_SUMMARY) {
    return renderFormPage(res, {
      pageTitle: 'Export Report',
      moduleSlug: 'reports',
      moduleTitle: 'Export Report PDF',
      moduleDescription: 'Buat PDF visual untuk kebutuhan demo dan presentasi.',
      moduleStatus: 'Reporting',
      formMode: 'create',
      formAction: '/reports/export',
      formMethod: 'post',
      submitLabel: 'Generate PDF',
      fields: buildReportExportFields(req.body, { report_type: 'Tipe report belum didukung' }),
      helperNotes: [
        'Output PDF akan disimpan ke folder reports publik',
        'Visual mencakup logo, grafik, KPI cards, dan tabel berwarna',
        'Versi awal fokus pada dashboard summary report'
      ],
      flashMessage: 'Tipe report belum didukung',
      flashType: 'danger',
      formErrors: { report_type: 'Tipe report belum didukung' },
      errorSummary: ['Tipe report belum didukung'],
      panelBadge: 'PDF'
    });
  }

  try {
    await reportExportService.generateDashboardSummaryPdf({
      createdBy: req.session?.user?.id,
      sessionUser: req.session?.user ?? null,
      requestContext: req
    });

    return res.redirect('/reports?type=success&message=PDF%20report%20berhasil%20dibuat');
  } catch (error) {
    return renderFormPage(res, {
      pageTitle: 'Export Report',
      moduleSlug: 'reports',
      moduleTitle: 'Export Report PDF',
      moduleDescription: 'Buat PDF visual untuk kebutuhan demo dan presentasi.',
      moduleStatus: 'Reporting',
      formMode: 'create',
      formAction: '/reports/export',
      formMethod: 'post',
      submitLabel: 'Generate PDF',
      fields: buildReportExportFields(req.body, { report_type: 'PDF gagal dibuat' }),
      helperNotes: [
        'Output PDF akan disimpan ke folder reports publik',
        'Visual mencakup logo, grafik, KPI cards, dan tabel berwarna',
        'Versi awal fokus pada dashboard summary report'
      ],
      flashMessage: 'PDF gagal dibuat',
      flashType: 'danger',
      formErrors: { report_type: 'PDF gagal dibuat' },
      errorSummary: [error.message || 'PDF gagal dibuat'],
      panelBadge: 'PDF'
    });
  }
}

module.exports = {
  showStockTransactions,
  showStockTransactionCreate,
  createStockTransaction,
  cancelStockTransaction,
  showWarehouseTransfers,
  showWarehouseTransferCreate,
  createWarehouseTransfer,
  approveWarehouseTransfer,
  rejectWarehouseTransfer,
  cancelWarehouseTransfer,
  dispatchWarehouseTransfer,
  completeWarehouseTransfer,
  showNotifications,
  markNotificationAsRead,
  showAuditLogs,
  showErrorLogs,
  showImports,
  showImportProductsCreate,
  importProducts,
  downloadImportProductTemplate,
  showReports,
  showReportExportCreate,
  exportReport
};
