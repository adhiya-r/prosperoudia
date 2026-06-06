const database = require('../../config/database');

async function listUsersWithActiveRole() {
  return database('users as u')
    .leftJoin('user_roles as ur', function joinUserRoles() {
      this.on('ur.user_id', '=', 'u.id').andOn('ur.is_active', '=', database.raw('true'));
    })
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .select(
      'u.id',
      'u.full_name',
      'u.username',
      'u.email',
      'u.phone',
      'u.is_active',
      'u.last_login_at',
      'u.created_at',
      'r.name as role_name',
      'r.display_name as role_display_name'
    )
    .orderBy('u.created_at', 'desc');
}

module.exports = {
  listUsersWithActiveRole
};
