const userManagementService = require('./userManagementService');
const auditLogService = require('../audit-logs/auditLogService');
const {
  DONOR_MODULE_VIEW,
  buildListControls,
  filterItems,
  paginateItems,
  parseListParams,
  sortItems
} = require('../../shared/view-models/backofficeModulePresenter');

function buildUserRows(users) {
  return users.map((user) => ({
    cells: [
      user.full_name || '-',
      user.username,
      user.email || '-',
      user.phone || '-',
      user.role_label,
      user.account_group_label,
      user.status_label,
      user.last_login_label,
      user.created_at_label
    ],
    actions: [
      {
        type: 'modal',
        label: 'Kelola Akun',
        variant: 'secondary',
        payload: {
          action: `/system/users/${user.id}`,
          title: `Kelola Akun: ${user.username}`,
          submitLabel: 'Simpan Perubahan',
          entityLabel: user.username,
          full_name: user.full_name || '',
          username: user.username,
          email: user.email || '',
          phone: user.phone || '',
          role_id: String(user.role_id || ''),
          is_active: user.is_active ? 'true' : 'false'
        }
      }
    ]
  }));
}

async function showUserList(req, res) {
  const [users, roleOptions] = await Promise.all([
    userManagementService.listUserAccounts(),
    userManagementService.listRoleOptions()
  ]);

  const params = parseListParams(req.query, {
    defaultSort: 'created_at',
    defaultDirection: 'desc',
    defaultPerPage: 10
  });

  const filteredUsers = filterItems(users, params.q, [
    'full_name',
    'username',
    'email',
    'phone',
    'role_label',
    'account_group_label',
    'status_label'
  ]);
  const sortedUsers = sortItems(filteredUsers, params.sort, params.direction);
  const { items, pagination } = paginateItems(sortedUsers, {
    basePath: '/system/users',
    page: params.page,
    perPage: params.perPage,
    params: {
      q: params.q,
      sort: params.sort,
      direction: params.direction
    }
  });

  const internalUsers = users.filter((user) => user.account_group_label === 'Internal');

  return res.render(DONOR_MODULE_VIEW, {
    pageTitle: 'Manajemen Akun',
    activePage: 'users',
    moduleSlug: 'users',
    moduleStatus: 'Backoffice',
    moduleDescription: 'Kelola akun aplikasi yang aktif dipakai pada operasional apotek dan pelanggan online.',
    dashboardPath: '/dashboard',
    listPath: '/system/users',
    createPath: null,
    flashMessage: req.query.message ?? null,
    flashType: req.query.type ?? 'info',
    metrics: [
      { label: 'Total Akun', value: String(users.length) },
      { label: 'Akun Internal', value: String(internalUsers.length) },
      { label: 'Pelanggan', value: String(users.filter((user) => user.account_group_label === 'Pelanggan').length) },
      { label: 'Akun Aktif', value: String(users.filter((user) => user.is_active).length) }
    ],
    tableHeading: 'Daftar Akun',
    tableBadge: 'System',
    listControls: buildListControls('/system/users', params, [
      { value: 'created_at', label: 'Tanggal dibuat' },
      { value: 'full_name', label: 'Nama lengkap' },
      { value: 'username', label: 'Username' },
      { value: 'role_label', label: 'Peran aktif' },
      { value: 'last_login_at', label: 'Login terakhir' }
    ]),
    tableHeaders: ['Nama', 'Username', 'Email', 'Telepon', 'Peran', 'Kelompok', 'Status', 'Login Terakhir', 'Dibuat'],
    tableRows: buildUserRows(items),
    hasActions: true,
    emptyMessage: 'Belum ada akun pengguna.',
    pagination,
    editModal: {
      title: 'Kelola Akun Pengguna',
      description: 'Perbarui identitas akun, peran aktif, dan status akses aplikasi.',
      submitLabel: 'Simpan Perubahan',
      actionBase: '/system/users',
      fields: [
        {
          name: 'full_name',
          label: 'Nama Lengkap',
          type: 'text',
          required: true
        },
        {
          name: 'username',
          label: 'Username',
          type: 'text',
          required: true
        },
        {
          name: 'email',
          label: 'Email',
          type: 'email',
          required: true
        },
        {
          name: 'phone',
          label: 'Nomor HP',
          type: 'text',
          required: false
        },
        {
          name: 'role_id',
          label: 'Peran Aktif',
          type: 'select',
          required: true,
          options: roleOptions
        },
        {
          name: 'is_active',
          label: 'Status Akun',
          type: 'select',
          required: true,
          options: [
            { value: 'true', label: 'Aktif' },
            { value: 'false', label: 'Nonaktif' }
          ]
        }
      ]
    }
  });
}

async function updateUserAccount(req, res) {
  const targetUserId = req.params.id;
  const adminUser = req.session?.user;

  try {
    const result = await userManagementService.updateUserAccount(targetUserId, req.body, adminUser);

    if (adminUser) {
      await auditLogService.recordAuditLog(
        auditLogService.buildAuditPayload(adminUser, req, {
          action: 'update_user_account',
          entity_type: 'user',
          entity_id: targetUserId,
          old_value: result.previous,
          new_value: result.updated
        })
      );
    }

    if (Number(adminUser?.id) === Number(targetUserId)) {
      req.session.user = {
        ...req.session.user,
        full_name: result.user.full_name,
        username: result.user.username,
        email: result.user.email,
        phone: result.user.phone,
        role: result.selectedRole.name,
        primaryRole: {
          ...(req.session.user.primaryRole ?? {}),
          id: result.selectedRole.id,
          name: result.selectedRole.name,
          display_name: result.selectedRole.display_name
        },
        roles: [
          {
            ...(req.session.user.roles?.[0] ?? {}),
            id: result.selectedRole.id,
            name: result.selectedRole.name,
            display_name: result.selectedRole.display_name
          }
        ]
      };
    }

    return res.redirect('/system/users?message=Data+akun+berhasil+diperbarui&type=success');
  } catch (error) {
    if (error.validation) {
      const firstError = Object.values(error.validation.errors)[0] || 'Validasi akun pengguna gagal.';
      return res.redirect(`/system/users?message=${encodeURIComponent(firstError)}&type=danger`);
    }

    console.error('Failed to update user account:', error);
    return res.redirect(`/system/users?message=${encodeURIComponent('Gagal memperbarui akun pengguna: ' + error.message)}&type=danger`);
  }
}

module.exports = {
  showUserList,
  updateUserAccount
};
