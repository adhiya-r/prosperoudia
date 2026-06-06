const database = require('../config/database');

function baseQuery() {
  return database('users').select(
    'users.id',
    'users.full_name',
    'users.username',
    'users.email',
    'users.password_hash',
    database.raw('NULL as assigned_warehouse_id'),
    'users.is_active',
    'users.last_login_at',
    'users.created_at',
    'users.updated_at'
  );
}

async function findByUsername(username) {
  return baseQuery()
    .whereRaw('LOWER(users.username) = LOWER(?)', [username])
    .first();
}

async function findByEmail(email) {
  if (!email) {
    return null;
  }

  return baseQuery()
    .whereRaw('LOWER(users.email) = LOWER(?)', [email])
    .first();
}

async function findById(id) {
  return baseQuery().where('users.id', id).first();
}

async function findRolesByUserId(userId) {
  return database('user_roles as ur')
    .innerJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .select(
      'r.id',
      'r.name',
      'r.display_name',
      'r.description',
      'r.created_at',
      'r.updated_at'
    )
    .orderBy('r.id', 'asc');
}

async function listActiveUsers() {
  return baseQuery().where('users.is_active', true);
}

async function listActiveUsersByRoleName(roleName, trx = database) {
  return trx('users as u')
    .innerJoin('user_roles as ur', function joinUserRoles() {
      this.on('ur.user_id', '=', 'u.id').andOn('ur.is_active', '=', trx.raw('true'));
    })
    .innerJoin('roles as r', 'r.id', 'ur.role_id')
    .select(
      'u.id',
      'u.full_name',
      'u.username',
      'u.email',
      database.raw('NULL as assigned_warehouse_id'),
      'u.is_active',
      'u.last_login_at',
      'u.created_at',
      'u.updated_at'
    )
    .where('u.is_active', true)
    .where('r.name', roleName)
    .orderBy('u.full_name', 'asc');
}

async function listUsersWithRoleAndWarehouse() {
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
      database.raw('NULL as assigned_warehouse_id'),
      'u.is_active',
      'u.last_login_at',
      'u.created_at',
      database.raw('NULL as warehouse_name'),
      'r.id as role_id',
      'r.name as role_name',
      'r.display_name as role_display_name'
    )
    .orderBy('u.full_name', 'asc');
}

async function createUser(payload, trx = database) {
  const [record] = await trx('users')
    .insert({
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      password_hash: payload.password_hash,
      is_active: payload.is_active ?? true
    })
    .returning([
      'id',
      'full_name',
      'username',
      'email',
      'is_active',
      'last_login_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function assignRole(userId, roleId, trx = database) {
  const [record] = await trx('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      is_active: true,
      assigned_at: trx.fn.now()
    })
    .returning(['id', 'user_id', 'role_id', 'is_active', 'assigned_at', 'created_at', 'updated_at']);

  return record ?? null;
}

async function findActiveRoleByUserId(userId, trx = database) {
  return trx('user_roles as ur')
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .where('ur.is_active', true)
    .select(
      'ur.id',
      'ur.user_id',
      'ur.role_id',
      'ur.is_active',
      'ur.assigned_at',
      'ur.revoked_at',
      'r.name',
      'r.display_name'
    )
    .first();
}

async function findRoleAssignment(userId, roleId, trx = database) {
  return trx('user_roles as ur')
    .leftJoin('roles as r', 'r.id', 'ur.role_id')
    .where('ur.user_id', userId)
    .where('ur.role_id', roleId)
    .select(
      'ur.id',
      'ur.user_id',
      'ur.role_id',
      'ur.is_active',
      'ur.assigned_at',
      'ur.revoked_at',
      'r.name',
      'r.display_name'
    )
    .first();
}

async function syncActiveRole(userId, roleId, trx = database) {
  const currentActiveRole = await findActiveRoleByUserId(userId, trx);

  if (currentActiveRole && Number(currentActiveRole.role_id) === Number(roleId)) {
    return currentActiveRole;
  }

  if (currentActiveRole) {
    await trx('user_roles')
      .where('id', currentActiveRole.id)
      .update({
        is_active: false,
        revoked_at: trx.fn.now(),
        updated_at: trx.fn.now()
      });
  }

  const existingAssignment = await findRoleAssignment(userId, roleId, trx);

  if (existingAssignment) {
    const [record] = await trx('user_roles')
      .where('id', existingAssignment.id)
      .update({
        is_active: true,
        revoked_at: null,
        assigned_at: trx.fn.now(),
        updated_at: trx.fn.now()
      })
      .returning(['id', 'user_id', 'role_id', 'is_active', 'assigned_at', 'revoked_at']);

    return record ?? null;
  }

  return assignRole(userId, roleId, trx);
}

async function setActiveState(userId, isActive, trx = database) {
  const [record] = await trx('users')
    .where('id', userId)
    .update({
      is_active: isActive,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'full_name',
      'username',
      'email',
      'assigned_warehouse_id',
      'is_active',
      'last_login_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updateUser(userId, payload, trx = database) {
  const [record] = await trx('users')
    .where('id', userId)
    .update({
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      is_active: payload.is_active ?? true,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'full_name',
      'username',
      'email',
      'is_active',
      'last_login_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function updatePassword(userId, passwordHash, trx = database) {
  const [record] = await trx('users')
    .where('id', userId)
    .update({
      password_hash: passwordHash,
      updated_at: trx.fn.now()
    })
    .returning([
      'id',
      'full_name',
      'username',
      'email',
      'is_active',
      'last_login_at',
      'created_at',
      'updated_at'
    ]);

  return record ?? null;
}

async function countUsage(userId, trx = database) {
  const [stockTransactions, requestedTransfers, approvedTransfers, completedTransfers] = await Promise.all([
    trx('stock_movements').where('performed_by', userId).count('* as count').first(),
    database.raw('SELECT 0::bigint AS count'),
    database.raw('SELECT 0::bigint AS count'),
    database.raw('SELECT 0::bigint AS count')
  ]);

  return {
    stock_transactions: Number(stockTransactions?.count ?? 0),
    requested_transfers: Number(requestedTransfers?.rows?.[0]?.count ?? requestedTransfers?.count ?? 0),
    approved_transfers: Number(approvedTransfers?.rows?.[0]?.count ?? approvedTransfers?.count ?? 0),
    completed_transfers: Number(completedTransfers?.rows?.[0]?.count ?? completedTransfers?.count ?? 0)
  };
}

async function deleteById(userId, trx = database) {
  return trx('users').where('id', userId).del();
}

async function updateLastLoginAt(userId, trx = database) {
  return trx('users').where('id', userId).update({
    last_login_at: trx.fn.now(),
    updated_at: trx.fn.now()
  });
}

module.exports = {
  findByUsername,
  findByEmail,
  findById,
  findRolesByUserId,
  listActiveUsers,
  listActiveUsersByRoleName,
  listUsersWithRoleAndWarehouse,
  createUser,
  assignRole,
  findActiveRoleByUserId,
  findRoleAssignment,
  syncActiveRole,
  setActiveState,
  updateUser,
  updatePassword,
  countUsage,
  deleteById,
  updateLastLoginAt
};
