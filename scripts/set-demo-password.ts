import { getDb } from "../lib/db";
import { hashPassword } from "../lib/password";
import { USERS } from "../lib/seed";

async function main() {
  const password = process.env.SEED_PASSWORD;
  if (!password) {
    console.error("SEED_PASSWORD belum diset di .env.local.");
    process.exit(1);
  }

  const db = await getDb();
  const hash = await hashPassword(password);
  const emails = USERS.map((user) => user.email.toLowerCase());
  const placeholders = emails.map((_, index) => `$${index + 2}`).join(", ");

  await db.query(
    `update profiles
     set password_hash = $1, updated_at = now()
     where lower(email) in (${placeholders})`,
    [hash, ...emails],
  );

  console.log(`Kata sandi demo diperbarui untuk ${emails.length} akun:`);
  for (const email of emails) console.log(`- ${email}`);

  await db.close();
}

main().catch((error) => {
  console.error("Gagal memperbarui kata sandi demo:", error);
  process.exit(1);
});
