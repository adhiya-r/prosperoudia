const database = require('../config/database');

function baseQuery() {
  return database('roles').select(
    'roles.id',
    'roles.name',
    'roles.display_name',
    'roles.description',
    'roles.created_at',
    'roles.updated_at'
  );
}

async function findByName(name) {
  return baseQuery().where('roles.name', name).first();
}

async function findById(id) {
  return baseQuery().where('roles.id', id).first();
}

async function listRoles() {
  return baseQuery().orderBy('roles.id', 'asc');
}

module.exports = {
  findById,
  findByName,
  listRoles
};
