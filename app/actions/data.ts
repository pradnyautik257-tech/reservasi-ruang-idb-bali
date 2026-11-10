"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getDb, query } from "@/lib/db";
import { seedSampleReservations } from "@/lib/seed";
import type { ActionResult } from "@/lib/types";

export async function resetDemoAction(): Promise<ActionResult<{ count: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin reservasi yang dapat mereset data demo." };
  }

  try {
    await query("delete from reservations");
    await query("delete from activity_log");
    await query("delete from reservation_counters");

    const db = await getDb();
    await seedSampleReservations(db);

    const rows = await query<{ count: number }>("select count(*)::int as count from reservations");
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Data demo direset', 'system', 'demo', $2::jsonb)`,
      [user.id, JSON.stringify({ reservations: Number(rows[0]?.count ?? 0) })],
    );

    for (const path of [
      "/",
      "/ruang",
      "/reservasi",
      "/jadwal",
      "/surat",
      "/admin",
      "/admin/pengajuan",
      "/admin/jadwal",
      "/admin/surat",
      "/admin/pengaturan",
    ]) {
      revalidatePath(path);
    }
    return { ok: true, data: { count: Number(rows[0]?.count ?? 0) } };
  } catch (error) {
    console.error("[resetDemo] gagal:", error);
    return { ok: false, message: "Data demo tidak dapat direset saat ini. Coba lagi." };
  }
}
