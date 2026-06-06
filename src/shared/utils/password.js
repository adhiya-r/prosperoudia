const crypto = require('node:crypto');

const SCRYPT_KEY_LENGTH = 64;
const SCRYPT_SALT_LENGTH = 16;

function hashPassword(plainPassword) {
  const password = String(plainPassword ?? '');

  if (!password) {
    throw new Error('Password is required');
  }

  const salt = crypto.randomBytes(SCRYPT_SALT_LENGTH).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');

  return `scrypt$${salt}$${derivedKey}`;
}

function verifyPassword(plainPassword, storedHash) {
  const password = String(plainPassword ?? '');
  const hash = String(storedHash ?? '');

  if (!password || !hash.startsWith('scrypt$')) {
    return false;
  }

  const [, salt, expectedKey] = hash.split('$');
  if (!salt || !expectedKey) {
    return false;
  }

  const derivedKey = crypto.scryptSync(password, salt, SCRYPT_KEY_LENGTH).toString('hex');
  const expectedBuffer = Buffer.from(expectedKey, 'hex');
  const derivedBuffer = Buffer.from(derivedKey, 'hex');

  if (expectedBuffer.length !== derivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuffer, derivedBuffer);
}

module.exports = {
  hashPassword,
  verifyPassword
};
