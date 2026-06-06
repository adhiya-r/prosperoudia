const medicineService = require('../medicines/medicineService');

function getCartState(session) {
  if (!session.cart || !Array.isArray(session.cart.items)) {
    session.cart = {
      items: []
    };
  }

  return session.cart;
}

function calculateCartTotals(cart) {
  const items = cart.items.map((item) => ({
    ...item,
    line_total: Number(item.unit_price) * Number(item.quantity),
    line_total_label: new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(Number(item.unit_price) * Number(item.quantity))
  }));

  const totalQuantity = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalAmount = items.reduce((sum, item) => sum + Number(item.line_total), 0);

  return {
    items,
    totalQuantity,
    totalAmount,
    totalAmountLabel: new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(totalAmount)
  };
}

function getCartSummary(session) {
  const cart = getCartState(session);
  const summary = calculateCartTotals(cart);

  return {
    ...summary,
    isEmpty: summary.totalQuantity === 0,
    previewItems: [...summary.items].slice(-2).reverse()
  };
}

async function addItemToCart(session, medicineId, quantity = 1) {
  const cart = getCartState(session);
  const normalizedQuantity = Math.max(1, Number.parseInt(quantity, 10) || 1);
  const medicine = await medicineService.getMedicineDetail(medicineId);
  const existingItem = cart.items.find((item) => Number(item.medicine_id) === Number(medicine.id));

  if (existingItem) {
    existingItem.quantity += normalizedQuantity;
    return calculateCartTotals(cart);
  }

  cart.items.push({
    medicine_id: medicine.id,
    sku: medicine.sku,
    name: medicine.name,
    category_name: medicine.category_name,
    requires_prescription: medicine.requires_prescription,
    unit_price: Number(medicine.unit_price),
    unit_price_label: medicine.price_label,
    quantity: normalizedQuantity
  });

  return calculateCartTotals(cart);
}

function updateCartItemQuantity(session, medicineId, quantity) {
  const cart = getCartState(session);
  const normalizedQuantity = Number.parseInt(quantity, 10);
  const item = cart.items.find((entry) => Number(entry.medicine_id) === Number(medicineId));

  if (!item) {
    const error = new Error('Item cart tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  if (Number.isNaN(normalizedQuantity) || normalizedQuantity <= 0) {
    const error = new Error('Jumlah item cart harus lebih dari nol.');
    error.statusCode = 422;
    throw error;
  }

  item.quantity = normalizedQuantity;
  return calculateCartTotals(cart);
}

function removeCartItem(session, medicineId) {
  const cart = getCartState(session);
  cart.items = cart.items.filter((item) => Number(item.medicine_id) !== Number(medicineId));
  return calculateCartTotals(cart);
}

function clearCart(session) {
  const cart = getCartState(session);
  cart.items = [];
  return calculateCartTotals(cart);
}

module.exports = {
  getCartSummary,
  addItemToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart
};
