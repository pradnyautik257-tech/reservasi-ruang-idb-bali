import { z } from "zod";
import type { ReservationInput, Room, Settings } from "@/lib/types";
import { daysFromToday, isBookableDay, toMinutes } from "@/lib/format";

export type FieldErrors = Record<string, string>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Masukkan email kampus Anda.").email("Format email belum benar."),
  password: z.string().min(1, "Masukkan kata sandi."),
});

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(3, "Nama lengkap minimal 3 karakter.")
      .max(80, "Nama maksimal 80 karakter."),
    email: z.string().trim().min(1, "Masukkan email.").email("Format email belum benar."),
    identity: z.string().trim().max(30, "NIM maksimal 30 karakter.").optional().default(""),
    program: z.string().trim().max(80, "Program studi maksimal 80 karakter.").optional().default(""),
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter.")
      .max(72, "Kata sandi maksimal 72 karakter.")
      .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
      .regex(/\d/, "Kata sandi harus memuat angka."),
    confirm: z.string().min(1, "Ulangi kata sandi."),
  })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Konfirmasi kata sandi belum sama.",
  });


export const roomSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode ruangan wajib diisi.")
    .max(10, "Kode maksimal 10 karakter.")
    .regex(/^[A-Za-z0-9-]+$/, "Kode hanya boleh huruf, angka, dan tanda hubung."),
  name: z.string().trim().min(3, "Nama ruangan minimal 3 karakter.").max(80, "Nama maksimal 80 karakter."),
  building: z.string().trim().min(2, "Nama gedung minimal 2 karakter.").max(60, "Nama gedung maksimal 60 karakter."),
  floor: z.coerce.number().int("Lantai harus bilangan bulat.").min(1, "Lantai minimal 1.").max(20, "Lantai maksimal 20."),
  capacity: z.coerce.number().int("Kapasitas harus bilangan bulat.").min(1, "Kapasitas minimal 1.").max(1000, "Kapasitas maksimal 1000."),
  status: z.enum(["aktif", "nonaktif"]),
  note: z.string().trim().max(240, "Catatan maksimal 240 karakter.").optional().default(""),
  facilities: z.array(z.string().trim().min(1)).max(20).default([]),
});

export const settingsSchema = z
  .object({
    openHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam buka tidak valid."),
    closeHour: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Jam tutup tidak valid."),
    minHours: z.coerce.number().int().min(1, "Durasi minimal 1 jam.").max(8, "Durasi minimal maksimal 8 jam."),
    maxHours: z.coerce.number().int().min(1, "Durasi maksimal minimal 1 jam.").max(12, "Durasi maksimal maksimal 12 jam."),
    windowDays: z.coerce.number().int().min(1, "Batas pemesanan minimal 1 hari.").max(90, "Batas pemesanan maksimal 90 hari."),
    cancelHours: z.coerce.number().int().min(0, "Batas pembatalan minimal 0 jam.").max(168, "Batas pembatalan maksimal 168 jam."),
    autoApprove: z.boolean(),
    announcement: z.string().trim().max(160, "Pengumuman maksimal 160 karakter."),
  })
  .refine((v) => toMinutes(v.closeHour) > toMinutes(v.openHour), {
    message: "Jam tutup harus lebih akhir daripada jam buka.",
    path: ["closeHour"],
  })
  .refine((v) => v.maxHours >= v.minHours, {
    message: "Durasi maksimal harus lebih besar atau sama dengan durasi minimal.",
    path: ["maxHours"],
  });

export const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Nama lengkap minimal 3 karakter.").max(80, "Nama maksimal 80 karakter."),
  identity: z.string().trim().max(30, "NIM/NIP maksimal 30 karakter.").optional().default(""),
  program: z.string().trim().max(80, "Program studi maksimal 80 karakter.").optional().default(""),
});

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Masukkan kata sandi saat ini."),
    newPassword: z
      .string()
      .min(8, "Kata sandi baru minimal 8 karakter.")
      .max(72, "Kata sandi maksimal 72 karakter.")
      .regex(/[A-Za-z]/, "Kata sandi harus memuat huruf.")
      .regex(/\d/, "Kata sandi harus memuat angka."),
    confirmPassword: z.string().min(1, "Ulangi kata sandi baru."),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi belum sama.",
  });

export const letterSettingsSchema = z.object({
  institution: z.string().trim().min(3, "Nama institusi minimal 3 karakter.").max(120, "Nama institusi maksimal 120 karakter."),
  unit: z.string().trim().max(120, "Nama unit maksimal 120 karakter.").optional().default(""),
  address: z.string().trim().max(200, "Alamat maksimal 200 karakter.").optional().default(""),
  phone: z.string().trim().max(60, "Telepon maksimal 60 karakter.").optional().default(""),
  email: z.string().trim().max(120, "Email maksimal 120 karakter.").optional().default(""),
  website: z.string().trim().max(120, "Situs maksimal 120 karakter.").optional().default(""),
  city: z.string().trim().max(60, "Kota maksimal 60 karakter.").optional().default(""),
  numberFormat: z
    .string()
    .trim()
    .min(5, "Format nomor minimal 5 karakter.")
    .max(80, "Format nomor maksimal 80 karakter.")
    .refine((value) => value.includes("{seq}"), "Format nomor harus memuat token {seq}."),
  numberPrefix: z.string().trim().min(2, "Prefix minimal 2 karakter.").max(20, "Prefix maksimal 20 karakter."),
  signatoryName: z.string().trim().max(100, "Nama pejabat maksimal 100 karakter.").optional().default(""),
  signatoryPosition: z.string().trim().max(100, "Jabatan maksimal 100 karakter.").optional().default(""),
  signatoryNip: z.string().trim().max(40, "NIP maksimal 40 karakter.").optional().default(""),
});

export interface ConflictInfo {
  code: string;
  start: string;
  end: string;
}

export interface ReservationValidation {
  ok: boolean;
  fieldErrors: FieldErrors;
}

/** Validasi aturan bisnis yang dipakai klien dan server. */
export function validateReservation(
  input: ReservationInput,
  settings: Settings,
  room: Room | null,
  conflicts: ConflictInfo[] = [],
): ReservationValidation {
  const errors: FieldErrors = {};
  const activity = String(input.activity ?? "").trim();

  if (!room) errors.roomId = "Pilih ruangan yang akan digunakan.";
  else if (room.status !== "aktif") errors.roomId = "Ruangan ini sedang tidak aktif. Pilih ruangan lain.";

  if (activity.length < 4) errors.activity = "Tuliskan nama kegiatan minimal 4 karakter.";
  else if (activity.length > 90) errors.activity = "Nama kegiatan maksimal 90 karakter.";

  if (!["Akademik", "Organisasi", "Seminar", "Lomba", "Lainnya"].includes(input.category)) {
    errors.category = "Pilih jenis kegiatan.";
  }

  if (!input.date) {
    errors.date = "Pilih tanggal kegiatan.";
  } else if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    errors.date = "Tanggal tidak valid.";
  } else {
    const offset = daysFromToday(input.date);
    if (offset < 0) errors.date = "Tanggal sudah lewat. Pilih hari ini atau setelahnya.";
    else if (offset > settings.windowDays) {
      errors.date = `Pemesanan dibuka maksimal ${settings.windowDays} hari ke depan.`;
    } else if (!isBookableDay(input.date)) {
      errors.date = "Reservasi hanya tersedia Senin–Sabtu. Minggu libur.";
    }
  }

  if (!input.start) errors.start = "Tentukan waktu mulai.";
  if (!input.end) errors.end = "Tentukan waktu selesai.";

  if (!errors.start && !errors.end) {
    const start = toMinutes(input.start);
    const end = toMinutes(input.end);
    const open = toMinutes(settings.openHour);
    const close = toMinutes(settings.closeHour);
    if (end <= start) {
      errors.end = "Waktu selesai harus lebih akhir daripada waktu mulai.";
    } else {
      if (start < open) errors.start = `Ruang dapat dipakai mulai pukul ${settings.openHour.replace(":", ".")}.`;
      if (end > close) errors.end = `Ruang harus dikosongkan sebelum pukul ${settings.closeHour.replace(":", ".")}.`;
      const minutes = end - start;
      if (minutes < settings.minHours * 60) errors.end = `Durasi minimal ${settings.minHours} jam.`;
      else if (minutes > settings.maxHours * 60) errors.end = `Durasi maksimal ${settings.maxHours} jam per pengajuan.`;
    }
  }

  const participants = Number(input.participants);
  if (input.participants === "" || input.participants === null || input.participants === undefined) {
    errors.participants = "Isi jumlah peserta.";
  } else if (!Number.isFinite(participants) || participants < 1) {
    errors.participants = "Jumlah peserta minimal 1 orang.";
  } else if (room && participants > room.capacity) {
    errors.participants = `Melebihi kapasitas ${room.name} (${room.capacity} orang).`;
  }

  const purpose = String(input.purpose ?? "").trim();
  if (purpose.length < 10) errors.purpose = "Jelaskan tujuan peminjaman minimal 10 karakter.";
  else if (purpose.length > 300) errors.purpose = "Tujuan peminjaman maksimal 300 karakter.";

  const contact = String(input.contact ?? "").trim();
  if (contact && !/^[+0-9 ()-]{8,20}$/.test(contact)) {
    errors.contact = "Nomor kontak hanya berisi angka, spasi, tanda hubung, dan +.";
  }
  if (String(input.note ?? "").length > 300) {
    errors.note = "Catatan maksimal 300 karakter.";
  }

  if (!Object.keys(errors).length && conflicts.length) {
    const first = conflicts[0];
    errors.end = `Ruang sudah dipakai ${first.start.replace(":", ".")}–${first.end.replace(":", ".")} (${first.code}). Pilih waktu atau ruang lain.`;
  }

  return { ok: Object.keys(errors).length === 0, fieldErrors: errors };
}
