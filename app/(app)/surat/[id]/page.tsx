import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getReservation } from "@/lib/data";
import { getLetterForReservation, getLetterSettings } from "@/lib/letters";
import { fmtDate, fmtDateTime, timeLabel } from "@/lib/format";
import { AutoPrint } from "@/components/auto-print";
import { Icon } from "@/components/icons";
import { LetterDocument } from "@/components/letter-document";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Surat peminjaman" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LetterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: SearchParams;
}) {
  const user = await requireUser();
  const { id } = await params;
  const query = await searchParams;
  const reservation = await getReservation(id);

  if (!reservation) notFound();
  if (user.role !== "admin" && reservation.userId !== user.id) notFound();

  const letter = await getLetterForReservation(id);
  const settings = await getLetterSettings();
  const backHref = `/reservasi/${id}`;

  if (reservation.status !== "disetujui" || !letter) {
    return (
      <div className="wrap">
        <div className="empty" style={{ marginTop: "var(--space-l)" }}>
          <div className="empty-icon">
            <Icon name="file" />
          </div>
          <h3>{reservation.status === "disetujui" ? "Surat belum diterbitkan" : "Surat belum tersedia"}</h3>
          <p>
            {reservation.status === "disetujui"
              ? "Peminjaman sudah disetujui, tetapi surat belum dibuat. Hubungi admin reservasi untuk menerbitkannya."
              : "Surat peminjaman hanya dapat diterbitkan untuk permohonan yang sudah disetujui admin."}
          </p>
          <div className="btn-group">
            <Link className="btn btn-primary" href={backHref}>
              Kembali ke detail
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const incomplete = !settings.address || !settings.signatoryName || !settings.signatoryPosition;

  return (
    <>
      <div className="letter-page">
        <div className="letter-toolbar">
          <Link className="btn btn-ghost btn-sm" href={backHref}>
            <Icon name="arrowRight" className="icon-flip" /> Kembali
          </Link>
          <span className="tiny muted" style={{ marginLeft: 8 }}>
            {reservation.code} · disetujui {fmtDateTime(reservation.decidedAt)}
          </span>
          <span className="grow" />
          <a className="btn btn-primary btn-sm" href={`/api/surat/${reservation.id}/pdf?download=1`}>
            <Icon name="download" /> Unduh PDF
          </a>
          <PrintButton label="Cetak Surat" />
        </div>

        {incomplete ? (
          <div className="notice notice-warn letter-config-warning" style={{ width: "min(210mm, 100%)", margin: "0 auto var(--space-m)" }}>
            <Icon name="alert" />
            <div>
              <strong>Beberapa data surat belum diatur.</strong>
              <span>
                Alamat/kop atau data pejabat penandatangan masih kosong dan ditampilkan sebagai titik-titik. Lengkapi
                melalui panel admin sebelum surat digunakan secara resmi.
              </span>
            </div>
          </div>
        ) : null}

        <LetterDocument reservation={reservation} letter={letter} settings={settings} />

        <p className="tiny muted letter-preview-note" style={{ width: "min(210mm, 100%)", margin: "var(--space-s) auto 0" }}>
          Pratinjau A4 · nomor {letter.number} · diterbitkan {fmtDateTime(letter.issuedAt)} ·{" "}
          {fmtDate(reservation.date, { weekday: true })}, {timeLabel(reservation.start)}–{timeLabel(reservation.end)}
        </p>
      </div>

      {query.print === "1" ? <AutoPrint /> : null}
    </>
  );
}
