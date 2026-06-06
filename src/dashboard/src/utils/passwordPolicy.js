const MIN_LENGTH = 8;

function validatePasswordStrength(password) {
  const value = String(password ?? '');
  const issues = [];

  if (value.length < MIN_LENGTH) {
    issues.push(`minimal ${MIN_LENGTH} karakter`);
  }

  if (!/[a-z]/.test(value)) {
    issues.push('huruf kecil');
  }

  if (!/[A-Z]/.test(value)) {
    issues.push('huruf besar');
  }

  if (!/[0-9]/.test(value)) {
    issues.push('angka');
  }

  if (!/[^A-Za-z0-9]/.test(value)) {
    issues.push('simbol');
  }

  return {
    valid: issues.length === 0,
    issues,
    message: issues.length
      ? `Password harus mengandung ${issues.join(', ')}.`
      : null
  };
}

function assertStrongPassword(password) {
  const result = validatePasswordStrength(password);

  if (!result.valid) {
    const error = new Error(result.message || 'Password tidak memenuhi kebijakan keamanan');
    error.code = 'WEAK_PASSWORD';
    error.issues = result.issues;
    throw error;
  }

  return true;
}

module.exports = {
  MIN_LENGTH,
  validatePasswordStrength,
  assertStrongPassword
};
