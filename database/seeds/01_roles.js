exports.seed = async function seed(knex) {
  await knex('user_roles').del();
  await knex('roles').del();

  await knex('roles').insert([
    {
      id: 1,
      name: 'Admin',
      display_name: 'Admin',
      description: 'Mengelola sistem, master data, laporan, monitoring, dan user.'
    },
    {
      id: 2,
      name: 'Apoteker',
      display_name: 'Apoteker',
      description: 'Memverifikasi resep, memantau stok obat, dan mengawasi transaksi farmasi.'
    },
    {
      id: 3,
      name: 'Kasir',
      display_name: 'Kasir',
      description: 'Mengelola transaksi penjualan dan konfirmasi pembayaran dasar.'
    },
    {
      id: 4,
      name: 'Pelanggan',
      display_name: 'Pelanggan',
      description: 'Membeli obat, mengunggah resep, dan memantau status pesanan.'
    }
  ]);
};
