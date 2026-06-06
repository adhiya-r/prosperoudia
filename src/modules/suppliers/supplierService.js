const supplierRepository = require('./supplierRepository');

async function listSuppliers() {
  return supplierRepository.listSuppliers();
}

async function createSupplier(payload) {
  const existingSupplier = await supplierRepository.findByCode(payload.code);

  if (existingSupplier) {
    const error = new Error('Kode supplier sudah digunakan.');
    error.statusCode = 409;
    throw error;
  }

  return supplierRepository.createSupplier(payload);
}

module.exports = {
  listSuppliers,
  createSupplier
};
