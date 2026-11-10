"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { roomSchema } from "@/lib/validation";
import { query, withTransaction, type DbClient } from "@/lib/db";
import type { ActionResult, RoomInput } from "@/lib/types";

function zodErrors(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

function revalidateRooms() {
  for (const path of ["/", "/ruang", "/admin"]) revalidatePath(path);
}

async function ensureFacility(client: DbClient, name: string): Promise<number> {
  const existing = await client.query<{ id: number }>("select id from facilities where name = $1", [name]);
  if (existing.rows[0]) return Number(existing.rows[0].id);
  const created = await client.query<{ id: number }>(
    "insert into facilities (name) values ($1) returning id",
    [name],
  );
  return Number(created.rows[0].id);
}

export async function saveRoomAction(input: RoomInput): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") return { ok: false, message: "Hanya admin reservasi yang dapat mengubah data ruang." };

  const parsed = roomSchema.safeParse({
    code: input.code,
    name: input.name,
    building: input.building,
    floor: input.floor,
    capacity: input.capacity,
    status: input.status,
    note: input.note ?? "",
    facilities: input.facilities ?? [],
  });

  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali data ruang.", fieldErrors: zodErrors(parsed.error) };
  }

  const data = parsed.data;

  try {
    const id = await withTransaction(async (client) => {
      let roomId = input.id;
      if (roomId) {
        const existing = await client.query<{ id: string }>("select id from rooms where id = $1", [roomId]);
        if (!existing.rows[0]) throw new Error("NOT_FOUND");
        await client.query(
          `update rooms set code = $2, name = $3, building = $4, floor = $5, capacity = $6,
                  status = $7, note = $8
           where id = $1`,
          [roomId, data.code.toUpperCase(), data.name, data.building, data.floor, data.capacity, data.status, data.note ?? ""],
        );
      } else {
        roomId = randomUUID();
        await client.query(
          `insert into rooms (id, code, name, building, floor, capacity, status, note)
           values ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [roomId, data.code.toUpperCase(), data.name, data.building, data.floor, data.capacity, data.status, data.note ?? ""],
        );
      }

      await client.query("delete from room_facilities where room_id = $1", [roomId]);
      for (const facility of data.facilities) {
        const facilityId = await ensureFacility(client, facility);
        await client.query(
          "insert into room_facilities (room_id, facility_id) values ($1, $2) on conflict do nothing",
          [roomId, facilityId],
        );
      }

      await client.query(
        `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
         values ($1, $2, 'room', $3, $4::jsonb)`,
        [
          user.id,
          input.id ? "Data ruang diperbarui" : "Ruang ditambahkan",
          data.code.toUpperCase(),
          JSON.stringify({ name: data.name, capacity: data.capacity, facilities: data.facilities }),
        ],
      );

      return roomId;
    });

    revalidateRooms();
    return { ok: true, data: { id } };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      return { ok: false, message: "Kode ruangan sudah dipakai.", fieldErrors: { code: "Kode ini sudah dipakai ruang lain." } };
    }
    if ((error as Error).message === "NOT_FOUND") {
      return { ok: false, message: "Ruangan tidak ditemukan. Muat ulang halaman." };
    }
    console.error("[saveRoom] gagal:", error);
    return { ok: false, message: "Data ruang tidak dapat disimpan saat ini. Coba lagi." };
  }
}

export async function toggleRoomStatusAction(id: string, status: "aktif" | "nonaktif"): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") return { ok: false, message: "Hanya admin reservasi yang dapat mengubah status ruang." };

  try {
    const rows = await query<{ code: string; name: string }>("select code, name from rooms where id = $1", [id]);
    if (!rows[0]) return { ok: false, message: "Ruangan tidak ditemukan." };
    await query("update rooms set status = $2 where id = $1", [id, status]);
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, $2, 'room', $3, $4::jsonb)`,
      [user.id, status === "aktif" ? "Ruang diaktifkan" : "Ruang dinonaktifkan", rows[0].code, JSON.stringify({ name: rows[0].name })],
    );
    revalidateRooms();
    return { ok: true, data: null };
  } catch (error) {
    console.error("[toggleRoom] gagal:", error);
    return { ok: false, message: "Status ruang tidak dapat diubah saat ini." };
  }
}
