import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getReservation } from "@/lib/data";
import { getLetterForReservation, getLetterSettings } from "@/lib/letters";
import { buildLetterPdf } from "@/lib/letter-pdf";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return new NextResponse("Tidak terautentikasi.", { status: 401 });
  }

  const { id } = await params;

  try {
    const reservation = await getReservation(id);
    if (!reservation) {
      return new NextResponse("Peminjaman tidak ditemukan.", { status: 404 });
    }
    if (user.role !== "admin" && reservation.userId !== user.id) {
      return new NextResponse("Anda tidak berwenang membuka surat ini.", { status: 403 });
    }
    if (reservation.status !== "disetujui") {
      return new NextResponse("Surat hanya tersedia untuk peminjaman yang sudah disetujui.", { status: 409 });
    }

    const letter = await getLetterForReservation(id);
    if (!letter) {
      return new NextResponse("Surat belum diterbitkan.", { status: 404 });
    }

    const settings = await getLetterSettings();
    const pdf = await buildLetterPdf(reservation, letter, settings);
    const download = new URL(request.url).searchParams.get("download") === "1";
    const safeNumber = letter.number.replace(/[^A-Za-z0-9._-]+/g, "-");

    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="Surat-Peminjaman-${safeNumber}.pdf"`,
        "Cache-Control": "no-store",
        "Content-Length": String(pdf.byteLength),
      },
    });
  } catch (error) {
    console.error("[letterPdf] gagal:", error);
    return new NextResponse("Surat tidak dapat dibuat saat ini.", { status: 500 });
  }
}
