"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { query, queryOne } from "@/lib/db";
import { loginSchema, registerSchema } from "@/lib/validation";
import { hashPassword, verifyPassword } from "@/lib/password";
import { createSession, destroySession, homeFor } from "@/lib/auth";
import type { ActionResult, Role } from "@/lib/types";

export async function loginAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Periksa kembali isian Anda.", fieldErrors };
  }

  const email = parsed.data.email.toLowerCase();
  const password = parsed.data.password;

  try {
    const headerStore = await headers();
    const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;

    const attempts = await query<{ count: number }>(
      `select count(*)::int as count from login_attempts
       where email = $1 and success = false and created_at > now() - interval '15 minutes'`,
      [email],
    );
    if (Number(attempts[0]?.count ?? 0) >= 5) {
      return {
        ok: false,
        message: "Terlalu banyak percobaan gagal. Coba lagi dalam 15 menit.",
      };
    }

    const user = await queryOne<{
      id: string;
      email: string;
      password_hash: string;
      is_active: boolean;
      role: Role;
    }>("select id, email, password_hash, is_active, role from profiles where lower(email) = lower($1)", [email]);

    const valid = user && user.is_active ? await verifyPassword(password, user.password_hash) : false;

    await query("insert into login_attempts (email, ip, success) values ($1, $2, $3)", [email, ip, valid]);

    if (!valid || !user) {
      return { ok: false, message: "Email atau kata sandi salah.", fieldErrors: { form: "Email atau kata sandi salah." } };
    }

    await createSession(user.id);
    await query("delete from sessions where expires_at < now()");
    return { ok: true, data: { redirectTo: homeFor(user.role) } };
  } catch (error) {
    console.error("[login] gagal:", error);
    return { ok: false, message: "Login tidak dapat diproses saat ini. Coba lagi beberapa saat lagi." };
  }
}

export async function logoutAction() {
  try {
    await destroySession();
  } catch (error) {
    console.error("[logout] gagal:", error);
  }
  redirect("/login");
}

export async function registerAction(formData: FormData): Promise<ActionResult<{ redirectTo: string }>> {
  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    identity: formData.get("identity"),
    program: formData.get("program"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, message: "Periksa kembali data pendaftaran.", fieldErrors };
  }

  const { fullName, identity, program, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  try {
    const existing = await queryOne<{ id: string }>("select id from profiles where lower(email) = lower($1)", [email]);
    if (existing) {
      return {
        ok: false,
        message: "Email sudah terdaftar.",
        fieldErrors: { email: "Email ini sudah digunakan. Silakan masuk atau gunakan email lain." },
      };
    }

    const id = randomUUID();
    const passwordHash = await hashPassword(password);
    await query(
      `insert into profiles (id, email, password_hash, full_name, role, identity, program)
       values ($1, $2, $3, $4, 'mahasiswa', $5, $6)`,
      [id, email, passwordHash, fullName, identity || null, program || null],
    );
    await query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail)
       values ($1, 'Pendaftaran akun', 'profile', $2, $3::jsonb)`,
      [id, email, JSON.stringify({ role: "mahasiswa", fullName })],
    );

    await createSession(id);
    return { ok: true, data: { redirectTo: "/" } };
  } catch (error) {
    if ((error as { code?: string }).code === "23505") {
      return {
        ok: false,
        message: "Email sudah terdaftar.",
        fieldErrors: { email: "Email ini sudah digunakan. Silakan masuk atau gunakan email lain." },
      };
    }
    console.error("[register] gagal:", error);
    return { ok: false, message: "Pendaftaran tidak dapat diproses saat ini. Coba lagi beberapa saat lagi." };
  }
}

export async function demoLoginAction(role: Role): Promise<ActionResult<{ redirectTo: string }>> {
  if (process.env.DEMO_MODE !== "true") {
    return { ok: false, message: "Masuk cepat demo tidak aktif." };
  }
  try {
    const user = await queryOne<{ id: string; role: Role }>(
      "select id, role from profiles where role = $1 and is_active = true order by created_at limit 1",
      [role],
    );
    if (!user) return { ok: false, message: "Akun demo untuk peran ini belum tersedia." };
    await createSession(user.id);
    return { ok: true, data: { redirectTo: homeFor(user.role) } };
  } catch (error) {
    console.error("[demo-login] gagal:", error);
    return { ok: false, message: "Masuk cepat demo gagal diproses." };
  }
}
