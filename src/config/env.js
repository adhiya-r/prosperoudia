const dotenv = require('dotenv');

dotenv.config();

function getEnv(name, fallback = undefined) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    return fallback;
  }

  return String(value).trim();
}

function getInt(name, fallback) {
  return Number.parseInt(getEnv(name, fallback), 10);
}

function getBoolean(name, fallback) {
  const value = String(getEnv(name, fallback)).toLowerCase();
  return ['1', 'true', 'yes', 'on'].includes(value);
}

module.exports = {
  APP_NAME: getEnv('APP_NAME', 'Prosperoudia'),
  APP_PORT: getInt('APP_PORT', 3000),
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  DATABASE_URL: getEnv('DATABASE_URL', 'postgres://postgres:postgres@127.0.0.1:5432/prosperoudia'),
  SESSION_SECRET: getEnv('SESSION_SECRET', 'change-this-secret'),
  SESSION_MAX_AGE_MINUTES: getInt('SESSION_MAX_AGE_MINUTES', 60),
  SESSION_COOKIE_SECURE: getBoolean('SESSION_COOKIE_SECURE', false),
  SESSION_STORE: getEnv('SESSION_STORE', 'memory')
};
