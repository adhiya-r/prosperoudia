const warehouseRepository = require('../repositories/warehouseRepository');
const { validateWarehousePayload } = require('../validators/warehouseValidator');

const DEFAULT_WAREHOUSE = {
  id: 1,
  code: 'GDU-UTAMA',
  name: 'Gudang Utama Klinik',
  city: 'Lokasi Klinik',
  latitude: null,
  longitude: null,
  is_active: true
};

function normalizeWarehousePayload(payload, options = {}) {
  const validation = validateWarehousePayload(payload, options);

  if (!validation.valid) {
    const error = new Error('Warehouse validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  return validation.value;
}

async function listWarehouses(options = {}, trx) {
  return [DEFAULT_WAREHOUSE];
}

async function getWarehouseById(id, trx) {
  return Number(id) === DEFAULT_WAREHOUSE.id ? DEFAULT_WAREHOUSE : null;
}

async function getWarehouseByCode(code, trx) {
  return String(code || '').toLowerCase() === DEFAULT_WAREHOUSE.code.toLowerCase() ? DEFAULT_WAREHOUSE : null;
}

async function createWarehouse(payload, trx) {
  const value = normalizeWarehousePayload(payload);
  return warehouseRepository.create(value, trx);
}

async function updateWarehouse(id, payload, trx) {
  const current = await warehouseRepository.findById(id, trx);

  if (!current) {
    return null;
  }

  const value = normalizeWarehousePayload(payload);
  if (payload?.is_active === undefined) {
    value.is_active = current.is_active;
  }

  return warehouseRepository.updateById(id, value, trx);
}

async function deactivateWarehouse(id, trx) {
  return warehouseRepository.deactivateById(id, trx);
}

async function activateWarehouse(id, trx) {
  return warehouseRepository.activateById(id, trx);
}

async function getWarehouseUsage(id, trx) {
  return warehouseRepository.countUsage(id, trx);
}

async function deleteWarehouse(id, trx) {
  return warehouseRepository.deleteById(id, trx);
}

module.exports = {
  listWarehouses,
  getWarehouseById,
  getWarehouseByCode,
  createWarehouse,
  updateWarehouse,
  deactivateWarehouse,
  activateWarehouse,
  getWarehouseUsage,
  deleteWarehouse,
  normalizeWarehousePayload
};
