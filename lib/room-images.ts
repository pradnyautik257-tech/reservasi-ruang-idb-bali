import type { Room } from "@/lib/types";

/**
 * Foto resmi fasilitas kampus IDB Bali yang diunduh dari
 * https://www.idbbali.ac.id/fasilitas-kampus/ dan disimpan secara lokal.
 * Ruang baru yang dibuat admin memakai foto fallback.
 */
const ROOM_IMAGES: Record<string, string> = {
  AULA: "/rooms/idb/aula.jpg",
  SG: "/rooms/idb/studio-gambar.jpg",
  LK: "/rooms/idb/lab-komputer.jpg",
  LI: "/rooms/idb/lab-imac.jpg",
  RK: "/rooms/idb/ruang-kelas.jpg",
  LFD: "/rooms/idb/lab-fashion-design.jpg",
  GSG: "/rooms/idb/gedung-serba-guna.jpg",
  RA: "/rooms/idb/ruang-asistensi.jpg",
  SP: "/rooms/idb/studio-pola.jpg",
  SF: "/rooms/idb/studio-foto.jpg",
  LSD: "/rooms/idb/lab-software-development.jpg",
  RKM: "/rooms/idb/ruang-kelas-magister.jpg",
};

const FALLBACK = "/rooms/c2.jpg";

export function roomImage(room: Pick<Room, "code"> | { code: string }) {
  return ROOM_IMAGES[String(room.code).toUpperCase()] ?? FALLBACK;
}

export function roomImageAlt(room: Pick<Room, "name" | "code">) {
  return `Foto ${room.name} (${room.code}) — IDB Bali`;
}
