const test = require('node:test');
const assert = require('node:assert/strict');

const profileController = require('../../src/modules/profile/profileController');
const profileService = require('../../src/modules/profile/profileService');

function buildResponse() {
  return {
    statusCode: 200,
    renderedView: null,
    renderedData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    render(view, data) {
      this.renderedView = view;
      this.renderedData = data;
      return this;
    }
  };
}

function buildUser() {
  return {
    id: 1,
    full_name: 'Admin Prosperoudia',
    username: 'admin',
    email: 'admin@prosperoudia.local',
    phone: '081100000001',
    avatar_url: null,
    is_active: true,
    created_at: new Date('2026-06-01T00:00:00Z')
  };
}

test('showEditProfile renders backoffice profile with internal account actions for Admin', async () => {
  const originalGetProfile = profileService.getProfile;
  profileService.getProfile = async () => buildUser();
  const req = {
    session: {
      user: {
        id: 1,
        role: 'Admin',
        primaryRole: { name: 'Admin', display_name: 'Admin' },
        roles: [{ name: 'Admin', display_name: 'Admin' }]
      }
    },
    query: {}
  };
  const res = buildResponse();

  try {
    await profileController.showEditProfile(req, res);

    assert.equal(res.renderedView, 'pages/profile/backoffice-edit');
    assert.equal(res.renderedData.internalUser, true);
    assert.equal(res.renderedData.profileActions.account, '/profile');
    assert.equal(res.renderedData.profileActions.avatar, '/profile/avatar');
  } finally {
    profileService.getProfile = originalGetProfile;
  }
});

test('showEditProfile keeps storefront profile and customer account actions for Pelanggan', async () => {
  const originalGetProfile = profileService.getProfile;
  profileService.getProfile = async () => ({ ...buildUser(), id: 4, full_name: 'Pelanggan Demo' });
  const req = {
    session: {
      user: {
        id: 4,
        role: 'Pelanggan',
        primaryRole: { name: 'Pelanggan', display_name: 'Pelanggan' },
        roles: [{ name: 'Pelanggan', display_name: 'Pelanggan' }]
      }
    },
    query: {}
  };
  const res = buildResponse();

  try {
    await profileController.showEditProfile(req, res);

    assert.equal(res.renderedView, 'pages/profile/edit');
    assert.equal(res.renderedData.internalUser, false);
    assert.equal(res.renderedData.profileActions.account, '/profil/edit');
    assert.equal(res.renderedData.profileActions.password, '/profil/password');
    assert.equal(res.renderedData.profileActions.avatar, '/profil/avatar');
  } finally {
    profileService.getProfile = originalGetProfile;
  }
});
