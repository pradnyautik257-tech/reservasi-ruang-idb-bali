-- ============================================================================
-- Sistem Reservasi Ruang Kampus — IDB Bali
-- Skema PostgreSQL (kompatibel PGlite lokal dan Supabase)
--
-- Prinsip:
--  * Kata sandi hanya disimpan sebagai hash (scrypt) di tabel profiles.
--  * Reservasi menyimpan tanggal + jam terpisah agar mudah divalidasi & diindeks.
--  * Setiap perubahan status ditulis ke reservation_history dan activity_log.
--  * Kode reservasi unik dan dibuat di dalam transaksi.
-- ============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY,
  email         text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name     text NOT NULL,
  role          text NOT NULL CHECK (role IN ('mahasiswa', 'dosen', 'admin')),
  identity      text,
  program       text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles (role);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash   text PRIMARY KEY,
  user_id      uuid NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  user_agent   text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS login_attempts (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  email      text NOT NULL,
  ip         text,
  success    boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS login_attempts_email_idx ON login_attempts (email, created_at DESC);

CREATE TABLE IF NOT EXISTS facilities (
  id   integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS rooms (
  id         uuid PRIMARY KEY,
  code       text NOT NULL UNIQUE,
  name       text NOT NULL,
  building   text NOT NULL,
  floor      smallint NOT NULL DEFAULT 1 CHECK (floor BETWEEN 1 AND 20),
  capacity   integer NOT NULL CHECK (capacity BETWEEN 1 AND 1000),
  status     text NOT NULL DEFAULT 'aktif' CHECK (status IN ('aktif', 'nonaktif')),
  note       text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS rooms_status_idx ON rooms (status);
CREATE INDEX IF NOT EXISTS rooms_capacity_idx ON rooms (capacity);

CREATE TABLE IF NOT EXISTS room_facilities (
  room_id     uuid NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
  facility_id integer NOT NULL REFERENCES facilities (id) ON DELETE CASCADE,
  PRIMARY KEY (room_id, facility_id)
);

CREATE TABLE IF NOT EXISTS reservation_counters (
  year       integer PRIMARY KEY,
  last_value integer NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reservations (
  id            uuid PRIMARY KEY,
  code          text NOT NULL UNIQUE,
  user_id       uuid NOT NULL REFERENCES profiles (id) ON DELETE RESTRICT,
  room_id       uuid NOT NULL REFERENCES rooms (id) ON DELETE RESTRICT,
  activity      text NOT NULL,
  category      text NOT NULL CHECK (category IN ('Akademik', 'Organisasi', 'Seminar', 'Lomba', 'Lainnya')),
  date          date NOT NULL,
  start_time    time NOT NULL,
  end_time      time NOT NULL,
  participants  integer NOT NULL CHECK (participants > 0),
  contact       text NOT NULL DEFAULT '',
  note          text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'menunggu'
                CHECK (status IN ('menunggu', 'disetujui', 'ditolak', 'dibatalkan')),
  created_at    timestamptz NOT NULL DEFAULT now(),
  decided_at    timestamptz,
  decided_by    uuid REFERENCES profiles (id) ON DELETE SET NULL,
  decision_note text NOT NULL DEFAULT '',
  CONSTRAINT reservations_time_valid CHECK (end_time > start_time)
);
CREATE INDEX IF NOT EXISTS reservations_room_date_idx ON reservations (room_id, date);
CREATE INDEX IF NOT EXISTS reservations_user_idx ON reservations (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS reservations_status_date_idx ON reservations (status, date);
CREATE INDEX IF NOT EXISTS reservations_date_idx ON reservations (date);

-- Kolom tujuan peminjaman ditambahkan untuk memisahkan tujuan kegiatan dari catatan tambahan.
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS reservation_history (
  id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  reservation_id uuid NOT NULL REFERENCES reservations (id) ON DELETE CASCADE,
  action         text NOT NULL,
  status         text,
  note           text NOT NULL DEFAULT '',
  actor_id       uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reservation_history_res_idx ON reservation_history (reservation_id, created_at);

CREATE TABLE IF NOT EXISTS activity_log (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  actor_id    uuid REFERENCES profiles (id) ON DELETE SET NULL,
  action      text NOT NULL,
  entity_type text NOT NULL,
  entity_id   text,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activity_log_created_idx ON activity_log (created_at DESC);
CREATE INDEX IF NOT EXISTS activity_log_entity_idx ON activity_log (entity_type, entity_id);

CREATE TABLE IF NOT EXISTS settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES profiles (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- Surat peminjaman
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS letter_settings (
  id                 smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  institution        text NOT NULL DEFAULT 'Institut Desain dan Bisnis Bali',
  unit               text NOT NULL DEFAULT 'Unit Peminjaman Ruangan',
  address            text NOT NULL DEFAULT 'Jl. Tukad Batanghari No. 29, Panjer, Denpasar, Bali 80225',
  phone              text NOT NULL DEFAULT '(0361) 8955649',
  email              text NOT NULL DEFAULT 'info@idbbali.ac.id',
  website            text NOT NULL DEFAULT 'www.idbbali.ac.id',
  city               text NOT NULL DEFAULT 'Denpasar',
  number_format      text NOT NULL DEFAULT '{seq}/{prefix}/{year}',
  number_prefix      text NOT NULL DEFAULT 'SPR-IDB',
  signatory_name     text NOT NULL DEFAULT 'Made Sari',
  signatory_position text NOT NULL DEFAULT 'Admin Reservasi',
  signatory_nip      text NOT NULL DEFAULT '',
  updated_at         timestamptz NOT NULL DEFAULT now(),
  updated_by         uuid REFERENCES profiles (id) ON DELETE SET NULL
);
INSERT INTO letter_settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS letters (
  id             uuid PRIMARY KEY,
  reservation_id uuid NOT NULL UNIQUE REFERENCES reservations (id) ON DELETE CASCADE,
  number         text NOT NULL UNIQUE,
  issued_at      timestamptz NOT NULL DEFAULT now(),
  issued_by      uuid REFERENCES profiles (id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS letters_issued_idx ON letters (issued_at DESC);

CREATE TABLE IF NOT EXISTS letter_counters (
  id         smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  last_value integer NOT NULL DEFAULT 0
);
INSERT INTO letter_counters (id, last_value) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Trigger updated_at
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_set_updated_at ON profiles;
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS rooms_set_updated_at ON rooms;
CREATE TRIGGER rooms_set_updated_at BEFORE UPDATE ON rooms
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
