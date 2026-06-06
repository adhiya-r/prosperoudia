const fs = require('fs');
const path = require('path');
const multer = require('multer');
const env = require('../config/env');

const projectRoot = path.join(__dirname, '..', '..');
const productsUploadDir = path.resolve(projectRoot, env.UPLOAD_DIR, 'products');
const importsUploadDir = path.resolve(projectRoot, env.UPLOAD_DIR, 'imports');
const PRODUCT_IMAGE_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const PRODUCT_IMAGE_MAX_SIZE_MB = 2;
const IMPORT_FILE_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const IMPORT_FILE_MAX_SIZE_MB = 5;

fs.mkdirSync(productsUploadDir, { recursive: true });
fs.mkdirSync(importsUploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, productsUploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = extension || '.jpg';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `product-${uniqueSuffix}${safeExtension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: PRODUCT_IMAGE_MAX_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    if (!String(file.mimetype || '').startsWith('image/')) {
      const error = new Error('File harus berupa gambar');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    }

    return cb(null, true);
  }
});

function uploadProductImage(req, res, next) {
  upload.single('product_image')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        error.message = `Ukuran gambar maksimal ${PRODUCT_IMAGE_MAX_SIZE_MB} MB`;
      }

      req.uploadError = error;
    }

    next();
  });
}

const importStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, importsUploadDir);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || '').toLowerCase();
    const safeExtension = extension || '.csv';
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `import-${uniqueSuffix}${safeExtension}`);
  }
});

const importUpload = multer({
  storage: importStorage,
  limits: {
    fileSize: IMPORT_FILE_MAX_SIZE_BYTES
  },
  fileFilter: (req, file, cb) => {
    const mimeType = String(file.mimetype || '').toLowerCase();
    const extension = path.extname(file.originalname || '').toLowerCase();
    const isCsvMime = ['text/csv', 'application/csv', 'application/vnd.ms-excel'].includes(mimeType);
    const isXlsxMime = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ].includes(mimeType);
    const hasSupportedExtension = ['.csv', '.xlsx'].includes(extension);

    if ((!isCsvMime && !isXlsxMime) && !hasSupportedExtension) {
      const error = new Error('File import harus CSV atau XLSX');
      error.code = 'INVALID_FILE_TYPE';
      return cb(error);
    }

    return cb(null, true);
  }
});

function uploadImportFile(req, res, next) {
  importUpload.single('import_file')(req, res, (error) => {
    if (error) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        error.message = `Ukuran file import maksimal ${IMPORT_FILE_MAX_SIZE_MB} MB`;
      }

      req.uploadError = error;
    }

    next();
  });
}

module.exports = {
  uploadProductImage,
  uploadImportFile,
  PRODUCT_IMAGE_MAX_SIZE_MB,
  IMPORT_FILE_MAX_SIZE_MB
};
