const categoryService = require('./categoryService');
const { validateCategoryPayload } = require('./categoryValidator');

async function showCategories(req, res) {
  const categories = await categoryService.listCategories();

  return res.render('pages/master-data/categories/index', {
    pageTitle: 'Kategori Obat',
    categories,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formValues: {
      code: '',
      name: '',
      description: ''
    },
    formErrors: {}
  });
}

async function createCategory(req, res) {
  const validation = validateCategoryPayload(req.body);

  if (!validation.valid) {
    const categories = await categoryService.listCategories();

    return res.status(422).render('pages/master-data/categories/index', {
      pageTitle: 'Kategori Obat',
      categories,
      flashMessage: 'Validasi kategori gagal.',
      flashType: 'danger',
      formValues: req.body,
      formErrors: validation.errors
    });
  }

  try {
    await categoryService.createCategory(validation.value);
    return res.redirect('/categories?type=success&message=Kategori%20berhasil%20ditambahkan');
  } catch (error) {
    const categories = await categoryService.listCategories();
    const statusCode = error.statusCode ?? 500;

    return res.status(statusCode).render('pages/master-data/categories/index', {
      pageTitle: 'Kategori Obat',
      categories,
      flashMessage: error.message || 'Gagal menambahkan kategori.',
      flashType: 'danger',
      formValues: req.body,
      formErrors: statusCode === 409 ? { code: error.message } : {}
    });
  }
}

module.exports = {
  showCategories,
  createCategory
};
