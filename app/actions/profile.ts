"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { passwordSchema, profileSchema } from "@/lib/validation";
import type { ActionResult } from "@/lib/types";

function fieldErrors(issues: { path: PropertyKey[]; message: string }[]) {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

export async function updateProfileAction(input: unknown): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };

  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali data profil.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  try {
    await query(
      `update profiles set full_name = $2, identity = $3, program = $4, updated_at = now()
       where id = $1`,
      [user.id, parsed.data.fullName, parsed.data.identity || null, parsed.data.program || null],
    );
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Profil diperbarui', 'profile', $2, $3::jsonb)`,
      [user.id, user.email, JSON.stringify({ fullName: parsed.data.fullName })],
    );
    revalidatePath("/", "layout");
    return { ok: true, data: null };
  } catch (error) {
    console.error("[profile] gagal memperbarui:", error);
    return { ok: false, message: "Profil belum dapat disimpan. Coba lagi." };
  }
}

export async function changePasswordAction(input: unknown): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };

  const parsed = passwordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "Periksa kembali kata sandi.", fieldErrors: fieldErrors(parsed.error.issues) };
  }

  try {
    const row = await queryOne<{ password_hash: string }>("select password_hash from profiles where id = $1", [user.id]);
    if (!row) return { ok: false, message: "Akun tidak ditemukan." };
    const valid = await verifyPassword(parsed.data.currentPassword, row.password_hash);
    if (!valid) {
      return {
        ok: false,
        message: "Kata sandi saat ini tidak sesuai.",
        fieldErrors: { currentPassword: "Kata sandi saat ini tidak sesuai." },
      };
    }

    const nextHash = await hashPassword(parsed.data.newPassword);
    await query("update profiles set password_hash = $2, updated_at = now() where id = $1", [user.id, nextHash]);
    await query("delete from sessions where user_id = $1", [user.id]);
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Kata sandi diubah', 'profile', $2, '{}'::jsonb)`,
      [user.id, user.email],
    );
    return { ok: true, data: null };
  } catch (error) {
    console.error("[profile] gagal mengganti kata sandi:", error);
    return { ok: false, message: "Kata sandi belum dapat diubah. Coba lagi." };
  }
}
