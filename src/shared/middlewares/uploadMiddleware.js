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

const paymentProofUpload = multer({
  storage: createStorage('payment-proofs'),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: createFileFilter(
    ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    'File bukti pembayaran harus berformat JPG, PNG, WEBP, atau PDF.'
  )
});

const checkoutUpload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      try {
        if (file.fieldname === 'prescription_image') {
          return callback(null, ensureDirectory('prescriptions'));
        }

        if (file.fieldname === 'payment_proof') {
          return callback(null, ensureDirectory('payment-proofs'));
        }

        return callback(new Error('Field upload checkout tidak dikenali.'));
      } catch (error) {
        return callback(error);
      }
    },
    filename(req, file, callback) {
      const filename = buildFileName(file);
      req.uploadedFiles = req.uploadedFiles || {};
      const relativePath = file.fieldname === 'payment_proof' ? 'payment-proofs' : 'prescriptions';
      req.uploadedFiles[file.fieldname] = `/uploads/${relativePath}/${filename}`;
      callback(null, filename);
    }
  }),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(req, file, callback) {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (!allowedTypes.includes(file.mimetype)) {
      const error = new Error(
        file.fieldname === 'payment_proof'
          ? 'File bukti pembayaran harus berformat JPG, PNG, WEBP, atau PDF.'
          : 'File resep harus berformat JPG, PNG, WEBP, atau PDF.'
      );
      error.statusCode = 422;
      return callback(error);
    }

    return callback(null, true);
  }
});

module.exports = {
  checkoutUpload,
  importFileUpload,
  medicineImageUpload,
  paymentProofUpload,
  prescriptionUpload
};
