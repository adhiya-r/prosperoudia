const allowedTransactionTypes = ['STOCK_IN', 'STOCK_OUT', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT', 'IMPORT'];

function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function normalizeOptionalNumber(value) {
  if (value === undefined || value === null || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : Number.NaN;
}

function validateStockTransactionPayload(payload) {
  const errors = {};
  const productId = normalizeOptionalNumber(payload?.product_id);
  const warehouseId = normalizeOptionalNumber(payload?.warehouse_id);
  const transactionType = normalizeString(payload?.transaction_type);
  const quantity = normalizeOptionalNumber(payload?.quantity);
  const performedBy = normalizeOptionalNumber(payload?.performed_by);

  if (!Number.isFinite(productId)) {
    errors.product_id = 'Product wajib dipilih';
  }

  if (!Number.isFinite(warehouseId)) {
    errors.warehouse_id = 'Warehouse wajib dipilih';
  }

  if (!transactionType) {
    errors.transaction_type = 'Transaction type wajib diisi';
  } else if (!allowedTransactionTypes.includes(transactionType)) {
    errors.transaction_type = 'Transaction type tidak valid';
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    errors.quantity = 'Quantity harus lebih besar dari 0';
  }

  if (!Number.isFinite(performedBy)) {
    errors.performed_by = 'User pelaksana wajib diisi';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      product_id: Number.isFinite(productId) ? productId : null,
      warehouse_id: Number.isFinite(warehouseId) ? warehouseId : null,
      transaction_type: transactionType,
      quantity: Number.isFinite(quantity) ? quantity : null,
      performed_by: Number.isFinite(performedBy) ? performedBy : null,
      notes: normalizeString(payload?.notes) || null,
      reference_type: normalizeString(payload?.reference_type) || null,
      reference_id: normalizeOptionalNumber(payload?.reference_id),
      unit_cost: normalizeOptionalNumber(payload?.unit_cost),
      remaining_quantity: normalizeOptionalNumber(payload?.remaining_quantity)
    }
  };
}

module.exports = {
  validateStockTransactionPayload
};
