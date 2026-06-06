const test = require('node:test');
const assert = require('node:assert/strict');

const userManagementService = require('../../src/modules/users/userManagementService');
const userManagementRepository = require('../../src/modules/users/userManagementRepository');
const database = require('../../src/config/database');

test('validateUserAccountPayload rejects invalid account fields', () => {
  const result = userManagementService.validateUserAccountPayload({
    full_name: 'Ad',
    username: 'a!',
    email: 'invalid',
    phone: '08abc',
    role_id: ''
  });

  assert.equal(result.valid, false);
  assert.match(result.errors.full_name, /minimal 3 karakter/i);
  assert.match(result.errors.username, /garis bawah/i);
  assert.match(result.errors.email, /format email/i);
  assert.match(result.errors.phone, /Nomor HP/i);
  assert.match(result.errors.role_id, /Peran pengguna wajib dipilih/i);
});

test('updateUserAccount blocks admin from deactivating own account', async () => {
  const originalFindUserById = userManagementRepository.findUserById;
  const originalFindRoleById = userManagementRepository.findRoleById;
  const originalFindUserByUsernameExcluding = userManagementRepository.findUserByUsernameExcluding;
  const originalFindUserByEmailExcluding = userManagementRepository.findUserByEmailExcluding;
  const originalFindActiveRoleByUserId = userManagementRepository.findActiveRoleByUserId;

  userManagementRepository.findUserById = async () => ({
    id: 1,
    full_name: 'Admin Prosperoudia',
    username: 'admin',
    email: 'admin@prosperoudia.local',
    phone: '081100000001',
    is_active: true
  });
  userManagementRepository.findRoleById = async () => ({ id: 1, name: 'Admin', display_name: 'Admin' });
  userManagementRepository.findUserByUsernameExcluding = async () => null;
  userManagementRepository.findUserByEmailExcluding = async () => null;
  userManagementRepository.findActiveRoleByUserId = async () => ({ role_id: 1, name: 'Admin', display_name: 'Admin' });

  try {
    await assert.rejects(
      userManagementService.updateUserAccount(
        1,
        {
          full_name: 'Admin Prosperoudia',
          username: 'admin',
          email: 'admin@prosperoudia.local',
          phone: '081100000001',
          role_id: '1',
          is_active: 'false'
        },
        { id: 1 }
      ),
      (error) => {
        assert.equal(error.statusCode, 422);
        assert.match(error.validation.errors.is_active, /tidak boleh menonaktifkan akun sendiri/i);
        return true;
      }
    );
  } finally {
    userManagementRepository.findUserById = originalFindUserById;
    userManagementRepository.findRoleById = originalFindRoleById;
    userManagementRepository.findUserByUsernameExcluding = originalFindUserByUsernameExcluding;
    userManagementRepository.findUserByEmailExcluding = originalFindUserByEmailExcluding;
    userManagementRepository.findActiveRoleByUserId = originalFindActiveRoleByUserId;
  }
});

test('updateUserAccount updates profile fields, role, and status for another user', async () => {
  const originalFindUserById = userManagementRepository.findUserById;
  const originalFindRoleById = userManagementRepository.findRoleById;
  const originalFindUserByUsernameExcluding = userManagementRepository.findUserByUsernameExcluding;
  const originalFindUserByEmailExcluding = userManagementRepository.findUserByEmailExcluding;
  const originalFindActiveRoleByUserId = userManagementRepository.findActiveRoleByUserId;
  const originalUpdateUserAccount = userManagementRepository.updateUserAccount;
  const originalSyncActiveRole = userManagementRepository.syncActiveRole;
  const originalTransactionDescriptor = Object.getOwnPropertyDescriptor(database, 'transaction');

  userManagementRepository.findUserById = async () => ({
    id: 3,
    full_name: 'Kasir Demo',
    username: 'kasir',
    email: 'kasir@prosperoudia.local',
    phone: '081100000003',
    is_active: true
  });
  userManagementRepository.findRoleById = async () => ({ id: 2, name: 'Apoteker', display_name: 'Apoteker' });
  userManagementRepository.findUserByUsernameExcluding = async () => null;
  userManagementRepository.findUserByEmailExcluding = async () => null;
  userManagementRepository.findActiveRoleByUserId = async () => ({ role_id: 3, name: 'Kasir', display_name: 'Kasir' });
  userManagementRepository.updateUserAccount = async (_userId, payload) => ({
    id: 3,
    full_name: payload.full_name,
    username: payload.username,
    email: payload.email,
    phone: payload.phone,
    is_active: payload.is_active
  });
  userManagementRepository.syncActiveRole = async () => ({ id: 99, role_id: 2 });
  Object.defineProperty(database, 'transaction', {
    configurable: true,
    value: async (handler) => handler(database)
  });

  try {
    const result = await userManagementService.updateUserAccount(
      3,
      {
        full_name: 'Apoteker Baru',
        username: 'apotekerbaru',
        email: 'apoteker.baru@prosperoudia.local',
        phone: '081122223333',
        role_id: '2',
        is_active: 'true'
      },
      { id: 1 }
    );

    assert.equal(result.user.username, 'apotekerbaru');
    assert.equal(result.selectedRole.name, 'Apoteker');
    assert.equal(result.previous.role_name, 'Kasir');
    assert.equal(result.updated.role_label, 'Apoteker');
  } finally {
    userManagementRepository.findUserById = originalFindUserById;
    userManagementRepository.findRoleById = originalFindRoleById;
    userManagementRepository.findUserByUsernameExcluding = originalFindUserByUsernameExcluding;
    userManagementRepository.findUserByEmailExcluding = originalFindUserByEmailExcluding;
    userManagementRepository.findActiveRoleByUserId = originalFindActiveRoleByUserId;
    userManagementRepository.updateUserAccount = originalUpdateUserAccount;
    userManagementRepository.syncActiveRole = originalSyncActiveRole;
    Object.defineProperty(database, 'transaction', originalTransactionDescriptor);
  }
});
