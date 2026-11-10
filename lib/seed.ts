import { randomBytes, randomUUID } from "node:crypto";
import type { PGlite } from "@electric-sql/pglite";
import { hashPassword } from "./password";
import { addDaysISO, nextBookableDay, todayISO } from "./format";

export const FACILITY_NAMES = [
  "AC", "Wi-Fi", "Proyektor", "Whiteboard", "Sound System", "Panggung",
  "Live Streaming", "Video Conference", "Meja Gambar", "36 PC", "Printer",
  "Green Screen", "Lighting Kit", "Pencahayaan Pameran", "Partisi",
  "TV 55 inci", "Colokan Listrik", "Meja Lipat", "Kopi",
  "iMac", "Mesin Jahit", "Meja Potong", "Alat Cetak", "Peralatan Maket",
  "Koleksi Buku", "Sofa", "Kamera", "Backdrop Foto",
];

export const ROOMS = [
  { code: "AULA", name: "Aula", building: "Gedung Utama", floor: 1, capacity: 300, note: "Aula utama untuk upacara, seminar, wisuda, dan kegiatan besar kampus.", facilities: ["AC", "Wi-Fi", "Proyektor", "Sound System", "Panggung", "Live Streaming"] },
  { code: "SG", name: "Studio Gambar", building: "Gedung Utama", floor: 2, capacity: 40, note: "Studio menggambar dan melukis dengan pencahayaan alami untuk praktik mahasiswa seni dan desain.", facilities: ["AC", "Wi-Fi", "Meja Gambar", "Proyektor"] },
  { code: "LK", name: "Lab Komputer", building: "Gedung Utama", floor: 2, capacity: 36, note: "Laboratorium komputer untuk praktik desain digital, multimedia, dan tugas akhir.", facilities: ["AC", "Wi-Fi", "36 PC", "Proyektor", "Printer"] },
  { code: "LI", name: "Lab iMac", building: "Gedung Utama", floor: 2, capacity: 30, note: "Laboratorium iMac untuk praktik desain, ilustrasi digital, dan produksi multimedia.", facilities: ["AC", "Wi-Fi", "iMac", "Proyektor", "Printer"] },
  { code: "RK", name: "Ruang Kelas", building: "Gedung Utama", floor: 1, capacity: 45, note: "Ruang kelas representatif untuk perkuliahan teori, diskusi, dan presentasi.", facilities: ["AC", "Wi-Fi", "Proyektor", "Whiteboard"] },
  { code: "LFD", name: "Lab Fashion Design", building: "Gedung Utama", floor: 3, capacity: 30, note: "Laboratorium desain mode untuk praktik merancang, memotong, dan menjahit.", facilities: ["AC", "Wi-Fi", "Mesin Jahit", "Meja Potong", "Meja Gambar"] },
  { code: "GSG", name: "Gedung Serba Guna", building: "Gedung Serba Guna", floor: 1, capacity: 500, note: "Gedung serbaguna untuk kegiatan kampus, pameran, dan acara komunitas.", facilities: ["AC", "Wi-Fi", "Sound System", "Panggung", "Colokan Listrik", "Meja Lipat"] },
  { code: "RA", name: "Ruang Asistensi", building: "Gedung Utama", floor: 3, capacity: 25, note: "Ruang asistensi untuk bimbingan tugas, konsultasi, dan diskusi kelompok kecil.", facilities: ["AC", "Wi-Fi", "Whiteboard", "Meja Lipat", "TV 55 inci"] },
  { code: "SP", name: "Studio Pola", building: "Gedung Utama", floor: 3, capacity: 30, note: "Studio pola untuk praktik pembuatan pola dan konstruksi busana.", facilities: ["AC", "Wi-Fi", "Meja Gambar", "Meja Potong"] },
  { code: "SF", name: "Studio Foto", building: "Gedung Utama", floor: 2, capacity: 20, note: "Studio foto dengan backdrop dan pencahayaan untuk praktik fotografi.", facilities: ["AC", "Wi-Fi", "Green Screen", "Lighting Kit", "Kamera", "Backdrop Foto"] },
  { code: "LSD", name: "Lab Software Development", building: "Gedung Utama", floor: 3, capacity: 30, note: "Laboratorium pengembangan perangkat lunak untuk praktik pemrograman dan proyek digital.", facilities: ["AC", "Wi-Fi", "36 PC", "Proyektor", "Printer"] },
  { code: "RKM", name: "Ruang Kelas Magister", building: "Gedung Magister", floor: 1, capacity: 25, note: "Ruang kelas magister dengan peralatan presentasi dan kamera untuk pembelajaran digital.", facilities: ["AC", "Wi-Fi", "Proyektor", "Whiteboard", "Video Conference", "Kamera"] },
];

export const USERS = [
  { key: "nia", name: "Nia Pramesti", email: "nia@student.idbbali.ac.id", role: "mahasiswa", identity: "NIM 2101010234", program: "Desain Komunikasi Visual" },
  { key: "bagus", name: "Bagus Wirawan", email: "bagus@student.idbbali.ac.id", role: "mahasiswa", identity: "NIM 2101010411", program: "Bisnis Digital" },
  { key: "ayu", name: "Dr. Ayu Lestari", email: "ayu@idbbali.ac.id", role: "dosen", identity: "NIP 198804152012", program: "Dosen Desain Komunikasi Visual" },
  { key: "arta", name: "Komang Arta", email: "arta@idbbali.ac.id", role: "dosen", identity: "NIP 199002072015", program: "Staf Akademik" },
  { key: "sari", name: "Made Sari", email: "admin@idbbali.ac.id", role: "admin", identity: "Admin Reservasi", program: "Bagian Umum dan Sarana" },
];

interface SeedReservation {
  user: string;
  room: string;
  activity: string;
  category: string;
  offset: number;
  start: string;
  end: string;
  participants: number;
  contact: string;
  status: "menunggu" | "disetujui" | "ditolak" | "dibatalkan";
  createdDaysAgo: number;
  decidedDaysAgo?: number;
  note?: string;
  cancelledByOwner?: boolean;
}

const RESERVATIONS: SeedReservation[] = [
  { user: "nia", room: "RA", activity: "Rapat Himpunan Mahasiswa DKV", category: "Organisasi", offset: 0, start: "09:00", end: "11:00", participants: 18, contact: "0812-3456-7890", status: "disetujui", createdDaysAgo: 3, decidedDaysAgo: 2, note: "Ruang tersedia, agenda sesuai jam operasional." },
  { user: "ayu", room: "AULA", activity: "Kuliah Tamu: Desain dan Industri Kreatif", category: "Akademik", offset: 0, start: "13:00", end: "15:30", participants: 96, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 5, decidedDaysAgo: 4, note: "Disetujui untuk kegiatan akademik terjadwal." },
  { user: "bagus", room: "RK", activity: "Latihan Paduan Suara Kampus", category: "Organisasi", offset: 0, start: "16:00", end: "18:00", participants: 24, contact: "0857-2200-3311", status: "menunggu", createdDaysAgo: 0 },
  { user: "bagus", room: "SF", activity: "Workshop Fotografi Produk", category: "Akademik", offset: 1, start: "10:00", end: "12:00", participants: 14, contact: "0857-2200-3311", status: "disetujui", createdDaysAgo: 2, decidedDaysAgo: 1 },
  { user: "ayu", room: "RA", activity: "Rapat Kurikulum Semester Ganjil", category: "Akademik", offset: 1, start: "09:00", end: "11:00", participants: 20, contact: "0813-8899-1122", status: "menunggu", createdDaysAgo: 0 },
  { user: "ayu", room: "AULA", activity: "Seminar Bisnis Digital", category: "Seminar", offset: 2, start: "08:00", end: "12:00", participants: 110, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 6, decidedDaysAgo: 5 },
  { user: "nia", room: "LK", activity: "Lomba UI/UX Antar Kelas", category: "Lomba", offset: 2, start: "13:00", end: "17:00", participants: 32, contact: "0812-3456-7890", status: "menunggu", createdDaysAgo: 1 },
  { user: "nia", room: "RKM", activity: "Diskusi Kelompok Tugas Akhir", category: "Akademik", offset: 3, start: "14:00", end: "16:00", participants: 8, contact: "0812-3456-7890", status: "disetujui", createdDaysAgo: 4, decidedDaysAgo: 3 },
  { user: "ayu", room: "GSG", activity: "Pameran Karya Mahasiswa Semester 5", category: "Akademik", offset: 3, start: "09:00", end: "17:00", participants: 75, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 7, decidedDaysAgo: 6, note: "Durasi delapan jam disetujui khusus untuk pameran." },
  { user: "bagus", room: "RA", activity: "Rapat BEM: Persiapan Ormawa Fair", category: "Organisasi", offset: 3, start: "14:00", end: "16:00", participants: 22, contact: "0857-2200-3311", status: "ditolak", createdDaysAgo: 2, decidedDaysAgo: 1, note: "Ruang rapat senat diprioritaskan untuk agenda pimpinan pada jam tersebut." },
  { user: "bagus", room: "AULA", activity: "Kelas Tambahan Desain Grafis", category: "Akademik", offset: 5, start: "07:30", end: "09:30", participants: 42, contact: "0857-2200-3311", status: "menunggu", createdDaysAgo: 1 },
  { user: "nia", room: "SF", activity: "Rekaman Podcast Kampus", category: "Lainnya", offset: 5, start: "13:00", end: "15:00", participants: 6, contact: "0812-3456-7890", status: "dibatalkan", createdDaysAgo: 6, decidedDaysAgo: 2, note: "Jadwal narasumber berubah.", cancelledByOwner: true },
  { user: "nia", room: "GSG", activity: "English Club Mingguan", category: "Organisasi", offset: 7, start: "15:00", end: "17:00", participants: 30, contact: "0812-3456-7890", status: "menunggu", createdDaysAgo: 0 },
  { user: "ayu", room: "LK", activity: "Pelatihan Perangkat Lunak untuk Dosen", category: "Akademik", offset: 7, start: "09:00", end: "12:00", participants: 28, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 9, decidedDaysAgo: 8 },
  { user: "bagus", room: "LK", activity: "Turnamen E-Sport Antar Fakultas", category: "Lomba", offset: -1, start: "15:00", end: "18:00", participants: 34, contact: "0857-2200-3311", status: "disetujui", createdDaysAgo: 8, decidedDaysAgo: 7 },
  { user: "ayu", room: "RA", activity: "Rapat Evaluasi Semester", category: "Akademik", offset: -2, start: "10:00", end: "12:00", participants: 19, contact: "0813-8899-1122", status: "disetujui", createdDaysAgo: 10, decidedDaysAgo: 9 },
];

export const DEFAULT_SETTINGS: Record<string, unknown> = {
  openHour: "07:00",
  closeHour: "22:00",
  minHours: 1,
  maxHours: 4,
  windowDays: 30,
  cancelHours: 24,
  autoApprove: false,
  announcement: "Pengajuan diproses admin pada hari kerja, pukul 08.00-16.00.",
};

export async function seedIfEmpty(db: PGlite) {
  const existing = await db.query<{ count: number }>("select count(*)::int as count from profiles");
  if (Number(existing.rows[0]?.count ?? 0) > 0) return;

  let password = process.env.SEED_PASSWORD;
  if (!password) {
    password = randomBytes(9).toString("base64url");
    console.warn("[seed] SEED_PASSWORD belum diset. Kata sandi demo sementara: " + password);
  }
  const passwordHash = await hashPassword(password);

  const facilityIds = new Map<string, number>();
  for (const name of FACILITY_NAMES) {
    const result = await db.query<{ id: number }>(
      "insert into facilities (name) values ($1) on conflict (name) do update set name = excluded.name returning id",
      [name],
    );
    facilityIds.set(name, result.rows[0].id);
  }

  const roomIds = new Map<string, string>();
  for (const room of ROOMS) {
    const id = randomUUID();
    roomIds.set(room.code, id);
    await db.query(
      `insert into rooms (id, code, name, building, floor, capacity, status, note)
       values ($1, $2, $3, $4, $5, $6, 'aktif', $7)`,
      [id, room.code, room.name, room.building, room.floor, room.capacity, room.note],
    );
    for (const facility of room.facilities) {
      const facilityId = facilityIds.get(facility);
      if (facilityId) {
        await db.query("insert into room_facilities (room_id, facility_id) values ($1, $2)", [id, facilityId]);
      }
    }
  }

  const userIds = new Map<string, string>();
  for (const user of USERS) {
    const id = randomUUID();
    userIds.set(user.key, id);
    await db.query(
      `insert into profiles (id, email, password_hash, full_name, role, identity, program)
       values ($1, $2, $3, $4, $5, $6, $7)`,
      [id, user.email, passwordHash, user.name, user.role, user.identity, user.program],
    );
  }

  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await db.query(
      "insert into settings (key, value) values ($1, $2::jsonb) on conflict (key) do nothing",
      [key, JSON.stringify(value)],
    );
  }

  await seedSampleReservations(db);
}

/**
 * Menyisipkan ulang contoh reservasi. Dipakai saat seeding awal dan reset demo.
 * Data ruang & pengguna harus sudah ada.
 */
export async function seedSampleReservations(db: PGlite) {
  const roomRows = await db.query<{ id: string; code: string }>("select id, code from rooms");
  const userRows = await db.query<{ id: string; email: string; role: string }>(
    "select id, email, role from profiles",
  );
  const roomByCode = new Map(roomRows.rows.map((row) => [row.code, row.id]));
  const userByEmail = new Map(userRows.rows.map((row) => [row.email, row.id]));
  const adminId = userRows.rows.find((row) => row.role === "admin")?.id;
  if (!adminId || roomByCode.size === 0 || userByEmail.size === 0) return;
  const emailByKey = new Map(USERS.map((user) => [user.key, user.email]));

  const year = new Date().getFullYear();
  let sequence = 0;

  for (const item of RESERVATIONS) {
    sequence += 1;
    const code = `RSV-${year}-${String(sequence).padStart(4, "0")}`;
    const date = nextBookableDay(addDaysISO(todayISO(), item.offset));
    const roomId = roomByCode.get(item.room);
    const userId = userByEmail.get(emailByKey.get(item.user) ?? "");
    if (!roomId || !userId) continue;
    const createdAt = new Date(Date.now() - item.createdDaysAgo * 86_400_000).toISOString();
    const decidedAt =
      item.status === "menunggu" ? null : new Date(Date.now() - (item.decidedDaysAgo ?? 1) * 86_400_000).toISOString();
    const decidedBy = item.status === "menunggu" ? null : item.cancelledByOwner ? userId : adminId;

    await db.query(
      `insert into reservations
        (id, code, user_id, room_id, activity, category, date, start_time, end_time, participants,
         contact, note, status, created_at, decided_at, decided_by, decision_note)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
      [
        randomUUID(), code, userId, roomId, item.activity, item.category, date, item.start, item.end,
        item.participants, item.contact, "", item.status, createdAt, decidedAt, decidedBy, item.note ?? "",
      ],
    );

    await db.query(
      `insert into reservation_history (reservation_id, action, status, note, actor_id, created_at)
       select id, 'Pengajuan dibuat', 'menunggu', 'Status awal: Menunggu', $2, $3
       from reservations where code = $1`,
      [code, userId, createdAt],
    );

    if (item.status !== "menunggu" && decidedAt) {
      const action = item.status === "disetujui" ? "Disetujui" : item.status === "ditolak" ? "Ditolak" : "Dibatalkan";
      await db.query(
        `insert into reservation_history (reservation_id, action, status, note, actor_id, created_at)
         select id, $2, $3, $4, $5, $6 from reservations where code = $1`,
        [code, action, item.status, item.note ?? "", decidedBy, decidedAt],
      );
    }

    const room = ROOMS.find((r) => r.code === item.room);
    await db.query(
      `insert into activity_log (actor_id, action, entity_type, entity_id, detail, created_at)
       values ($1, 'Pengajuan dibuat', 'reservation', $2, $3::jsonb, $4)`,
      [userId, code, JSON.stringify({ room: room?.name, date, start: item.start, end: item.end }), createdAt],
    );
    if (item.status !== "menunggu" && decidedAt) {
      await db.query(
        `insert into activity_log (actor_id, action, entity_type, entity_id, detail, created_at)
         values ($1, $2, 'reservation', $3, $4::jsonb, $5)`,
        [decidedBy, item.status === "disetujui" ? "Disetujui" : item.status === "ditolak" ? "Ditolak" : "Dibatalkan",
          code, JSON.stringify({ note: item.note ?? "" }), decidedAt],
      );
    }
  }

  await db.query(
    `insert into reservation_counters (year, last_value) values ($1, $2)
     on conflict (year) do update set last_value = excluded.last_value`,
    [year, sequence],
  );
}

