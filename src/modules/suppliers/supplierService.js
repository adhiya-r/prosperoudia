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

async function getSupplierById(id) {
  const supplier = await supplierRepository.findById(id);
  if (!supplier) {
    const error = new Error('Supplier tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }
  return supplier;
}

async function updateSupplier(id, payload) {
  // Pastikan supplier ada
  await getSupplierById(id);

  // Check unique code if changed
  const existingSupplier = await supplierRepository.findByCode(payload.code);
  if (existingSupplier && String(existingSupplier.id) !== String(id)) {
    const error = new Error('Kode supplier sudah digunakan.');
    error.statusCode = 409;
    throw error;
  }

  return supplierRepository.updateById(id, payload);
}

async function deactivateSupplier(id) {
  await getSupplierById(id);
  return supplierRepository.deactivateById(id);
}

async function activateSupplier(id) {
  await getSupplierById(id);
  return supplierRepository.activateById(id);
}

async function deleteSupplier(id) {
  await getSupplierById(id);

  // Periksa apakah supplier digunakan oleh obat/medicine
  const usage = await supplierRepository.countUsage(id);
  if (usage.products > 0) {
    const error = new Error('Supplier tidak bisa dihapus karena masih digunakan oleh produk obat.');
    error.statusCode = 400;
    throw error;
  }

  return supplierRepository.deleteById(id);
}

module.exports = {
  listSuppliers,
  createSupplier,
  getSupplierById,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
  deleteSupplier
};
