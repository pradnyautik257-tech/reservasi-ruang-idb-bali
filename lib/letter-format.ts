import type { LetterSettings } from "@/lib/types";

export const DEFAULT_LETTER_SETTINGS: LetterSettings = {
  institution: "Institut Desain dan Bisnis Bali",
  unit: "Unit Peminjaman Ruangan",
  address: "Jl. Tukad Batanghari No. 29, Panjer, Denpasar, Bali 80225",
  phone: "(0361) 8955649",
  email: "info@idbbali.ac.id",
  website: "www.idbbali.ac.id",
  city: "Denpasar",
  numberFormat: "{seq}/{prefix}/{year}",
  numberPrefix: "SPR-IDB",
  signatoryName: "Made Sari",
  signatoryPosition: "Admin Reservasi",
  signatoryNip: "",
};

export function formatLetterNumber(settings: LetterSettings, sequence: number, date = new Date()) {
  const seq = String(sequence).padStart(3, "0");
  return settings.numberFormat
    .replaceAll("{seq}", seq)
    .replaceAll("{prefix}", settings.numberPrefix)
    .replaceAll("{year}", String(date.getFullYear()))
    .replaceAll("{month}", String(date.getMonth() + 1).padStart(2, "0"))
    .replaceAll("{day}", String(date.getDate()).padStart(2, "0"));
}
