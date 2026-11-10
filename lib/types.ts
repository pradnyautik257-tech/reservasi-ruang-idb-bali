export type Role = "mahasiswa" | "dosen" | "admin";
export type RoomStatus = "aktif" | "nonaktif";
export type ReservationStatus = "menunggu" | "disetujui" | "ditolak" | "dibatalkan";
export type Category = "Akademik" | "Organisasi" | "Seminar" | "Lomba" | "Lainnya";

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; message: string; fieldErrors?: Record<string, string> };

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  identity: string | null;
  program: string | null;
  initials: string;
}

export interface Room {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
  status: RoomStatus;
  note: string;
  facilities: string[];
}

export interface ReservationUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  identity: string | null;
  initials: string;
}

export interface ReservationRoom {
  id: string;
  code: string;
  name: string;
  building: string;
  floor: number;
  capacity: number;
}

export interface Reservation {
  id: string;
  code: string;
  userId: string;
  roomId: string;
  activity: string;
  category: Category;
  date: string;
  start: string;
  end: string;
  participants: number;
  contact: string;
  purpose: string;
  note: string;
  status: ReservationStatus;
  createdAt: string;
  decidedAt: string | null;
  decidedBy: string | null;
  decisionNote: string;
  user?: ReservationUser;
  room?: ReservationRoom;
  history?: HistoryEntry[];
}

export interface HistoryEntry {
  id: number;
  action: string;
  status: string | null;
  note: string;
  actorId: string | null;
  actorName: string | null;
  createdAt: string;
}

export interface ActivityEntry {
  id: number;
  actorId: string | null;
  actorName: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  detail: Record<string, unknown>;
  createdAt: string;
}

export interface Settings {
  openHour: string;
  closeHour: string;
  minHours: number;
  maxHours: number;
  windowDays: number;
  cancelHours: number;
  autoApprove: boolean;
  announcement: string;
}

export interface ReservationInput {
  activity: string;
  category: Category;
  roomId: string;
  date: string;
  start: string;
  end: string;
  participants: number | string;
  contact: string;
  purpose: string;
  note: string;
}

export interface RoomInput {
  id?: string;
  code: string;
  name: string;
  building: string;
  floor: number | string;
  capacity: number | string;
  status: RoomStatus;
  facilities: string[];
  note: string;
}

export interface BookingSummary {
  code: string;
  activity: string;
  start: string;
  end: string;
  status: string;
  userName?: string;
}

export interface LetterSettings {
  institution: string;
  unit: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  city: string;
  numberFormat: string;
  numberPrefix: string;
  signatoryName: string;
  signatoryPosition: string;
  signatoryNip: string;
}

export interface Letter {
  id: string;
  reservationId: string;
  number: string;
  issuedAt: string;
  issuedBy: string | null;
  issuedByName?: string | null;
}

export interface LetterListItem extends Letter {
  reservationCode: string;
  reservationStatus: ReservationStatus;
  activity: string;
  date: string;
  start: string;
  end: string;
  borrowerName: string;
  roomName: string;
}
