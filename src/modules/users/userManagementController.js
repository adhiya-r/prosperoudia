const userManagementService = require('./userManagementService');

async function showUserList(req, res) {
  const users = await userManagementService.listUserAccounts();

  return res.render('pages/system/users/index', {
    pageTitle: 'Manajemen Akun',
    users
  });
}

module.exports = {
  showUserList
};
