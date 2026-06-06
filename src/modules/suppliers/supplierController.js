const supplierService = require('./supplierService');
const { validateSupplierPayload } = require('./supplierValidator');
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
  buildActionButtons,
  buildDangerActions
} = require('../../shared/view-models/backofficeModulePresenter');

function buildSupplierFormValues(payload = {}) {
  return {
    code: payload.code || '',
    name: payload.name || '',
    phone: payload.phone || '',
    email: payload.email || '',
    address: payload.address || ''
  };
}

function buildSupplierFields(formValues, formErrors) {
  return [
    { name: 'code', label: 'Kode Supplier', type: 'text', value: formValues.code, error: formErrors.code, required: true, placeholder: 'SUP-001' },
    { name: 'name', label: 'Nama Supplier', type: 'text', value: formValues.name, error: formErrors.name, required: true, placeholder: 'PT Sumber Sehat' },
    { name: 'phone', label: 'Telepon', type: 'text', value: formValues.phone, error: formErrors.phone, placeholder: '081234567890' },
    { name: 'email', label: 'Email', type: 'email', value: formValues.email, error: formErrors.email, placeholder: 'supplier@contoh.com' },
    { name: 'address', label: 'Alamat', type: 'textarea', value: formValues.address, error: formErrors.address, placeholder: 'Alamat supplier' }
  ];
}

function buildSupplierRows(suppliers, canManage = true) {
  return suppliers.map((supplier) => ({
    cells: [
      supplier.code,
      supplier.name,
      supplier.phone || '-',
      supplier.email || '-',
      supplier.address || '-',
      supplier.is_active ? 'Aktif' : 'Nonaktif'
    ],
    actions: buildActionButtons(
      'suppliers',
      supplier.id,
      supplier.is_active,
      supplier.name,
      {
        id: supplier.id,
        code: supplier.code,
        name: supplier.name,
        phone: supplier.phone ?? '',
        email: supplier.email ?? '',
        address: supplier.address ?? ''
      },
      { canManage }
    )
  }));
}

async function renderSupplierList(req, res, overrides = {}) {
  const suppliers = await supplierService.listSuppliers();
  const params = parseListParams(req.query, {
    defaultSort: 'name',
    defaultDirection: 'asc',
    defaultPerPage: 10
  });

  const filteredSuppliers = filterItems(suppliers, params.q, ['code', 'name', 'phone', 'email', 'address']);
  const sortedSuppliers = sortItems(filteredSuppliers, params.sort, params.direction);
  const { items, pagination } = paginateItems(sortedSuppliers, {
    basePath: '/suppliers',
    page: params.page,
    perPage: params.perPage,
    params: {
      q: params.q,
      sort: params.sort,
      direction: params.direction
    }
  });

  const canManageSuppliers = hasAnyRole(req.session?.user ?? null, ['Admin']);
  const tableRows = buildSupplierRows(items, canManageSuppliers);

  return res.render(DONOR_MODULE_VIEW, {
    pageTitle: 'Supplier',
    activePage: 'suppliers',
    moduleSlug: 'suppliers',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Kelola pemasok obat dan alat kesehatan yang terdaftar di sistem.',
    dashboardPath: '/dashboard',
    createPath: canManageSuppliers ? '/suppliers/new' : null,
    createLabel: 'Tambah Supplier',
    flashMessage: overrides.flashMessage ?? req.query.message ?? null,
    flashType: overrides.flashType ?? req.query.type ?? 'info',
    metrics: [
      { label: 'Total Supplier', value: String(suppliers.length) },
      { label: 'Supplier Aktif', value: String(suppliers.filter((supplier) => supplier.is_active).length) },
      { label: 'Memiliki Email', value: String(suppliers.filter((supplier) => supplier.email).length) }
    ],
    tableHeading: 'Daftar Supplier',
    tableBadge: 'Master Data',
    listControls: buildListControls('/suppliers', params, [
      { value: 'name', label: 'Nama supplier' },
      { value: 'code', label: 'Kode supplier' },
      { value: 'created_at', label: 'Tanggal dibuat' }
    ]),
    tableHeaders: ['Kode', 'Nama', 'Telepon', 'Email', 'Alamat', 'Status'],
    tableRows,
    hasActions: tableRows.some((row) => Array.isArray(row.actions) && row.actions.length > 0),
    emptyMessage: 'Belum ada supplier.',
    pagination,
    editModal: {
      title: 'Ubah Supplier',
      description: 'Ubah data supplier langsung dari popup tanpa pindah halaman.',
      submitLabel: 'Update Supplier',
      actionBase: '/suppliers',
      fields: [
        { name: 'code', label: 'Kode Supplier', type: 'text', required: true },
        { name: 'name', label: 'Nama Supplier', type: 'text', required: true },
        { name: 'phone', label: 'Telepon', type: 'text', required: false },
        { name: 'email', label: 'Email', type: 'email', required: false },
        { name: 'address', label: 'Alamat', type: 'textarea', required: false }
      ]
    }
  });
}

async function renderSupplierForm(res, overrides = {}) {
  const formValues = buildSupplierFormValues(overrides.formValues);
  const formErrors = overrides.formErrors || {};

  return res.render(DONOR_MODULE_FORM_VIEW, {
    pageTitle: overrides.pageTitle ?? 'Tambah Supplier',
    activePage: 'suppliers',
    moduleSlug: 'suppliers',
    listPath: '/suppliers',
    dashboardPath: '/dashboard',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Tambahkan supplier baru untuk kebutuhan pengadaan obat.',
    submitLabel: overrides.submitLabel ?? 'Simpan Supplier',
    panelBadge: 'Form Supplier',
    flashMessage: overrides.flashMessage ?? null,
    flashType: overrides.flashType ?? 'info',
    formErrors,
    errorSummary: buildErrorSummary(formErrors),
    formAction: overrides.formAction ?? '/suppliers',
    formMethod: 'post',
    helperNotes: ['Kode supplier unik', 'Telepon dan email harus valid bila diisi'],
    fields: buildSupplierFields(formValues, formErrors),
    formContext: null,
    dangerActions: overrides.dangerActions ?? []
  });
}

async function showSuppliers(req, res) {
  return renderSupplierList(req, res);
}

async function showCreateSupplierForm(req, res) {
  return renderSupplierForm(res, {
    formValues: buildSupplierFormValues()
  });
}

async function createSupplier(req, res) {
  const validation = validateSupplierPayload(req.body);

  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Supplier',
      activePage: 'suppliers',
      moduleSlug: 'suppliers',
      listPath: '/suppliers',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Tambahkan supplier baru untuk kebutuhan pengadaan obat.',
      submitLabel: 'Simpan Supplier',
      panelBadge: 'Form Supplier',
      flashMessage: 'Validasi supplier gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: '/suppliers',
      formMethod: 'post',
      helperNotes: ['Kode supplier unik', 'Telepon dan email harus valid bila diisi'],
      fields: buildSupplierFields(buildSupplierFormValues(req.body), validation.errors),
      formContext: null
    });
  }

  try {
    await supplierService.createSupplier(validation.value);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20ditambahkan');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = statusCode === 409 ? { code: error.message } : {};

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Supplier',
      activePage: 'suppliers',
      moduleSlug: 'suppliers',
      listPath: '/suppliers',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Tambahkan supplier baru untuk kebutuhan pengadaan obat.',
      submitLabel: 'Simpan Supplier',
      panelBadge: 'Form Supplier',
      flashMessage: error.message || 'Gagal menambahkan supplier.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: '/suppliers',
      formMethod: 'post',
      helperNotes: ['Kode supplier unik', 'Telepon dan email harus valid bila diisi'],
      fields: buildSupplierFields(buildSupplierFormValues(req.body), formErrors),
      formContext: null
    });
  }
}

async function showEditSupplierForm(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    const supplier = await supplierService.getSupplierById(id);
    return renderSupplierForm(res, {
      pageTitle: 'Ubah Supplier',
      submitLabel: 'Update Supplier',
      formAction: `/suppliers/${id}`,
      formValues: supplier,
      dangerActions: buildDangerActions('suppliers', id, supplier.is_active, supplier.name)
    });
  } catch (error) {
    return res.status(error.statusCode ?? 500).render('pages/error', {
      pageTitle: 'Supplier Tidak Ditemukan',
      message: error.message || 'Terjadi kesalahan saat mencari supplier.'
    });
  }
}

async function updateSupplier(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'ID tidak valid' });
  }

  let supplier;
  try {
    supplier = await supplierService.getSupplierById(id);
  } catch (error) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'Supplier tidak ditemukan' });
  }

  const validation = validateSupplierPayload(req.body);
  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Supplier',
      activePage: 'suppliers',
      moduleSlug: 'suppliers',
      listPath: '/suppliers',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah supplier di sistem.',
      submitLabel: 'Update Supplier',
      panelBadge: 'Form Supplier',
      flashMessage: 'Validasi supplier gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: `/suppliers/${id}`,
      formMethod: 'post',
      helperNotes: ['Kode supplier unik', 'Telepon dan email harus valid bila diisi'],
      fields: buildSupplierFields(buildSupplierFormValues(req.body), validation.errors),
      formContext: null,
      dangerActions: buildDangerActions('suppliers', id, supplier.is_active, supplier.name)
    });
  }

  try {
    await supplierService.updateSupplier(id, validation.value);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20diperbarui');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = statusCode === 409 ? { code: error.message } : {};

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Supplier',
      activePage: 'suppliers',
      moduleSlug: 'suppliers',
      listPath: '/suppliers',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah supplier di sistem.',
      submitLabel: 'Update Supplier',
      panelBadge: 'Form Supplier',
      flashMessage: error.message || 'Gagal memperbarui supplier.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: `/suppliers/${id}`,
      formMethod: 'post',
      helperNotes: ['Kode supplier unik', 'Telepon dan email harus valid bila diisi'],
      fields: buildSupplierFields(buildSupplierFormValues(req.body), formErrors),
      formContext: null,
      dangerActions: buildDangerActions('suppliers', id, supplier.is_active, supplier.name)
    });
  }
}

async function deactivateSupplier(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await supplierService.deactivateSupplier(id);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20dinonaktifkan');
  } catch (error) {
    return res.redirect(`/suppliers?type=danger&message=${encodeURIComponent(error.message)}`);
  }
}

async function activateSupplier(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await supplierService.activateSupplier(id);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20diaktifkan');
  } catch (error) {
    return res.redirect(`/suppliers?type=danger&message=${encodeURIComponent(error.message)}`);
  }
}

async function deleteSupplier(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Supplier Tidak Ditemukan', message: 'ID tidak valid' });
  }

  try {
    await supplierService.deleteSupplier(id);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20dihapus');
  } catch (error) {
    return res.redirect(`/suppliers?type=danger&message=${encodeURIComponent(error.message)}`);
  }
}

module.exports = {
  showSuppliers,
  showCreateSupplierForm,
  createSupplier,
  showEditSupplierForm,
  updateSupplier,
  deactivateSupplier,
  activateSupplier,
  deleteSupplier
};
