# Dokumentasi Endpoint

Prosperoudia terutama menggunakan server-rendered web route. Endpoint JSON/SSE berikut dapat dipakai untuk monitoring atau integrasi terbatas.

## Konvensi

- Base URL lokal: `http://localhost:3000`
- Autentikasi: session cookie
- Request state-changing web form memerlukan CSRF token
- Endpoint internal hanya dapat diakses user yang login dan bukan Pelanggan. Route pelanggan seperti `/orders` dan route notifikasi tetap memakai session login sesuai role user.

## `GET /health`

Health check publik.

```json
{
  "success": true,
  "data": {
    "status": "ok",
    "app": "prosperoudia"
  }
}
```

## `GET /search/suggestions?q={kata}`

Mengembalikan suggestion obat untuk autocomplete storefront. Endpoint publik.

Parameter:

| Nama | Wajib | Keterangan |
|---|---|---|
| `q` | Ya | kata pencarian nama/SKU/kategori |

## `GET /dashboard/data`

Mengembalikan data ringkasan dashboard. Wajib login internal; Pelanggan menerima `403`.

Struktur data mencakup summary, tren order/revenue, low-stock, order terbaru, notifikasi, dan error log sesuai kondisi database.

## `GET /dashboard/events`

Membuka Server-Sent Events (SSE) untuk koneksi dashboard internal.

Event yang pasti tersedia saat ini:

- `connected`
- `heartbeat`

Catatan: koneksi SSE aktif, tetapi wiring seluruh event bisnis apotek belum lengkap.

## Web Route Penting

| Method | Route | Akses | Fungsi |
|---|---|---|---|
| `POST` | `/login` | Guest | autentikasi |
| `POST` | `/register` | Guest | registrasi pelanggan |
| `POST` | `/cart/items` | Publik | tambah cart session |
| `POST` | `/checkout` | Login | membuat order |
| `POST` | `/orders/:orderId/payment-proof` | Pelanggan | upload bukti pembayaran setelah checkout |
| `POST` | `/orders/manage/:id/status` | Admin/Apoteker/Kasir | update lifecycle order |
| `POST` | `/prescriptions/:id/review` | Admin/Apoteker | review resep |
| `GET` | `/notifications/:notificationId/open` | Login | membuka target notifikasi dan menandai sudah dibaca |
| `POST` | `/notifications/read-all` | Login | menandai semua notifikasi user sebagai sudah dibaca |
| `POST` | `/system/imports/medicines` | Admin | import CSV/XLSX |
| `POST` | `/system/reports/export` | Admin | generate PDF |

## Upload dan File Reference

Upload resep, bukti pembayaran, gambar obat, dan avatar memakai form `multipart/form-data`. Referensi file yang disimpan dan dibuka UI harus berupa path aplikasi `/uploads/...` atau URL `http/https`. Nilai teks bebas tidak dianggap file valid dan tidak dibuat menjadi link.

## Batasan Integrasi

Belum ada API token, versioning (`/api/v1`), rate limit, OpenAPI spec, atau webhook. Endpoint saat ini ditujukan untuk UI prototype dan demo, bukan integrasi eksternal production.
