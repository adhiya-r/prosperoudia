const database = require('../../config/database');

async function findUserByIdentifier(identifier) {
  return database('users')
    .select(
      'id',
      'full_name',
      'username',
      'email',
      'password_hash',
      'phone',
      'avatar_url',
      'is_active',
      'last_login_at'
    )
    .where((query) => {
      query.whereRaw('LOWER(username) = LOWER(?)', [identifier]).orWhereRaw('LOWER(email) = LOWER(?)', [identifier]);
    })
    .first();
}

async function findUserByUsername(username) {
  return database('users')
    .select('id', 'username', 'email', 'avatar_url')
    .whereRaw('LOWER(username) = LOWER(?)', [username])
    .first();
}

async function findUserByEmail(email) {
  return database('users')
    .select('id', 'full_name', 'username', 'email', 'phone', 'avatar_url', 'is_active')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .first();
}

async function findRolesByUserId(userId) {
  return database('user_roles as ur')
    .innerJoin('roles as r', 'r.id', 'ur.role_id')
    .select('r.id', 'r.name', 'r.display_name', 'r.description')
    .where('ur.user_id', userId)
    .where('ur.is_active', true)
    .orderBy('r.id', 'asc');
}

async function findRoleByName(roleName) {
  return database('roles')
    .select('id', 'name', 'display_name', 'description')
    .whereRaw('LOWER(name) = LOWER(?)', [roleName])
    .first();
}

async function createUser(trx, payload) {
  const [user] = await trx('users')
    .insert({
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      password_hash: payload.password_hash,
      phone: payload.phone || null,
      is_active: true
    })
    .returning(['id', 'full_name', 'username', 'email', 'phone', 'is_active']);

  return user;
}

async function assignRoleToUser(trx, userId, roleId) {
  const [assignment] = await trx('user_roles')
    .insert({
      user_id: userId,
      role_id: roleId,
      is_active: true
    })
    .returning(['id']);

  return assignment;
}

async function updateLastLoginAt(userId) {
  return database('users').where({ id: userId }).update({
    last_login_at: database.fn.now(),
    updated_at: database.fn.now()
  });
}

module.exports = {
  assignRoleToUser,
  createUser,
  findRoleByName,
  findUserByEmail,
  findUserByIdentifier,
  findUserByUsername,
  findRolesByUserId,
  updateLastLoginAt
};
