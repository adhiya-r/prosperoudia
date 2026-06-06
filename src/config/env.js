const dotenv = require('dotenv');
const path = require('path');

// Selalu baca .env dari root project (bukan dari CWD)
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

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
  SESSION_STORE: getEnv('SESSION_STORE', 'memory'),
  GOOGLE_CLIENT_ID: getEnv('GOOGLE_CLIENT_ID', ''),
  GOOGLE_CLIENT_SECRET: getEnv('GOOGLE_CLIENT_SECRET', ''),
  GOOGLE_CALLBACK_URL: getEnv('GOOGLE_CALLBACK_URL', 'http://localhost:3000/auth/google/callback')
};
