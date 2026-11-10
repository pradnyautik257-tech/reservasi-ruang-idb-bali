-- ============================================================================
-- Supabase hardening: RLS + fungsi transaksi
-- Jalankan SETELAH lib/schema.sql disesuaikan:
--   * profiles.id  -> uuid primary key references auth.users(id) on delete cascade
--   * hapus kolom profiles.password_hash (Supabase Auth menangani kata sandi)
--   * kolom profiles.role tetap dipakai untuk otorisasi
-- ============================================================================

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_role() = 'admin', false);
$$;

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.facilities enable row level security;
alter table public.room_facilities enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_history enable row level security;
alter table public.activity_log enable row level security;
alter table public.settings enable row level security;
alter table public.sessions enable row level security;
alter table public.login_attempts enable row level security;

-- Profil: pemilik atau staf
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_staff());

drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

-- Ruang & fasilitas: semua pengguna login boleh membaca; admin menulis
drop policy if exists rooms_read on public.rooms;
create policy rooms_read on public.rooms for select to authenticated using (true);
drop policy if exists rooms_write on public.rooms;
create policy rooms_write on public.rooms for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists facilities_read on public.facilities;
create policy facilities_read on public.facilities for select to authenticated using (true);
drop policy if exists facilities_write on public.facilities;
create policy facilities_write on public.facilities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists room_facilities_read on public.room_facilities;
create policy room_facilities_read on public.room_facilities for select to authenticated using (true);
drop policy if exists room_facilities_write on public.room_facilities;
create policy room_facilities_write on public.room_facilities for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Reservasi: pemilik atau staf
drop policy if exists reservations_read on public.reservations;
create policy reservations_read on public.reservations
  for select to authenticated
  using (user_id = auth.uid() or public.is_staff());

drop policy if exists reservations_insert on public.reservations;
create policy reservations_insert on public.reservations
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.current_role() in ('mahasiswa', 'dosen')
    and status = 'menunggu'
  );

drop policy if exists reservations_update on public.reservations;
create policy reservations_update on public.reservations
  for update to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- Riwayat & audit
drop policy if exists history_read on public.reservation_history;
create policy history_read on public.reservation_history
  for select to authenticated
  using (
    public.is_staff()
    or exists (
      select 1 from public.reservations r
      where r.id = reservation_id and r.user_id = auth.uid()
    )
  );

drop policy if exists audit_read on public.activity_log;
create policy audit_read on public.activity_log
  for select to authenticated using (public.is_staff());

-- Pengaturan: semua membaca, admin menulis
drop policy if exists settings_read on public.settings;
create policy settings_read on public.settings for select to authenticated using (true);
drop policy if exists settings_write on public.settings;
create policy settings_write on public.settings for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- Tabel internal tidak diakses langsung dari klien
drop policy if exists sessions_deny on public.sessions;
create policy sessions_deny on public.sessions for all to authenticated using (false) with check (false);
drop policy if exists attempts_deny on public.login_attempts;
create policy attempts_deny on public.login_attempts for all to authenticated using (false) with check (false);

-- ---------------------------------------------------------------------------
-- RPC: buat reservasi dengan pemeriksaan bentrok atomik
-- ---------------------------------------------------------------------------
create or replace function public.create_reservation(
  p_room_id uuid,
  p_activity text,
  p_category text,
  p_date date,
  p_start time,
  p_end time,
  p_participants int,
  p_contact text,
  p_note text
)
returns table (id uuid, code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_status text := 'menunggu';
  v_code text;
  v_year int := extract(year from current_date)::int;
  v_seq int;
  v_id uuid := gen_random_uuid();
  v_clash record;
begin
  if v_user is null then
    raise exception 'Tidak terautentikasi';
  end if;
  if public.current_role() not in ('mahasiswa', 'dosen') then
    raise exception 'Peran tidak dapat membuat pengajuan';
  end if;

  -- kunci ruang agar dua transaksi tidak menyisipkan slot yang sama
  perform 1 from public.rooms where id = p_room_id for update;

  select code into v_clash from public.reservations
   where room_id = p_room_id and date = p_date
     and status in ('menunggu', 'disetujui')
     and start_time < p_end and end_time > p_start
   limit 1;

  if v_clash is not null then
    raise exception 'Jadwal bentrok dengan reservasi %', v_clash;
  end if;

  insert into public.reservation_counters (year, last_value)
  values (v_year, 1)
  on conflict (year) do update set last_value = public.reservation_counters.last_value + 1
  returning last_value into v_seq;

  v_code := 'RSV-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  insert into public.reservations
    (id, code, user_id, room_id, activity, category, date, start_time, end_time,
     participants, contact, note, status)
  values
    (v_id, v_code, v_user, p_room_id, p_activity, p_category, p_date, p_start, p_end,
     p_participants, coalesce(p_contact, ''), coalesce(p_note, ''), v_status);

  insert into public.reservation_history (reservation_id, action, status, note, actor_id)
  values (v_id, 'Pengajuan dibuat', v_status, 'Status awal: Menunggu', v_user);

  insert into public.activity_log (actor_id, action, entity_type, entity_id, detail)
  values (v_user, 'Pengajuan dibuat', 'reservation', v_code,
          jsonb_build_object('date', p_date, 'start', p_start, 'end', p_end));

  return query select v_id, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: keputusan admin (setujui/tolak/batalkan)
-- ---------------------------------------------------------------------------
create or replace function public.decide_reservation(
  p_id uuid,
  p_status text,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_res public.reservations%rowtype;
  v_clash text;
begin
  if not public.is_admin() then
    raise exception 'Hanya admin reservasi yang dapat memutuskan';
  end if;
  if p_status not in ('disetujui', 'ditolak', 'dibatalkan') then
    raise exception 'Status tidak valid';
  end if;

  select * into v_res from public.reservations where id = p_id for update;
  if not found then
    raise exception 'Pengajuan tidak ditemukan';
  end if;

  if p_status = 'disetujui' and v_res.status <> 'menunggu' then
    raise exception 'Transisi status tidak valid';
  end if;

  if p_status = 'disetujui' then
    select code into v_clash from public.reservations
     where room_id = v_res.room_id and date = v_res.date and status = 'disetujui'
       and id <> v_res.id and start_time < v_res.end_time and end_time > v_res.start_time
     limit 1;
    if v_clash is not null then
      raise exception 'Slot sudah disetujui oleh %', v_clash;
    end if;
  end if;

  update public.reservations
     set status = p_status, decided_at = now(), decided_by = v_user, decision_note = coalesce(p_note, '')
   where id = p_id;

  insert into public.reservation_history (reservation_id, action, status, note, actor_id)
  values (p_id, initcap(p_status), p_status, coalesce(p_note, ''), v_user);

  insert into public.activity_log (actor_id, action, entity_type, entity_id, detail)
  values (v_user, initcap(p_status), 'reservation', v_res.code, jsonb_build_object('note', coalesce(p_note, '')));
end;
$$;

revoke all on function public.create_reservation(uuid, text, text, date, time, time, int, text, text) from public;
grant execute on function public.create_reservation(uuid, text, text, date, time, time, int, text, text) to authenticated;
revoke all on function public.decide_reservation(uuid, text, text) from public;
grant execute on function public.decide_reservation(uuid, text, text) to authenticated;
