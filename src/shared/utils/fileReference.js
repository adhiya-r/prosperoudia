function normalizeFileReference(value) {
  const normalized = String(value ?? '').trim();

  if (!normalized) {
    return '';
  }

  if (normalized.startsWith('/uploads/')) {
    return normalized;
  }

  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }

  return '';
}

function hasOpenableFileReference(value) {
  return Boolean(normalizeFileReference(value));
}

module.exports = {
  hasOpenableFileReference,
  normalizeFileReference
};
