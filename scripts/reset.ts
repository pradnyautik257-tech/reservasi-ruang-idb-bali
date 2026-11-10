import fs from "node:fs";
import path from "node:path";

const configured = process.env.PGLITE_DATA_DIR || ".data/pglite";
const dir = path.isAbsolute(configured) ? configured : path.join(process.cwd(), configured);

if (!dir.includes("pglite") && !dir.includes(".data")) {
  console.error("Direktori data tidak dikenali, pembatalan untuk keamanan:", dir);
  process.exit(1);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log("Data database dihapus:", dir);
console.log("Jalankan `npm run db:seed` (atau `npm run dev`) untuk membuat ulang data demo.");
