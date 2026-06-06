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
      'u.updated_at',
      'r.id as role_id',
      'r.name as role_name',
      'r.display_name as role_display_name'
    )
    .orderBy('u.created_at', 'desc');
}

async function findUserById(userId, trx = database) {
  return trx('users')
    .select('id', 'full_name', 'username', 'email', 'phone', 'is_active', 'last_login_at', 'created_at', 'updated_at')
    .where({ id: userId })
    .first();
}

async function findUserByUsernameExcluding(username, excludeUserId, trx = database) {
  return trx('users')
    .select('id')
    .whereRaw('LOWER(username) = LOWER(?)', [username])
    .whereNot({ id: excludeUserId })
    .first();
}

async function findUserByEmailExcluding(email, excludeUserId, trx = database) {
  return trx('users')
    .select('id')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .whereNot({ id: excludeUserId })
    .first();
}

async function listRoles(trx = database) {
  return trx('roles')
    .select('id', 'name', 'display_name')
    .orderBy('id', 'asc');
}

async function findRoleById(roleId, trx = database) {
  return trx('roles')
    .select('id', 'name', 'display_name')
    .where({ id: roleId })
    .first();
}

async function findActiveRoleByUserId(userId, trx = database) {
  return trx('user_roles as ur')
    .innerJoin('roles as r', 'r.id', 'ur.role_id')
    .select('ur.id', 'ur.user_id', 'ur.role_id', 'r.name', 'r.display_name')
    .where('ur.user_id', userId)
    .where('ur.is_active', true)
    .first();
}

async function findRoleAssignment(userId, roleId, trx = database) {
  return trx('user_roles')
    .select('id', 'user_id', 'role_id', 'is_active')
    .where({ user_id: userId, role_id: roleId })
    .first();
}

async function findActiveUsersByRoleName(roleName, trx = database) {
  return trx('users as u')
    .innerJoin('user_roles as ur', function joinUserRoles() {
      this.on('ur.user_id', '=', 'u.id').andOn('ur.is_active', '=', trx.raw('true'));
    })
    .innerJoin('roles as r', 'r.id', 'ur.role_id')
    .select('u.id', 'u.full_name', 'u.username', 'u.email')
    .where('u.is_active', true)
    .andWhereRaw('LOWER(r.name) = LOWER(?)', [roleName])
    .orderBy('u.id', 'asc');
}

async function updateUserAccount(userId, payload, trx = database) {
  const [record] = await trx('users')
    .where({ id: userId })
    .update({
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      is_active: payload.is_active,
      updated_at: trx.fn.now()
    })
    .returning(['id', 'full_name', 'username', 'email', 'phone', 'is_active', 'last_login_at', 'created_at', 'updated_at']);

  return record ?? null;
}

async function syncActiveRole(userId, roleId, trx = database) {
  const activeRole = await findActiveRoleByUserId(userId, trx);

  if (activeRole && Number(activeRole.role_id) === Number(roleId)) {
    return activeRole;
  }

  if (activeRole) {
    await trx('user_roles')
      .where({ id: activeRole.id })
      .update({
        is_active: false,
        updated_at: trx.fn.now()
      });
  }

  const existingAssignment = await findRoleAssignment(userId, roleId, trx);

  if (existingAssignment) {
    const [record] = await trx('user_roles')
      .where({ id: existingAssignment.id })
      .update({
        is_active: true,
        assigned_at: trx.fn.now(),
        updated_at: trx.fn.now()
      })
      .returning(['id', 'user_id', 'role_id', 'is_active']);

    return record ?? null;
  }

  const [record] = await trx('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      is_active: true,
      assigned_at: trx.fn.now(),
      created_at: trx.fn.now(),
      updated_at: trx.fn.now()
    })
    .returning(['id', 'user_id', 'role_id', 'is_active']);

  return record ?? null;
}

module.exports = {
  findActiveRoleByUserId,
  findActiveUsersByRoleName,
  findRoleById,
  findRoleAssignment,
  findUserByEmailExcluding,
  findUserById,
  findUserByUsernameExcluding,
  listRoles,
  listUsersWithActiveRole,
  syncActiveRole,
  updateUserAccount
};
