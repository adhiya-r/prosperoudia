const medicineService = require('../medicines/medicineService');
const env = require('../../config/env');

const FALLBACK_FEATURED_PRODUCTS = [
  {
    id: 1,
    sku: 'OBT-001',
    name: 'Paracetamol 500 mg',
    category: 'Obat Bebas',
    price: 12500,
    accent: 'mint',
    badge: 'Stok Banyak'
  },
  {
    id: 2,
    sku: 'OBT-002',
    name: 'Vitamin C 1000 mg',
    category: 'Vitamin & Suplemen',
    price: 28500,
    accent: 'sun',
    badge: 'Promo'
  },
  {
    id: 3,
    sku: 'OBT-003',
    name: 'Omeprazole 20 mg',
    category: 'Pencernaan',
    price: 32000,
    accent: 'violet',
    badge: 'Resep'
  },
  {
    id: 4,
    sku: 'OBT-004',
    name: 'Salep Antijamur',
    category: 'Perawatan Kulit',
    price: 23500,
    accent: 'rose',
    badge: 'Terlaris'
  },
  {
    id: 5,
    sku: 'OBT-005',
    name: 'Suplemen Zat Besi',
    category: 'Vitamin & Suplemen',
    price: 41000,
    accent: 'ocean',
    badge: 'For You'
  },
  {
    id: 6,
    sku: 'OBT-006',
    name: 'Oralit Sachet',
    category: 'Keluarga',
    price: 8500,
    accent: 'leaf',
    badge: 'Hemat'
  },
  {
    id: 7,
    sku: 'OBT-007',
    name: 'Minyak Telon Bayi',
    category: 'Ibu & Anak',
    price: 19500,
    accent: 'amber',
    badge: 'Favorit'
  },
  {
    id: 8,
    sku: 'OBT-008',
    name: 'Lotion Anti Nyamuk',
    category: 'Keluarga',
    price: 17500,
    accent: 'sky',
    badge: 'Siap Kirim'
  }
];

function formatCurrencyIDR(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value ?? 0));
}

function listFallbackFeaturedProducts(searchQuery = '') {
  const normalizedQuery = String(searchQuery ?? '').trim().toLowerCase();

  return FALLBACK_FEATURED_PRODUCTS
    .filter((product) => {
      if (!normalizedQuery) {
        return true;
      }

      return [
        product.name,
        product.category,
        product.sku
      ].some((field) => String(field).toLowerCase().includes(normalizedQuery));
    })
    .map((product) => ({
      ...product,
      description: 'Produk kesehatan siap ditampilkan di katalog.',
      price_label: formatCurrencyIDR(product.price)
    }));
}

async function listFeaturedProducts(searchQuery = '', options = {}) {
  if (env.NODE_ENV === 'test') {
    return listFallbackFeaturedProducts(searchQuery);
  }

  try {
    const medicines = await medicineService.listFeaturedMedicines(searchQuery, 12, options);

    if (medicines.length) {
      return medicines;
    }
  } catch (error) {
    console.error(error);
  }

  return listFallbackFeaturedProducts(searchQuery);
}

async function listCategoryHighlights() {
  if (env.NODE_ENV === 'test') {
    return [
      { code: 'VIT-SUPL', name: 'Vitamin & Suplemen' },
      { code: 'OBAT-BEBAS', name: 'Obat Bebas' },
      { code: 'OBAT-RESEP', name: 'Obat Resep' },
      { code: 'ALKES', name: 'Alat Kesehatan' }
    ];
  }

  try {
    const categories = await medicineService.listCategoryHighlights();

    if (categories.length) {
      return categories;
    }
  } catch (error) {
    console.error(error);
  }

  return [
    { code: 'VIT-SUPL', name: 'Vitamin & Suplemen' },
    { code: 'OBAT-BEBAS', name: 'Obat Bebas' },
    { code: 'OBAT-RESEP', name: 'Obat Resep' },
    { code: 'ALKES', name: 'Alat Kesehatan' }
  ];
}

function getCatalogSidebar() {
  return {
    title: 'Kategori Produk',
    sections: [
      {
        heading: 'Obat Resep',
        categoryCode: 'OBAT-RESEP',
        items: [
          { label: 'Semua Obat Resep', categoryCode: 'OBAT-RESEP' },
          { label: 'Hipertensi', search: 'candesartan amlodipine' },
          { label: 'Diabetes', search: 'metformin' },
          { label: 'Kolesterol', search: 'atorvastatin' }
        ]
      },
      {
        heading: 'Obat Bebas',
        categoryCode: 'OBAT-BEBAS',
        items: [
          { label: 'Semua Obat Bebas', categoryCode: 'OBAT-BEBAS' },
          { label: 'Batuk & Flu', search: 'batuk flu' },
          { label: 'Tenggorokan', search: 'degirol betadine' },
          { label: 'Antiseptik', search: 'betadine' }
        ]
      },
      {
        heading: 'Vitamin & Suplemen',
        categoryCode: 'VIT-SUPL',
        items: [
          { label: 'Semua Vitamin', categoryCode: 'VIT-SUPL' },
          { label: 'Daya Tahan Tubuh', search: 'imboost vitacimin' },
          { label: 'Saraf', search: 'neurobion' },
          { label: 'Penambah Darah', search: 'sangobion' }
        ]
      },
      {
        heading: 'Alat Kesehatan',
        categoryCode: 'ALKES',
        items: [
          { label: 'Semua Alat Kesehatan', categoryCode: 'ALKES' },
          { label: 'Termometer', search: 'thermometer' },
          { label: 'Test Kit', search: 'test kehamilan' },
          { label: 'Spuit', search: 'spuit' }
        ]
      }
    ]
  };
}

module.exports = {
  listFeaturedProducts,
  listCategoryHighlights,
  getCatalogSidebar
};
