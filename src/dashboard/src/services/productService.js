const productRepository = require('../repositories/productRepository');
const { validateProductPayload } = require('../validators/productValidator');

function normalizeProductPayload(payload, options = {}) {
  const validation = validateProductPayload(payload, options);

  if (!validation.valid) {
    const error = new Error('Product validation failed');
    error.statusCode = 400;
    error.errors = validation.errors;
    throw error;
  }

  return validation.value;
}

async function listProducts(options = {}, trx) {
  return productRepository.listAll(options, trx);
}

async function listProductsWithStockSummary(options = {}, trx) {
  return productRepository.listWithStockSummary(options, trx);
}

async function getProductById(id, trx) {
  return productRepository.findById(id, trx);
}

async function getProductBySku(sku, trx) {
  return productRepository.findBySku(sku, trx);
}

async function createProduct(payload, trx) {
  const value = normalizeProductPayload(payload);
  return productRepository.create(value, trx);
}

async function updateProduct(id, payload, trx) {
  const current = await productRepository.findById(id, trx);

  if (!current) {
    return null;
  }

  const value = normalizeProductPayload(payload);
  if (payload?.is_active === undefined) {
    value.is_active = current.is_active;
  }

  return productRepository.updateById(id, value, trx);
}

async function deactivateProduct(id, trx) {
  return productRepository.deactivateById(id, trx);
}

async function activateProduct(id, trx) {
  return productRepository.activateById(id, trx);
}

async function getProductUsage(id, trx) {
  return productRepository.countUsage(id, trx);
}

async function deleteProduct(id, trx) {
  return productRepository.deleteById(id, trx);
}

module.exports = {
  listProducts,
  listProductsWithStockSummary,
  getProductById,
  getProductBySku,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
  getProductUsage,
  deleteProduct,
  normalizeProductPayload
};
