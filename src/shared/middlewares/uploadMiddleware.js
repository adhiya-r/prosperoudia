const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const multer = require('multer');

const PUBLIC_DIR = path.join(__dirname, '..', '..', '..', 'public');
const UPLOAD_DIR = path.join(PUBLIC_DIR, 'uploads');

function ensureDirectory(relativePath) {
  const directory = path.join(UPLOAD_DIR, relativePath);
  fs.mkdirSync(directory, { recursive: true });
  return directory;
}

function buildFileName(file) {
  const extension = path.extname(file.originalname || '').toLowerCase();
  const baseName = path
    .basename(file.originalname || 'upload', extension)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .slice(0, 40) || 'upload';

  return `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${baseName}${extension}`;
}

function createStorage(relativePath) {
  return multer.diskStorage({
    destination(req, file, callback) {
      try {
        callback(null, ensureDirectory(relativePath));
      } catch (error) {
        callback(error);
      }
    },
    filename(req, file, callback) {
      const filename = buildFileName(file);
      req.uploadedFiles = req.uploadedFiles || {};
      req.uploadedFiles[file.fieldname] = `/uploads/${relativePath}/${filename}`;
      callback(null, filename);
    }
  });
}

function createFileFilter(allowedMimeTypes, message) {
  return function fileFilter(req, file, callback) {
    if (!allowedMimeTypes.includes(file.mimetype)) {
      const error = new Error(message);
      error.statusCode = 422;
      return callback(error);
    }

    return callback(null, true);
  };
}

const medicineImageUpload = multer({
  storage: createStorage('medicines'),
  limits: {
    fileSize: 2 * 1024 * 1024
  },
  fileFilter: createFileFilter(
    ['image/jpeg', 'image/png', 'image/webp'],
    'File gambar obat harus berformat JPG, PNG, atau WEBP.'
  )
});

const importFileUpload = multer({
  storage: createStorage('imports'),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: createFileFilter(
    [
      'text/csv',
      'text/plain',
      'application/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ],
    'File import harus berformat CSV atau XLSX.'
  )
});

const prescriptionUpload = multer({
  storage: createStorage('prescriptions'),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: createFileFilter(
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    'File resep harus berformat JPG, PNG, WEBP, atau PDF.'
  )
});

module.exports = {
  importFileUpload,
  medicineImageUpload,
  prescriptionUpload
};
