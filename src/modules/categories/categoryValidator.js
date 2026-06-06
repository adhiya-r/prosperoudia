function validateCategoryPayload(payload = {}) {
  const code = String(payload.code ?? '').trim().toUpperCase();
  const name = String(payload.name ?? '').trim();
  const description = String(payload.description ?? '').trim();
  const errors = {};
  const codePattern = /^[A-Z0-9-]{3,30}$/;

  if (!code) {
    errors.code = 'Kode kategori wajib diisi.';
  } else if (!codePattern.test(code)) {
    errors.code = 'Kode kategori hanya boleh huruf kapital, angka, dan tanda hubung, panjang 3-30 karakter.';
  }

  if (!name) {
    errors.name = 'Nama kategori wajib diisi.';
  } else if (name.length < 3) {
    errors.name = 'Nama kategori minimal 3 karakter.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      code,
      name,
      description: description || null,
      is_active: true
    }
  };
}

module.exports = {
  validateCategoryPayload
};
