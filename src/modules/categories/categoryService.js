const categoryRepository = require('./categoryRepository');

async function listCategories() {
  return categoryRepository.listCategories();
}

async function createCategory(payload) {
  const existingCategory = await categoryRepository.findByCode(payload.code);

  if (existingCategory) {
    const error = new Error('Kode kategori sudah digunakan.');
    error.statusCode = 409;
    throw error;
  }

  return categoryRepository.createCategory(payload);
}

async function getCategoryById(id) {
  return categoryRepository.findById(id);
}

async function getCategoryByCode(code) {
  return categoryRepository.findByCode(code);
}

async function updateCategory(id, payload) {
  return categoryRepository.updateById(id, payload);
}

async function deactivateCategory(id) {
  return categoryRepository.deactivateById(id);
}

async function activateCategory(id) {
  return categoryRepository.activateById(id);
}

async function getCategoryUsage(id) {
  return categoryRepository.countUsage(id);
}

async function deleteCategory(id) {
  return categoryRepository.deleteById(id);
}

module.exports = {
  listCategories,
  createCategory,
  getCategoryById,
  getCategoryByCode,
  updateCategory,
  deactivateCategory,
  activateCategory,
  getCategoryUsage,
  deleteCategory
};
