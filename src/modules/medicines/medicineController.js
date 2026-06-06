const medicineService = require('./medicineService');
const { validateMedicinePayload } = require('./medicineValidator');

async function showMedicines(req, res) {
  const [medicines, options] = await Promise.all([
    medicineService.listMedicines(),
    medicineService.listMedicineOptions()
  ]);

  return res.render('pages/master-data/medicines/index', {
    pageTitle: 'Obat',
    medicines,
    categories: options.categories,
    suppliers: options.suppliers,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formValues: {
      sku: '',
      name: '',
      brand_name: '',
      category_id: '',
      supplier_id: '',
      unit_price: '',
      minimum_stock_threshold: '0',
      dosage_form: '',
      strength: '',
      composition: '',
      dosage: '',
      side_effects: '',
      description: '',
      image_path: '',
      requires_prescription: false
    },
    formErrors: {}
  });
}

async function createMedicine(req, res) {
  const validation = validateMedicinePayload({
    ...req.body,
    image_path: req.uploadedFiles?.medicine_image || null
  });

  if (!validation.valid) {
    const [medicines, options] = await Promise.all([
      medicineService.listMedicines(),
      medicineService.listMedicineOptions()
    ]);

    return res.status(422).render('pages/master-data/medicines/index', {
      pageTitle: 'Obat',
      medicines,
      categories: options.categories,
      suppliers: options.suppliers,
      flashMessage: 'Validasi obat gagal.',
      flashType: 'danger',
      formValues: {
        ...req.body,
        image_path: req.uploadedFiles?.medicine_image || '',
        requires_prescription: validation.value.requires_prescription
      },
      formErrors: validation.errors
    });
  }

  try {
    await medicineService.createMedicine(validation.value);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20ditambahkan');
  } catch (error) {
    const [medicines, options] = await Promise.all([
      medicineService.listMedicines(),
      medicineService.listMedicineOptions()
    ]);
    const statusCode = error.statusCode ?? 500;

    return res.status(statusCode).render('pages/master-data/medicines/index', {
      pageTitle: 'Obat',
      medicines,
      categories: options.categories,
      suppliers: options.suppliers,
      flashMessage: error.message || 'Gagal menambahkan obat.',
      flashType: 'danger',
      formValues: {
        ...req.body,
        image_path: req.uploadedFiles?.medicine_image || '',
        requires_prescription: validation.value.requires_prescription
      },
      formErrors: {
        ...(statusCode === 409 ? { sku: error.message } : {}),
        ...(statusCode === 422 && error.message.includes('Kategori') ? { category_id: error.message } : {}),
        ...(statusCode === 422 && error.message.includes('Supplier') ? { supplier_id: error.message } : {})
      }
    });
  }
}

async function showMedicineDetail(req, res) {
  try {
    const medicine = await medicineService.getMedicineDetail(req.params.medicineId);

    return res.render('pages/medicines/show', {
      pageTitle: medicine.name,
      medicine
    });
  } catch (error) {
    const statusCode = error.statusCode ?? 500;

    return res.status(statusCode).render('pages/error', {
      pageTitle: statusCode === 404 ? 'Produk Tidak Ditemukan' : 'Terjadi Kesalahan',
      message: error.message || 'Data obat tidak dapat ditampilkan.'
    });
  }
}

module.exports = {
  showMedicines,
  createMedicine,
  showMedicineDetail
};
