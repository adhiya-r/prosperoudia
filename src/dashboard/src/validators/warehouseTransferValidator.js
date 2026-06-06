const allowedTransferStatuses = ['DRAFT', 'REQUESTED', 'APPROVED', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED', 'REJECTED'];

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

function validateWarehouseTransferPayload(payload) {
  const errors = {};
  const transferNumber = normalizeString(payload?.transfer_number);
  const sourceWarehouseId = normalizeOptionalNumber(payload?.source_warehouse_id);
  const destinationWarehouseId = normalizeOptionalNumber(payload?.destination_warehouse_id);
  const requestedBy = normalizeOptionalNumber(payload?.requested_by);
  const status = normalizeString(payload?.status);

  if (!transferNumber) {
    errors.transfer_number = 'Transfer number wajib diisi';
  }

  if (!Number.isFinite(sourceWarehouseId)) {
    errors.source_warehouse_id = 'Source warehouse wajib dipilih';
  }

  if (!Number.isFinite(destinationWarehouseId)) {
    errors.destination_warehouse_id = 'Destination warehouse wajib dipilih';
  }

  if (Number.isFinite(sourceWarehouseId) && Number.isFinite(destinationWarehouseId) && sourceWarehouseId === destinationWarehouseId) {
    errors.destination_warehouse_id = 'Source dan destination warehouse tidak boleh sama';
  }

  if (!Number.isFinite(requestedBy)) {
    errors.requested_by = 'User pemohon wajib diisi';
  }

  if (!status) {
    errors.status = 'Status transfer wajib diisi';
  } else if (!allowedTransferStatuses.includes(status)) {
    errors.status = 'Status transfer tidak valid';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      transfer_number: transferNumber || null,
      source_warehouse_id: Number.isFinite(sourceWarehouseId) ? sourceWarehouseId : null,
      destination_warehouse_id: Number.isFinite(destinationWarehouseId) ? destinationWarehouseId : null,
      requested_by: Number.isFinite(requestedBy) ? requestedBy : null,
      status,
      request_notes: normalizeString(payload?.request_notes) || null,
      decision_notes: normalizeString(payload?.decision_notes) || null
    }
  };
}

module.exports = {
  validateWarehouseTransferPayload
};
