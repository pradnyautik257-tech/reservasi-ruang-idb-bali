"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { query } from "@/lib/db";
import { letterSettingsSchema } from "@/lib/validation";
import { ensureLetterForReservation, ensureMissingLetters } from "@/lib/letters";
import type { ActionResult } from "@/lib/types";

function revalidateLetters() {
  for (const path of ["/admin", "/reservasi", "/"]) revalidatePath(path);
}

export async function updateLetterSettingsAction(input: unknown): Promise<ActionResult<null>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin yang dapat mengubah pengaturan surat resmi." };
  }

  const parsed = letterSettingsSchema.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Periksa kembali pengaturan surat.", fieldErrors };
  }

  const data = parsed.data;

  try {
    await query(
      `update letter_settings set
         institution = $1, unit = $2, address = $3, phone = $4, email = $5, website = $6,
         city = $7, number_format = $8, number_prefix = $9, signatory_name = $10,
         signatory_position = $11, signatory_nip = $12, updated_at = now(), updated_by = $13
       where id = 1`,
      [
        data.institution,
        data.unit ?? "",
        data.address ?? "",
        data.phone ?? "",
        data.email ?? "",
        data.website ?? "",
        data.city ?? "",
        data.numberFormat,
        data.numberPrefix,
        data.signatoryName ?? "",
        data.signatoryPosition ?? "",
        data.signatoryNip ?? "",
        user.id,
      ],
    );

    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Pengaturan surat diperbarui', 'letter_settings', 'kop-surat', $2::jsonb)`,
      [
        user.id,
        JSON.stringify({
          institution: data.institution,
          numberFormat: data.numberFormat,
          numberPrefix: data.numberPrefix,
          signatory: data.signatoryName,
        }),
      ],
    );

    revalidateLetters();
    return { ok: true, data: null };
  } catch (error) {
    console.error("[updateLetterSettings] gagal:", error);
    return { ok: false, message: "Pengaturan surat tidak dapat disimpan saat ini. Coba lagi." };
  }
}

export async function issueMissingLettersAction(): Promise<ActionResult<{ count: number }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin yang dapat menerbitkan surat." };
  }

  try {
    const count = await ensureMissingLetters(user.id);
    revalidateLetters();
    return { ok: true, data: { count } };
  } catch (error) {
    console.error("[issueMissingLetters] gagal:", error);
    return { ok: false, message: "Surat tertunda tidak dapat diterbitkan saat ini." };
  }
}

export async function issueLetterForReservationAction(reservationId: string): Promise<ActionResult<{ number: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sesi Anda berakhir. Silakan masuk kembali." };
  if (user.role !== "admin") {
    return { ok: false, message: "Hanya admin yang dapat menerbitkan surat." };
  }

  try {
    const letter = await ensureLetterForReservation(reservationId, user.id);
    if (!letter) {
      return { ok: false, message: "Surat hanya dapat diterbitkan untuk peminjaman yang sudah disetujui." };
    }
    revalidateLetters();
    return { ok: true, data: { number: letter.number } };
  } catch (error) {
    console.error("[issueLetterForReservation] gagal:", error);
    return { ok: false, message: "Surat tidak dapat diterbitkan saat ini." };
  }
}
