import { getDb } from "../lib/db";

async function main() {
  const db = await getDb();
  const result = await db.query<{
    users: number;
    rooms: number;
    reservations: number;
    audit: number;
  }>(
    `select
       (select count(*)::int from profiles) as users,
       (select count(*)::int from rooms) as rooms,
       (select count(*)::int from reservations) as reservations,
       (select count(*)::int from activity_log) as audit`,
  );
  console.log("Database siap:", result.rows[0]);
  await db.close();
}

main().catch((error) => {
  console.error("Seed gagal:", error);
  process.exit(1);
});
