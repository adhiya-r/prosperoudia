const database = require('../../config/database');

async function findUserById(userId) {
  return database('users')
    .select('id', 'full_name', 'username', 'email', 'phone', 'avatar_url', 'is_active', 'created_at')
    .where({ id: userId })
    .first();
}

async function findUserByUsernameExcluding(username, excludeUserId) {
  return database('users')
    .select('id')
    .whereRaw('LOWER(username) = LOWER(?)', [username])
    .whereNot({ id: excludeUserId })
    .first();
}

async function findUserByEmailExcluding(email, excludeUserId) {
  return database('users')
    .select('id')
    .whereRaw('LOWER(email) = LOWER(?)', [email])
    .whereNot({ id: excludeUserId })
    .first();
}

async function updateUserProfile(userId, payload) {
  const [updated] = await database('users')
    .where({ id: userId })
    .update({
      full_name: payload.full_name,
      username: payload.username,
      email: payload.email,
      phone: payload.phone,
      updated_at: database.fn.now()
    })
    .returning(['id', 'full_name', 'username', 'email', 'phone']);

  return updated;
}

async function updateUserPassword(userId, passwordHash) {
  return database('users')
    .where({ id: userId })
    .update({
      password_hash: passwordHash,
      updated_at: database.fn.now()
    });
}

async function updateUserAvatar(userId, avatarUrl) {
  const [updated] = await database('users')
    .where({ id: userId })
    .update({ avatar_url: avatarUrl, updated_at: database.fn.now() })
    .returning(['id', 'avatar_url']);
  return updated;
}

module.exports = {
  findUserById,
  findUserByUsernameExcluding,
  findUserByEmailExcluding,
  updateUserProfile,
  updateUserPassword,
  updateUserAvatar
};
