import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { Role, SessionUser } from "@/lib/types";
import { query, queryOne } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/password";
import { initialsOf } from "@/lib/format";

export const SESSION_COOKIE = "idb_session";
const SESSION_HOURS = 8;

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  role: Role;
  identity: string | null;
  program: string | null;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = await queryOne<ProfileRow>(
    `select p.id, p.email, p.full_name, p.role, p.identity, p.program
     from sessions s
     join profiles p on p.id = s.user_id
     where s.token_hash = $1 and s.expires_at > now() and p.is_active = true`,
    [sha256(token)],
  );
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
    identity: row.identity,
    program: row.program,
    initials: initialsOf(row.full_name),
  };
});

export async function createSession(userId: string) {
  const headerStore = await headers();
  const token = randomToken();
  await query(
    `insert into sessions (token_hash, user_id, user_agent, expires_at)
     values ($1, $2, $3, now() + interval '${SESSION_HOURS} hours')`,
    [sha256(token), userId, headerStore.get("user-agent")?.slice(0, 300) ?? null],
  );
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function destroySession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    await query("delete from sessions where token_hash = $1", [sha256(token)]);
  }
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(roles: Role[]): Promise<SessionUser> {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect(`/terlarang?peran=${encodeURIComponent(user.role)}`);
  return user;
}

export function homeFor(role: Role) {
  if (role === "admin") return "/admin";
  return "/";
}

export async function cleanupExpiredSessions() {
  await query("delete from sessions where expires_at < now()");
}
