import { randomBytes, randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "./password";
import { addDaysISO, nextBookableDay, todayISO } from "./format";
import { FACILITY_NAMES, ROOMS, SEED_RESERVATIONS, USERS } from "./demo-catalog";

export { FACILITY_NAMES, ROOMS, USERS };

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  openHour: "07:00",
  closeHour: "22:00",
  minHours: 1,
  maxHours: 4,
  windowDays: 30,
  cancelHours: 24,
  autoApprove: false,
  announcement: "Pengajuan diproses admin pada hari kerja, pukul 08.00-16.00.",
};

export async function seedIfEmpty(db: PGlite) {
  const existing = await db.query<{ count: number }>("select count(*)::int as count from profiles");
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  let password = process.env.SEED_PASSWORD;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    console.warn("[seed] SEED_PASSWORD belum diset. Kata sandi demo sementara: " + password);
  }
  const passwordHash = await hashPassword(password);

  const facilityIds = new Map<string, number>();
  for (const name of FACILITY_NAMES) {
    const result = await db.query<{ id: number }>(
      "insert into facilities (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
      [name],
    );
    facilityIds.set(name, result.rows[0].id);
  }

  const roomIds = new Map<string, string>();
  for (const room of ROOMS) {
    const id = randomUUID();
    roomIds.set(room.code, id);
    await db.query(
      `insert into rooms (id, code, name, building, floor, capacity, status, note)
       values ($1, $2, $3, $4, $5, $6, 'aktif', $7)`,
      [id, room.code, room.name, room.building, room.floor, room.capacity, room.note],
    );
    for (const facility of room.facilities) {
      const facilityId = facilityIds.get(facility);
      if (facilityId) {
        await db.query("insert into room_facilities (room_id, facility_id) values ($1, $2)", [id, facilityId]);
      }
    }
  }

  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const id = randomUUID();
    userIds.set(user.key, id);
    await db.query(
      `insert into profiles (id, email, password_hash, full_name, role, identity, program)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, user.email, passwordHash, user.name, user.role, user.identity, user.program],
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query(
      "insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing",
      [key, JSON.stringify(value)],
    );
  }

  await seedSampleReservations(db);
}

/**
 * Menyisipkan ulang contoh reservasi. Dipakai saat seeding awal dan reset demo.
 * Data ruang & pengguna harus sudah ada.
 */
export async function seedSampleReservations(db: PGlite) {
  const roomRows = await db.query<{ id: string; code: string }>("select id, code from rooms");
  const userRows = await db.query<{ id: string; email: string; role: string }>(
    "select id, email, role from profiles",
  );
  const roomByCode = new Map(roomRows.rows.map((row) => [row.code, row.id]));
  const userByEmail = new Map(userRows.rows.map((row) => [row.email, row.id]));
  const adminId = userRows.rows.find((row) => row.role === "admin")?.id;
  if (!adminId || roomByCode.size === 0 || userByEmail.size === 0) return;
  const emailByKey = new Map(USERS.map((user) => [user.key, user.email]));

  const year = new Date().getFullYear();
  let sequence = 0;

  for (const item of SEED_RESERVATIONS) {
    sequence += 1;
    const code = `RSV-${year}-${String(sequence).padStart(4, "0")}`;
    const date = nextBookableDay(addDaysISO(todayISO(), item.offset));
    const roomId = roomByCode.get(item.room);
    const userId = userByEmail.get(emailByKey.get(item.user) ?? "");
    if (!roomId || !userId) continue;
    const createdAt = new Date(Date.now() - item.createdDaysAgo * 86_400_000).toISOString();
    const decidedAt =
      item.status === "menunggu" ? null : new Date(Date.now() - (item.decidedDaysAgo ?? 1) * 86_400_000).toISOString();
    const decidedBy = item.status === "menunggu" ? null : item.cancelledByOwner ? userId : adminId;

    await db.query(
      `insert into reservations
        (id, code, user_id, room_id, activity, category, date, start_time, end_time, participants,
         contact, note, status, created_at, decided_at, decided_by, decision_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        randomUUID(), code, userId, roomId, item.activity, item.category, date, item.start, item.end,
        item.participants, item.contact, "", item.status, createdAt, decidedAt, decidedBy, item.note ?? "",
      ],
    );

    await db.query(
      `insert into reservation_history (reservation_id, action, status, note, actor_id, created_at)
       select id, 'Pengajuan dibuat', 'menunggu', 'Status awal: Menunggu', $2, $3
       from reservations where code = $1`,
      [code, userId, createdAt],
    );

    if (item.status !== "menunggu" && decidedAt) {
      const action = item.status === "disetujui" ? "Disetujui" : item.status === "ditolak" ? "Ditolak" : "Dibatalkan";
      await db.query(
        `insert into reservation_history (reservation_id, action, status, note, actor_id, created_at)
         select id, $2, $3, $4, $5, $6 from reservations where code = $1`,
        [code, action, item.status, item.note ?? "", decidedBy, decidedAt],
      );
    }

    const room = ROOMS.find((r) => r.code === item.room);
    await db.query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail, created_at)
       values ($1, 'Pengajuan dibuat', 'reservation', $2, $3::jsonb, $4)`,
      [userId, code, JSON.stringify({ room: room?.name, date, start: item.start, end: item.end }), createdAt],
    );
    if (item.status !== "menunggu" && decidedAt) {
      await db.query(
        `insert into activity_log (actor_id, action, entity_type, entity_id, detail, created_at)
         values ($1, $2, 'reservation', $3, $4::jsonb, $5)`,
        [decidedBy, item.status === "disetujui" ? "Disetujui" : item.status === "ditolak" ? "Ditolak" : "Dibatalkan",
          code, JSON.stringify({ note: item.note ?? "" }), decidedAt],
      );
    }
  }

  await db.query(
    `insert into reservation_counters (year, last_value) values ($1, $2)
     on conflict (year) do update set last_value = excluded.last_value`,
    [year, sequence],
  );
}
