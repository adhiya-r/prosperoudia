const importService = require('./importService');
const { validateImportFilePayload } = require('./importValidator');

async function showMedicineImports(req, res) {
  const jobs = await importService.listLatestMedicineImportJobs();

  return res.render('pages/system/imports/medicines', {
    pageTitle: 'Import Obat',
    jobs,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    formErrors: {}
  });
}

async function submitMedicineImport(req, res) {
  const uploadError = req.uploadError;

  if (uploadError) {
    const jobs = await importService.listLatestMedicineImportJobs();

    return res.status(422).render('pages/system/imports/medicines', {
      pageTitle: 'Import Obat',
      jobs,
      flashMessage: uploadError.message || 'File import tidak valid.',
      flashType: 'danger',
      formErrors: {
        import_file: uploadError.message || 'File import tidak valid.'
      }
    });
  }

  const validation = validateImportFilePayload({
    file_name: req.file?.originalname,
    file_path: req.file?.path,
    file_type: req.file?.originalname?.split('.').pop()
  });

  if (!validation.valid) {
    const jobs = await importService.listLatestMedicineImportJobs();

    return res.status(422).render('pages/system/imports/medicines', {
      pageTitle: 'Import Obat',
      jobs,
      flashMessage: 'Validasi file import gagal.',
      flashType: 'danger',
      formErrors: validation.errors
    });
  }

  try {
    const result = await importService.processMedicineImport({
      fileName: validation.value.file_name,
      filePath: validation.value.file_path,
      fileType: validation.value.file_type,
      createdBy: req.session.user.id
    });

    return res.redirect(
      `/system/imports/medicines?type=success&message=${encodeURIComponent(
        `Import selesai. ${result.successfulRows} baris berhasil, ${result.failedRows} gagal.`
      )}`
    );
  } catch (error) {
    const jobs = await importService.listLatestMedicineImportJobs();
    const statusCode = error.statusCode ?? 500;

    return res.status(statusCode).render('pages/system/imports/medicines', {
      pageTitle: 'Import Obat',
      jobs,
      flashMessage: error.message || 'Import obat gagal diproses.',
      flashType: 'danger',
      formErrors: {}
    });
  }
}

module.exports = {
  showMedicineImports,
  submitMedicineImport
};
