export const MONTHS_ID = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const SHORT_MONTHS_ID = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

export const DAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

function pad(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

export function isoDate(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function todayISO() {
  return isoDate(new Date());
}

export function parseDateISO(value: string) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function addDaysISO(iso: string, days: number) {
  const d = parseDateISO(iso);
  d.setDate(d.getDate() + days);
  return isoDate(d);
}

/** Reservasi ruang hanya dibuka Senin–Sabtu; Minggu libur. */
export function isBookableDay(iso: string) {
  return parseDateISO(iso).getDay() !== 0;
}

/** Kembalikan tanggal yang sama, atau Senin berikutnya bila jatuh pada Minggu. */
export function nextBookableDay(iso: string) {
  return isBookableDay(iso) ? iso : addDaysISO(iso, 1);
}

export function daysFromToday(iso: string) {
  const a = parseDateISO(todayISO());
  const b = parseDateISO(iso);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function fmtDate(iso: string, opts: { weekday?: boolean; short?: boolean; year?: boolean } = {}) {
  if (!iso) return "—";
  const d = parseDateISO(iso);
  let out = opts.weekday ? `${DAYS_ID[d.getDay()]}, ` : "";
  out += `${d.getDate()} ${opts.short ? SHORT_MONTHS_ID[d.getMonth()] : MONTHS_ID[d.getMonth()]}`;
  if (opts.year !== false) out += ` ${d.getFullYear()}`;
  return out;
}

export function fmtDateShort(iso: string) {
  return fmtDate(iso, { short: true });
}

export function relativeDay(iso: string) {
  const diff = daysFromToday(iso);
  if (diff === 0) return "Hari ini";
  if (diff === 1) return "Besok";
  if (diff === -1) return "Kemarin";
  return fmtDate(iso, { weekday: true, short: true });
}

/** Terima "HH:MM" atau "HH:MM:SS" dan kembalikan "HH:MM". */
export function normalizeTime(value: unknown) {
  return String(value ?? "").slice(0, 5);
}

export function timeLabel(value: unknown) {
  return normalizeTime(value).replace(":", ".");
}

export function toMinutes(value: unknown) {
  const [h, m] = normalizeTime(value).split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

export function toTime(totalMinutes: number) {
  const m = Math.max(0, Math.min(24 * 60, Math.round(totalMinutes)));
  return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
}

export function durationLabel(minutes: number) {
  const total = Math.max(0, Math.round(minutes));
  const h = Math.floor(total / 60);
  const rest = total % 60;
  if (h && rest) return `${h} jam ${rest} menit`;
  if (h) return `${h} jam`;
  return `${rest} menit`;
}

export function fmtDateTime(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${SHORT_MONTHS_ID[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export function fmtTimeOnly(value: string | Date) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getHours())}.${pad(d.getMinutes())}`;
}

export function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function statusLabel(status: string) {
  return {
    menunggu: "Menunggu",
    disetujui: "Disetujui",
    ditolak: "Ditolak",
    dibatalkan: "Dibatalkan",
  }[status] ?? status;
}

export function roleLabel(role: string) {
  return {
    mahasiswa: "Mahasiswa",
    dosen: "Dosen / Staf",
    admin: "Admin Reservasi",
  }[role] ?? role;
}
