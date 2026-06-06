const supplierRepository = require('../repositories/supplierRepository');
const { validateSupplierPayload } = require('../validators/supplierValidator');

function normalizeSupplierPayload(payload, options = {}) {
  const validation = validateSupplierPayload(payload, options);

  if (!validation.valid) {
    const error = new Error('Supplier validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  return validation.value;
}

async function listSuppliers(options = {}, trx) {
  return supplierRepository.listAll(options, trx);
}

async function getSupplierById(id, trx) {
  return supplierRepository.findById(id, trx);
}

async function getSupplierByCode(code, trx) {
  return supplierRepository.findByCode(code, trx);
}

async function createSupplier(payload, trx) {
  const value = normalizeSupplierPayload(payload);
  return supplierRepository.create(value, trx);
}

async function updateSupplier(id, payload, trx) {
  const current = await supplierRepository.findById(id, trx);

  if (!current) {
    return null;
  }

  const value = normalizeSupplierPayload(payload);
  if (payload?.is_active === undefined) {
    value.is_active = current.is_active;
  }

  return supplierRepository.updateById(id, value, trx);
}

async function deactivateSupplier(id, trx) {
  return supplierRepository.deactivateById(id, trx);
}

async function activateSupplier(id, trx) {
  return supplierRepository.activateById(id, trx);
}

async function getSupplierUsage(id, trx) {
  return supplierRepository.countUsage(id, trx);
}

async function deleteSupplier(id, trx) {
  return supplierRepository.deleteById(id, trx);
}

module.exports = {
  listSuppliers,
  getSupplierById,
  getSupplierByCode,
  createSupplier,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
  getSupplierUsage,
  deleteSupplier,
  normalizeSupplierPayload
};
