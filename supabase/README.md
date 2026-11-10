# Jalur Supabase (produksi)

Aplikasi lokal memakai PostgreSQL di dalam Node (PGlite) dengan autentikasi sendiri. Untuk produksi
multi-pengguna, Supabase adalah target yang direkomendasikan. Berkas di folder ini menyiapkan
database-nya, tetapi **lapisan autentikasi aplikasi perlu diganti** ke Supabase Auth (lihat bawah).

## 1. Skema

1. Buat project Supabase.
2. Buka SQL Editor, jalankan isi [`../lib/schema.sql`](../lib/schema.sql) dengan dua penyesuaian:
   - `profiles.id uuid primary key references auth.users(id) on delete cascade`
   - hapus kolom `password_hash` (Supabase Auth menyimpan hash kata sandi di `auth.users`)
3. Jalankan [`rls.sql`](rls.sql) untuk mengaktifkan Row Level Security, policy, dan fungsi
   `create_reservation` / `decide_reservation`.

> Semua tabel memakai `security definer` untuk operasi yang perlu menulis riwayat/audit, sehingga
> klien tidak pernah menulis langsung ke `reservation_history` atau `activity_log`.

## 2. Akun & peran

- Buat pengguna lewat Dashboard → Authentication, atau Admin API di server (service role key).
- Setelah user dibuat, isi `profiles`:

```sql
insert into public.profiles (id, email, full_name, role, identity, program)
values ('<uuid auth user>', 'nia@student.idbbali.ac.id', 'Nia Pramesti', 'mahasiswa', 'NIM ...', 'DKV');
```

- **Service role key hanya boleh dipakai di server/CI.** Jangan pernah mengirimkannya ke browser
  atau menaruhnya di variabel `NEXT_PUBLIC_*`.

## 3. Environment

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

Anon key memang publik; keamanan bergantung pada RLS. Jangan letakkan service role key di aplikasi
web.

## 4. Yang perlu diubah di aplikasi

Lapisan lokal sengaja dipisah agar mudah diganti:

| Lokal (sekarang) | Supabase |
|---|---|
| `lib/db.ts` (PGlite + SQL) | `@supabase/supabase-js` / `@supabase/ssr` |
| `lib/auth.ts` (sesi + cookie) | Supabase Auth + `@supabase/ssr` middleware |
| `lib/password.ts` (scrypt) | ditangani Supabase Auth |
| `createReservationAction` | panggil RPC `create_reservation` |
| `decideReservationAction` | panggil RPC `decide_reservation` |

Komponen UI, validasi (`lib/validation.ts`), aturan kebijakan (`lib/policy.ts`), dan skema database
dapat dipakai ulang tanpa perubahan besar.

## 5. Verifikasi RLS

Uji dengan dua akun berbeda:

1. Mahasiswa A tidak dapat membaca reservasi mahasiswa B
   (`select * from reservations where user_id <> auth.uid()` → 0 baris).
2. Mahasiswa tidak dapat memanggil `decide_reservation`.
3. Admin dapat menyetujui; riwayat dan `activity_log` bertambah.
4. Mahasiswa dan dosen hanya dapat melihat reservasinya sendiri.

## Catatan

- Skema lokal adalah sumber kebenaran untuk bentuk tabel dan constraint.
- Fungsi `create_reservation` memakai lock baris ruang (`for update`) + pemeriksaan bentrok, setara
  dengan transaksi di `app/actions/reservations.ts`.
- Untuk beban tinggi, pertimbangkan constraint `EXCLUDE USING gist` pada rentang waktu per ruang
  (butuh ekstensi `btree_gist`) sebagai pertahanan tambahan di level database.
