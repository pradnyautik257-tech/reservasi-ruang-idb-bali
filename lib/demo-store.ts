import { addDaysISO, initialsOf, nextBookableDay, todayISO } from "@/lib/format";
import { ROOMS, SEED_RESERVATIONS, USERS } from "@/lib/demo-catalog";
import type {
  Category,
  HistoryEntry,
  Reservation,
  ReservationInput,
  ReservationRoom,
  ReservationUser,
  Role,
  Room,
  SessionUser,
  Settings,
} from "@/lib/types";

export const DEMO_RESERVATION_KEY = "idb-demo-reservations-v1";
export const DEMO_USER_KEY = "idb-demo-user-v1";

export const DEMO_SETTINGS: Settings = {
  openHour: "07:00",
  closeHour: "22:00",
  minHours: 1,
  maxHours: 4,
  windowDays: 30,
  cancelHours: 24,
  autoApprove: false,
  announcement: "Pengajuan diproses admin pada hari kerja, pukul 08.00–16.00.",
};

export const DEMO_ACCOUNTS: SessionUser[] = USERS.map((user) => ({
  id: `demo-user-${user.key}`,
  email: user.email,
  fullName: user.name,
  role: user.role as Role,
  identity: user.identity,
  program: user.program,
  initials: initialsOf(user.name),
}));

export const DEMO_ROOMS: Room[] = ROOMS.map((room) => ({
  id: `demo-room-${room.code.toLowerCase()}`,
  code: room.code,
  name: room.name,
  building: room.building,
  floor: room.floor,
  capacity: room.capacity,
  status: "aktif",
  note: room.note,
  facilities: room.facilities,
}));

export type DemoMutationResult =
  | { ok: true; reservations: Reservation[]; reservation: Reservation }
  | { ok: false; message: string };

function toReservationUser(account: SessionUser): ReservationUser {
  return {
    id: account.id,
    fullName: account.fullName,
    email: account.email,
    role: account.role,
    identity: account.identity,
    initials: account.initials,
  };
}

function toReservationRoom(room: Room): ReservationRoom {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    building: room.building,
    floor: room.floor,
    capacity: room.capacity,
  };
}

function historyEntry(
  id: number,
  action: string,
  status: string | null,
  note: string,
  actorId: string | null,
  actorName: string | null,
  createdAt: string,
): HistoryEntry {
  return { id, action, status, note, actorId, actorName, createdAt };
}

export function buildInitialDemoReservations(): Reservation[] {
  const accountByKey = new Map(USERS.map((user, index) => [user.key, DEMO_ACCOUNTS[index]]));
  const roomByCode = new Map(DEMO_ROOMS.map((room) => [room.code, room]));
  const admin = DEMO_ACCOUNTS.find((account) => account.role === "admin") ?? null;
  const year = new Date().getFullYear();
  let sequence = 0;

  return SEED_RESERVATIONS.flatMap((item) => {
    sequence += 1;
    const account = accountByKey.get(item.user);
    const room = roomByCode.get(item.room);
    if (!account || !room) return [];

    const createdAt = new Date(Date.now() - item.createdDaysAgo * 86_400_000).toISOString();
    const decidedAt =
      item.status === "menunggu" ? null : new Date(Date.now() - (item.decidedDaysAgo ?? 1) * 86_400_000).toISOString();
    const decidedBy =
      item.status === "menunggu" ? null : item.cancelledByOwner ? account.id : (admin?.id ?? null);
    const action =
      item.status === "disetujui" ? "Disetujui" : item.status === "ditolak" ? "Ditolak" : "Dibatalkan";

    const history: HistoryEntry[] = [
      historyEntry(
        sequence * 10,
        "Pengajuan dibuat",
        "menunggu",
        "Status awal: Menunggu",
        account.id,
        account.fullName,
        createdAt,
      ),
    ];
    if (item.status !== "menunggu" && decidedAt) {
      history.push(
        historyEntry(
          sequence * 10 + 1,
          action,
          item.status,
          item.note ?? "",
          decidedBy,
          item.cancelledByOwner ? account.fullName : (admin?.fullName ?? null),
          decidedAt,
        ),
      );
    }

    return [
      {
        id: `demo-res-${String(sequence).padStart(3, "0")}`,
        code: `RSV-${year}-${String(sequence).padStart(4, "0")}`,
        userId: account.id,
        roomId: room.id,
        activity: item.activity,
        category: item.category as Category,
        date: nextBookableDay(addDaysISO(todayISO(), item.offset)),
        start: item.start,
        end: item.end,
        participants: item.participants,
        contact: item.contact,
        purpose: `Kegiatan ${item.activity} di ${room.name}.`,
        note: item.note ?? "",
        status: item.status,
        createdAt,
        decidedAt,
        decidedBy,
        decisionNote: item.status === "menunggu" ? "" : (item.note ?? ""),
        user: toReservationUser(account),
        room: toReservationRoom(room),
        history,
      } satisfies Reservation,
    ];
  }).sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));
}

function hydrateReservation(reservation: Reservation): Reservation {
  const account = DEMO_ACCOUNTS.find((item) => item.id === reservation.userId);
  const room = DEMO_ROOMS.find((item) => item.id === reservation.roomId);
  return {
    ...reservation,
    user: account ? toReservationUser(account) : reservation.user,
    room: room ? toReservationRoom(room) : reservation.room,
    history: Array.isArray(reservation.history) ? reservation.history : [],
  };
}

function readStoredReservations(): Reservation[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DEMO_RESERVATION_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    const list =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === "object" && Array.isArray((parsed as { reservations?: unknown }).reservations)
          ? (parsed as { reservations: unknown[] }).reservations
          : [];
    return list.filter(
      (item): item is Reservation =>
        Boolean(
          item &&
            typeof item === "object" &&
            typeof (item as Reservation).id === "string" &&
            typeof (item as Reservation).roomId === "string" &&
            typeof (item as Reservation).date === "string",
        ),
    );
  } catch {
    return [];
  }
}

/**
 * Gabungkan contoh reservasi dari kode dengan data yang tersimpan di
 * localStorage. Data localStorage menang untuk id yang sama, sehingga
 * perubahan status (setuju/tolak/batal) tetap bertahan setelah reload.
 */
export function loadDemoReservations(): Reservation[] {
  const initial = buildInitialDemoReservations();
  const stored = readStoredReservations();
  const merged = new Map(initial.map((reservation) => [reservation.id, reservation]));
  for (const reservation of stored) {
    merged.set(reservation.id, reservation);
  }

  const result = [...merged.values()]
    .map(hydrateReservation)
    .sort((a, b) => `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`));

  saveDemoReservations(result);
  return result;
}

export function saveDemoReservations(reservations: Reservation[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DEMO_RESERVATION_KEY,
      JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), reservations }),
    );
  } catch {
    // Mode privat/penyimpanan penuh: demo tetap berjalan di memori.
  }
}

export function resetDemoReservations(): Reservation[] {
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(DEMO_RESERVATION_KEY);
    } catch {
      // abaikan
    }
  }
  return buildInitialDemoReservations();
}

export function readDemoUser(): SessionUser | null {
  if (typeof window === "undefined") return null;
  try {
    const id = window.localStorage.getItem(DEMO_USER_KEY);
    return DEMO_ACCOUNTS.find((account) => account.id === id) ?? null;
  } catch {
    return null;
  }
}

export function rememberDemoUser(user: SessionUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) window.localStorage.setItem(DEMO_USER_KEY, user.id);
    else window.localStorage.removeItem(DEMO_USER_KEY);
  } catch {
    // abaikan
  }
}

function nextDemoCode(reservations: Reservation[]) {
  const year = new Date().getFullYear();
  const prefix = `RSV-${year}-`;
  const last = reservations.reduce((max, reservation) => {
    if (!reservation.code.startsWith(prefix)) return max;
    const value = Number(reservation.code.slice(prefix.length));
    return Number.isFinite(value) ? Math.max(max, value) : max;
  }, 0);
  return `${prefix}${String(last + 1).padStart(4, "0")}`;
}

export function addDemoReservation(
  input: ReservationInput,
  user: SessionUser,
  current: Reservation[],
): DemoMutationResult {
  const room = DEMO_ROOMS.find((item) => item.id === input.roomId);
  if (!room) return { ok: false, message: "Ruangan tidak ditemukan." };
  const now = new Date().toISOString();
  const id = `demo-res-${crypto.randomUUID()}`;
  const code = nextDemoCode(current);
  const reservation: Reservation = {
    id,
    code,
    userId: user.id,
    roomId: room.id,
    activity: input.activity.trim(),
    category: input.category,
    date: input.date,
    start: input.start,
    end: input.end,
    participants: Number(input.participants),
    contact: input.contact.trim(),
    purpose: input.purpose.trim(),
    note: input.note.trim(),
    status: "menunggu",
    createdAt: now,
    decidedAt: null,
    decidedBy: null,
    decisionNote: "",
    user: toReservationUser(user),
    room: toReservationRoom(room),
    history: [
      historyEntry(Date.now(), "Pengajuan dibuat", "menunggu", "Status awal: Menunggu", user.id, user.fullName, now),
    ],
  };
  return {
    ok: true,
    reservation,
    reservations: [...current, reservation].sort((a, b) =>
      `${a.date}${a.start}`.localeCompare(`${b.date}${b.start}`),
    ),
  };
}

export function cancelDemoReservation(
  id: string,
  user: SessionUser,
  current: Reservation[],
): DemoMutationResult {
  const reservation = current.find((item) => item.id === id);
  if (!reservation) return { ok: false, message: "Reservasi tidak ditemukan." };
  if (reservation.userId !== user.id) return { ok: false, message: "Anda hanya dapat membatalkan pengajuan sendiri." };
  if (reservation.status !== "menunggu") {
    return { ok: false, message: "Hanya pengajuan berstatus Menunggu yang dapat dibatalkan." };
  }
  const now = new Date().toISOString();
  const updated: Reservation = {
    ...reservation,
    status: "dibatalkan",
    decidedAt: now,
    decidedBy: user.id,
    decisionNote: "Dibatalkan oleh pemohon.",
    history: [
      ...(reservation.history ?? []),
      historyEntry(Date.now(), "Dibatalkan", "dibatalkan", "Dibatalkan oleh pemohon.", user.id, user.fullName, now),
    ],
  };
  return {
    ok: true,
    reservation: updated,
    reservations: current.map((item) => (item.id === id ? updated : item)),
  };
}

export function decideDemoReservation(
  id: string,
  admin: SessionUser,
  decision: "disetujui" | "ditolak",
  note: string,
  current: Reservation[],
): DemoMutationResult {
  if (admin.role !== "admin") return { ok: false, message: "Hanya admin reservasi yang dapat memutuskan pengajuan." };
  const reservation = current.find((item) => item.id === id);
  if (!reservation) return { ok: false, message: "Reservasi tidak ditemukan." };
  if (reservation.status !== "menunggu") return { ok: false, message: "Pengajuan ini sudah diputuskan." };

  if (decision === "disetujui") {
    const conflict = current.find(
      (item) =>
        item.id !== id &&
        item.status === "disetujui" &&
        item.roomId === reservation.roomId &&
        item.date === reservation.date &&
        item.start < reservation.end &&
        item.end > reservation.start,
    );
    if (conflict) {
      return {
        ok: false,
        message: `Tidak dapat disetujui: bentrok dengan ${conflict.code} (${conflict.start}–${conflict.end}).`,
      };
    }
  }

  const now = new Date().toISOString();
  const action = decision === "disetujui" ? "Disetujui" : "Ditolak";
  const updated: Reservation = {
    ...reservation,
    status: decision,
    decidedAt: now,
    decidedBy: admin.id,
    decisionNote: note.trim(),
    history: [
      ...(reservation.history ?? []),
      historyEntry(Date.now(), action, decision, note.trim(), admin.id, admin.fullName, now),
    ],
  };
  return {
    ok: true,
    reservation: updated,
    reservations: current.map((item) => (item.id === id ? updated : item)),
  };
}
