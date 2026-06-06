const express = require('express');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const profileController = require('./profileController');
const { requireAuth } = require('../../shared/middlewares/authMiddleware');

const router = express.Router();

// Multer: simpan ke public/uploads/avatars/
const storage = multer.diskStorage({
  destination(req, file, cb) {
    const destination = path.join(__dirname, '../../../public/uploads/avatars');
    fs.mkdirSync(destination, { recursive: true });
    cb(null, destination);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `avatar-${req.session?.user?.id ?? 'u'}-${Date.now()}${ext}`;
    cb(null, uniqueName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  cb(null, allowed.includes(file.mimetype));
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // max 2MB
});

router.get('/profil/edit', requireAuth, profileController.showEditProfile);
router.post('/profil/edit', requireAuth, profileController.updateProfile);
router.post('/profil/password', requireAuth, profileController.changePassword);
router.post('/profil/avatar', requireAuth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/profil/avatar/hapus', requireAuth, profileController.deleteAvatar);
router.get('/profile', requireAuth, profileController.showEditProfile);
router.post('/profile', requireAuth, profileController.updateProfile);
router.post('/profile/password', requireAuth, profileController.changePassword);
router.post('/profile/avatar', requireAuth, upload.single('avatar'), profileController.uploadAvatar);
router.post('/profile/avatar/hapus', requireAuth, profileController.deleteAvatar);

module.exports = router;
