const medicineService = require('./medicineService');
const { validateMedicinePayload } = require('./medicineValidator');
const {
  DONOR_MODULE_FORM_VIEW,
  DONOR_MODULE_VIEW,
  buildErrorSummary,
  buildListControls,
  filterItems,
  paginateItems,
  parseListParams,
  sortItems,
  hasAnyRole,
  buildDangerActions
} = require('../../shared/view-models/backofficeModulePresenter');

function buildMedicineFormValues(payload = {}) {
  return {
    sku: payload.sku || '',
    name: payload.name || '',
    brand_name: payload.brand_name || '',
    category_id: payload.category_id || '',
    supplier_id: payload.supplier_id || '',
    unit_price: payload.unit_price || '',
    minimum_stock_threshold: payload.minimum_stock_threshold ?? '0',
    dosage_form: payload.dosage_form || '',
    strength: payload.strength || '',
    composition: payload.composition || '',
    dosage: payload.dosage || '',
    side_effects: payload.side_effects || '',
    description: payload.description || '',
    image_path: payload.image_path || '',
    requires_prescription: payload.requires_prescription === true || payload.requires_prescription === 'true' || payload.requires_prescription === 'on'
  };
}

function buildMedicineFields(formValues, formErrors, options) {
  return [
    { name: 'sku', label: 'SKU', type: 'text', value: formValues.sku, error: formErrors.sku, required: true, placeholder: 'OBT-001' },
    { name: 'name', label: 'Nama Obat', type: 'text', value: formValues.name, error: formErrors.name, required: true, placeholder: 'Paracetamol 500 mg' },
    { name: 'brand_name', label: 'Merek', type: 'text', value: formValues.brand_name, error: formErrors.brand_name, placeholder: 'Nama merek obat' },
    {
      name: 'category_id',
      label: 'Kategori Obat',
      type: 'select',
      value: formValues.category_id,
      error: formErrors.category_id,
      required: true,
      options: [
        { value: '', label: 'Pilih kategori' },
        ...options.categories.map((category) => ({ value: category.id, label: category.name }))
      ]
    },
    {
      name: 'supplier_id',
      label: 'Supplier',
      type: 'select',
      value: formValues.supplier_id,
      error: formErrors.supplier_id,
      required: true,
      options: [
        { value: '', label: 'Pilih supplier' },
        ...options.suppliers.map((supplier) => ({ value: supplier.id, label: supplier.name }))
      ]
    },
    { name: 'unit_price', label: 'Harga Jual', type: 'number', value: formValues.unit_price, error: formErrors.unit_price, required: true, placeholder: '0' },
    { name: 'minimum_stock_threshold', label: 'Minimum Stok', type: 'number', value: formValues.minimum_stock_threshold, error: formErrors.minimum_stock_threshold, placeholder: '0' },
    { name: 'dosage_form', label: 'Bentuk Sediaan', type: 'text', value: formValues.dosage_form, error: formErrors.dosage_form, placeholder: 'Tablet, kapsul, sirup' },
    { name: 'strength', label: 'Kekuatan Dosis', type: 'text', value: formValues.strength, error: formErrors.strength, placeholder: '500 mg' },
    { name: 'medicine_image', label: 'Gambar Obat', type: 'file', error: formErrors.medicine_image, accept: 'image/*', helpText: 'Unggah gambar kemasan obat untuk katalog.' },
    { name: 'composition', label: 'Komposisi', type: 'textarea', value: formValues.composition, error: formErrors.composition, placeholder: 'Komposisi aktif obat' },
    { name: 'dosage', label: 'Aturan Pakai', type: 'textarea', value: formValues.dosage, error: formErrors.dosage, placeholder: 'Aturan pakai singkat' },
    { name: 'side_effects', label: 'Efek Samping', type: 'textarea', value: formValues.side_effects, error: formErrors.side_effects, placeholder: 'Efek samping yang perlu dicatat' },
    { name: 'description', label: 'Deskripsi', type: 'textarea', value: formValues.description, error: formErrors.description, placeholder: 'Deskripsi singkat produk' },
    {
      name: 'requires_prescription',
      label: 'Perlu Resep',
      type: 'select',
      value: formValues.requires_prescription ? 'true' : 'false',
      error: formErrors.requires_prescription,
      options: [
        { value: 'false', label: 'Tidak' },
        { value: 'true', label: 'Ya' }
      ]
    }
  ];
}

function buildMedicineTableRows(medicines, canManage = true) {
  return medicines.map((medicine) => {
    const actions = [
      { label: 'Detail', href: `/medicines/${medicine.id}`, variant: 'secondary' }
    ];

    if (canManage) {
      actions.push({
        label: 'Ubah',
        href: `/medicines/${medicine.id}/edit`,
        variant: 'secondary'
      });

      if (medicine.is_active) {
        actions.push({
          type: 'form',
          label: 'Nonaktifkan',
          action: `/medicines/${medicine.id}/deactivate`,
          variant: 'danger',
          confirmMessage: `Nonaktifkan obat ${medicine.name}?`
        });
      } else {
        actions.push({
          type: 'form',
          label: 'Aktifkan',
          action: `/medicines/${medicine.id}/activate`,
          variant: 'secondary',
          confirmMessage: `Aktifkan kembali obat ${medicine.name}?`
        });
        actions.push({
          type: 'form',
          label: 'Hapus',
          action: `/medicines/${medicine.id}/delete`,
          variant: 'danger',
          confirmMessage: `Hapus permanen obat ${medicine.name}? Aksi ini tidak bisa dibatalkan.`
        });
      }
    }

    return {
      cells: [
        medicine.image_path
          ? { type: 'image', src: medicine.image_path, alt: medicine.name }
          : { type: 'image-placeholder', label: medicine.name },
        medicine.sku,
        medicine.name,
        medicine.category_name || '-',
        medicine.supplier_name || '-',
        medicine.price_label,
        String(medicine.current_stock ?? 0),
        medicine.requires_prescription ? 'Resep' : 'Non-resep',
        medicine.is_active ? 'Aktif' : 'Nonaktif'
      ],
      actions
    };
  });
}

async function renderMedicineList(req, res, overrides = {}) {
  const [medicines, options] = await Promise.all([
    medicineService.listMedicines(),
    medicineService.listMedicineOptions()
  ]);

  const params = parseListParams(req.query, {
    defaultSort: 'name',
    defaultDirection: 'asc',
    defaultPerPage: 10
  });

  const filteredMedicines = filterItems(medicines, params.q, ['sku', 'name', 'brand_name', 'category_name', 'supplier_name']);
  const sortedMedicines = sortItems(filteredMedicines, params.sort, params.direction);
  const { items, pagination } = paginateItems(sortedMedicines, {
    basePath: '/medicines',
    page: params.page,
    perPage: params.perPage,
    params: {
      q: params.q,
      sort: params.sort,
      direction: params.direction
    }
  });

  const canManageMedicines = hasAnyRole(req.session?.user ?? null, ['Admin']);
  const tableRows = buildMedicineTableRows(items, canManageMedicines);

  return res.render(DONOR_MODULE_VIEW, {
    pageTitle: 'Data Obat',
    activePage: 'products',
    moduleSlug: 'medicines',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Kelola data obat, status resep, harga jual, dan ketersediaan stok.',
    dashboardPath: '/dashboard',
    createPath: canManageMedicines ? '/medicines/new' : null,
    createLabel: 'Tambah Obat',
    flashMessage: overrides.flashMessage ?? req.query.message ?? null,
    flashType: overrides.flashType ?? req.query.type ?? 'info',
    metrics: [
      { label: 'Total Obat', value: String(medicines.length) },
      { label: 'Kategori Aktif', value: String(options.categories.length) },
      { label: 'Supplier Aktif', value: String(options.suppliers.length) },
      { label: 'Perlu Resep', value: String(medicines.filter((medicine) => medicine.requires_prescription).length) }
    ],
    tableHeading: 'Daftar Obat',
    tableBadge: 'Master Data',
    listControls: buildListControls('/medicines', params, [
      { value: 'name', label: 'Nama obat' },
      { value: 'sku', label: 'SKU' },
      { value: 'unit_price', label: 'Harga jual' },
      { value: 'current_stock', label: 'Stok saat ini' },
      { value: 'category_name', label: 'Kategori' }
    ]),
    tableHeaders: ['Gambar', 'SKU', 'Nama', 'Kategori', 'Supplier', 'Harga', 'Stok', 'Resep', 'Status'],
    tableRows,
    hasActions: tableRows.some((row) => Array.isArray(row.actions) && row.actions.length > 0),
    emptyMessage: 'Belum ada data obat.',
    pagination
  });
}

async function renderMedicineForm(req, res, overrides = {}) {
  const options = await medicineService.listMedicineOptions();
  const formValues = buildMedicineFormValues(overrides.formValues);
  const formErrors = overrides.formErrors || {};

  return res.render(DONOR_MODULE_FORM_VIEW, {
    pageTitle: overrides.pageTitle ?? 'Tambah Obat',
    activePage: 'products',
    moduleSlug: 'medicines',
    listPath: '/medicines',
    dashboardPath: '/dashboard',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Masukkan data obat untuk katalog dan pengelolaan stok.',
    submitLabel: overrides.submitLabel ?? 'Simpan Obat',
    panelBadge: 'Form Obat',
    flashMessage: overrides.flashMessage ?? null,
    flashType: overrides.flashType ?? 'info',
    formErrors,
    errorSummary: buildErrorSummary(formErrors),
    formAction: overrides.formAction ?? '/medicines',
    formMethod: 'post',
    helperNotes: ['SKU unik', 'Harga jual wajib', 'Kategori dan supplier harus dipilih'],
    fields: buildMedicineFields(formValues, formErrors, options),
    imagePreviewSrc: formValues.image_path || '',
    formContext: null,
    dangerActions: overrides.dangerActions ?? []
  });
}

async function showMedicines(req, res) {
  return renderMedicineList(req, res);
}

async function showCreateMedicineForm(req, res) {
  return renderMedicineForm(req, res, {
    formValues: buildMedicineFormValues()
  });
}

async function createMedicine(req, res) {
  const validation = validateMedicinePayload({
    ...req.body,
    image_path: req.uploadedFiles?.medicine_image || null
  });

  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Obat',
      activePage: 'products',
      moduleSlug: 'medicines',
      listPath: '/medicines',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Masukkan data obat baru untuk katalog dan pengelolaan stok.',
      submitLabel: 'Simpan Obat',
      panelBadge: 'Form Obat',
      flashMessage: 'Validasi obat gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: '/medicines',
      formMethod: 'post',
      helperNotes: ['SKU unik', 'Harga jual wajib', 'Kategori dan supplier harus dipilih'],
      fields: buildMedicineFields(buildMedicineFormValues({
        ...req.body,
        image_path: req.uploadedFiles?.medicine_image || ''
      }), validation.errors, await medicineService.listMedicineOptions()),
      imagePreviewSrc: req.uploadedFiles?.medicine_image || '',
      formContext: null,
      dangerActions: []
    });
  }

  try {
    await medicineService.createMedicine(validation.value);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20ditambahkan');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = {
      ...(statusCode === 409 ? { sku: error.message } : {}),
      ...(statusCode === 422 && error.message.includes('Kategori') ? { category_id: error.message } : {}),
      ...(statusCode === 422 && error.message.includes('Supplier') ? { supplier_id: error.message } : {})
    };

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Obat',
      activePage: 'products',
      moduleSlug: 'medicines',
      listPath: '/medicines',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Masukkan data obat baru untuk katalog dan pengelolaan stok.',
      submitLabel: 'Simpan Obat',
      panelBadge: 'Form Obat',
      flashMessage: error.message || 'Gagal menambahkan obat.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: '/medicines',
      formMethod: 'post',
      helperNotes: ['SKU unik', 'Harga jual wajib', 'Kategori dan supplier harus dipilih'],
      fields: buildMedicineFields(buildMedicineFormValues({
        ...req.body,
        image_path: req.uploadedFiles?.medicine_image || ''
      }), formErrors, await medicineService.listMedicineOptions()),
      imagePreviewSrc: req.uploadedFiles?.medicine_image || '',
      formContext: null,
      dangerActions: []
    });
  }
}

async function showEditMedicineForm(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    const medicine = await medicineService.getMedicineById(id);
    return renderMedicineForm(req, res, {
      pageTitle: 'Ubah Obat',
      submitLabel: 'Update Obat',
      formAction: `/medicines/${id}`,
      formValues: medicine,
      dangerActions: buildDangerActions('medicines', id, medicine.is_active, medicine.name)
    });
  } catch (error) {
    return res.status(error.statusCode ?? 500).render('pages/error', {
      pageTitle: 'Obat Tidak Ditemukan',
      message: error.message || 'Terjadi kesalahan saat mencari data obat.'
    });
  }
}

async function updateMedicine(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'ID tidak valid' });
  }

  let medicine;
  try {
    medicine = await medicineService.getMedicineById(id);
  } catch (error) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'Obat tidak ditemukan' });
  }

  const payload = {
    ...req.body,
    image_path: req.uploadedFiles?.medicine_image || medicine.image_path || null
  };

  const validation = validateMedicinePayload(payload);
  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Obat',
      activePage: 'products',
      moduleSlug: 'medicines',
      listPath: '/medicines',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah data obat di sistem.',
      submitLabel: 'Update Obat',
      panelBadge: 'Form Obat',
      flashMessage: 'Validasi obat gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: `/medicines/${id}`,
      formMethod: 'post',
      helperNotes: ['SKU unik', 'Harga jual wajib', 'Kategori dan supplier harus dipilih'],
      fields: buildMedicineFields(buildMedicineFormValues(payload), validation.errors, await medicineService.listMedicineOptions()),
      imagePreviewSrc: payload.image_path || '',
      formContext: null,
      dangerActions: buildDangerActions('medicines', id, medicine.is_active, medicine.name)
    });
  }

  try {
    await medicineService.updateMedicine(id, validation.value);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20diperbarui');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = {
      ...(statusCode === 409 ? { sku: error.message } : {}),
      ...(statusCode === 422 && error.message.includes('Kategori') ? { category_id: error.message } : {}),
      ...(statusCode === 422 && error.message.includes('Supplier') ? { supplier_id: error.message } : {})
    };

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Obat',
      activePage: 'products',
      moduleSlug: 'medicines',
      listPath: '/medicines',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah data obat di sistem.',
      submitLabel: 'Update Obat',
      panelBadge: 'Form Obat',
      flashMessage: error.message || 'Gagal memperbarui obat.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: `/medicines/${id}`,
      formMethod: 'post',
      helperNotes: ['SKU unik', 'Harga jual wajib', 'Kategori dan supplier harus dipilih'],
      fields: buildMedicineFields(buildMedicineFormValues(payload), formErrors, await medicineService.listMedicineOptions()),
      imagePreviewSrc: payload.image_path || '',
      formContext: null,
      dangerActions: buildDangerActions('medicines', id, medicine.is_active, medicine.name)
    });
  }
}

async function deactivateMedicine(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await medicineService.deactivateMedicine(id);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20dinonaktifkan');
  } catch (error) {
    return res.redirect(`/medicines?type=danger&message=${encodeURIComponent(error.message)}`);
  }
}

async function activateMedicine(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await medicineService.activateMedicine(id);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20diaktifkan');
  } catch (error) {
    return res.redirect(`/medicines?type=danger&message=${encodeURIComponent(error.message)}`);
  }
}

async function deleteMedicine(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Obat Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await medicineService.deleteMedicine(id);
    return res.redirect('/medicines?type=success&message=Obat%20berhasil%20dihapus');
  } catch (error) {
    return res.redirect(`/medicines?type=danger&message=${encodeURIComponent(error.message)}`);
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
  showCreateMedicineForm,
  createMedicine,
  showEditMedicineForm,
  updateMedicine,
  deactivateMedicine,
  activateMedicine,
  deleteMedicine,
  showMedicineDetail
};
