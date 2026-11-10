import "server-only";
import { cache } from "react";
import type {
  ActivityEntry,
  HistoryEntry,
  Reservation,
  ReservationRoom,
  ReservationUser,
  Role,
  Room,
  Settings,
} from "@/lib/types";
import { query, queryOne } from "@/lib/db";
import { fmtDateShort, isoDate, normalizeTime, statusLabel } from "@/lib/format";

export const DEFAULT_SETTINGS: Settings = {
  openHour: "07:00",
  closeHour: "22:00",
  minHours: 1,
  maxHours: 4,
  windowDays: 30,
  cancelHours: 24,
  autoApprove: false,
  announcement: "Pengajuan diproses admin pada hari kerja, pukul 08.00–16.00.",
};

function asTimestamp(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asDate(value: unknown): string {
  if (value instanceof Date) return isoDate(value);
  return String(value ?? "").slice(0, 10);
}

interface RoomRow {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  status: "aktif" | "nonaktif";
  note: string;
}

interface FacilityRow {
  room_id: string;
  name: string;
}

export const getRooms = cache(async (includeInactive = false): Promise<Room[]> => {
  const rooms = await query<RoomRow>(
    `select id, code, name, building, floor, capacity, status, note
     from rooms ${includeInactive ? "" : "where status = 'aktif'"}
     order by name`,
  );
  const facilities = await query<FacilityRow>(
    `select rf.room_id, f.name
     from room_facilities rf
     join facilities f on f.id = rf.facility_id
     order by f.name`,
  );
  const byRoom = new Map<string, string[]>();
  for (const row of facilities) {
    const list = byRoom.get(row.room_id) ?? [];
    list.push(row.name);
    byRoom.set(row.room_id, list);
  }
  return rooms.map((room) => ({
    id: room.id,
    code: room.code,
    name: room.name,
    building: room.building,
    floor: Number(room.floor),
    capacity: Number(room.capacity),
    status: room.status,
    note: room.note,
    facilities: byRoom.get(room.id) ?? [],
  }));
});

export async function getRoomById(id: string): Promise<Room | null> {
  const rooms = await getRooms(true);
  return rooms.find((room) => room.id === id) ?? null;
}

export async function getFacilityNames(): Promise<string[]> {
  const rows = await query<{ name: string }>("select name from facilities order by name");
  return rows.map((r) => r.name);
}

export const getSettings = cache(async (): Promise<Settings> => {
  const rows = await query<{ key: string; value: unknown }>("select key, value from settings");
  const settings: Settings = { ...DEFAULT_SETTINGS };
  for (const row of rows) {
    const value = typeof row.value === "string" ? safeJson(row.value) : row.value;
    if (value === undefined || value === null) continue;
    switch (row.key) {
      case "openHour":
      case "closeHour":
        (settings as unknown as Record<string, unknown>)[row.key] = String(value);
        break;
      case "minHours":
      case "maxHours":
      case "windowDays":
      case "cancelHours":
        (settings as unknown as Record<string, unknown>)[row.key] = Number(value);
        break;
      case "autoApprove":
        settings.autoApprove = Boolean(value);
        break;
      case "announcement":
        settings.announcement = String(value);
        break;
      default:
        break;
    }
  }
  return settings;
});

function safeJson(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

interface ReservationRow {
  id: string;
  code: string;
  user_id: string;
  room_id: string;
  activity: string;
  category: Reservation["category"];
  date: unknown;
  start_time: unknown;
  end_time: unknown;
  participants: number;
  contact: string;
  purpose: string;
  note: string;
  status: Reservation["status"];
  created_at: unknown;
  decided_at: unknown;
  decided_by: string | null;
  decision_note: string;
  user_name: string;
  user_email: string;
  user_role: Role;
  user_identity: string | null;
  room_code: string;
  room_name: string;
  room_building: string;
  room_floor: number;
  room_capacity: number;
}

const RESERVATION_SELECT = `
  select r.id, r.code, r.user_id, r.room_id, r.activity, r.category, r.date,
         r.start_time, r.end_time, r.participants, r.contact, r.purpose, r.note, r.status,
         r.created_at, r.decided_at, r.decided_by, r.decision_note,
         u.full_name as user_name, u.email as user_email, u.role as user_role,
         u.identity as user_identity,
         rm.code as room_code, rm.name as room_name, rm.building as room_building,
         rm.floor as room_floor, rm.capacity as room_capacity
  from reservations r
  join profiles u on u.id = r.user_id
  join rooms rm on rm.id = r.room_id`;

function mapReservation(row: ReservationRow): Reservation {
  const user: ReservationUser = {
    id: row.user_id,
    fullName: row.user_name,
    email: row.user_email,
    role: row.user_role,
    identity: row.user_identity,
    initials: row.user_name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join(""),
  };
  const room: ReservationRoom = {
    id: row.room_id,
    code: row.room_code,
    name: row.room_name,
    building: row.room_building,
    floor: Number(row.room_floor),
    capacity: Number(row.room_capacity),
  };
  return {
    id: row.id,
    code: row.code,
    userId: row.user_id,
    roomId: row.room_id,
    activity: row.activity,
    category: row.category,
    date: asDate(row.date),
    start: normalizeTime(row.start_time),
    end: normalizeTime(row.end_time),
    participants: Number(row.participants),
    contact: row.contact,
    purpose: row.purpose ?? "",
    note: row.note,
    status: row.status,
    createdAt: asTimestamp(row.created_at),
    decidedAt: row.decided_at ? asTimestamp(row.decided_at) : null,
    decidedBy: row.decided_by,
    decisionNote: row.decision_note,
    user,
    room,
  };
}

export interface ReservationFilters {
  userId?: string;
  roomId?: string;
  status?: string;
  statuses?: string[];
  q?: string;
  date?: string;
  from?: string;
  to?: string;
  limit?: number;
}

export async function listReservations(filters: ReservationFilters = {}): Promise<Reservation[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filters.userId) {
    params.push(filters.userId);
    where.push(`r.user_id = $${params.length}`);
  }
  if (filters.roomId) {
    params.push(filters.roomId);
    where.push(`r.room_id = $${params.length}`);
  }
  if (filters.status && filters.status !== "semua") {
    params.push(filters.status);
    where.push(`r.status = $${params.length}`);
  }
  if (filters.statuses?.length) {
    const placeholders = filters.statuses.map((status) => {
      params.push(status);
      return `$${params.length}`;
    });
    where.push(`r.status in (${placeholders.join(", ")})`);
  }
  if (filters.date) {
    params.push(filters.date);
    where.push(`r.date = $${params.length}`);
  }
  if (filters.from) {
    params.push(filters.from);
    where.push(`r.date >= $${params.length}`);
  }
  if (filters.to) {
    params.push(filters.to);
    where.push(`r.date <= $${params.length}`);
  }
  if (filters.q) {
    params.push(`%${filters.q.toLowerCase()}%`);
    where.push(`(lower(r.code) like $${params.length} or lower(r.activity) like $${params.length}
      or lower(u.full_name) like $${params.length} or lower(rm.name) like $${params.length})`);
  }

  const sql = `${RESERVATION_SELECT}
    ${where.length ? `where ${where.join(" and ")}` : ""}
    order by r.date ${filters.from || filters.to ? "asc" : "desc"}, r.start_time asc
    limit ${Math.min(Number(filters.limit) || 200, 1000)}`;

  const rows = await query<ReservationRow>(sql, params);
  return rows.map(mapReservation);
}

export async function getReservation(id: string): Promise<Reservation | null> {
  const row = await queryOne<ReservationRow>(`${RESERVATION_SELECT} where r.id = $1`, [id]);
  if (!row) return null;
  const reservation = mapReservation(row);
  reservation.history = await getHistory(id);
  return reservation;
}

export async function getHistory(reservationId: string): Promise<HistoryEntry[]> {
  const rows = await query<{
    id: number;
    action: string;
    status: string | null;
    note: string;
    actor_id: string | null;
    actor_name: string | null;
    created_at: unknown;
  }>(
    `select h.id, h.action, h.status, h.note, h.actor_id, p.full_name as actor_name, h.created_at
     from reservation_history h
     left join profiles p on p.id = h.actor_id
     where h.reservation_id = $1
     order by h.created_at asc, h.id asc`,
    [reservationId],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    action: row.action,
    status: row.status,
    note: row.note,
    actorId: row.actor_id,
    actorName: row.actor_name,
    createdAt: asTimestamp(row.created_at),
  }));
}

export interface BookingSlot {
  id: string;
  code: string;
  activity: string;
  start: string;
  end: string;
  status: string;
  userId: string;
  userName: string;
}

export async function getBookings(roomId: string, date: string, ignoreId?: string): Promise<BookingSlot[]> {
  const rows = await query<{
    id: string;
    code: string;
    activity: string;
    start_time: unknown;
    end_time: unknown;
    status: string;
    user_id: string;
    user_name: string;
  }>(
    `select r.id, r.code, r.activity, r.start_time, r.end_time, r.status, r.user_id, u.full_name as user_name
     from reservations r join profiles u on u.id = r.user_id
     where r.room_id = $1 and r.date = $2 and r.status in ('menunggu','disetujui')
       and ($3::uuid is null or r.id <> $3::uuid)
     order by r.start_time`,
    [roomId, date, ignoreId ?? null],
  );
  return rows.map((row) => ({
    id: row.id,
    code: row.code,
    activity: row.activity,
    start: normalizeTime(row.start_time),
    end: normalizeTime(row.end_time),
    status: row.status,
    userId: row.user_id,
    userName: row.user_name,
  }));
}

export async function getApprovedConflicts(roomId: string, date: string, start: string, end: string, ignoreId: string) {
  return query<{ code: string; start_time: unknown; end_time: unknown }>(
    `select code, start_time, end_time from reservations
     where room_id = $1 and date = $2 and status = 'disetujui' and id <> $5
       and start_time < $4::time and end_time > $3::time`,
    [roomId, date, start, end, ignoreId],
  );
}

export async function getAudit(search?: string, limit = 60): Promise<ActivityEntry[]> {
  const params: unknown[] = [];
  let where = "";
  if (search) {
    params.push(`%${search.toLowerCase()}%`);
    where = `where lower(coalesce(p.full_name,'')) like $1 or lower(a.action) like $1
             or lower(coalesce(a.entity_id,'')) like $1 or lower(a.detail::text) like $1`;
  }
  const rows = await query<{
    id: number;
    actor_id: string | null;
    actor_name: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    detail: unknown;
    created_at: unknown;
  }>(
    `select a.id, a.actor_id, p.full_name as actor_name, a.action, a.entity_type,
            a.entity_id, a.detail, a.created_at
     from activity_log a left join profiles p on p.id = a.actor_id
     ${where}
     order by a.created_at desc, a.id desc
     limit $${params.length + 1}`,
    [...params, Math.min(limit, 200)],
  );
  return rows.map((row) => ({
    id: Number(row.id),
    actorId: row.actor_id,
    actorName: row.actor_name,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    detail: (typeof row.detail === "string" ? safeJson(row.detail) : row.detail) ?? {},
    createdAt: asTimestamp(row.created_at),
  }));
}

export async function listUsers() {
  const rows = await query<{
    id: string;
    full_name: string;
    email: string;
    role: Role;
    identity: string | null;
    program: string | null;
    created_at: unknown;
  }>(
    `select id, full_name, email, role, identity, program, created_at
     from profiles order by case role when 'admin' then 1 when 'dosen' then 2 else 3 end, full_name`,
  );
  return rows.map((row) => ({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    identity: row.identity,
    program: row.program,
    createdAt: asTimestamp(row.created_at),
  }));
}

export async function getStats() {
  const [rooms, today, pending, total, users, audit, mine] = await Promise.all([
    queryOne<{ count: number }>("select count(*)::int as count from rooms where status = 'aktif'"),
    queryOne<{ count: number }>(
      "select count(*)::int as count from reservations where date = current_date and status in ('menunggu','disetujui')",
    ),
    queryOne<{ count: number }>("select count(*)::int as count from reservations where status = 'menunggu'"),
    queryOne<{ count: number }>("select count(*)::int as count from reservations"),
    queryOne<{ count: number }>("select count(*)::int as count from profiles"),
    queryOne<{ count: number }>("select count(*)::int as count from activity_log"),
    queryOne<{ count: number }>(
      "select count(*)::int as count from reservations where status in ('menunggu','disetujui') and date >= current_date",
    ),
  ]);
  return {
    rooms: Number(rooms?.count ?? 0),
    today: Number(today?.count ?? 0),
    pending: Number(pending?.count ?? 0),
    total: Number(total?.count ?? 0),
    users: Number(users?.count ?? 0),
    audit: Number(audit?.count ?? 0),
    activeAll: Number(mine?.count ?? 0),
  };
}

export function reservationExportRow(reservation: Reservation) {
  return {
    code: reservation.code,
    activity: reservation.activity,
    room: reservation.room?.name,
    date: fmtDateShort(reservation.date),
    time: `${reservation.start}–${reservation.end}`,
    status: statusLabel(reservation.status),
  };
}
