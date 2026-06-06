const { hashPassword } = require('../../src/shared/utils/password');

exports.seed = async function seed(knex) {
  await knex('user_roles').del();
  await knex('users').del();

  const demoUsers = [
    {
      id: 1,
      full_name: 'Admin Prosperoudia',
      username: 'admin',
      email: 'admin@prosperoudia.local',
      phone: '081100000001',
      password: 'Admin123!',
      role_id: 1
    },
    {
      id: 2,
      full_name: 'Apoteker Demo',
      username: 'apoteker',
      email: 'apoteker@prosperoudia.local',
      phone: '081100000002',
      password: 'Apoteker123!',
      role_id: 2
    },
    {
      id: 3,
      full_name: 'Kasir Demo',
      username: 'kasir',
      email: 'kasir@prosperoudia.local',
      phone: '081100000003',
      password: 'Kasir123!',
      role_id: 3
    },
    {
      id: 4,
      full_name: 'Pelanggan Demo',
      username: 'pelanggan',
      email: 'pelanggan@prosperoudia.local',
      phone: '081100000004',
      password: 'Pelanggan123!',
      role_id: 4
    }
  ];

  const seededUsers = demoUsers.map((user) => ({
    id: user.id,
    full_name: user.full_name,
    username: user.username,
    email: user.email,
    password_hash: hashPassword(user.password),
    phone: user.phone,
    is_active: true
  }));

  await knex('users').insert(seededUsers);

  await knex('user_roles').insert(
    demoUsers.map((user) => ({
      user_id: user.id,
      role_id: user.role_id,
      is_active: true,
      assigned_at: knex.fn.now()
    }))
  );
};
