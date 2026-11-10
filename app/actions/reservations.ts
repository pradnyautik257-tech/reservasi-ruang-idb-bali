"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getApprovedConflicts, getBookings, getReservation, getRoomById, getSettings } from "@/lib/data";
import { validateReservation } from "@/lib/validation";
import { query, withTransaction, type DbClient } from "@/lib/db";
import { issueLetter } from "@/lib/letters";
import { normalizeTime, toMinutes } from "@/lib/format";
import type { ActionResult, Reservation, ReservationInput, ReservationStatus } from "@/lib/types";

const BOOK_ROLES = ["mahasiswa", "dosen"];

function revalidateAll() {
  for (const path of ["/", "/ruang", "/reservasi", "/jadwal", "/surat", "/admin", "/admin/pengajuan", "/admin/jadwal", "/admin/surat"]) {
    revalidatePath(path);
  }
}

async function nextCode(client: DbClient): Promise<string> {
  const year = new Date().getFullYear();
  const result = await client.query<{ last_value: number }>(
    `insert into reservation_counters (year, last_value) values ($1, 1)
     on conflict (year) do update set last_value = reservation_counters.last_value + 1
     returning last_value`,
    [year],
  );
  const value = Number(result.rows[0].last_value);
  return `RSV-${year}-${String(value).padStart(4, "0")}`;
}

async function writeLog(
  client: DbClient,
  actorId: string,
  action: string,
  entity: string,
  detail: Record<string, unknown>,
) {
  await client.query(
    `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
     values ($1, $2, 'reservation', $3, $4::jsonb)`,
    [actorId, action, entity, JSON.stringify(detail)],
  );
}

export async function createReservationAction(
  input: ReservationInput,
): Promise<ActionResult<{ id: string; code: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (!BOOK_ROLES.includes(user.role)) {
    return { ok: false, message: "Peran Anda tidak dapat membuat pengajuan reservasi." };
  }

  try {
    const settings = await getSettings();
    const room = await getRoomById(input.roomId);
    const existing = room ? await getBookings(room.id, input.date) : [];
    const conflicts = existing
      .filter((b) => {
        const start = toMinutes(input.start);
        const end = toMinutes(input.end);
        return start < toMinutes(b.end) && end > toMinutes(b.start);
      })
      .map((b) => ({ code: b.code, start: b.start, end: b.end }));

    const validation = validateReservation(input, settings, room, conflicts);
    if (!validation.ok) {
      return {
        ok: false,
        message: "Ada isian yang perlu diperbaiki.",
        fieldErrors: validation.fieldErrors,
      };
    }

    const approved = settings.autoApprove;
    const created = await withTransaction(async (client) => {
      await client.query("select id from rooms where id = $1 for update", [input.roomId]);

      const clashes = await client.query<{ code: string; start_time: unknown; end_time: unknown }>(
        `select code, start_time, end_time from reservations
         where room_id = $1 and date = $2 and status in ('menunggu', 'disetujui')
           and start_time < $4::time and end_time > $3::time`,
        [input.roomId, input.date, input.start, input.end],
      );

      if (clashes.rows.length > 0) {
        const first = clashes.rows[0];
        return {
          ok: false as const,
          message: "Jadwal baru saja terisi. Pilih waktu atau ruang lain.",
          fieldErrors: {
            end: `Ruang sudah dipakai ${normalizeTime(first.start_time).replace(":", ".")}–${normalizeTime(first.end_time).replace(":", ".")} (${first.code}).`,
          },
        };
      }

      const code = await nextCode(client);
      const status: ReservationStatus = approved ? "disetujui" : "menunggu";
      const inserted = await client.query<{ id: string }>(
        `insert into reservations
          (id, code, user_id, room_id, activity, category, date, start_time, end_time,
           participants, contact, purpose, note, status, decided_at, decided_by, decision_note)
         values (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
                 $14, $15, $16)
         returning id`,
        [
          code,
          user.id,
          input.roomId,
          String(input.activity).trim(),
          input.category,
          input.date,
          input.start,
          input.end,
          Number(input.participants),
          String(input.contact ?? "").trim(),
          String(input.purpose ?? "").trim(),
          String(input.note ?? "").trim(),
          status,
          approved ? new Date().toISOString() : null,
          approved ? user.id : null,
          approved ? "Disetujui otomatis sesuai pengaturan kampus." : "",
        ],
      );

      const id = inserted.rows[0].id;
      await client.query(
        `insert into reservation_history (reservation_id, action, status, note, actor_id)
         values ($1, 'Pengajuan dibuat', $2, $3, $4)`,
        [id, status, approved ? "Disetujui otomatis" : "Status awal: Menunggu", user.id],
      );
      await writeLog(client, user.id, "Pengajuan dibuat", code, {
        room: room?.name,
        date: input.date,
        start: input.start,
        end: input.end,
        status,
      });

      return { ok: true as const, data: { id, code } };
    });

    if (!created.ok) return created;
    revalidateAll();
    return { ok: true, data: created.data };
  } catch (error) {
    console.error("[createReservation] gagal:", error);
    return {
      ok: false,
      message: "Pengajuan tidak dapat disimpan karena gangguan sistem. Data Anda belum tersimpan — coba lagi.",
    };
  }
}

export async function fetchBookingsAction(
  roomId: string,
  date: string,
): Promise<ActionResult<{ bookings: { code: string; start: string; end: string; status: string; activity: string }[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi berakhir. Muat ulang halaman." };
  try {
    const bookings = await getBookings(roomId, date);
    return {
      ok: true,
      data: {
        bookings: bookings.map((b) => ({
          code: b.code,
          start: b.start,
          end: b.end,
          status: b.status,
          activity: b.activity,
        })),
      },
    };
  } catch (error) {
    console.error("[fetchBookings] gagal:", error);
    return { ok: false, message: "Ketersediaan ruang tidak dapat dimuat. Coba lagi." };
  }
}

export async function cancelReservationAction(id: string, note: string): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  const trimmed = String(note ?? "").trim();
  if (trimmed.length < 3) return { ok: false, message: "Tuliskan alasan pembatalan minimal 3 karakter." };

  try {
    const reservation = await getReservation(id);
    if (!reservation) return { ok: false, message: "Pengajuan tidak ditemukan." };
    if (reservation.status !== "menunggu") {
      return {
        ok: false,
        message:
          reservation.status === "dibatalkan" || reservation.status === "ditolak"
            ? "Pengajuan ini sudah berstatus akhir dan tidak dapat dibatalkan."
            : "Pembatalan hanya tersedia selama pengajuan masih menunggu.",
      };
    }
    if (user.role !== "admin" && reservation.userId !== user.id) {
      return { ok: false, message: "Anda tidak berwenang membatalkan pengajuan ini." };
    }

    await withTransaction(async (client) => {
      await client.query(
        `update reservations set status = 'dibatalkan', decided_at = now(), decided_by = $2, decision_note = $3
         where id = $1`,
        [id, user.id, trimmed],
      );
      await client.query(
        `insert into reservation_history (reservation_id, action, status, note, actor_id)
         values ($1, 'Dibatalkan', 'dibatalkan', $2, $3)`,
        [id, trimmed, user.id],
      );
      await writeLog(client, user.id, "Dibatalkan", reservation.code, {
        room: reservation.room?.name,
        date: reservation.date,
        note: trimmed,
      });
    });

    revalidateAll();
    return { ok: true, data: null };
  } catch (error) {
    console.error("[cancelReservation] gagal:", error);
    return { ok: false, message: "Pembatalan tidak dapat diproses saat ini. Coba lagi." };
  }
}

export async function decideReservationAction(
  id: string,
  decision: "disetujui" | "ditolak" | "dibatalkan",
  note: string,
): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") return { ok: false, message: "Hanya admin reservasi yang dapat memutuskan pengajuan." };

  const trimmed = String(note ?? "").trim();
  if (decision !== "disetujui" && trimmed.length < 3) {
    return { ok: false, message: "Alasan wajib diisi minimal 3 karakter." };
  }

  try {
    const reservation = await getReservation(id);
    if (!reservation) return { ok: false, message: "Pengajuan tidak ditemukan." };

    const allowedFrom: Record<string, ReservationStatus[]> = {
      disetujui: ["menunggu"],
      ditolak: ["menunggu"],
      dibatalkan: ["menunggu", "disetujui"],
    };
    if (!allowedFrom[decision]?.includes(reservation.status)) {
      return { ok: false, message: "Status pengajuan sudah berubah. Muat ulang halaman." };
    }

    if (decision === "disetujui") {
      const clashes = await getApprovedConflicts(
        reservation.roomId,
        reservation.date,
        reservation.start,
        reservation.end,
        reservation.id,
      );
      if (clashes.length > 0) {
        const first = clashes[0];
        return {
          ok: false,
          message: `Tidak dapat disetujui: ${first.code} sudah disetujui pada ${normalizeTime(first.start_time).replace(":", ".")}–${normalizeTime(first.end_time).replace(":", ".")}.`,
        };
      }
    }

    await withTransaction(async (client) => {
      await client.query(
        `update reservations set status = $2, decided_at = now(), decided_by = $3, decision_note = $4
         where id = $1`,
        [id, decision, user.id, trimmed],
      );
      await client.query(
        `insert into reservation_history (reservation_id, action, status, note, actor_id)
         values ($1, $2, $3, $4, $5)`,
        [
          id,
          decision === "disetujui" ? "Disetujui" : decision === "ditolak" ? "Ditolak" : "Dibatalkan",
          decision,
          trimmed,
          user.id,
        ],
      );
      await writeLog(client, user.id, decision === "disetujui" ? "Disetujui" : decision === "ditolak" ? "Ditolak" : "Dibatalkan", reservation.code, {
        room: reservation.room?.name,
        date: reservation.date,
        note: trimmed,
      });

      if (decision === "disetujui") {
        await issueLetter(client, id, user.id);
      }
    });

    revalidateAll();
    return { ok: true, data: null };
  } catch (error) {
    console.error("[decideReservation] gagal:", error);
    return { ok: false, message: "Keputusan tidak dapat disimpan saat ini. Coba lagi." };
  }
}

export async function getReservationDetailAction(id: string): Promise<ActionResult<Reservation>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  try {
    const reservation = await getReservation(id);
    if (!reservation) return { ok: false, message: "Pengajuan tidak ditemukan." };
    if (user.role !== "admin" && reservation.userId !== user.id) {
      return { ok: false, message: "Anda tidak berwenang melihat pengajuan ini." };
    }
    return { ok: true, data: reservation };
  } catch (error) {
    console.error("[getReservationDetail] gagal:", error);
    return { ok: false, message: "Detail pengajuan tidak dapat dimuat. Coba lagi." };
  }
}

export async function getReservationConflictsAction(
  id: string,
): Promise<ActionResult<{ approved: { code: string; start: string; end: string; activity: string }[]; pending: { code: string; start: string; end: string; activity: string }[] }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin yang dapat memeriksa konflik jadwal." };
  }
  try {
    const reservation = await getReservation(id);
    if (!reservation) return { ok: false, message: "Pengajuan tidak ditemukan." };
    const bookings = await getBookings(reservation.roomId, reservation.date, reservation.id);
    const clashes = bookings.filter((booking) => {
      const start = toMinutes(reservation.start);
      const end = toMinutes(reservation.end);
      return start < toMinutes(booking.end) && end > toMinutes(booking.start);
    });
    return {
      ok: true,
      data: {
        approved: clashes
          .filter((item) => item.status === "disetujui")
          .map((item) => ({ code: item.code, start: item.start, end: item.end, activity: item.activity })),
        pending: clashes
          .filter((item) => item.status === "menunggu")
          .map((item) => ({ code: item.code, start: item.start, end: item.end, activity: item.activity })),
      },
    };
  } catch (error) {
    console.error("[getReservationConflicts] gagal:", error);
    return { ok: false, message: "Konflik jadwal tidak dapat diperiksa saat ini." };
  }
}

export async function getBookingsForForm(roomId: string, date: string) {
  return getBookings(roomId, date);
}

export async function countBookings(roomId: string, date: string) {
  const rows = await query<{ count: number }>(
    "select count(*)::int as count from reservations where room_id = $1 and date = $2",
    [roomId, date],
  );
  return Number(rows[0]?.count ?? 0);
}
