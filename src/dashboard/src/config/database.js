const path = require('path');
const knex = require('knex');
const env = require('./env');

const database = knex({
  client: 'pg',
  connection: env.DATABASE_URL,
  pool: {
    min: env.NODE_ENV === 'test' ? 0 : 2,
    max: env.NODE_ENV === 'test' ? 2 : 10
  },
  migrations: {
    directory: path.join(__dirname, '..', '..', 'database', 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, '..', '..', 'database', 'seeds')
  }
});

module.exports = database;
