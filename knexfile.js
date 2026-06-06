const path = require('path');
require('dotenv').config();

const defaultConnection = process.env.DATABASE_URL || 'postgres://postgres:postgres@127.0.0.1:5432/prosperoudia';

const baseConfig = {
  client: 'pg',
  connection: defaultConnection,
  migrations: {
    directory: path.join(__dirname, 'database', 'migrations')
  },
  seeds: {
    directory: path.join(__dirname, 'database', 'seeds')
  },
  pool: {
    min: 1,
    max: 10
  }
};

module.exports = {
  development: baseConfig,
  production: baseConfig,
  test: {
    ...baseConfig,
    pool: {
      min: 1,
      max: 2
    }
  }
};
