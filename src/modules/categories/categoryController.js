const categoryService = require('./categoryService');
const { validateCategoryPayload } = require('./categoryValidator');
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
const database = require('../../config/database');

function buildCategoryFormValues(payload = {}) {
  return {
    code: payload.code || '',
    name: payload.name || '',
    description: payload.description || ''
  };
}

function buildCategoryFields(formValues, formErrors) {
  return [
    { name: 'code', label: 'Kode Kategori', type: 'text', value: formValues.code, error: formErrors.code, required: true, placeholder: 'VIT-001' },
    { name: 'name', label: 'Nama Kategori', type: 'text', value: formValues.name, error: formErrors.name, required: true, placeholder: 'Vitamin & Suplemen' },
    { name: 'description', label: 'Deskripsi', type: 'textarea', value: formValues.description, error: formErrors.description, placeholder: 'Keterangan singkat kategori obat' }
  ];
}

function buildCategoryRows(categories, canManage = true) {
  return categories.map((category) => ({
    cells: [
      category.code,
      category.name,
      category.description || '-',
      category.is_active ? 'Aktif' : 'Nonaktif'
    ],
    actions: buildActionButtons(
      'categories',
      category.id,
      category.is_active,
      category.name,
      {
        id: category.id,
        code: category.code,
        name: category.name,
        description: category.description ?? ''
      },
      { canManage }
    )
  }));
}

async function renderCategoryList(req, res, overrides = {}) {
  const categories = await categoryService.listCategories();
  const params = parseListParams(req.query, {
    defaultSort: 'name',
    defaultDirection: 'asc',
    defaultPerPage: 10
  });

  const filteredCategories = filterItems(categories, params.q, ['code', 'name', 'description']);
  const sortedCategories = sortItems(filteredCategories, params.sort, params.direction);
  const { items, pagination } = paginateItems(sortedCategories, {
    basePath: '/categories',
    page: params.page,
    perPage: params.perPage,
    params: {
      q: params.q,
      sort: params.sort,
      direction: params.direction
    }
  });

  const canManageCategories = hasAnyRole(req.session?.user ?? null, ['Admin']);
  const tableRows = buildCategoryRows(items, canManageCategories);

  return res.render(DONOR_MODULE_VIEW, {
    pageTitle: 'Kategori Obat',
    activePage: 'categories',
    moduleSlug: 'categories',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Kelola kategori obat yang dipakai di katalog dan master data.',
    dashboardPath: '/dashboard',
    createPath: canManageCategories ? '/categories/new' : null,
    createLabel: 'Tambah Kategori',
    flashMessage: overrides.flashMessage ?? req.query.message ?? null,
    flashType: overrides.flashType ?? req.query.type ?? 'info',
    metrics: [
      { label: 'Total Kategori', value: String(categories.length) },
      { label: 'Kategori - Aktif', value: String(categories.filter((category) => category.is_active).length) },
      { label: 'Kategori - Nonaktif', value: String(categories.filter((category) => !category.is_active).length) }
    ],
    tableHeading: 'Daftar Kategori Obat',
    tableBadge: 'Master Data',
    listControls: buildListControls('/categories', params, [
      { value: 'name', label: 'Nama kategori' },
      { value: 'code', label: 'Kode kategori' },
      { value: 'created_at', label: 'Tanggal dibuat' }
    ]),
    tableHeaders: ['Kode', 'Nama', 'Deskripsi', 'Status'],
    tableRows,
    hasActions: tableRows.some((row) => Array.isArray(row.actions) && row.actions.length > 0),
    emptyMessage: 'Belum ada kategori obat.',
    pagination,
    editModal: {
      title: 'Ubah Kategori',
      description: 'Ubah data kategori langsung dari popup tanpa pindah halaman.',
      submitLabel: 'Update Kategori',
      actionBase: '/categories',
      fields: [
        { name: 'code', label: 'Kode Kategori', type: 'text', required: true },
        { name: 'name', label: 'Nama Kategori', type: 'text', required: true },
        { name: 'description', label: 'Deskripsi', type: 'textarea', required: false }
      ]
    }
  });
}

async function renderCategoryForm(res, overrides = {}) {
  const formValues = buildCategoryFormValues(overrides.formValues);
  const formErrors = overrides.formErrors || {};

  return res.render(DONOR_MODULE_FORM_VIEW, {
    pageTitle: 'Tambah Kategori Obat',
    activePage: 'categories',
    moduleSlug: 'categories',
    listPath: '/categories',
    dashboardPath: '/dashboard',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Tambahkan kategori untuk pengelompokan obat di sistem.',
    submitLabel: 'Simpan Kategori',
    panelBadge: 'Form Kategori',
    flashMessage: overrides.flashMessage ?? null,
    flashType: overrides.flashType ?? 'info',
    formErrors,
    errorSummary: buildErrorSummary(formErrors),
    formAction: '/categories',
    formMethod: 'post',
    helperNotes: ['Kode kategori unik', 'Nama minimal 3 karakter'],
    fields: buildCategoryFields(formValues, formErrors),
    formContext: null,
    dangerActions: overrides.dangerActions ?? []
  });
}

async function showCategories(req, res) {
  return renderCategoryList(req, res);
}

async function showCreateCategoryForm(req, res) {
  return renderCategoryForm(res, {
    formValues: buildCategoryFormValues()
  });
}

async function createCategory(req, res) {
  const validation = validateCategoryPayload(req.body);

  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Kategori Obat',
      activePage: 'categories',
      moduleSlug: 'categories',
      listPath: '/categories',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Tambahkan kategori untuk pengelompokan obat di sistem.',
      submitLabel: 'Simpan Kategori',
      panelBadge: 'Form Kategori',
      flashMessage: 'Validasi kategori gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: '/categories',
      formMethod: 'post',
      helperNotes: ['Kode kategori unik', 'Nama minimal 3 karakter'],
      fields: buildCategoryFields(buildCategoryFormValues(req.body), validation.errors),
      formContext: null
    });
  }

  try {
    await categoryService.createCategory(validation.value);
    return res.redirect('/categories?type=success&message=Kategori%20berhasil%20ditambahkan');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = statusCode === 409 ? { code: error.message } : {};

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Tambah Kategori Obat',
      activePage: 'categories',
      moduleSlug: 'categories',
      listPath: '/categories',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Tambahkan kategori untuk pengelompokan obat di sistem.',
      submitLabel: 'Simpan Kategori',
      panelBadge: 'Form Kategori',
      flashMessage: error.message || 'Gagal menambahkan kategori.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: '/categories',
      formMethod: 'post',
      helperNotes: ['Kode kategori unik', 'Nama minimal 3 karakter'],
      fields: buildCategoryFields(buildCategoryFormValues(req.body), formErrors),
      formContext: null
    });
  }
}

async function showEditCategoryForm(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'ID tidak valid' });
  }

  const category = await categoryService.getCategoryById(id);
  if (!category) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'Kategori tidak ditemukan' });
  }

  return renderCategoryForm(res, {
    formValues: category,
    dangerActions: buildDangerActions('categories', id, category.is_active, category.name)
  });
}

async function updateCategory(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'ID tidak valid' });
  }

  const current = await categoryService.getCategoryById(id);
  if (!current) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'Kategori tidak ditemukan' });
  }

  const validation = validateCategoryPayload(req.body);
  if (!validation.valid) {
    return res.status(422).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Kategori Obat',
      activePage: 'categories',
      moduleSlug: 'categories',
      listPath: '/categories',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah kategori obat di sistem.',
      submitLabel: 'Update Kategori',
      panelBadge: 'Form Kategori',
      flashMessage: 'Validasi kategori gagal.',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: buildErrorSummary(validation.errors),
      formAction: `/categories/${id}`,
      formMethod: 'post',
      helperNotes: ['Kode kategori unik', 'Nama minimal 3 karakter'],
      fields: buildCategoryFields(buildCategoryFormValues(req.body), validation.errors),
      formContext: null,
      dangerActions: buildDangerActions('categories', id, current.is_active, current.name)
    });
  }

  try {
    const duplicateCode = await categoryService.getCategoryByCode(req.body.code);
    if (duplicateCode && Number(duplicateCode.id) !== id) {
      throw Object.assign(new Error('Kode kategori sudah digunakan oleh kategori lain.'), { statusCode: 409 });
    }

    await categoryService.updateCategory(id, validation.value);
    return res.redirect('/categories?type=success&message=Kategori%20berhasil%20diperbarui');
  } catch (error) {
    const statusCode = error.statusCode ?? 500;
    const formErrors = statusCode === 409 ? { code: error.message } : {};

    return res.status(statusCode).render(DONOR_MODULE_FORM_VIEW, {
      pageTitle: 'Ubah Kategori Obat',
      activePage: 'categories',
      moduleSlug: 'categories',
      listPath: '/categories',
      dashboardPath: '/dashboard',
      moduleStatus: 'Backoffice',
      moduleDescription: 'Ubah kategori obat di sistem.',
      submitLabel: 'Update Kategori',
      panelBadge: 'Form Kategori',
      flashMessage: error.message || 'Gagal memperbarui kategori.',
      flashType: 'danger',
      formErrors,
      errorSummary: buildErrorSummary(formErrors),
      formAction: `/categories/${id}`,
      formMethod: 'post',
      helperNotes: ['Kode kategori unik', 'Nama minimal 3 karakter'],
      fields: buildCategoryFields(buildCategoryFormValues(req.body), formErrors),
      formContext: null,
      dangerActions: buildDangerActions('categories', id, current.is_active, current.name)
    });
  }
}

async function deactivateCategory(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'ID tidak valid' });
  }

  await categoryService.deactivateCategory(id);
  return res.redirect('/categories?type=success&message=Kategori%20berhasil%20dinonaktifkan');
}

async function activateCategory(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'ID tidak valid' });
  }

  await categoryService.activateCategory(id);
  return res.redirect('/categories?type=success&message=Kategori%20berhasil%20diaktifkan');
}

async function deleteCategory(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!id) {
    return res.status(404).render('pages/error', { pageTitle: 'Kategori Tidak Ditemukan', message: 'ID tidak valid' });
  }

  const usage = await categoryService.getCategoryUsage(id);
  if (usage.products > 0) {
    return res.redirect('/categories?type=danger&message=Kategori%20tidak%20bisa%20dihapus%20karena%20masih%20memiliki%20obat%20aktif.');
  }

  await categoryService.deleteCategory(id);
  return res.redirect('/categories?type=success&message=Kategori%20berhasil%20dihapus');
}

module.exports = {
  showCategories,
  showCreateCategoryForm,
  createCategory,
  showEditCategoryForm,
  updateCategory,
  deactivateCategory,
  activateCategory,
  deleteCategory
};
