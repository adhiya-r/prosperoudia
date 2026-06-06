const categoryRepository = require('../categories/categoryRepository');
const supplierRepository = require('../suppliers/supplierRepository');
const medicineRepository = require('./medicineRepository');

const FALLBACK_MEDICINE_DETAILS = [
  {
    id: 1,
    sku: 'OBT-001',
    name: 'Paracetamol 500 mg',
    brand_name: 'Produk Demo',
    category_name: 'Obat Bebas',
    supplier_name: 'Supplier Demo',
    description: 'Obat penurun demam dan pereda nyeri ringan.',
    composition: 'Paracetamol 500 mg',
    dosage: 'Gunakan sesuai aturan pakai pada kemasan atau arahan tenaga kesehatan.',
    dosage_form: 'Tablet',
    strength: '500 mg',
    side_effects: 'Efek samping belum diisi pada data demo.',
    unit_price: 12500,
    requires_prescription: false,
    is_active: true
  },
  {
    id: 2,
    sku: 'OBT-002',
    name: 'Vitamin C 1000 mg',
    brand_name: 'Produk Demo',
    category_name: 'Vitamin & Suplemen',
    supplier_name: 'Supplier Demo',
    description: 'Suplemen vitamin C untuk kebutuhan harian.',
    composition: 'Vitamin C 1000 mg',
    dosage: '1 kali sehari setelah makan.',
    dosage_form: 'Tablet',
    strength: '1000 mg',
    side_effects: 'Efek samping belum diisi pada data demo.',
    unit_price: 28500,
    requires_prescription: false,
    is_active: true
  },
  {
    id: 3,
    sku: 'OBT-003',
    name: 'Omeprazole 20 mg',
    brand_name: 'Produk Demo',
    category_name: 'Pencernaan',
    supplier_name: 'Supplier Demo',
    description: 'Obat lambung yang memerlukan perhatian penggunaan.',
    composition: 'Omeprazole 20 mg',
    dosage: 'Sesuai arahan dokter atau apoteker.',
    dosage_form: 'Kapsul',
    strength: '20 mg',
    side_effects: 'Efek samping belum diisi pada data demo.',
    unit_price: 32000,
    requires_prescription: true,
    is_active: true
  }
];

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function buildMedicineCard(medicine) {
  const accentPool = ['mint', 'sun', 'ocean', 'leaf', 'rose', 'sky', 'amber', 'violet'];
  const accent = accentPool[(Number(medicine.id) || 0) % accentPool.length];

  return {
    id: medicine.id,
    sku: medicine.sku,
    name: medicine.name,
    category: medicine.category_name,
    accent,
    badge: medicine.requires_prescription ? 'Resep' : 'Tersedia',
    description: medicine.description || 'Produk kesehatan siap ditampilkan di katalog.',
    composition: medicine.composition || null,
    dosage: medicine.dosage || null,
    dosage_form: medicine.dosage_form || null,
    strength: medicine.strength || null,
    side_effects: medicine.side_effects || null,
    image_path: medicine.image_path || null,
    current_stock: Number(medicine.current_stock ?? 0),
    requires_prescription: Boolean(medicine.requires_prescription),
    price_label: formatCurrencyIDR(medicine.unit_price)
  };
}

async function listMedicines() {
  const medicines = await medicineRepository.listMedicines();

  return medicines.map((medicine) => ({
    ...medicine,
    image_path: medicine.image_path || null,
    current_stock: Number(medicine.current_stock ?? 0),
    price_label: formatCurrencyIDR(medicine.unit_price)
  }));
}

async function listMedicineOptions() {
  const [categories, suppliers] = await Promise.all([
    categoryRepository.listCategories(),
    supplierRepository.listSuppliers()
  ]);

  return {
    categories: categories.filter((category) => category.is_active),
    suppliers: suppliers.filter((supplier) => supplier.is_active)
  };
}

async function createMedicine(payload) {
  const [existingMedicine, categoryOptions, supplierOptions] = await Promise.all([
    medicineRepository.findBySku(payload.sku),
    categoryRepository.listCategories(),
    supplierRepository.listSuppliers()
  ]);

  if (existingMedicine) {
    const error = new Error('SKU obat sudah digunakan.');
    error.statusCode = 409;
    throw error;
  }

  const categoryExists = categoryOptions.some((category) => Number(category.id) === Number(payload.category_id));
  if (!categoryExists) {
    const error = new Error('Kategori obat tidak ditemukan.');
    error.statusCode = 422;
    throw error;
  }

  const supplierExists = supplierOptions.some((supplier) => Number(supplier.id) === Number(payload.supplier_id));
  if (!supplierExists) {
    const error = new Error('Supplier obat tidak ditemukan.');
    error.statusCode = 422;
    throw error;
  }

  return medicineRepository.createMedicine(payload);
}

async function listFeaturedMedicines(searchQuery = '', limit = 12, options = {}) {
  const medicines = await medicineRepository.listPublicMedicines(searchQuery, limit, options);
  return medicines.map(buildMedicineCard);
}

async function listCategoryHighlights() {
  const categories = await categoryRepository.listCategories();
  return categories
    .filter((category) => category.is_active)
    .slice(0, 4)
    .map((category) => ({
      code: category.code,
      name: category.name
    }));
}

function scoreSuggestionCandidate(candidate, query) {
  const normalizedQuery = String(query ?? '').trim().toLowerCase();
  const haystack = [
    candidate.name,
    candidate.brand_name,
    candidate.sku,
    candidate.category_name
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (!normalizedQuery) {
    return 1;
  }

  if (String(candidate.name).toLowerCase().startsWith(normalizedQuery)) {
    return 100;
  }

  if (haystack.includes(normalizedQuery)) {
    return 75;
  }

  const queryParts = normalizedQuery.split(/\s+/).filter(Boolean);
  const matchedParts = queryParts.filter((part) => haystack.includes(part));
  return matchedParts.length * 20;
}

async function listSearchSuggestions(searchQuery = '') {
  const normalizedQuery = String(searchQuery ?? '').trim();
  const rawSuggestions = await medicineRepository.listSearchSuggestions(normalizedQuery, normalizedQuery ? 10 : 5);

  return rawSuggestions
    .map((item) => ({
      id: item.id,
      name: item.name,
      category_name: item.category_name,
      image_path: item.image_path || null,
      badge: item.requires_prescription ? 'Resep' : (item.dosage_form || 'Produk'),
      score: scoreSuggestionCandidate(item, normalizedQuery)
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name))
    .slice(0, 5);
}

async function getMedicineDetail(id) {
  const medicine = await medicineRepository.findById(id);

  if (!medicine) {
    const fallbackMedicine = FALLBACK_MEDICINE_DETAILS.find((item) => Number(item.id) === Number(id));

    if (fallbackMedicine) {
      return {
        ...fallbackMedicine,
        image_path: fallbackMedicine.image_path || null,
        current_stock: 0,
        price_label: formatCurrencyIDR(fallbackMedicine.unit_price)
      };
    }
  }

  if (!medicine || !medicine.is_active) {
    const error = new Error('Produk obat tidak ditemukan.');
    error.statusCode = 404;
    throw error;
  }

  return {
    ...medicine,
    image_path: medicine.image_path || null,
    current_stock: Number(medicine.current_stock ?? 0),
    price_label: formatCurrencyIDR(medicine.unit_price)
  };
}

module.exports = {
  listMedicines,
  listMedicineOptions,
  createMedicine,
  listFeaturedMedicines,
  listCategoryHighlights,
  listSearchSuggestions,
  getMedicineDetail
};
