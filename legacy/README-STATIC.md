# Sistem Reservasi Ruang Kampus — IDB Bali

Prototipe antarmuka dan alur reservasi ruang kampus berdasarkan **PRD 1.0 (20 Oktober 2026)**.
Aplikasi berjalan sepenuhnya di peramban: tanpa server, tanpa build step, dan tanpa dependensi
eksternal (font disertakan secara lokal).

![Cakupan](https://img.shields.io/badge/PRD-1.0-b4432c) ![Status](https://img.shields.io/badge/status-prototipe-17130f)

---

## Menjalankan

**Cara tercepat:** buka `index.html` di Chrome/Edge (klik dua kali).

**Disarankan** — jalankan lewat server lokal agar penyimpanan data memakai origin yang stabil:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
# lalu buka http://localhost:8080
```

> Data prototipe disimpan di `localStorage`. Membuka lewat `file://` tetap berfungsi, tetapi
> data dapat dianggap berbeda bila path berkas berubah.

---

## Akun demo

Kata sandi semua akun: **`demo1234`**

| Peran | Nama | Email | Hak akses utama |
|---|---|---|---|
| Mahasiswa | Nia Pramesti | `nia@student.idbbali.ac.id` | Cari ruang, ajukan, pantau & batalkan pengajuan sendiri |
| Mahasiswa | Bagus Wirawan | `bagus@student.idbbali.ac.id` | Sama seperti di atas |
| Dosen / Staf | Dr. Ayu Lestari | `ayu@idbbali.ac.id` | Sama seperti mahasiswa, untuk kegiatan akademik |
| Dosen / Staf | Komang Arta | `arta@idbbali.ac.id` | Sama seperti di atas |
| Admin reservasi | Made Sari | `admin@idbbali.ac.id` | Antrean, setujui/tolak/batalkan, kelola data ruang |
| Operator layanan | Wayan Teknisi | `operator@idbbali.ac.id` | Pengaturan sistem, cadangan data, jejak audit, pengguna |

Tombol akun demo di halaman masuk akan mengisi kredensial dan langsung masuk.

---

## Fitur per peran

### Mahasiswa & dosen/staf
- **Beranda** dengan pencarian cepat (tanggal, waktu, kapasitas, fasilitas).
- **Daftar ruang** dengan filter dan pita ketersediaan per jam (07.00–22.00).
- **Detail ruang**: fasilitas, kapasitas, agenda pada tanggal terpilih, slot kosong berikutnya.
- **Formulir reservasi**: nama kegiatan, jenis kegiatan, ruangan, tanggal, waktu mulai/selesai,
  jumlah peserta, kontak, catatan.
- **Validasi langsung**: kolom wajib, jam operasional, durasi 1–4 jam, batas 30 hari ke depan,
  kapasitas ruang, dan **deteksi bentrok jadwal** sebelum pengiriman.
- **Nomor reservasi** otomatis (`RSV-2026-0001`) dan halaman bukti yang dapat dicetak.
- **Reservasi saya**: filter status, detail, jejak perubahan, pembatalan sesuai kebijakan.

### Admin reservasi
- Antrean pengajuan dengan pencarian dan filter status.
- Detail permohonan + peringatan bentrok + riwayat.
- **Setujui** (dengan catatan), **Tolak** (alasan wajib), **Batalkan** (alasan wajib).
- Persetujuan diblokir bila slot sudah disetujui pada reservasi lain.
- **Kelola ruang**: tambah ruang, ubah nama/kode/gedung/lantai/kapasitas/fasilitas/status.

### Operator layanan
- **Jadwal ruang**: papan jadwal per hari untuk seluruh ruang (07.00–22.00), filter ruang,
  ringkasan pemakaian, dan daftar reservasi hari itu. Detail bersifat **baca-saja** — keputusan
  status tetap di admin.
- Pengaturan global: jam operasional, durasi minimum/maksimum, batas pemesanan,
  batas pembatalan mandiri, persetujuan otomatis, pengumuman beranda.
- Ekspor/impor JSON, ukuran data, dan reset ke data demo (konfirmasi ketik `RESET`).
- **Jejak audit** yang dapat dicari (kode, pelaku, tindakan) + daftar pengguna & peran.

### Kontrol akses
- Rute dijaga per peran; akses langsung ke URL terlarang menampilkan penjelasan, bukan data.
- Sesi berakhir otomatis setelah 8 jam.
- Deep link tetap bekerja: jika belum masuk, pengguna diarahkan ke login lalu kembali ke tujuan.

---

## Ketersediaan & status reservasi

**Pemeriksaan bentrok otomatis** berjalan pada tiga titik:

1. Saat pengguna memilih ruang/tanggal/waktu — indikator langsung di formulir.
2. Saat pengajuan dikirim — `store.validate()` memeriksa ulang terhadap seluruh reservasi
   berstatus **Menunggu** atau **Disetujui**, lalu menolak pengiriman bila bertabrakan.
3. Saat admin menyetujui — permintaan ditolak bila slot sudah disetujui pada reservasi lain,
   sehingga data lama atau perubahan manual tidak dapat menghasilkan jadwal ganda.

Dua rentang waktu dianggap bentrok bila `mulai < selesai_lain` **dan** `selesai > mulai_lain`
pada ruang dan tanggal yang sama.

| Status | Arti | Transisi yang diizinkan |
|---|---|---|
| Menunggu | Pengajuan tersimpan, belum diputuskan | → Disetujui / Ditolak / Dibatalkan |
| Disetujui | Disetujui admin | → Dibatalkan (sesuai aturan) |
| Ditolak | Tidak dapat diterima | Status akhir |
| Dibatalkan | Dibatalkan pemohon/admin | Status akhir |

Setiap transisi menulis dua jejak: **riwayat pada reservasi** (waktu, pelaku, catatan) dan
**jejak audit global** yang dapat dibaca operator. Nomor reservasi (`RSV-2026-0001`) baru dibuat
setelah data berhasil disimpan.

---

## Alur uji yang bisa dicoba

| Skenario | Langkah |
|---|---|
| Login per peran | Masuk lewat tombol akun demo; menu berubah sesuai peran |
| Pencarian ruang | Isi tanggal 21 Okt 2026, waktu 09.00–11.00, kapasitas 30 |
| Validasi kolom | Kosongkan form lalu klik **Kirim pengajuan**; fokus pindah ke kolom pertama yang salah |
| Bentrok jadwal | Pilih Ruang Rapat Senat, hari ini, 09.00–11.00 → peringatan bentrok muncul |
| Pengajuan berhasil | Isi lengkap → nomor reservasi + halaman bukti |
| Hak akses | Masuk sebagai mahasiswa lalu buka `#/admin` → halaman ditolak |
| Keputusan admin | Masuk sebagai admin → **Setujui** / **Tolak** (alasan wajib) |
| Pembatalan | Dari Reservasi saya → **Batalkan** (wajib alasan) |
| Jadwal operator | Masuk sebagai operator → **Jadwal ruang** → ganti tanggal/filter ruang |
| Detail baca-saja | Klik blok jadwal → modal hanya berisi **Tutup** (tanpa aksi status) |
| Jejak audit | Operator → **Jejak audit** → cari kode `RSV` atau nama admin |
| Pengaturan | Operator → ubah jam tutup → simpan → beranda menampilkan aturan baru |
| Cadangan | Operator → **Ekspor JSON** lalu **Impor JSON** |

---

## Struktur berkas

```text
PUTRI/
├─ index.html                 # kerangka halaman
├─ serve.ps1                  # server lokal PowerShell (opsional)
├─ assets/
│  ├─ css/app.css             # design tokens + komponen + responsif
│  ├─ js/
│  │  ├─ seed.js              # data awal: 12 ruang, 6 akun, 16 reservasi
│  │  ├─ store.js             # penyimpanan, sesi, validasi, aturan bentrok
│  │  ├─ ui.js                # format tanggal, ikon, modal, toast, ribbon
│  │  ├─ views-public.js      # login, beranda, daftar ruang
│  │  ├─ views-reserve.js     # formulir, reservasi saya, halaman sukses
│  │  ├─ views-admin.js       # antrean, keputusan, kelola ruang
│  │  ├─ views-operator.js    # pengaturan, data, audit, pengguna
│  │  └─ app.js               # router, navigasi, penjagaan peran
│  ├─ fonts/                  # Instrument Serif/Sans + Geist Mono (SIL OFL)
│  └─ img/favicon.svg
└─ README.md
```

---

## Catatan desain

Arah visual: **Tropical Broadsheet** — ketegasan editorial (garis tipis, tipografi serif besar,
label mono) dengan satu aksen terakota dan permukaan kertas hangat.

- **Tipografi:** Instrument Serif (judul), Instrument Sans (antarmuka), Geist Mono (kode, waktu, data).
- **Token:** satu skala tipe (rasio 1.25), satu skala ruang (basis 4 px), satu aksen.
- **Bentuk:** radius 2 px, bayangan hanya pada lapisan mengambang (modal/toast).
- **Momen yang diingat:** pita ketersediaan per jam dan nomor reservasi berukuran besar.
- **Aksesibilitas:** target sentuh ≥ 44 px pada aksi utama, fokus terlihat, kontras teks
  diperiksa dengan axe-core (0 pelanggaran pada seluruh halaman utama), `prefers-reduced-motion`,
  landmark, label form, dan dialog dengan focus trap + Esc.

---

## Batasan prototipe (penting)

Ini **bukan** sistem produksi:

- Tidak ada server. Data tersimpan di `localStorage` peramban dan tidak dibagi antar perangkat.
- Kata sandi demo disimpan apa adanya. Produksi wajib memakai autentikasi server, hash kata sandi,
  dan sesi aman (mis. cookie HttpOnly).
- Pemeriksaan bentrok berjalan di klien. Produksi perlu validasi ulang di server agar tidak dapat dilewati.
- Kebijakan (jam operasional, durasi, pembatalan, persetujuan) mengikuti **usulan** PRD dan masih
  perlu ditetapkan oleh pihak kampus.
- Metode login kampus, retensi data, dan prosedur pemulihan belum ditetapkan pada PRD.

---

## Lisensi aset

Font **Instrument Serif**, **Instrument Sans**, dan **Geist Mono** dilisensikan di bawah
SIL Open Font License 1.1. Teks lisensi tersedia di `assets/fonts/InstrumentSans-OFL.txt`
dan `assets/fonts/GeistMono-OFL.txt`.
