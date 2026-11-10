# Sistem Reservasi Ruang Kampus — IDB Bali

Aplikasi web reservasi ruang kampus dengan autentikasi server-side, pembatasan akses per peran, dan
database PostgreSQL. Dibangun ulang dari prototipe statis (`legacy/`) ke **Next.js 16 + TypeScript +
Tailwind CSS + PostgreSQL**.

> **Mode database lokal.** Aplikasi ini memakai PostgreSQL yang berjalan di dalam proses Node
> (PGlite) agar bisa dijalankan tanpa Docker atau akun cloud. Skema, constraint, dan alur transaksi
> kompatibel dengan PostgreSQL/Supabase. Jalur migrasi Supabase ada di [`supabase/`](supabase/README.md).

> **Mode demo Vercel.** Halaman `/demo` adalah versi demo mandiri yang berjalan sepenuhnya di browser.
> Reservasi disimpan di `localStorage`, sehingga tidak membutuhkan PGlite/database saat dibuka di
> Vercel. Saat `DEMO_MODE=true` atau `VERCEL=1`, route aplikasi diarahkan otomatis ke `/demo`.

---

## Menjalankan

Prasyarat: **Node.js 24+** (sudah terpasang di mesin ini).

```powershell
cd C:\Users\wiguna\Documents\PUTRI
npm install
npm run dev
# buka http://localhost:3000
```

Konfigurasi lokal ada di `.env.local` (tidak di-commit):

```dotenv
PGLITE_DATA_DIR=.data/pglite
SEED_PASSWORD=<kata-sandi-demo-kuat>
DEMO_MODE=true
```

- `SEED_PASSWORD` dipakai sekali saat database pertama kali di-seed. Kata sandi disimpan sebagai hash
  **scrypt**; tidak ada kata sandi di kode frontend.
- `DEMO_MODE=true` mengaktifkan mode demo: route aplikasi diarahkan ke `/demo` dan reservasi disimpan
  di `localStorage`. **Matikan di produksi yang memakai database asli.**
- Salin `.env.local.example` bila ingin menyiapkan environment baru.

### Demo di Vercel

1. Import repositori ini ke Vercel sebagai proyek **Next.js**.
2. Build command: `npm run build` (default). Tidak perlu database atau environment tambahan.
3. Di Vercel, `VERCEL=1` otomatis mengaktifkan mode demo. Root domain akan diarahkan ke `/demo`.
4. Jika ingin mengaktifkan mode demo di luar Vercel, set `DEMO_MODE=true`.
5. Data demo tersimpan **per browser**, bukan di server. Data akan terlihat oleh semua akun demo
   ketika berpindah akun di browser yang sama, dan bertahan setelah halaman dimuat ulang.
6. Gunakan **Reset data demo** di sidebar atau halaman **Pengaturan Demo** untuk mengembalikan data
   contoh dari kode.

Catatan: `localStorage` tidak dibagi antar perangkat/browser dan bukan penyimpanan produksi. Untuk
aplikasi multi-pengguna nyata, gunakan mode database dengan PostgreSQL/Supabase.

### Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server pengembangan (Turbopack) |
| `npm run build` | Build produksi |
| `npm run start` | Jalankan hasil build |
| `npm run typecheck` | TypeScript tanpa emit |
| `npm run db:seed` | Inisialisasi skema + data demo (idempoten) |
| `npm run db:demo-password` | Terapkan ulang `SEED_PASSWORD` ke semua akun demo |
| `npm run db:reset` | Hapus folder data lokal (butuh konfirmasi manual berikutnya) |

---

## Akun demo

Kata sandi demo lokal saat ini: **`DemoIDB2026!`** — dipakai oleh semua akun di bawah.
Nilai ini mengikuti `SEED_PASSWORD` di `.env.local` (bukan di kode frontend). Email demo:

| Peran | Email |
|---|---|
| Mahasiswa | `nia@student.idbbali.ac.id` · `bagus@student.idbbali.ac.id` |
| Dosen / Staf | `ayu@idbbali.ac.id` · `arta@idbbali.ac.id` |
| Admin reservasi | `admin@idbbali.ac.id` |

Untuk mengganti kata sandi semua akun demo setelah mengubah `SEED_PASSWORD`, jalankan
`npm run db:demo-password` saat server lokal berhenti.

Dengan `DEMO_MODE=true`, tombol **Masuk cepat** pada halaman login membuka sesi tanpa mengetik sandi.
Mahasiswa juga dapat membuat akun sendiri lewat `/register` (akun baru otomatis berperan `mahasiswa`).

> **Data ruang adalah contoh pengujian**, bukan data resmi kampus. Ganti melalui panel admin sebelum
> dipakai untuk operasional.

Peran yang tersedia: **mahasiswa**, **dosen**, dan **admin**. Pemeliharaan data dilakukan oleh admin
melalui menu **Pengaturan Sistem**.

---

## Fitur

**Mahasiswa & dosen/staf**
- **Registrasi mandiri** untuk mahasiswa (`/register`) dengan validasi + auto-login.
- Dashboard ringkasan: total peminjaman, menunggu, disetujui, dan riwayat selesai.
- Pencarian ruang berdasarkan **nama/kode/gedung**, tanggal, waktu, kapasitas, dan fasilitas (filter tersimpan di URL).
- Reservasi dan filter tanggal hanya tersedia **Senin–Sabtu**; Minggu libur dan otomatis dialihkan ke Senin.
- Pita ketersediaan per jam, detail ruang, slot kosong berikutnya.
- Formulir pengajuan dengan validasi klien + server, pemeriksaan bentrok langsung, dan ringkasan.
- Nomor reservasi otomatis (`RSV-2026-XXXX`) setelah data benar-benar tersimpan.
- Riwayat, detail + jejak perubahan, pembatalan mandiri hanya selama pengajuan berstatus **Menunggu**.
- **Halaman detail peminjaman** (`/reservasi/[id]`) dengan tombol **Lihat Surat**, **Unduh PDF**, dan
  **Cetak Surat** — hanya muncul saat status **Disetujui**.

**Admin reservasi**
- **Dashboard ringkasan**: permohonan masuk, disetujui, ruang aktif, agenda hari ini, jadwal hari ini,
  dan daftar permohonan terbaru.
- **Memantau jadwal penggunaan ruang** (papan jadwal baca-saja) dari tautan “Papan jadwal”.
- Antrean semua pengajuan, filter status, pencarian.
- Setujui (opsional catatan) dan tolak (alasan wajib).
- Persetujuan ditolak bila slot sudah disetujui reservasi lain.
- Kelola ruang: tambah/ubah nama, kode, gedung, lantai, kapasitas, fasilitas, status aktif/nonaktif.
- **Surat peminjaman**: surat diterbitkan otomatis saat menyetujui, arsip surat, pengaturan kop,
  pejabat penandatangan, dan format nomor (khusus admin).
- **Data & cadangan**: ekspor JSON dan reset data demo tersedia di **Pengaturan Sistem**.

**Surat peminjaman ruangan**
- Surat dibuat otomatis di dalam transaksi persetujuan dan terhubung ke reservasi (satu surat per
  peminjaman). Tidak ada surat untuk status menunggu/ditolak/dibatalkan.
- Nomor unik dari counter global + format yang dapat dikonfigurasi (`{seq}`, `{prefix}`, `{year}`,
  `{month}`, `{day}`); perubahan format hanya berlaku untuk surat baru.
- Pratinjau A4 di `/surat/[id]`, PDF asli A4 (`pdf-lib`) di `/api/surat/[id]/pdf`, tombol cetak
  memakai CSS `@page A4`.
- Kop, alamat, kota, pejabat, NIP, dan format nomor diatur admin lewat **Panel admin → Surat
  peminjaman**. Kolom yang belum diisi tampil sebagai titik-titik dan diberi penanda — aplikasi tidak
  mengarang alamat, pejabat, tanda tangan, atau stempel.
- Waktu terbit, penerbit, dan perubahan pengaturan dicatat di `letters` + `activity_log`.

**Keamanan & akses**
- Sesi 8 jam, token acak 32 byte, disimpan sebagai hash SHA-256 di database.
- Cookie `HttpOnly`, `SameSite=Lax`, `Secure` di produksi.
- Setiap server action memeriksa sesi + peran sebelum menyentuh data.
- Rate limit login: 5 kegagalan / 15 menit per email.
- Pesan login tidak membocorkan apakah email terdaftar.

---

## Struktur database

Skema lengkap: [`lib/schema.sql`](lib/schema.sql).

```
profiles ─┬─< sessions
          ├─< reservations >── rooms ──< room_facilities >── facilities
          ├─< reservation_history
          └─< activity_log

settings            (key/value JSONB, aturan global)
reservation_counters(year, last_value)  ← nomor reservasi unik
letters             (satu per reservasi, nomor unik, waktu & penerbit)
letter_settings     (baris tunggal: kop, pejabat, format nomor)
letter_counters     (counter global nomor surat)
login_attempts      (rate limit)
```

Constraint penting:

- `reservations` — `end_time > start_time`, `participants > 0`, status & kategori dibatasi `CHECK`.
- `rooms` — `capacity` 1..1000, `floor` 1..20, kode unik.
- `reservations.code` unik; nomor dibuat di dalam transaksi lewat `reservation_counters`.
- `letters.reservation_id` unik (satu surat per peminjaman), `letters.number` unik; nomor diambil
  dari `letter_counters` di dalam transaksi yang sama dengan persetujuan.
- Index: `(room_id, date)`, `(user_id, created_at)`, `(status, date)`, `(created_at)` pada log.
- Setiap perubahan status menulis `reservation_history` (per reservasi) **dan** `activity_log`
  (global, dengan pelaku, waktu, detail JSONB).

### Pencegahan bentrok (3 lapis)

1. **Saat memilih waktu** — UI memuat slot ruang dan menandai bentrok secara langsung.
2. **Saat submit** — validasi server (`validateReservation`) + pemeriksaan ulang di dalam transaksi
   setelah `SELECT ... FOR UPDATE` pada ruang, lalu insert. Dua pengajuan bersamaan tidak bisa
   menghasilkan slot ganda.
3. **Saat admin menyetujui** — dicek lagi terhadap reservasi berstatus `disetujui`.

Rumus bentrok: `start < other_end AND end > other_start` pada ruang & tanggal yang sama.

---

## Keamanan data pengguna

- **Tidak ada kata sandi di frontend.** Halaman login hanya mengirim email + sandi ke server action;
  verifikasi dilakukan dengan `crypto.scrypt` + salt unik per akun (`lib/password.ts`).
- **Tidak ada service key/secret di klien.** Hanya kode server yang menyentuh database. Variabel
  `NEXT_PUBLIC_*` tidak dipakai untuk rahasia.
- **Otorisasi berlapis**: layout (`requireUser`), halaman (`requireRole`), dan setiap action
  (cek peran + kepemilikan).
- **Input tervalidasi** dengan Zod + aturan bisnis bersama (`lib/validation.ts`).
- **Query berparameter** di seluruh akses database (tidak ada string SQL yang disisipi input).
- **Pesan error aman**: kegagalan tak terduga dicatat di server, pengguna menerima pesan umum +
  tombol coba lagi. Data tidak pernah dianggap tersimpan sebelum transaksi berhasil.
- **Login rate limit** dan pencatatan percobaan di `login_attempts`.

---

## Penanganan kesalahan

- Server action mengembalikan `ActionResult` (`ok`, `message`, `fieldErrors`), tidak pernah melempar
  detail internal ke klien.
- Formulir mempertahankan isian saat gagal; error tampil di dekat kolom dan pada ringkasan.
- Operasi tulis memakai transaksi: bila insert reservasi gagal, history/log tidak ikut tersimpan.
- Halaman error global (`app/error.tsx`) dan 404 kustom tersedia.
- Status koneksi/DB yang gagal ditampilkan sebagai notifikasi yang bisa ditutup.

---

## Struktur proyek

```text
app/
├─ demo/                  # demo client-side, data reservasi di localStorage
├─ (app)/                 # area terautentikasi (header + footer)
│  ├─ page.tsx            # beranda
│  ├─ ruang/              # pencarian & daftar ruang
│  ├─ reservasi/          # riwayat, formulir, halaman sukses, detail /reservasi/[id]
│  ├─ surat/              # pratinjau A4 + cetak
│  ├─ admin/              # antrean, kelola ruang, surat, pengaturan, data & cadangan
│  └─ terlarang/          # penjelasan akses ditolak
├─ login/                 # halaman masuk (tanpa header)
├─ actions/               # server actions (auth, reservasi, ruang, pengaturan, data, surat)
├─ api/surat/[id]/pdf/    # PDF A4 (pdf-lib)
├─ api/export/            # unduh cadangan JSON (admin)
└─ globals.css            # design system + Tailwind
components/               # header, modal, toast, form, tabel, papan jadwal, dokumen surat
lib/
├─ schema.sql             # skema PostgreSQL
├─ db.ts                  # koneksi PGlite + helper query/transaksi
├─ seed.ts                # data demo (12 ruang, 5 akun, 16 reservasi)
├─ auth.ts                # sesi & guard peran
├─ password.ts            # scrypt + token
├─ data.ts                # query baca
├─ validation.ts          # Zod + aturan reservasi
├─ letters.ts             # penerbitan & penomoran surat
├─ letter-format.ts       # format nomor (dipakai server & klien)
├─ letter-pdf.ts          # tata letak PDF A4
├─ policy.ts              # aturan pembatalan
└─ slots.ts               # utilitas ketersediaan
public/fonts/             # Instrument Serif/Sans + Geist Mono (SIL OFL)
supabase/                 # panduan + RLS untuk jalur Supabase
legacy/                   # prototipe statis sebelumnya (referensi)
```

---

## Uji cepat

1. Buka `/register`, buat akun mahasiswa baru → otomatis masuk ke dashboard.
2. Cari ruang dengan kata kunci nama/gedung + filter tanggal/waktu → hasil menyesuaikan.
3. Login mahasiswa → cari ruang hari ini 09.00–11.00 → **Ruang Rapat Senat** tidak muncul (bentrok).
4. Buka formulir, pilih ruang + waktu yang sudah terisi → peringatan **Jadwal bentrok**; submit ditolak server.
5. Ajukan slot kosong → nomor reservasi + status **Menunggu**.
6. Dashboard mahasiswa menampilkan ringkasan total/menunggu/disetujui/riwayat.
7. Login admin → dashboard **Ringkasan** (permohonan masuk, disetujui, agenda hari ini, permohonan terbaru).
8. Setujui pengajuan → cek **Jejak audit** sebagai admin (pelaku, waktu, catatan).
9. Coba buka `/admin` sebagai mahasiswa → diarahkan ke halaman **Akses ditolak**.
10. Admin → **Kelola ruang** → ubah kapasitas, nonaktifkan ruang, tambah ruang.
11. Admin → **Papan jadwal** → memantau penggunaan ruang (baca-saja).
12. Admin → **Pengaturan Sistem** → ubah jam tutup → beranda menampilkan aturan baru.
13. Admin → **Pengaturan Sistem → Data & cadangan** → ekspor JSON dan reset data demo.
14. Admin → **Surat peminjaman** → isi kop/pejabat/format nomor → simpan.
15. Setujui pengajuan baru → **Surat peminjaman** menampilkan nomor baru → **Lihat Surat**
    (pratinjau A4) → **Unduh PDF** (file `%PDF` A4 1 halaman) → **Cetak Surat**.
16. Buka detail pengajuan **Menunggu**/**Ditolak** → tombol surat tidak muncul; akses PDF langsung
    mengembalikan `409`.
17. Buka `/surat/<id>` milik mahasiswa lain → `404`; ubah pengaturan surat sebagai non-admin →
    ditolak.

Surat lama untuk peminjaman yang sudah disetujui sebelum fitur ini ada dapat diterbitkan lewat
tombol **Terbitkan surat tertunda** di tab Surat.

Uji aksesibilitas otomatis (axe-core) pada halaman utama: **0 pelanggaran**.

---

## Catatan produksi

- PGlite cocok untuk demo/lokal. Untuk produksi multi-pengguna gunakan **Supabase/PostgreSQL**
  dengan RLS, atau server PostgreSQL biasa + pool koneksi.
- Set `DEMO_MODE=false`, gunakan HTTPS, dan rotasi `SEED_PASSWORD`.
- Jalankan `npm run build` lalu `npm run start` di belakang reverse proxy.
- Backup: `pg_dump` (Postgres) atau Supabase Backup. Ekspor JSON tersedia untuk audit manual.
- Kebijakan reservasi (jam, durasi, pembatalan) masih mengikuti usulan PRD dan perlu ditetapkan
  oleh pihak kampus.
- Sebelum surat dipakai resmi: isi alamat/kop, kota, pejabat penandatangan, dan format nomor sesuai
  tata naskah kampus. Format bawaan (`{seq}/{prefix}/{year}`) adalah contoh sistem, bukan nomor
  resmi kampus. Tanda tangan/stempel tidak dibuat oleh aplikasi.

---

## Lisensi aset

Font **Instrument Serif**, **Instrument Sans**, dan **Geist Mono** — SIL Open Font License 1.1.
Teks lisensi: `public/fonts/InstrumentSans-OFL.txt`, `public/fonts/GeistMono-OFL.txt`.
