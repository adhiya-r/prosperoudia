const categoryRepository = require('../repositories/categoryRepository');
const { validateCategoryPayload } = require('../validators/categoryValidator');

function normalizeCategoryPayload(payload, options = {}) {
  const validation = validateCategoryPayload(payload, options);

  if (!validation.valid) {
    const error = new Error('Category validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  return validation.value;
}

async function listCategories(options = {}, trx) {
  return categoryRepository.listAll(options, trx);
}

async function getCategoryById(id, trx) {
  return categoryRepository.findById(id, trx);
}

async function getCategoryByCode(code, trx) {
  return categoryRepository.findByCode(code, trx);
}

async function createCategory(payload, trx) {
  const value = normalizeCategoryPayload(payload);
  return categoryRepository.create(value, trx);
}

async function updateCategory(id, payload, trx) {
  const current = await categoryRepository.findById(id, trx);

  if (!current) {
    return null;
  }

  const value = normalizeCategoryPayload(payload);
  if (payload?.is_active === undefined) {
    value.is_active = current.is_active;
  }

  return categoryRepository.updateById(id, value, trx);
}

async function deactivateCategory(id, trx) {
  return categoryRepository.deactivateById(id, trx);
}

async function activateCategory(id, trx) {
  return categoryRepository.activateById(id, trx);
}

async function getCategoryUsage(id, trx) {
  return categoryRepository.countUsage(id, trx);
}

async function deleteCategory(id, trx) {
  return categoryRepository.deleteById(id, trx);
}

module.exports = {
  listCategories,
  getCategoryById,
  getCategoryByCode,
  createCategory,
  updateCategory,
  deactivateCategory,
  activateCategory,
  getCategoryUsage,
  deleteCategory,
  normalizeCategoryPayload
};
