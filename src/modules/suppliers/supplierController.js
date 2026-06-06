const supplierService = require('./supplierService');
const { validateSupplierPayload } = require('./supplierValidator');

async function showSuppliers(req, res) {
  const suppliers = await supplierService.listSuppliers();

  return res.render('pages/master-data/suppliers/index', {
    pageTitle: 'Supplier',
    suppliers,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formValues: {
      code: '',
      name: '',
      phone: '',
      email: '',
      address: ''
    },
    formErrors: {}
  });
}

async function createSupplier(req, res) {
  const validation = validateSupplierPayload(req.body);

  if (!validation.valid) {
    const suppliers = await supplierService.listSuppliers();

    return res.status(422).render('pages/master-data/suppliers/index', {
      pageTitle: 'Supplier',
      suppliers,
      flashMessage: 'Validasi supplier gagal.',
      flashType: 'danger',
      formValues: req.body,
      formErrors: validation.errors
    });
  }

  try {
    await supplierService.createSupplier(validation.value);
    return res.redirect('/suppliers?type=success&message=Supplier%20berhasil%20ditambahkan');
  } catch (error) {
    const suppliers = await supplierService.listSuppliers();
    const statusCode = error.statusCode ?? 500;

    return res.status(statusCode).render('pages/master-data/suppliers/index', {
      pageTitle: 'Supplier',
      suppliers,
      flashMessage: error.message || 'Gagal menambahkan supplier.',
      flashType: 'danger',
      formValues: req.body,
      formErrors: statusCode === 409 ? { code: error.message } : {}
    });
  }
}

module.exports = {
  showSuppliers,
  createSupplier
};
