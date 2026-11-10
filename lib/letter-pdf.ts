import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Letter, LetterSettings, Reservation } from "@/lib/types";
import { fmtDate, fmtDateTime, timeLabel } from "@/lib/format";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const MARGIN = 56;
const CONTENT_WIDTH = A4_WIDTH - MARGIN * 2;

const NAVY = rgb(0.055, 0.18, 0.33);
const INK = rgb(0.08, 0.08, 0.08);
const MUTED = rgb(0.36, 0.34, 0.31);
const LINE = rgb(0.83, 0.85, 0.88);
const LABEL_BG = rgb(0.965, 0.973, 0.982);

function clean(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, " ");
}

function wrap(text: string, maxWidth: number, size: number, font: PDFFont): string[] {
  const lines: string[] = [];
  for (const paragraph of clean(text).split("\n")) {
    const words = paragraph.split(/\s+/).filter(Boolean);
    let current = "";
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= maxWidth) {
        current = next;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines.length ? lines : [""];
}

export async function buildLetterPdf(
  reservation: Reservation,
  letter: Letter,
  settings: LetterSettings,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(clean(`Surat Peminjaman Ruangan ${letter.number}`));
  doc.setAuthor(clean(settings.institution));
  doc.setSubject(clean(reservation.activity));

  const page = doc.addPage([A4_WIDTH, A4_HEIGHT]);
  const font = await doc.embedFont(StandardFonts.TimesRoman);
  const bold = await doc.embedFont(StandardFonts.TimesRomanBold);
  const italic = await doc.embedFont(StandardFonts.TimesRomanItalic);

  let y = A4_HEIGHT - MARGIN;

  // ---------------- Logo dan kop surat ----------------
  try {
    const logoBytes = await readFile(path.join(process.cwd(), "public", "idb-logo.png"));
    const logo = await doc.embedPng(logoBytes);
    const logoWidth = 54;
    const logoHeight = (logo.height / logo.width) * logoWidth;
    page.drawImage(logo, {
      x: MARGIN,
      y: y - logoHeight,
      width: logoWidth,
      height: logoHeight,
    });
  } catch (error) {
    console.warn("[letterPdf] logo kampus tidak tersedia:", error);
  }

  const center = (text: string, size: number, usedFont: PDFFont, color = INK, gap = size + 6) => {
    const value = clean(text);
    if (!value) return;
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: (A4_WIDTH - width) / 2, y, size, font: usedFont, color });
    y -= gap;
  };

  const right = (text: string, size: number, usedFont: PDFFont, color = INK, baseline = y) => {
    const value = clean(text);
    const width = usedFont.widthOfTextAtSize(value, size);
    page.drawText(value, { x: A4_WIDTH - MARGIN - width, y: baseline, size, font: usedFont, color });
  };

  const paragraph = (text: string, size = 10.5, usedFont = font, leading = size + 5) => {
    for (const line of wrap(text, CONTENT_WIDTH, size, usedFont)) {
      page.drawText(line, { x: MARGIN, y, size, font: usedFont, color: INK });
      y -= leading;
    }
  };

  y -= 13;
  center(settings.institution || "Institut Desain dan Bisnis Bali", 16, bold, NAVY, 22);
  if (settings.unit) center(settings.unit.toUpperCase(), 9.5, bold, MUTED, 15);
  center(settings.address || "Alamat: ..............................................................", 8.5, font, MUTED, 12);
  const contact = [settings.phone, settings.email, settings.website].filter(Boolean).join("  |  ");
  center(contact || "Telepon / Email / Situs: ..........................................", 8.5, font, MUTED, 12);

  y += 1;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: A4_WIDTH - MARGIN, y },
    thickness: 1.1,
    color: NAVY,
  });
  page.drawLine({
    start: { x: MARGIN, y: y - 2.5 },
    end: { x: A4_WIDTH - MARGIN, y: y - 2.5 },
    thickness: 0.45,
    color: NAVY,
  });
  y -= 32;

  // ---------------- Judul ----------------
  center("SURAT PEMINJAMAN RUANGAN", 14, bold, NAVY, 21);
  center(`Nomor: ${letter.number}`, 10, font, INK, 17);

  const issuedDate = new Date(letter.issuedAt);
  const issuedISO = `${issuedDate.getFullYear()}-${String(issuedDate.getMonth() + 1).padStart(2, "0")}-${String(
    issuedDate.getDate(),
  ).padStart(2, "0")}`;
  right(`${settings.city || "Denpasar"}, ${fmtDate(issuedISO)}`, 10.5, font, INK);
  y -= 22;

  paragraph(
    "Yang bertanda tangan di bawah ini menerangkan bahwa permohonan peminjaman ruangan berikut telah disetujui oleh pengelola reservasi kampus:",
    10.5,
    font,
    15.5,
  );
  y -= 8;

  // ---------------- Rincian ----------------
  const rows: [string, string[]][] = [
    ["Kode Peminjaman", [reservation.code]],
    ["Nama Kegiatan", [reservation.activity]],
    [
      "Nama Peminjam",
      [
        reservation.user?.fullName ?? "-",
        [reservation.user?.identity, reservation.user?.email].filter(Boolean).join("  |  "),
      ].filter(Boolean),
    ],
    [
      "Ruangan",
      [
        `${reservation.room?.name ?? "-"} (${reservation.room?.code ?? "-"})`,
        reservation.room ? `${reservation.room.building}, lantai ${reservation.room.floor}` : "",
      ].filter(Boolean),
    ],
    ["Tanggal Penggunaan", [fmtDate(reservation.date, { weekday: true })]],
    ["Waktu", [`${timeLabel(reservation.start)} - ${timeLabel(reservation.end)}`]],
    ["Jumlah Peserta", [`${reservation.participants} orang`]],
    ["Tujuan Peminjaman", [reservation.purpose || `Kegiatan ${reservation.activity}`]],
    ...(reservation.note ? ([["Keterangan Tambahan", [reservation.note]]] as [string, string[]][]) : []),
  ];

  const labelWidth = 140;
  const valueX = MARGIN + labelWidth + 12;
  const valueSize = 10;
  const valueLeading = 12.5;
  const preparedRows = rows.map(([label, values]) => {
    const valueLines = values.flatMap((value) =>
      wrap(value, CONTENT_WIDTH - labelWidth - 24, valueSize, font),
    );
    return {
      label,
      valueLines,
      height: Math.max(23, valueLines.length * valueLeading + 11),
    };
  });
  const tableHeight = preparedRows.reduce((total, row) => total + row.height, 0);
  const tableTop = y;
  const tableBottom = tableTop - tableHeight;

  page.drawRectangle({
    x: MARGIN,
    y: tableBottom,
    width: labelWidth,
    height: tableHeight,
    color: LABEL_BG,
  });

  let rowTop = tableTop;
  for (const row of preparedRows) {
    const baseline = rowTop - 14;
    page.drawText(clean(row.label), {
      x: MARGIN + 10,
      y: baseline,
      size: 9.5,
      font: bold,
      color: INK,
    });

    let valueY = baseline;
    for (const line of row.valueLines) {
      page.drawText(line, { x: valueX, y: valueY, size: valueSize, font, color: INK });
      valueY -= valueLeading;
    }

    rowTop -= row.height;
    page.drawLine({
      start: { x: MARGIN, y: rowTop },
      end: { x: A4_WIDTH - MARGIN, y: rowTop },
      thickness: 0.45,
      color: LINE,
    });
  }

  page.drawLine({
    start: { x: MARGIN + labelWidth, y: tableBottom },
    end: { x: MARGIN + labelWidth, y: tableTop },
    thickness: 0.5,
    color: LINE,
  });
  page.drawRectangle({
    x: MARGIN,
    y: tableBottom,
    width: CONTENT_WIDTH,
    height: tableHeight,
    borderColor: LINE,
    borderWidth: 0.6,
  });

  y = tableBottom - 18;
  paragraph(
    "Demikian surat peminjaman ruangan ini dibuat berdasarkan data permohonan yang tersimpan pada sistem, untuk dipergunakan sebagaimana mestinya.",
    10.5,
    font,
    15.5,
  );

  // ---------------- Tanda tangan ----------------
  y -= 8;
  right(`${settings.city || "Denpasar"}, ${fmtDate(issuedISO)}`, 10.5, font, INK);
  y -= 19;
  right(settings.signatoryPosition || "Jabatan: ........................................", 10, font, INK);
  y -= 54;
  right(settings.signatoryName || "........................................", 10.5, bold, INK);
  if (settings.signatoryNip) {
    y -= 14;
    right(`NIP. ${settings.signatoryNip}`, 9.5, font, MUTED);
  }

  // ---------------- Footer ----------------
  const footerY = 58;
  page.drawLine({
    start: { x: MARGIN, y: footerY + 9 },
    end: { x: A4_WIDTH - MARGIN, y: footerY + 9 },
    thickness: 0.5,
    color: LINE,
  });
  page.drawText(clean("Dokumen ini dihasilkan oleh Sistem Peminjaman Ruangan IDB Bali."), {
    x: MARGIN,
    y: footerY,
    size: 7.5,
    font,
    color: MUTED,
  });
  page.drawText(clean(`Diterbitkan ${fmtDateTime(letter.issuedAt)}`), {
    x: MARGIN,
    y: footerY - 10,
    size: 7,
    font,
    color: MUTED,
  });

  const numberText = clean(`Nomor: ${letter.number}`);
  const numberWidth = font.widthOfTextAtSize(numberText, 7.5);
  page.drawText(numberText, {
    x: A4_WIDTH - MARGIN - numberWidth,
    y: footerY,
    size: 7.5,
    font,
    color: MUTED,
  });

  const pageText = "Halaman 1 dari 1";
  const pageWidth = font.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: A4_WIDTH - MARGIN - pageWidth,
    y: footerY - 10,
    size: 7,
    font,
    color: MUTED,
  });

  const incomplete = !settings.address || !settings.signatoryName || !settings.signatoryPosition;
  if (incomplete) {
    page.drawText(
      clean("Catatan: sebagian data kop atau penandatangan belum diatur pada konfigurasi surat."),
      { x: MARGIN, y: footerY + 18, size: 7, font: italic, color: MUTED },
    );
  }

  return doc.save();
}
