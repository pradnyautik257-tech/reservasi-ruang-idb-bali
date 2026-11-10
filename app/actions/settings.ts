"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { settingsSchema } from "@/lib/validation";
import { query } from "@/lib/db";
import type { ActionResult } from "@/lib/types";

export async function updateSettingsAction(input: unknown): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin reservasi yang dapat mengubah pengaturan sistem." };
  }

  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Periksa kembali pengaturan.", fieldErrors };
  }

  try {
    const values = parsed.data;
    for (const [key, value] of Object.entries(values)) {
      await query(
        `insert into settings (key, value, updated_at, updated_by) values ($1, $2::jsonb, now(), $3)
         on conflict (key) do update set value = excluded.value, updated_at = now(), updated_by = excluded.updated_by`,
        [key, JSON.stringify(value), user.id],
      );
    }
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Pengaturan diperbarui', 'settings', 'system', $2::jsonb)`,
      [user.id, JSON.stringify(values)],
    );
    for (const path of ["/", "/ruang", "/reservasi/baru", "/admin"]) revalidatePath(path);
    return { ok: true, data: null };
  } catch (error) {
    console.error("[updateSettings] gagal:", error);
    return { ok: false, message: "Pengaturan tidak dapat disimpan saat ini. Coba lagi." };
  }
}
