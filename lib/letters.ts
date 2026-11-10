import "server-only";
import { randomUUID } from "node:crypto";
import { query, queryOne, withTransaction, type DbClient } from "@/lib/db";
import type { Letter, LetterListItem, LetterSettings, ReservationStatus } from "@/lib/types";
import { DEFAULT_LETTER_SETTINGS, formatLetterNumber } from "@/lib/letter-format";
import { isoDate, normalizeTime } from "@/lib/format";

interface LetterSettingsRow {
  institution: string;
  unit: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  number_format: string;
  number_prefix: string;
  signatory_name: string;
  signatory_position: string;
  signatory_nip: string;
}

function asTimestamp(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function mapSettings(row: LetterSettingsRow | null): LetterSettings {
  if (!row) return { ...DEFAULT_LETTER_SETTINGS };
  return {
    institution: row.institution,
    unit: row.unit,
    address: row.address,
    phone: row.phone,
    email: row.email,
    website: row.website,
    city: row.city,
    numberFormat: row.number_format,
    numberPrefix: row.number_prefix,
    signatoryName: row.signatory_name,
    signatoryPosition: row.signatory_position,
    signatoryNip: row.signatory_nip,
  };
}

export async function getLetterSettings(): Promise<LetterSettings> {
  const row = await queryOne<LetterSettingsRow>("select * from letter_settings where id = 1");
  return mapSettings(row);
}

interface LetterRow {
  id: string;
  reservation_id: string;
  number: string;
  issued_at: unknown;
  issued_by: string | null;
  issued_by_name?: string | null;
}

function mapLetter(row: LetterRow): Letter {
  return {
    id: row.id,
    reservationId: row.reservation_id,
    number: row.number,
    issuedAt: asTimestamp(row.issued_at),
    issuedBy: row.issued_by,
    issuedByName: row.issued_by_name ?? null,
  };
}

export async function getLetterForReservation(reservationId: string): Promise<Letter | null> {
  const row = await queryOne<LetterRow>(
    `select l.id, l.reservation_id, l.number, l.issued_at, l.issued_by, p.full_name as issued_by_name
     from letters l left join profiles p on p.id = l.issued_by
     where l.reservation_id = $1`,
    [reservationId],
  );
  return row ? mapLetter(row) : null;
}

/**
 * Terbitkan surat di dalam transaksi. Aman dipanggil berulang (idempoten per reservasi).
 * Mengembalikan null bila peminjaman belum/tidak disetujui.
 */
export async function issueLetter(
  client: DbClient,
  reservationId: string,
  actorId: string,
): Promise<Letter | null> {
  const reservationResult = await client.query<{ id: string; code: string; status: string }>(
    "select id, code, status from reservations where id = $1",
    [reservationId],
  );
  const reservation = reservationResult.rows[0];
  if (!reservation || reservation.status !== "disetujui") return null;

  const existing = await client.query<LetterRow>(
    `select l.id, l.reservation_id, l.number, l.issued_at, l.issued_by, p.full_name as issued_by_name
     from letters l left join profiles p on p.id = l.issued_by
     where l.reservation_id = $1`,
    [reservationId],
  );
  if (existing.rows[0]) return mapLetter(existing.rows[0]);

  const settingsResult = await client.query<LetterSettingsRow>("select * from letter_settings where id = 1");
  const settings = mapSettings(settingsResult.rows[0] ?? null);

  const counter = await client.query<{ last_value: number }>(
    `insert into letter_counters (id, last_value) values (1, 1)
     on conflict (id) do update set last_value = letter_counters.last_value + 1
     returning last_value`,
  );
  const number = formatLetterNumber(settings, Number(counter.rows[0].last_value));
  const id = randomUUID();

  const inserted = await client.query<LetterRow>(
    `insert into letters (id, reservation_id, number, issued_by)
     values ($1, $2, $3, $4)
     returning id, reservation_id, number, issued_at, issued_by`,
    [id, reservationId, number, actorId],
  );

  await client.query(
    `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
     values ($1, 'Surat diterbitkan', 'letter', $2, $3::jsonb)`,
    [actorId, number, JSON.stringify({ reservation: reservation.code, number })],
  );

  return mapLetter(inserted.rows[0]);
}

export async function ensureLetterForReservation(
  reservationId: string,
  actorId: string,
): Promise<Letter | null> {
  return withTransaction((client) => issueLetter(client, reservationId, actorId));
}

export async function listLetters(limit = 100, userId?: string): Promise<LetterListItem[]> {
  const rows = await query<{
    id: string;
    reservation_id: string;
    number: string;
    issued_at: unknown;
    issued_by: string | null;
    issued_by_name: string | null;
    reservation_code: string;
    reservation_status: ReservationStatus;
    activity: string;
    date: unknown;
    start_time: unknown;
    end_time: unknown;
    borrower_name: string;
    room_name: string;
  }>(
    `select l.id, l.reservation_id, l.number, l.issued_at, l.issued_by,
            p.full_name as issued_by_name,
            r.code as reservation_code, r.status as reservation_status, r.activity,
            r.date, r.start_time, r.end_time,
            u.full_name as borrower_name, rm.name as room_name
     from letters l
     join reservations r on r.id = l.reservation_id
     join profiles u on u.id = r.user_id
     join rooms rm on rm.id = r.room_id
     left join profiles p on p.id = l.issued_by
     ${userId ? "where r.user_id = $1" : ""}
     order by l.issued_at desc, l.number desc
     limit $${userId ? 2 : 1}`,
    userId ? [userId, Math.min(limit, 300)] : [Math.min(limit, 300)],
  );

  return rows.map((row) => ({
    id: row.id,
    reservationId: row.reservation_id,
    number: row.number,
    issuedAt: asTimestamp(row.issued_at),
    issuedBy: row.issued_by,
    issuedByName: row.issued_by_name,
    reservationCode: row.reservation_code,
    reservationStatus: row.reservation_status,
    activity: row.activity,
    date: row.date instanceof Date ? isoDate(row.date) : String(row.date ?? "").slice(0, 10),
    start: normalizeTime(row.start_time),
    end: normalizeTime(row.end_time),
    borrowerName: row.borrower_name,
    roomName: row.room_name,
  }));
}

/** Terbitkan surat untuk peminjaman disetujui yang belum memiliki surat (data lama/impor). */
export async function ensureMissingLetters(actorId: string, limit = 50): Promise<number> {
  const rows = await query<{ id: string }>(
    `select r.id from reservations r
     where r.status = 'disetujui'
       and not exists (select 1 from letters l where l.reservation_id = r.id)
     order by r.date asc
     limit $1`,
    [limit],
  );
  let issued = 0;
  for (const row of rows) {
    const letter = await ensureLetterForReservation(row.id, actorId);
    if (letter) issued += 1;
  }
  return issued;
}
