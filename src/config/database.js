const knex = require('knex');
const env = require('./env');

const database = knex({
  client: 'pg',
  connection: env.DATABASE_URL,
  pool: {
    min: env.NODE_ENV === 'test' ? 0 : 1,
    max: env.NODE_ENV === 'test' ? 2 : 10
  }
});

module.exports = database;
