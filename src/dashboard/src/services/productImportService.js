const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const path = require('node:path');
const ExcelJS = require('exceljs');

const database = require('../config/database');
const productService = require('./productService');
const categoryService = require('./categoryService');
const supplierService = require('./supplierService');
const warehouseService = require('./warehouseService');
const inventoryService = require('./inventoryService');
const importJobService = require('./importJobService');
const notificationService = require('./notificationService');
const auditLogService = require('./auditLogService');
const { parseCsv } = require('../utils/csvParser');

const REQUIRED_HEADERS = [
  'sku',
  'product_name',
  'category',
  'supplier',
  'warehouse',
  'quantity',
  'minimum_stock_threshold',
  'unit_price'
];

function normalizeLookupKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeOptionalString(value) {
  const result = String(value ?? '').trim();
  return result || null;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function detectImportFileType(fileName, fallbackType = '') {
  const normalizedFallbackType = String(fallbackType || '').trim().toLowerCase();
  const extension = path.extname(String(fileName || '')).toLowerCase();

  if (extension === '.xlsx') {
    return 'xlsx';
  }

  if (extension === '.csv') {
    return 'csv';
  }

  return normalizedFallbackType || 'csv';
}

function buildLookup(records, keys) {
  const lookup = new Map();

  for (const record of records) {
    for (const key of keys) {
      const value = record[key];
      if (value === undefined || value === null || value === '') {
        continue;
      }

      lookup.set(normalizeLookupKey(value), record);
    }
  }

  return lookup;
}

function buildRowError(rowNumber, message) {
  return {
    row: rowNumber,
    message
  };
}

function summarizeErrors(errors, limit = 10) {
  return errors.slice(0, limit).map((error) => `Row ${error.row}: ${error.message}`);
}

function getImportHeaderErrors(headers) {
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (!missingHeaders.length) {
    return [];
  }

  return [
    {
      row: 1,
      message: `Header wajib belum lengkap: ${missingHeaders.join(', ')}`
    }
  ];
}

function normalizeBooleanInput(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on', 'active'].includes(normalized);
}

async function loadImportLookups() {
  const [categories, suppliers, warehouses] = await Promise.all([
    categoryService.listCategories({ includeInactive: true }),
    supplierService.listSuppliers({ includeInactive: true }),
    warehouseService.listWarehouses({ includeInactive: true })
  ]);

  return {
    categories,
    suppliers,
    warehouses,
    categoryLookup: buildLookup(categories, ['code', 'name']),
    supplierLookup: buildLookup(suppliers, ['code', 'name']),
    warehouseLookup: buildLookup(warehouses, ['code', 'name', 'city'])
  };
}

async function parseXlsx(filePath) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(filePath);

  const worksheet = workbook.worksheets[0];
  if (!worksheet) {
    return {
      headers: [],
      rows: []
    };
  }

  const headerRow = worksheet.getRow(1);
  const headers = headerRow.values
    .slice(1)
    .map((value) => String(value ?? '').trim())
    .filter((value, index, array) => value || index < array.length - 1);
  const normalizedHeaders = headers.map((header) =>
    String(header)
      .trim()
      .toLowerCase()
      .replace(/^\uFEFF/, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
  );
  const rows = [];

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const rowValues = worksheet.getRow(rowIndex).values.slice(1);
    const hasContent = rowValues.some((value) => String(value ?? '').trim() !== '');

    if (!hasContent) {
      continue;
    }

    const row = {};
    normalizedHeaders.forEach((header, headerIndex) => {
      row[header] = rowValues[headerIndex] ?? '';
    });
    rows.push(row);
  }

  return {
    headers: normalizedHeaders,
    rows
  };
}

async function parseImportFile({ filePath, fileType }) {
  if (fileType === 'xlsx') {
    return parseXlsx(filePath);
  }

  const rawContent = await fs.readFile(filePath, 'utf8');
  return parseCsv(rawContent);
}

function mapImportRow(row, rowNumber, lookups, existingSkus = new Set()) {
  const sku = normalizeOptionalString(row.sku);
  const productName = normalizeOptionalString(row.product_name);
  const categoryInput = normalizeOptionalString(row.category);
  const supplierInput = normalizeOptionalString(row.supplier);
  const warehouseInput = normalizeOptionalString(row.warehouse);
  const quantity = normalizeOptionalNumber(row.quantity);
  const minimumStockThreshold = normalizeOptionalNumber(row.minimum_stock_threshold);
  const unitPrice = normalizeOptionalNumber(row.unit_price);
  const description = normalizeOptionalString(row.description);
  const isActive = normalizeBooleanInput(row.is_active, true);

  const errors = [];

  if (!sku) {
    errors.push('SKU wajib diisi');
  }

  if (!productName) {
    errors.push('Product Name wajib diisi');
  }

  if (!categoryInput) {
    errors.push('Category wajib diisi');
  }

  if (!supplierInput) {
    errors.push('Supplier wajib diisi');
  }

  if (!warehouseInput) {
    errors.push('Warehouse wajib diisi');
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push('Quantity harus berupa angka lebih besar dari 0');
  }

  if (!Number.isFinite(minimumStockThreshold) || minimumStockThreshold < 0) {
    errors.push('Minimum Stock Threshold harus berupa angka dan tidak boleh negatif');
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    errors.push('Unit Price harus berupa angka dan tidak boleh negatif');
  }

  if (sku && existingSkus.has(normalizeLookupKey(sku))) {
    errors.push('SKU duplikat di file import');
  }

  const category = categoryInput ? lookups.categoryLookup.get(normalizeLookupKey(categoryInput)) : null;
  const supplier = supplierInput ? lookups.supplierLookup.get(normalizeLookupKey(supplierInput)) : null;
  const warehouse = warehouseInput ? lookups.warehouseLookup.get(normalizeLookupKey(warehouseInput)) : null;

  if (categoryInput && !category) {
    errors.push(`Category "${categoryInput}" tidak ditemukan`);
  }

  if (supplierInput && !supplier) {
    errors.push(`Supplier "${supplierInput}" tidak ditemukan`);
  }

  if (warehouseInput && !warehouse) {
    errors.push(`Warehouse "${warehouseInput}" tidak ditemukan`);
  }

  return {
    row: rowNumber,
    valid: errors.length === 0,
    errors,
    value: {
      sku,
      name: productName,
      description,
      category_id: category?.id ?? null,
      supplier_id: supplier?.id ?? null,
      warehouse_id: warehouse?.id ?? null,
      quantity: Number.isFinite(quantity) ? quantity : null,
      minimum_stock_threshold: Number.isFinite(minimumStockThreshold) ? minimumStockThreshold : null,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : null,
      is_active: isActive
    }
  };
}

async function processProductImport({ filePath, fileName, fileType, createdBy, sessionUser, requestContext }) {
  const resolvedFileType = detectImportFileType(fileName, fileType);
  const job = await importJobService.createImportJob({
    job_uuid: crypto.randomUUID(),
    file_name: fileName,
    file_path: filePath,
    file_type: resolvedFileType,
    status: 'processing',
    created_by: createdBy,
    started_at: new Date().toISOString()
  });

  try {
    const parsed = await parseImportFile({ filePath, fileType: resolvedFileType });
    const headerErrors = getImportHeaderErrors(parsed.headers);

    if (headerErrors.length) {
      const failedJob = await importJobService.updateImportJob(job.id, {
        ...job,
        status: 'failed',
        total_rows: parsed.rows.length,
        successful_rows: 0,
        failed_rows: headerErrors.length,
        error_summary: headerErrors,
        completed_at: new Date().toISOString()
      });

      await auditLogService.logAction(
        auditLogService.buildAuditPayload(sessionUser ?? null, requestContext, {
          action: 'IMPORT_FAILED',
          entity_type: 'import_job',
          entity_id: failedJob.id,
          old_value: null,
          new_value: { error_summary: headerErrors }
        }),
        database
      );

      await notificationService.createNotification(
        {
          user_id: createdBy,
          severity: 'warning',
          title: 'Import Failed',
          message: `Import ${resolvedFileType.toUpperCase()} gagal karena header tidak lengkap. ${summarizeErrors(headerErrors).join(' | ')}`,
          entity_type: 'import_job',
          entity_id: failedJob.id
        },
        database
      );

      return {
        job: failedJob,
        totalRows: parsed.rows.length,
        successfulRows: 0,
        failedRows: headerErrors.length,
        errors: headerErrors
      };
    }

    const lookups = await loadImportLookups();
    const validations = [];
    const seenSkus = new Set();

    for (let index = 0; index < parsed.rows.length; index += 1) {
      const rowNumber = index + 2;
      const row = parsed.rows[index];
      const skuKey = normalizeLookupKey(row.sku);
      if (skuKey) {
        if (seenSkus.has(skuKey)) {
          validations.push({
            row: rowNumber,
            valid: false,
            errors: ['SKU duplikat di file import'],
            value: null
          });
          continue;
        }

        seenSkus.add(skuKey);
      }

      validations.push(mapImportRow(row, rowNumber, lookups));
    }

    const validationErrors = validations.filter((item) => !item.valid).flatMap((item) =>
      item.errors.map((message) => buildRowError(item.row, message))
    );

    if (validationErrors.length) {
      const failedJob = await importJobService.updateImportJob(job.id, {
        ...job,
        status: 'failed',
        total_rows: parsed.rows.length,
        successful_rows: 0,
        failed_rows: validationErrors.length,
        error_summary: validationErrors,
        completed_at: new Date().toISOString()
      });

      await auditLogService.logAction(
        auditLogService.buildAuditPayload(sessionUser ?? null, requestContext, {
          action: 'IMPORT_FAILED',
          entity_type: 'import_job',
          entity_id: failedJob.id,
          old_value: null,
          new_value: { error_summary: validationErrors }
        }),
        database
      );

      await notificationService.createNotification(
        {
          user_id: createdBy,
          severity: 'warning',
          title: 'Import Failed',
          message: `Import ${resolvedFileType.toUpperCase()} gagal. ${summarizeErrors(validationErrors).join(' | ')}`,
          entity_type: 'import_job',
          entity_id: failedJob.id
        },
        database
      );

      return {
        job: failedJob,
        totalRows: parsed.rows.length,
        successfulRows: 0,
        failedRows: validationErrors.length,
        errors: validationErrors
      };
    }

    const result = await database.transaction(async (trx) => {
      let successfulRows = 0;

      for (const validation of validations) {
        const row = validation.value;
        const existingProduct = await productService.getProductBySku(row.sku, trx);
        const productPayload = {
          sku: row.sku,
          name: row.name,
          description: row.description,
          category_id: row.category_id,
          supplier_id: row.supplier_id,
          unit_price: row.unit_price,
          minimum_stock_threshold: row.minimum_stock_threshold,
          image_path: existingProduct?.image_path ?? null,
          is_active: row.is_active
        };

        const product = existingProduct
          ? await productService.updateProduct(existingProduct.id, productPayload, trx)
          : await productService.createProduct(productPayload, trx);

        const existingBalance = await trx('inventory_balances')
          .where('product_id', product.id)
          .where('warehouse_id', row.warehouse_id)
          .first();

        if (existingBalance && Number(existingBalance.current_quantity ?? 0) !== 0) {
          const error = new Error(`Stock existing untuk SKU ${row.sku} di warehouse tujuan belum nol`);
          error.statusCode = 409;
          error.row = validation.row;
          throw error;
        }

        await inventoryService.recordStockMovement(
          {
            product_id: product.id,
            warehouse_id: row.warehouse_id,
            transaction_type: 'IMPORT',
            quantity: row.quantity,
            performed_by: createdBy,
            reference_type: 'import_job',
            reference_id: job.id,
            notes: `Imported from ${fileName} at row ${validation.row}`
          },
          trx
        );

        successfulRows += 1;
      }

      return {
        successfulRows
      };
    });

    const completedJob = await importJobService.updateImportJob(job.id, {
      ...job,
      status: 'completed',
      total_rows: parsed.rows.length,
      successful_rows: result.successfulRows,
      failed_rows: 0,
      error_summary: null,
      completed_at: new Date().toISOString()
    });

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(sessionUser ?? null, requestContext, {
        action: 'IMPORT_COMPLETED',
        entity_type: 'import_job',
        entity_id: completedJob.id,
        old_value: null,
        new_value: {
          total_rows: parsed.rows.length,
          successful_rows: result.successfulRows
        }
      }),
      database
    );

    await notificationService.createNotification(
      {
        user_id: createdBy,
        severity: 'info',
        title: 'Import Completed',
        message: `Import ${resolvedFileType.toUpperCase()} berhasil. ${result.successfulRows} row diproses dari ${parsed.rows.length} row.`,
        entity_type: 'import_job',
        entity_id: completedJob.id
      },
      database
    );

    return {
      job: completedJob,
      totalRows: parsed.rows.length,
      successfulRows: result.successfulRows,
      failedRows: 0,
      errors: []
    };
  } catch (error) {
    if (job?.id) {
      const failureSummary = [
        {
          row: error.row ?? 1,
          message: error.message || 'Import gagal diproses'
        }
      ];

      try {
        await importJobService.updateImportJob(job.id, {
          ...job,
          status: 'failed',
          total_rows: null,
          successful_rows: 0,
          failed_rows: failureSummary.length,
          error_summary: failureSummary,
          completed_at: new Date().toISOString()
        });
      } catch (updateError) {
        console.error('Failed to mark import job as failed:', updateError);
      }

      try {
        await auditLogService.logAction(
          auditLogService.buildAuditPayload(sessionUser ?? null, requestContext, {
            action: 'IMPORT_FAILED',
            entity_type: 'import_job',
            entity_id: job.id,
            old_value: null,
            new_value: { error_summary: failureSummary }
          }),
          database
        );
      } catch (auditError) {
        console.error('Failed to write import failure audit log:', auditError);
      }

      try {
        await notificationService.createNotification(
          {
            user_id: createdBy,
            severity: 'warning',
            title: 'Import Failed',
            message: `Import ${resolvedFileType.toUpperCase()} gagal diproses. ${error.message || 'Terjadi kesalahan internal.'}`,
            entity_type: 'import_job',
            entity_id: job.id
          },
          database
        );
      } catch (notificationError) {
        console.error('Failed to write import failure notification:', notificationError);
      }
    }

    throw error;
  }
}

module.exports = {
  processProductImport,
  processProductImportFromCsv: (payload) =>
    processProductImport({
      ...payload,
      fileType: payload?.fileType ?? 'csv'
    })
};
