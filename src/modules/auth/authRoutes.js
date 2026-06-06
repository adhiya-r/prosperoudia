const express = require('express');
const authController = require('./authController');
const { requireAuth, requireGuest } = require('../../shared/middlewares/authMiddleware');

const router = express.Router();

router.get('/login', requireGuest, authController.showLogin);
router.get('/register', requireGuest, authController.showRegister);
router.get('/daftar', requireGuest, authController.showRegister);
router.post('/login', requireGuest, authController.login);
router.post('/register', requireGuest, authController.register);
router.post('/logout', requireAuth, authController.logout);

router.get('/auth/google', requireGuest, authController.googleAuthStart);
router.get('/auth/google/callback', requireGuest, authController.googleAuthCallback);

module.exports = router;
