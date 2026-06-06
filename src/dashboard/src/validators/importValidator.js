function normalizeString(value) {
  if (value === undefined || value === null) {
    return '';
  }

  return String(value).trim();
}

function validateImportFilePayload(payload) {
  const errors = {};
  const fileName = normalizeString(payload?.file_name);
  const filePath = normalizeString(payload?.file_path);
  const fileType = normalizeString(payload?.file_type).toLowerCase();

  if (!fileName) {
    errors.import_file = 'File import wajib dipilih';
  }

  if (!filePath) {
    errors.import_file = 'File import tidak valid';
  }

  if (!['csv', 'xlsx'].includes(fileType)) {
    errors.import_file = 'File import harus berupa CSV atau XLSX';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      file_name: fileName,
      file_path: filePath,
      file_type: fileType
    }
  };
}

module.exports = {
  validateImportFilePayload
};
