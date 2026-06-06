const database = require('../config/database');
const userRepository = require('../repositories/userRepository');
const roleRepository = require('../repositories/roleRepository');
const warehouseService = require('../services/warehouseService');
const auditLogService = require('../services/auditLogService');
const { hashPassword } = require('../utils/password');
const { assertStrongPassword } = require('../utils/passwordPolicy');
const {
  validateCreateUserPayload,
  validateAdminUserUpdatePayload
} = require('../validators/userValidator');

function renderModulePage(res, config) {
  return res.render('pages/module', {
    pageTitle: config.pageTitle,
    moduleSlug: config.moduleSlug,
    moduleTitle: config.moduleTitle,
    moduleDescription: config.moduleDescription,
    moduleStatus: config.moduleStatus,
    metrics: config.metrics,
    noteItems: config.noteItems,
    tableHeaders: config.tableHeaders,
    tableRows: config.tableRows,
    hasActions: config.hasActions ?? false,
    createPath: config.createPath ?? null,
    emptyMessage: config.emptyMessage,
    flashMessage: config.flashMessage ?? null,
    flashType: config.flashType ?? 'info',
    moduleNote: config.moduleNote ?? 'Halaman ini sudah membaca data nyata.',
    stateLabel: config.stateLabel ?? 'Aktif',
    stateNote: config.stateNote ?? 'Siap digunakan.',
    quickActionNote: config.quickActionNote ?? 'User management aktif.',
    notesBadge: config.notesBadge ?? 'Overview',
    tableHeading: config.tableHeading ?? 'Data Table',
    tableBadge: config.tableBadge ?? 'Records',
    createLabel: config.createLabel ?? 'Tambah Baru',
    editModal: config.editModal ?? null,
    autoOpenEditModalPayload: config.autoOpenEditModalPayload ?? null
  });
}

function renderFormPage(res, config) {
  return res.render('pages/module-form', {
    pageTitle: config.pageTitle,
    moduleSlug: config.moduleSlug,
    moduleTitle: config.moduleTitle,
    moduleDescription: config.moduleDescription,
    moduleStatus: config.moduleStatus,
    formMode: config.formMode,
    formAction: config.formAction,
    formMethod: config.formMethod,
    submitLabel: config.submitLabel,
    fields: config.fields,
    helperNotes: config.helperNotes,
    flashMessage: config.flashMessage ?? null,
    flashType: config.flashType ?? 'info',
    formErrors: config.formErrors ?? {},
    errorSummary: config.errorSummary ?? [],
    formStatusNote: config.formStatusNote ?? 'Validation dasar sudah aktif.',
    heroStatusNote: config.heroStatusNote ?? 'Form ini terhubung ke flow data.',
    panelBadge: config.panelBadge ?? 'Aktif'
  });
}

function withFieldErrors(fields, errors = {}) {
  return fields.map((field) => ({
    ...field,
    error: errors[field.name] ?? null
  }));
}

function mapOptions(records, labelGetter) {
  return records.map((record) => ({
    value: String(record.id),
    label: labelGetter(record)
  }));
}

function getErrorSummary(errors = {}) {
  return Object.values(errors).filter(Boolean);
}

function getFlash(req) {
  return {
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info'
  };
}

function buildUserActions(user) {
  const actions = [];

  actions.push({
    type: 'modal',
    label: 'Edit',
    variant: 'secondary',
    payload: {
      title: 'Edit User',
      description: 'Ubah data akun, role, status aktif, dan password opsional dari modal ini.',
      submitLabel: 'Update User',
      action: `/users/${user.id}`,
      full_name: user.full_name ?? '',
      username: user.username ?? '',
      email: user.email ?? '',
      role_id: String(user.role_id ?? ''),
      assigned_warehouse_id: String(user.assigned_warehouse_id ?? ''),
      is_active: user.is_active ? 'true' : 'false',
      new_password: '',
      password_confirmation: ''
    }
  });

  if (user.is_active) {
    actions.push({
      type: 'form',
      label: 'Nonaktifkan',
      action: `/users/${user.id}/deactivate`,
      variant: 'danger',
      confirmMessage: `Nonaktifkan akun ${user.full_name} ini?`
    });
  } else {
    actions.push({
      type: 'form',
      label: 'Aktifkan',
      action: `/users/${user.id}/activate`,
      variant: 'secondary',
      confirmMessage: `Aktifkan kembali akun ${user.full_name} ini?`
    });
    actions.push({
      type: 'form',
      label: 'Hapus',
      action: `/users/${user.id}/delete`,
      variant: 'danger',
      confirmMessage: `Hapus permanen akun ${user.full_name} ini?`
    });
  }

  return actions;
}

async function getUserFormDependencies() {
  const [roles, warehouses] = await Promise.all([
    roleRepository.listRoles(),
    warehouseService.listWarehouses({ includeInactive: false })
  ]);

  return { roles, warehouses };
}

function buildUserFields(roles, warehouses, values = {}, errors = {}) {
  return withFieldErrors(
    [
      { name: 'full_name', label: 'Full Name', type: 'text', placeholder: 'Nama lengkap user', required: true, value: values.full_name ?? '' },
      { name: 'username', label: 'Username', type: 'text', placeholder: 'username_login', required: true, value: values.username ?? '' },
      { name: 'email', label: 'Email', type: 'email', placeholder: 'Opsional untuk sekarang', required: false, value: values.email ?? '' },
      { name: 'password', label: 'Password', type: 'password', placeholder: 'Password kuat', required: true, value: '' },
      {
        name: 'role_id',
        label: 'Role',
        type: 'select',
        options: [{ value: '', label: 'Select role' }, ...mapOptions(roles, (role) => role.display_name)],
        required: true,
        value: String(values.role_id ?? '')
      },
      {
        name: 'assigned_warehouse_id',
        label: 'Assigned Warehouse',
        type: 'select',
        options: [{ value: '', label: 'No warehouse scope' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
        required: false,
        value: String(values.assigned_warehouse_id ?? '')
      }
    ],
    errors
  );
}

function buildUserEditModalFields(roles, warehouses) {
  return [
    { name: 'full_name', label: 'Full Name', type: 'text', required: true },
    { name: 'username', label: 'Username', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'email', required: false },
    {
      name: 'role_id',
      label: 'Role',
      type: 'select',
      options: [{ value: '', label: 'Select role' }, ...mapOptions(roles, (role) => role.display_name)],
      required: true
    },
    {
      name: 'assigned_warehouse_id',
      label: 'Assigned Warehouse',
      type: 'select',
      options: [{ value: '', label: 'No warehouse scope' }, ...mapOptions(warehouses, (warehouse) => `${warehouse.code} - ${warehouse.name}`)],
      required: false
    },
    {
      name: 'is_active',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'true', label: 'Active' },
        { value: 'false', label: 'Inactive' }
      ],
      required: true
    },
    {
      name: 'new_password',
      label: 'New Password',
      type: 'password',
      required: false,
      helpText: 'Kosongkan jika tidak ingin mengganti password.'
    },
    {
      name: 'password_confirmation',
      label: 'Confirm Password',
      type: 'password',
      required: false,
      helpText: 'Wajib diisi hanya jika password baru diisi.'
    }
  ];
}

function buildUserEditPayload(user) {
  return {
    title: 'Edit User',
    description: 'Ubah data akun, role, status aktif, dan password opsional dari modal ini.',
    submitLabel: 'Update User',
    action: `/users/${user.id}`,
    full_name: user.full_name ?? '',
    username: user.username ?? '',
    email: user.email ?? '',
    role_id: String(user.role_id ?? ''),
    assigned_warehouse_id: String(user.assigned_warehouse_id ?? ''),
    is_active: user.is_active ? 'true' : 'false',
    new_password: '',
    password_confirmation: ''
  };
}

function buildUsersPageConfig({ users, roles, warehouses }, extra = {}) {
  const activeUsers = users.filter((user) => user.is_active);
  const usersWithWarehouse = users.filter((user) => user.assigned_warehouse_id);
  const tableRows = users.map((user) => ({
    cells: [
      user.full_name,
      user.username,
      user.email || '-',
      user.role_display_name || user.role_name || '-',
      user.warehouse_name || '-',
      user.is_active ? 'Active' : 'Inactive'
    ],
    actions: buildUserActions(user)
  }));

  return {
    pageTitle: 'Users',
    moduleSlug: 'users',
    moduleTitle: 'User Management',
    moduleDescription: 'Daftar user, role, dan warehouse scope untuk akses sistem.',
    moduleStatus: 'Access Control',
    metrics: [
      { label: 'Total Users', value: String(users.length) },
      { label: 'Active Users', value: String(activeUsers.length) },
      { label: 'Assigned Warehouse', value: String(usersWithWarehouse.length) }
    ],
    noteItems: ['Full name', 'Username', 'Email', 'Role dan scope gudang'],
    tableHeaders: ['Name', 'Username', 'Email', 'Role', 'Warehouse', 'Status'],
    tableRows,
    hasActions: true,
    createPath: '/users/new',
    emptyMessage: 'Belum ada user yang tercatat.',
    quickActionNote: 'Tambah akun baru untuk Admin, Manager, Staff, atau Viewer.',
    editModal: {
      title: 'Edit User',
      description: 'Ubah data akun, role, status aktif, dan password opsional dari modal ini.',
      submitLabel: 'Update User',
      actionBase: '/users',
      fields: buildUserEditModalFields(roles, warehouses)
    },
    ...extra
  };
}

async function showUsers(req, res) {
  const [users, roles, warehouses] = await Promise.all([
    userRepository.listUsersWithRoleAndWarehouse(),
    roleRepository.listRoles(),
    warehouseService.listWarehouses({ includeInactive: true })
  ]);
  return renderModulePage(res, buildUsersPageConfig({ users, roles, warehouses }));
}

async function showUserCreate(req, res) {
  const { roles, warehouses } = await getUserFormDependencies();

  return renderFormPage(res, {
    pageTitle: 'Create User',
    moduleSlug: 'users',
    moduleTitle: 'Create User',
    moduleDescription: 'Tambahkan akun baru untuk role operasional.',
    moduleStatus: 'Access Control',
    formMode: 'create',
    formAction: '/users',
    formMethod: 'post',
    submitLabel: 'Save User',
    fields: buildUserFields(roles, warehouses),
    helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
    ...getFlash(req)
  });
}

async function createUser(req, res) {
  const { roles, warehouses } = await getUserFormDependencies();
  const validation = validateCreateUserPayload(req.body);

  if (!validation.valid) {
    return renderFormPage(res, {
      pageTitle: 'Create User',
      moduleSlug: 'users',
      moduleTitle: 'Create User',
      moduleDescription: 'Tambahkan akun baru untuk role operasional.',
      moduleStatus: 'Access Control',
      formMode: 'create',
      formAction: '/users',
      formMethod: 'post',
      submitLabel: 'Save User',
      fields: buildUserFields(roles, warehouses, req.body, validation.errors),
      helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
      flashMessage: 'Validation failed',
      flashType: 'danger',
      formErrors: validation.errors,
      errorSummary: getErrorSummary(validation.errors)
    });
  }

  const selectedRole = await roleRepository.findById(validation.value.role_id);
  if (!selectedRole) {
    return renderFormPage(res, {
      pageTitle: 'Create User',
      moduleSlug: 'users',
      moduleTitle: 'Create User',
      moduleDescription: 'Tambahkan akun baru untuk role operasional.',
      moduleStatus: 'Access Control',
      formMode: 'create',
      formAction: '/users',
      formMethod: 'post',
      submitLabel: 'Save User',
      fields: buildUserFields(roles, warehouses, req.body, { role_id: 'Role tidak ditemukan' }),
      helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
      flashMessage: 'Role tidak valid',
      flashType: 'danger',
      formErrors: { role_id: 'Role tidak ditemukan' },
      errorSummary: ['Role tidak ditemukan']
    });
  }

  if (
    ['Warehouse Manager', 'Warehouse Staff'].includes(selectedRole.display_name) &&
    !validation.value.assigned_warehouse_id
  ) {
    return renderFormPage(res, {
      pageTitle: 'Create User',
      moduleSlug: 'users',
      moduleTitle: 'Create User',
      moduleDescription: 'Tambahkan akun baru untuk role operasional.',
      moduleStatus: 'Access Control',
      formMode: 'create',
      formAction: '/users',
      formMethod: 'post',
      submitLabel: 'Save User',
      fields: buildUserFields(roles, warehouses, req.body, {
        assigned_warehouse_id: 'Warehouse wajib dipilih untuk role ini'
      }),
      helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
      flashMessage: 'Warehouse wajib dipilih untuk role ini',
      flashType: 'danger',
      formErrors: { assigned_warehouse_id: 'Warehouse wajib dipilih untuk role ini' },
      errorSummary: ['Warehouse wajib dipilih untuk role ini']
    });
  }

  const [duplicateUsername, duplicateEmail] = await Promise.all([
    userRepository.findByUsername(validation.value.username),
    validation.value.email ? userRepository.findByEmail(validation.value.email) : Promise.resolve(null)
  ]);

  if (duplicateUsername || duplicateEmail) {
    const errors = {};
    if (duplicateUsername) {
      errors.username = 'Username sudah digunakan';
    }
    if (duplicateEmail) {
      errors.email = 'Email sudah digunakan';
    }

    return renderFormPage(res, {
      pageTitle: 'Create User',
      moduleSlug: 'users',
      moduleTitle: 'Create User',
      moduleDescription: 'Tambahkan akun baru untuk role operasional.',
      moduleStatus: 'Access Control',
      formMode: 'create',
      formAction: '/users',
      formMethod: 'post',
      submitLabel: 'Save User',
      fields: buildUserFields(roles, warehouses, req.body, errors),
      helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
      flashMessage: 'Username atau email sudah digunakan',
      flashType: 'danger',
      formErrors: errors,
      errorSummary: getErrorSummary(errors)
    });
  }

  try {
    assertStrongPassword(validation.value.password);
  } catch (error) {
    return renderFormPage(res, {
      pageTitle: 'Create User',
      moduleSlug: 'users',
      moduleTitle: 'Create User',
      moduleDescription: 'Tambahkan akun baru untuk role operasional.',
      moduleStatus: 'Access Control',
      formMode: 'create',
      formAction: '/users',
      formMethod: 'post',
      submitLabel: 'Save User',
      fields: buildUserFields(roles, warehouses, req.body, { password: error.message }),
      helperNotes: ['Password harus kuat', 'Username harus unik', 'Email opsional', 'Warehouse scope opsional untuk Admin/Viewer'],
      flashMessage: error.message,
      flashType: 'danger',
      formErrors: { password: error.message },
      errorSummary: [error.message]
    });
  }

  const passwordHash = await hashPassword(validation.value.password);

  const createdUser = await database.transaction(async (trx) => {
    const user = await userRepository.createUser(
      {
        full_name: validation.value.full_name,
        username: validation.value.username,
        email: validation.value.email,
        password_hash: passwordHash,
        assigned_warehouse_id: validation.value.assigned_warehouse_id,
        is_active: true
      },
      trx
    );

    await userRepository.assignRole(user.id, selectedRole.id, trx);

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: 'USER_CREATED',
        entity_type: 'user',
        entity_id: user.id,
        old_value: null,
        new_value: {
          id: user.id,
          full_name: user.full_name,
          username: user.username,
          email: user.email,
          assigned_warehouse_id: user.assigned_warehouse_id,
          role: selectedRole.display_name
        }
      }),
      trx
    );

    return user;
  });

  return res.redirect(`/users?type=success&message=${encodeURIComponent(`User ${createdUser.full_name} berhasil disimpan`)}`);
}

async function updateUser(req, res) {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  const [users, roles, warehouses, currentUser, currentRole] = await Promise.all([
    userRepository.listUsersWithRoleAndWarehouse(),
    roleRepository.listRoles(),
    warehouseService.listWarehouses({ includeInactive: true }),
    userRepository.findById(id),
    userRepository.findActiveRoleByUserId(id)
  ]);

  if (!currentUser) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  const validation = validateAdminUserUpdatePayload(req.body);
  const selectedRole = validation.value.role_id ? await roleRepository.findById(validation.value.role_id) : null;
  const currentRoleLabel = currentRole?.display_name ?? currentRole?.name ?? currentUser.role_display_name ?? currentUser.role_name ?? null;

  if (!validation.valid) {
    return renderModulePage(
      res,
      buildUsersPageConfig(
        { users, roles, warehouses },
        {
          flashMessage: 'Validation failed',
          flashType: 'danger',
          errorSummary: Object.values(validation.errors),
          autoOpenEditModalPayload: buildUserEditPayload({
            id: currentUser.id,
            full_name: req.body.full_name ?? currentUser.full_name,
            username: req.body.username ?? currentUser.username,
            email: req.body.email ?? currentUser.email,
            role_id: req.body.role_id ?? currentRole?.role_id,
            assigned_warehouse_id: req.body.assigned_warehouse_id ?? currentUser.assigned_warehouse_id,
            is_active: req.body.is_active === 'false' ? false : true
          }),
          editModal: {
            title: 'Edit User',
            description: 'Ubah data akun, role, status aktif, dan password opsional dari modal ini.',
            submitLabel: 'Update User',
            actionBase: '/users',
            fields: withFieldErrors(buildUserEditModalFields(roles, warehouses), validation.errors)
          }
        }
      )
    );
  }

  if (!selectedRole) {
    return res.redirect('/users?type=danger&message=Role%20tidak%20ditemukan');
  }

  if (
    ['Warehouse Manager', 'Warehouse Staff'].includes(selectedRole.display_name) &&
    !validation.value.assigned_warehouse_id
  ) {
    return res.redirect('/users?type=danger&message=Warehouse%20wajib%20dipilih%20untuk%20role%20ini');
  }

  const duplicateUsername = await userRepository.findByUsername(validation.value.username);
  if (duplicateUsername && Number(duplicateUsername.id) !== Number(currentUser.id)) {
    return res.redirect('/users?type=danger&message=Username%20sudah%20digunakan');
  }

  const duplicateEmail = validation.value.email ? await userRepository.findByEmail(validation.value.email) : null;
  if (duplicateEmail && Number(duplicateEmail.id) !== Number(currentUser.id)) {
    return res.redirect('/users?type=danger&message=Email%20sudah%20digunakan');
  }

  if (validation.value.new_password) {
    try {
      assertStrongPassword(validation.value.new_password);
    } catch (error) {
      return res.redirect(`/users?type=danger&message=${encodeURIComponent(error.message)}`);
    }
  }

  const oldValue = {
    ...currentUser,
    role_id: currentRole?.role_id ?? null,
    role_display_name: currentRoleLabel
  };

  const updatedUser = await database.transaction(async (trx) => {
    const user = await userRepository.updateUser(
      currentUser.id,
      {
        full_name: validation.value.full_name,
        username: validation.value.username,
        email: validation.value.email,
        assigned_warehouse_id: validation.value.assigned_warehouse_id,
        is_active: validation.value.is_active
      },
      trx
    );

    await userRepository.syncActiveRole(user.id, selectedRole.id, trx);

    let passwordChanged = false;
    if (validation.value.new_password) {
      const passwordHash = await hashPassword(validation.value.new_password);
      await userRepository.updatePassword(user.id, passwordHash, trx);
      passwordChanged = true;
    }

    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: passwordChanged ? 'USER_UPDATED_AND_PASSWORD_CHANGED' : 'USER_UPDATED',
        entity_type: 'user',
        entity_id: user.id,
        old_value: oldValue,
        new_value: {
          ...user,
          role_id: selectedRole.id,
          role_display_name: selectedRole.display_name,
          role_name: selectedRole.name,
          is_active: validation.value.is_active
        }
      }),
      trx
    );

    return user;
  });

  if (req.session?.user && Number(req.session.user.id) === Number(updatedUser.id)) {
    req.session.user.full_name = updatedUser.full_name;
    req.session.user.email = updatedUser.email;
    req.session.user.assigned_warehouse_id = updatedUser.assigned_warehouse_id;
    const updatedRoles = await userRepository.findRolesByUserId(updatedUser.id);
    req.session.user.roles = updatedRoles;
    req.session.user.primaryRole = updatedRoles[0] ?? null;
    req.session.user.role = updatedRoles[0]?.name ?? req.session.user.role ?? null;
  }

  return res.redirect('/users?type=success&message=User%20berhasil%20diperbarui');
}

async function deactivateUser(req, res) {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  const result = await database.transaction(async (trx) => {
    const current = await userRepository.findById(id);
    if (!current) {
      return null;
    }

    const updated = await userRepository.setActiveState(id, false, trx);
    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: 'USER_DEACTIVATED',
        entity_type: 'user',
        entity_id: current.id,
        old_value: current,
        new_value: updated
      }),
      trx
    );

    return updated;
  });

  if (!result) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  return res.redirect('/users?type=success&message=User%20berhasil%20dinonaktifkan');
}

async function activateUser(req, res) {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  const result = await database.transaction(async (trx) => {
    const current = await userRepository.findById(id);
    if (!current) {
      return null;
    }

    const updated = await userRepository.setActiveState(id, true, trx);
    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: 'USER_ACTIVATED',
        entity_type: 'user',
        entity_id: current.id,
        old_value: current,
        new_value: updated
      }),
      trx
    );

    return updated;
  });

  if (!result) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  return res.redirect('/users?type=success&message=User%20berhasil%20diaktifkan');
}

async function deleteUser(req, res) {
  const id = Number.parseInt(String(req.params.id), 10);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  const result = await database.transaction(async (trx) => {
    const current = await userRepository.findById(id);
    if (!current) {
      return { notFound: true };
    }

    const usage = await userRepository.countUsage(id, trx);
    if (Object.values(usage).some((count) => Number(count) > 0)) {
      return { blocked: true };
    }

    await userRepository.deleteById(id, trx);
    await auditLogService.logAction(
      auditLogService.buildAuditPayload(req.session?.user ?? null, req, {
        action: 'USER_DELETED',
        entity_type: 'user',
        entity_id: current.id,
        old_value: current,
        new_value: null
      }),
      trx
    );

    return { deleted: true };
  });

  if (result?.notFound) {
    return res.status(404).render('pages/not-found', { pageTitle: 'User Not Found' });
  }

  if (result?.blocked) {
    return res.redirect('/users?type=danger&message=User%20tidak%20bisa%20dihapus%20karena%20sudah%20punya%20jejak%20operasional');
  }

  return res.redirect('/users?type=success&message=User%20berhasil%20dihapus');
}

module.exports = {
  showUsers,
  showUserCreate,
  createUser,
  updateUser,
  deactivateUser,
  activateUser,
  deleteUser
};
