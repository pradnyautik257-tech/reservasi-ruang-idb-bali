import { PGlite } from "@electric-sql/pglite";
import fs from "node:fs";
import path from "node:path";
import { seedIfEmpty } from "./seed";

export interface DbClient {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

const globalForDb = globalThis as unknown as { __idbDb?: Promise<PGlite> };

export function getDb(): Promise<PGlite> {
  if (!globalForDb.__idbDb) {
    globalForDb.__idbDb = initDb().catch((error) => {
      globalForDb.__idbDb = undefined;
      throw error;
    });
  }
  return globalForDb.__idbDb;
}

async function initDb(): Promise<PGlite> {
  const configured = process.env.PGLITE_DATA_DIR || ".data/pglite";
  const dataDir = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);
  fs.mkdirSync(dataDir, { recursive: true });

  const db = new PGlite(dataDir);
  await db.waitReady;

  const schemaPath = path.join(/* turbopackIgnore: true */ process.cwd(), "lib", "schema.sql");
  const schema = fs.readFileSync(schemaPath, "utf8");
  await db.exec(schema);

  await seedIfEmpty(db);
  return db;
}

export async function query<T>(sql: string, params: unknown[] = []): Promise<T[]> {
  const db = await getDb();
  const result = await db.query<T>(sql, params as never[]);
  return result.rows;
}

export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}

export async function withTransaction<T>(fn: (client: DbClient) => Promise<T>): Promise<T> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    return fn(tx as unknown as DbClient);
  });
}

