const profileService = require('./profileService');
const profileRepository = require('./profileRepository');
const auditLogService = require('../audit-logs/auditLogService');
const { isCustomerUser } = require('../../shared/middlewares/authMiddleware');
const path = require('node:path');
const fs = require('node:fs');

function getProfilePath(req) {
  return isCustomerUser(req.session?.user) ? '/profil/edit' : '/profile';
}

function getProfileActions(req) {
  if (isCustomerUser(req.session?.user)) {
    return {
      account: '/profil/edit',
      password: '/profil/password',
      avatar: '/profil/avatar',
      deleteAvatar: '/profil/avatar/hapus'
    };
  }

  return {
    account: '/profile',
    password: '/profile/password',
    avatar: '/profile/avatar',
    deleteAvatar: '/profile/avatar/hapus'
  };
}

function renderProfilePage(req, res, data, statusCode = 200) {
  const internalUser = !isCustomerUser(req.session?.user);
  const view = internalUser ? 'pages/profile/backoffice-edit' : 'pages/profile/edit';

  return res.status(statusCode).render(view, {
    ...data,
    internalUser,
    profileActions: getProfileActions(req)
  });
}

async function showEditProfile(req, res) {
  const user = await profileService.getProfile(req.session.user.id);

  return renderProfilePage(req, res, {
    pageTitle: 'Profil Saya',
    user,
    formValues: {
      full_name: user.full_name,
      username: user.username,
      email: user.email,
      phone: user.phone ?? ''
    },
    formErrors: {},
    passwordErrors: {},
    flashMessage: String(req.query.error ?? req.query.success ?? '').trim() || null,
    flashType: req.query.error ? 'error' : 'success'
  });
}

async function updateProfile(req, res) {
  const result = await profileService.updateProfile(req.session.user.id, req.body);

  if (!result.ok) {
    const user = await profileService.getProfile(req.session.user.id);
    return renderProfilePage(req, res, {
      pageTitle: 'Profil Saya',
      user,
      formValues: {
        full_name: String(req.body?.full_name ?? '').trim(),
        username: String(req.body?.username ?? '').trim(),
        email: String(req.body?.email ?? '').trim(),
        phone: String(req.body?.phone ?? '').trim()
      },
      formErrors: result.validation?.errors ?? {},
      passwordErrors: {},
      flashMessage: 'Perbarui profil gagal. Periksa kembali isian di bawah.',
      flashType: 'error'
    }, 422);
  }

  // Update session agar nama dan email langsung berubah di navbar
  req.session.user = {
    ...req.session.user,
    full_name: result.user.full_name,
    username: result.user.username,
    email: result.user.email,
    phone: result.user.phone
  };

  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(req.session.user, req, {
      action: 'update_profile',
      entity_type: 'user',
      entity_id: req.session.user.id,
      new_value: {
        full_name: result.user.full_name,
        username: result.user.username,
        email: result.user.email
      }
    })
  );

  return res.redirect(`${getProfilePath(req)}?success=Profil+berhasil+diperbarui.`);
}

async function changePassword(req, res) {
  const result = await profileService.changePassword(req.session.user.id, req.body);

  if (!result.ok) {
    const user = await profileService.getProfile(req.session.user.id);
    return renderProfilePage(req, res, {
      pageTitle: 'Profil Saya',
      user,
      formValues: {
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        phone: user.phone ?? ''
      },
      formErrors: {},
      passwordErrors: result.errors ?? {},
      flashMessage: 'Gagal mengganti password.',
      flashType: 'error'
    }, 422);
  }

  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(req.session.user, req, {
      action: 'change_password',
      entity_type: 'user',
      entity_id: req.session.user.id
    })
  );

  return res.redirect(`${getProfilePath(req)}?success=Password+berhasil+diubah.`);
}

async function uploadAvatar(req, res) {
  const userId = req.session?.user?.id;
  if (!userId) return res.redirect('/login');

  if (!req.file) {
    return res.redirect(`${getProfilePath(req)}?error=Pilih+file+foto+JPEG%2C+PNG%2C+atau+WebP+terlebih+dahulu.`);
  }

  // Hapus avatar lama jika ada (bukan default)
  const currentUser = await profileRepository.findUserById(userId);
  if (currentUser?.avatar_url) {
    const oldPath = path.join(__dirname, '../../../public', currentUser.avatar_url);
    if (fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }

  const avatarUrl = `/uploads/avatars/${req.file.filename}`;
  await profileRepository.updateUserAvatar(userId, avatarUrl);

  // Update session
  req.session.user = { ...req.session.user, avatar_url: avatarUrl };

  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(req.session.user, req, {
      action: 'upload_avatar',
      entity_type: 'user',
      entity_id: userId,
      new_value: { avatar_url: avatarUrl }
    })
  );

  return res.redirect(`${getProfilePath(req)}?success=Foto+profil+berhasil+diperbarui.`);
}

async function deleteAvatar(req, res) {
  const userId = req.session?.user?.id;
  if (!userId) return res.redirect('/login');

  const currentUser = await profileRepository.findUserById(userId);
  if (currentUser?.avatar_url) {
    const filePath = path.join(__dirname, '../../../public', currentUser.avatar_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  await profileRepository.updateUserAvatar(userId, null);
  req.session.user = { ...req.session.user, avatar_url: null };

  await auditLogService.recordAuditLog(
    auditLogService.buildAuditPayload(req.session.user, req, {
      action: 'delete_avatar',
      entity_type: 'user',
      entity_id: userId,
      new_value: { avatar_url: null }
    })
  );

  return res.redirect(`${getProfilePath(req)}?success=Foto+profil+berhasil+dihapus.`);
}

module.exports = {
  showEditProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar
};
