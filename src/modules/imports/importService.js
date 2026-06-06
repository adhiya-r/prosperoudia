const fs = require('node:fs/promises');
const path = require('node:path');
const ExcelJS = require('exceljs');
const database = require('../../config/database');
const { parseCsv } = require('../../shared/utils/csvParser');
const importJobService = require('./importJobService');

const REQUIRED_HEADERS = ['sku', 'name', 'category', 'supplier', 'quantity', 'unit_price'];

function normalizeLookupKey(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

function normalizeOptionalString(value) {
  const normalized = String(value ?? '').trim();
  return normalized || null;
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const normalized = String(value).replace(/,/g, '').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function normalizeBooleanInput(value, fallback = false) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on', 'y'].includes(String(value).trim().toLowerCase());
}

function normalizeHeaderAlias(header) {
  const aliases = new Map([
    ['product_name', 'name'],
    ['medicine_name', 'name'],
    ['category_name', 'category'],
    ['supplier_name', 'supplier'],
    ['min_stock', 'minimum_stock_threshold'],
    ['minimum_stock', 'minimum_stock_threshold'],
    ['price', 'unit_price'],
    ['cost', 'unit_cost'],
    ['expiry_date', 'expired_at'],
    ['expiration_date', 'expired_at'],
    ['batch', 'batch_number']
  ]);

  return aliases.get(header) || header;
}

function buildSlugCode(value, prefix) {
  const slug = String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 24);

  return slug ? `${prefix}-${slug}`.slice(0, 30) : `${prefix}-${Date.now()}`;
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

  const headerValues = worksheet.getRow(1).values.slice(1);
  const headers = headerValues.map((value) => normalizeHeaderAlias(String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')));
  const rows = [];

  for (let rowIndex = 2; rowIndex <= worksheet.rowCount; rowIndex += 1) {
    const rowValues = worksheet.getRow(rowIndex).values.slice(1);
    const hasContent = rowValues.some((value) => String(value ?? '').trim() !== '');

    if (!hasContent) {
      continue;
    }

    const row = {};
    headers.forEach((header, index) => {
      row[header] = rowValues[index] ?? '';
    });
    rows.push(row);
  }

  return {
    headers,
    rows
  };
}

async function parseImportFile(filePath, fileType) {
  if (fileType === 'xlsx') {
    return parseXlsx(filePath);
  }

  const rawContent = await fs.readFile(filePath, 'utf8');
  const parsed = parseCsv(rawContent);
  return {
    headers: parsed.headers.map(normalizeHeaderAlias),
    rows: parsed.rows.map((row) => {
      const normalized = {};
      Object.entries(row).forEach(([key, value]) => {
        normalized[normalizeHeaderAlias(key)] = value;
      });
      return normalized;
    })
  };
}

async function ensureCategory(trx, categoryValue) {
  const normalizedValue = normalizeOptionalString(categoryValue);
  if (!normalizedValue) {
    return null;
  }

  const existing = await trx('medicine_categories')
    .whereRaw('LOWER(name) = LOWER(?)', [normalizedValue])
    .orWhereRaw('LOWER(code) = LOWER(?)', [normalizedValue])
    .first();

  if (existing) {
    return existing;
  }

  const [record] = await trx('medicine_categories')
    .insert({
      code: buildSlugCode(normalizedValue, 'CAT'),
      name: normalizedValue,
      description: `Kategori hasil import ${normalizedValue}`,
      is_active: true
    })
    .returning(['id', 'code', 'name']);

  return record;
}

async function ensureSupplier(trx, supplierValue) {
  const normalizedValue = normalizeOptionalString(supplierValue);
  if (!normalizedValue) {
    return null;
  }

  const existing = await trx('suppliers')
    .whereRaw('LOWER(name) = LOWER(?)', [normalizedValue])
    .orWhereRaw('LOWER(code) = LOWER(?)', [normalizedValue])
    .first();

  if (existing) {
    return existing;
  }

  const [record] = await trx('suppliers')
    .insert({
      code: buildSlugCode(normalizedValue, 'SUP'),
      name: normalizedValue,
      is_active: true
    })
    .returning(['id', 'code', 'name']);

  return record;
}

async function createInventoryBatch(trx, payload) {
  const [record] = await trx('inventory_batches')
    .insert({
      medicine_id: payload.medicine_id,
      batch_number: payload.batch_number,
      received_at: payload.received_at ?? trx.fn.now(),
      expired_at: payload.expired_at,
      quantity_received: payload.quantity_received,
      quantity_remaining: payload.quantity_remaining,
      unit_cost: payload.unit_cost,
      source_type: payload.source_type ?? null,
      source_id: payload.source_id ?? null
    })
    .returning(['id']);

  return record ?? null;
}

async function createOrUpdateMedicine(trx, payload) {
  const existing = await trx('medicines')
    .whereRaw('LOWER(sku) = LOWER(?)', [payload.sku])
    .first();

  if (existing) {
    const [record] = await trx('medicines')
      .where('id', existing.id)
      .update({
        name: payload.name,
        brand_name: payload.brand_name,
        category_id: payload.category_id,
        supplier_id: payload.supplier_id,
        description: payload.description,
        composition: payload.composition,
        dosage: payload.dosage,
        dosage_form: payload.dosage_form,
        strength: payload.strength,
        side_effects: payload.side_effects,
        unit_price: payload.unit_price,
        requires_prescription: payload.requires_prescription,
        minimum_stock_threshold: payload.minimum_stock_threshold,
        is_active: payload.is_active,
        updated_at: trx.fn.now()
      })
      .returning(['id', 'sku', 'name']);

    return {
      record,
      action: 'updated'
    };
  }

  const [record] = await trx('medicines')
    .insert({
      sku: payload.sku,
      name: payload.name,
      brand_name: payload.brand_name,
      category_id: payload.category_id,
      supplier_id: payload.supplier_id,
      description: payload.description,
      composition: payload.composition,
      dosage: payload.dosage,
      dosage_form: payload.dosage_form,
      strength: payload.strength,
      side_effects: payload.side_effects,
      unit_price: payload.unit_price,
      requires_prescription: payload.requires_prescription,
      minimum_stock_threshold: payload.minimum_stock_threshold,
      is_active: payload.is_active
    })
    .returning(['id', 'sku', 'name']);

  return {
    record,
    action: 'created'
  };
}

function buildDefaultExpiryDate() {
  const date = new Date();
  date.setMonth(date.getMonth() + 12);
  return date;
}

function validateHeaders(headers) {
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));

  if (!missingHeaders.length) {
    return [];
  }

  return [`Header wajib belum lengkap: ${missingHeaders.join(', ')}`];
}

function mapImportRow(row, rowNumber) {
  const sku = String(row.sku ?? '').trim().toUpperCase();
  const name = String(row.name ?? '').trim();
  const quantity = normalizeOptionalNumber(row.quantity);
  const unitPrice = normalizeOptionalNumber(row.unit_price);
  const minimumStockThreshold = normalizeOptionalNumber(row.minimum_stock_threshold ?? 0);
  const unitCost = normalizeOptionalNumber(row.unit_cost ?? row.unit_price ?? 0);
  const expiredAt = normalizeOptionalString(row.expired_at);
  const errors = [];

  if (!sku) {
    errors.push('SKU wajib diisi');
  }

  if (!name || name.length < 3) {
    errors.push('Nama obat minimal 3 karakter');
  }

  if (!normalizeOptionalString(row.category)) {
    errors.push('Kategori wajib diisi');
  }

  if (!normalizeOptionalString(row.supplier)) {
    errors.push('Supplier wajib diisi');
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.push('Quantity harus lebih besar dari 0');
  }

  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    errors.push('Unit price harus berupa angka dan tidak boleh negatif');
  }

  if (minimumStockThreshold !== null && (!Number.isFinite(minimumStockThreshold) || minimumStockThreshold < 0)) {
    errors.push('Minimum stock threshold tidak valid');
  }

  if (unitCost !== null && (!Number.isFinite(unitCost) || unitCost < 0)) {
    errors.push('Unit cost tidak valid');
  }

  const parsedExpiry = expiredAt ? new Date(expiredAt) : buildDefaultExpiryDate();
  if (!(parsedExpiry instanceof Date) || Number.isNaN(parsedExpiry.getTime())) {
    errors.push('Expired at tidak valid');
  }

  return {
    row: rowNumber,
    valid: errors.length === 0,
    errors,
    value: {
      sku,
      name,
      brand_name: normalizeOptionalString(row.brand_name),
      category: normalizeOptionalString(row.category),
      supplier: normalizeOptionalString(row.supplier),
      quantity: Number(quantity),
      unit_price: Number(unitPrice),
      minimum_stock_threshold: Number.isFinite(minimumStockThreshold) ? Number(minimumStockThreshold) : 0,
      unit_cost: Number.isFinite(unitCost) ? Number(unitCost) : Number(unitPrice),
      requires_prescription: normalizeBooleanInput(row.requires_prescription),
      dosage_form: normalizeOptionalString(row.dosage_form),
      strength: normalizeOptionalString(row.strength),
      description: normalizeOptionalString(row.description),
      composition: normalizeOptionalString(row.composition),
      dosage: normalizeOptionalString(row.dosage),
      side_effects: normalizeOptionalString(row.side_effects),
      batch_number: normalizeOptionalString(row.batch_number) || `IMP-${Date.now()}-${rowNumber}`,
      expired_at: parsedExpiry,
      is_active: normalizeBooleanInput(row.is_active, true)
    }
  };
}

async function processMedicineImport({ fileName, filePath, fileType, createdBy }) {
  const job = await importJobService.queueImportJob({
    file_name: fileName,
    file_path: filePath,
    file_type: fileType,
    created_by: createdBy
  });

  await importJobService.markImportJobProcessing(job.id);

  try {
    const parsedFile = await parseImportFile(filePath, fileType);
    const headerErrors = validateHeaders(parsedFile.headers);

    if (headerErrors.length) {
      const error = new Error(headerErrors.join('; '));
      error.statusCode = 422;
      throw error;
    }

    const rowErrors = [];
    let successfulRows = 0;

    await database.transaction(async (trx) => {
      for (let index = 0; index < parsedFile.rows.length; index += 1) {
        const mappedRow = mapImportRow(parsedFile.rows[index], index + 2);

        if (!mappedRow.valid) {
          rowErrors.push({
            row: mappedRow.row,
            message: mappedRow.errors.join(', ')
          });
          continue;
        }

        try {
          const category = await ensureCategory(trx, mappedRow.value.category);
          const supplier = await ensureSupplier(trx, mappedRow.value.supplier);

          const medicineResult = await createOrUpdateMedicine(trx, {
            ...mappedRow.value,
            category_id: category.id,
            supplier_id: supplier.id
          });

          const batch = await createInventoryBatch(trx, {
            medicine_id: medicineResult.record.id,
            batch_number: mappedRow.value.batch_number,
            expired_at: mappedRow.value.expired_at,
            quantity_received: mappedRow.value.quantity,
            quantity_remaining: mappedRow.value.quantity,
            unit_cost: mappedRow.value.unit_cost,
            source_type: 'import_job',
            source_id: job.id
          });

          await trx('stock_movements').insert({
            medicine_id: medicineResult.record.id,
            batch_id: batch.id,
            movement_type: 'stock_in',
            quantity: mappedRow.value.quantity,
            quantity_before: 0,
            quantity_after: mappedRow.value.quantity,
            unit_cost: mappedRow.value.unit_cost,
            reference_type: 'import_job',
            reference_id: job.id,
            notes: `Medicine import ${medicineResult.action}`,
            performed_by: createdBy
          });

          successfulRows += 1;
        } catch (error) {
          rowErrors.push({
            row: mappedRow.row,
            message: error.message || 'Gagal memproses baris import'
          });
        }
      }
    });

    await importJobService.markImportJobCompleted(job.id, {
      total_rows: parsedFile.rows.length,
      successful_rows: successfulRows,
      failed_rows: rowErrors.length,
      error_summary: rowErrors.slice(0, 20)
    });

    return {
      jobId: job.id,
      totalRows: parsedFile.rows.length,
      successfulRows,
      failedRows: rowErrors.length,
      rowErrors
    };
  } catch (error) {
    await importJobService.markImportJobFailed(job.id, {
      total_rows: null,
      successful_rows: 0,
      failed_rows: 1,
      error_summary: [{ row: 1, message: error.message || 'Import gagal diproses' }]
    });
    throw error;
  } finally {
    try {
      await fs.unlink(filePath);
    } catch (unlinkError) {
      // Ignore cleanup failure for temporary import file.
    }
  }
}

async function listLatestMedicineImportJobs(limit = 25) {
  return importJobService.listLatestImportJobs(limit);
}

module.exports = {
  listLatestMedicineImportJobs,
  processMedicineImport
};
