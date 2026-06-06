const userManagementRepository = require('./userManagementRepository');

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
}

async function listUserAccounts() {
  const users = await userManagementRepository.listUsersWithActiveRole();

  return users.map((user) => ({
    ...user,
    role_label: user.role_display_name || user.role_name || '-',
    status_label: user.is_active ? 'Aktif' : 'Nonaktif',
    last_login_label: formatDateTime(user.last_login_at),
    created_at_label: formatDateTime(user.created_at)
  }));
}

module.exports = {
  listUserAccounts
};
