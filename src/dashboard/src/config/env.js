const dotenv = require('dotenv');

dotenv.config();

const allowedNodeEnvs = new Set(['development', 'test', 'production']);

function fail(message) {
  throw new Error(`Environment validation failed: ${message}`);
}

function getString(name, fallback) {
  const value = process.env[name];

  if (value === undefined || value === '') {
    if (fallback !== undefined) {
      return fallback;
    }

    fail(`Missing required variable ${name}`);
  }

  return String(value).trim();
}

function getInt(name, fallback) {
  const raw = getString(name, fallback !== undefined ? String(fallback) : undefined);
  const parsed = Number.parseInt(raw, 10);

  if (Number.isNaN(parsed)) {
    fail(`Variable ${name} must be a valid integer`);
  }

  return parsed;
}

function getBoolean(name, fallback) {
  const raw = getString(name, fallback !== undefined ? String(fallback) : undefined).toLowerCase();

  if (['true', '1', 'yes'].includes(raw)) {
    return true;
  }

  if (['false', '0', 'no'].includes(raw)) {
    return false;
  }

  fail(`Variable ${name} must be a boolean value`);
}

function normalizeDatabaseUrl(databaseUrl) {
  try {
    const url = new URL(databaseUrl);

    if (url.hostname === 'localhost') {
      url.hostname = '127.0.0.1';
    }

    return url.toString();
  } catch (error) {
    fail('DATABASE_URL must be a valid connection string');
  }
}

const NODE_ENV = getString('NODE_ENV', 'development');

if (!allowedNodeEnvs.has(NODE_ENV)) {
  fail(`NODE_ENV must be one of: ${Array.from(allowedNodeEnvs).join(', ')}`);
}

const env = {
  APP_NAME: getString('APP_NAME', 'SmartStock Pro'),
  NODE_ENV,
  APP_PORT: getInt('APP_PORT', 3000),
  DATABASE_URL: normalizeDatabaseUrl(getString('DATABASE_URL')),
  SESSION_SECRET: getString('SESSION_SECRET'),
  SESSION_MAX_AGE_MINUTES: getInt('SESSION_MAX_AGE_MINUTES', 60),
  SESSION_COOKIE_SECURE: getBoolean('SESSION_COOKIE_SECURE', NODE_ENV === 'production'),
  SESSION_COOKIE_HTTP_ONLY: getBoolean('SESSION_COOKIE_HTTP_ONLY', true),
  SESSION_COOKIE_SAME_SITE: getString('SESSION_COOKIE_SAME_SITE', 'lax'),
  REDIS_HOST: getString('REDIS_HOST', '127.0.0.1'),
  REDIS_PORT: getInt('REDIS_PORT', 6379),
  UPLOAD_DIR: getString('UPLOAD_DIR', 'public/uploads'),
  REPORTS_DIR: getString('REPORTS_DIR', 'public/reports'),
  LOW_STOCK_CHECK_INTERVAL_MINUTES: getInt('LOW_STOCK_CHECK_INTERVAL_MINUTES', 15),
  REPORT_QUEUE_NAME: getString('REPORT_QUEUE_NAME', 'report-generation'),
  IMPORT_QUEUE_NAME: getString('IMPORT_QUEUE_NAME', 'import-processing')
};

module.exports = env;
