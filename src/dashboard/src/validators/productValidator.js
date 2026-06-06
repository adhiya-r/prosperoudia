function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeOptionalString(value) {
  const normalized = normalizeString(value);
  return normalized || null;
}

function normalizeOptionalBoolean(value, fallback = true) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(normalized);
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function validateProductPayload(payload, { requireAll = true } = {}) {
  const errors = {};
  const sku = normalizeString(payload?.sku);
  const name = normalizeString(payload?.name ?? payload?.product_name);
  const description = normalizeOptionalString(payload?.description);
  const categoryId = normalizeOptionalNumber(payload?.category_id);
  const supplierId = normalizeOptionalNumber(payload?.supplier_id);
  const unitPrice = normalizeOptionalNumber(payload?.unit_price);
  const minimumStockThreshold = normalizeOptionalNumber(payload?.minimum_stock_threshold);
  const imagePath = normalizeOptionalString(payload?.image_path ?? payload?.product_image);
  const isActive = normalizeOptionalBoolean(payload?.is_active, true);

  if (requireAll || payload?.sku !== undefined) {
    if (!sku) {
      errors.sku = 'SKU wajib diisi';
    }
  }

  if (requireAll || payload?.name !== undefined || payload?.product_name !== undefined) {
    if (!name) {
      errors.name = 'Product name wajib diisi';
    }
  }

  if (requireAll || payload?.category_id !== undefined) {
    if (!Number.isFinite(categoryId)) {
      errors.category_id = 'Category wajib dipilih';
    }
  }

  if (requireAll || payload?.supplier_id !== undefined) {
    if (!Number.isFinite(supplierId)) {
      errors.supplier_id = 'Supplier wajib dipilih';
    }
  }

  if (requireAll || payload?.unit_price !== undefined) {
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      errors.unit_price = 'Unit price harus berupa angka dan tidak boleh negatif';
    }
  }

  if (requireAll || payload?.minimum_stock_threshold !== undefined) {
    if (!Number.isFinite(minimumStockThreshold) || minimumStockThreshold < 0) {
      errors.minimum_stock_threshold = 'Minimum stock threshold harus berupa angka dan tidak boleh negatif';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      sku,
      name,
      description,
      category_id: Number.isFinite(categoryId) ? categoryId : null,
      supplier_id: Number.isFinite(supplierId) ? supplierId : null,
      unit_price: Number.isFinite(unitPrice) ? unitPrice : null,
      minimum_stock_threshold: Number.isFinite(minimumStockThreshold) ? minimumStockThreshold : null,
      image_path: imagePath,
      is_active: isActive
    }
  };
}

module.exports = {
  validateProductPayload
};
