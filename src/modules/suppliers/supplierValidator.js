function validateSupplierPayload(payload = {}) {
  const code = String(payload.code ?? '').trim().toUpperCase();
  const name = String(payload.name ?? '').trim();
  const phone = String(payload.phone ?? '').trim();
  const email = String(payload.email ?? '').trim();
  const address = String(payload.address ?? '').trim();
  const errors = {};
  const codePattern = /^[A-Z0-9-]{3,30}$/;
  const phonePattern = /^[0-9+]{8,15}$/;
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!code) {
    errors.code = 'Kode supplier wajib diisi.';
  } else if (!codePattern.test(code)) {
    errors.code = 'Kode supplier hanya boleh huruf kapital, angka, dan tanda hubung, panjang 3-30 karakter.';
  }

  if (!name) {
    errors.name = 'Nama supplier wajib diisi.';
  } else if (name.length < 3) {
    errors.name = 'Nama supplier minimal 3 karakter.';
  }

  if (phone && !phonePattern.test(phone)) {
    errors.phone = 'Nomor telepon hanya boleh angka atau tanda +, panjang 8-15 karakter.';
  }

  if (email && !emailPattern.test(email)) {
    errors.email = 'Format email supplier tidak valid.';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    value: {
      code,
      name,
      phone: phone || null,
      email: email || null,
      address: address || null,
      is_active: true
    }
  };
}

module.exports = {
  validateSupplierPayload
};
