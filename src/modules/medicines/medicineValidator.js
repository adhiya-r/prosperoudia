function toBooleanFlag(value) {
  return value === true || value === 'true' || value === 'on' || value === '1';
}

function validateMedicinePayload(payload = {}) {
  const sku = String(payload.sku ?? '').trim().toUpperCase();
  const name = String(payload.name ?? '').trim();
  const brandName = String(payload.brand_name ?? '').trim();
  const categoryId = Number.parseInt(String(payload.category_id ?? '').trim(), 10);
  const supplierId = Number.parseInt(String(payload.supplier_id ?? '').trim(), 10);
  const description = String(payload.description ?? '').trim();
  const composition = String(payload.composition ?? '').trim();
  const dosage = String(payload.dosage ?? '').trim();
  const dosageForm = String(payload.dosage_form ?? '').trim();
  const strength = String(payload.strength ?? '').trim();
  const sideEffects = String(payload.side_effects ?? '').trim();
  const unitPriceRaw = String(payload.unit_price ?? '').trim();
  const minimumStockThresholdRaw = String(payload.minimum_stock_threshold ?? '').trim();
  const requiresPrescription = toBooleanFlag(payload.requires_prescription);
  const errors = {};

  const skuPattern = /^[A-Z0-9-]{3,30}$/;
  const parsedUnitPrice = Number.parseFloat(unitPriceRaw);
  const parsedMinimumStockThreshold = Number.parseInt(minimumStockThresholdRaw || '0', 10);

  if (!sku) {
    errors.sku = 'SKU obat wajib diisi.';
  } else if (!skuPattern.test(sku)) {
    errors.sku = 'SKU obat hanya boleh huruf kapital, angka, dan tanda hubung, panjang 3-30 karakter.';
  }

  if (!name) {
    errors.name = 'Nama obat wajib diisi.';
  } else if (name.length < 3) {
    errors.name = 'Nama obat minimal 3 karakter.';
  }

  if (!Number.isInteger(categoryId) || categoryId <= 0) {
    errors.category_id = 'Kategori obat wajib dipilih.';
  }

  if (!Number.isInteger(supplierId) || supplierId <= 0) {
    errors.supplier_id = 'Supplier obat wajib dipilih.';
  }

  if (!unitPriceRaw) {
    errors.unit_price = 'Harga jual wajib diisi.';
  } else if (Number.isNaN(parsedUnitPrice) || parsedUnitPrice < 0) {
    errors.unit_price = 'Harga jual harus berupa angka dan tidak boleh negatif.';
  }

  if (minimumStockThresholdRaw && (Number.isNaN(parsedMinimumStockThreshold) || parsedMinimumStockThreshold < 0)) {
    errors.minimum_stock_threshold = 'Minimum stok harus berupa angka bulat dan tidak boleh negatif.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      sku,
      name,
      brand_name: brandName || null,
      category_id: categoryId,
      supplier_id: supplierId,
      description: description || null,
      composition: composition || null,
      dosage: dosage || null,
      dosage_form: dosageForm || null,
      strength: strength || null,
      side_effects: sideEffects || null,
      unit_price: Number.isNaN(parsedUnitPrice) ? 0 : parsedUnitPrice,
      minimum_stock_threshold: Number.isNaN(parsedMinimumStockThreshold) ? 0 : parsedMinimumStockThreshold,
      image_path: typeof payload.image_path === 'string' && payload.image_path.trim() ? payload.image_path.trim() : null,
      requires_prescription: requiresPrescription,
      is_active: true
    }
  };
}

module.exports = {
  validateMedicinePayload
};
