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

module.exports = {
  listCategories,
  createCategory
};
