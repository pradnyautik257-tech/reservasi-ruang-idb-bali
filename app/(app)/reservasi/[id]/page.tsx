import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { getReservation, getSettings } from "@/lib/data";
import { getLetterForReservation } from "@/lib/letters";
import { durationLabel, fmtDate, fmtDateTime, timeLabel, toMinutes } from "@/lib/format";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";
import { ReservationCancelButton } from "@/components/reservation-cancel-button";

export const metadata: Metadata = { title: "Detail peminjaman" };

export default async function ReservationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const settings = await getSettings();
  const reservation = await getReservation(id);

  if (!reservation) notFound();
  if (user.role !== "admin" && reservation.userId !== user.id) notFound();

  const letter = reservation.status === "disetujui" ? await getLetterForReservation(id) : null;
  const minutes = toMinutes(reservation.end) - toMinutes(reservation.start);
  const backHref = user.role === "admin" ? "/admin/pengajuan" : "/reservasi";

  return (
    <div className="wrap">
      <div className="page-head">
        <p className="eyebrow">Detail peminjaman · {reservation.code}</p>
        <div className="row-between" style={{ alignItems: "flex-start" }}>
          <div style={{ display: "grid", gap: 10 }}>
            <h1>{reservation.activity}</h1>
            <div className="row-between" style={{ justifyContent: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <StatusPill status={reservation.status} />
              <span className="mono tiny muted">{reservation.code}</span>
              <span className="tiny muted">Diajukan {fmtDateTime(reservation.createdAt)}</span>
            </div>
          </div>
          <div className="btn-group">
            <Link className="btn btn-ghost btn-sm" href={backHref}>
              <Icon name="arrowRight" className="icon-flip" /> Kembali
            </Link>
          </div>
        </div>
      </div>

      <div className="split split-form" style={{ alignItems: "start" }}>
        <div style={{ display: "grid", gap: "var(--space-m)" }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Informasi</p>
                <h3>Rincian peminjaman</h3>
              </div>
              <StatusPill status={reservation.status} />
            </div>
            <div className="dl">
              <div>
                <span>Kegiatan</span>
                <span>
                  <strong>{reservation.activity}</strong>
                  <br />
                  <span className="tiny muted">{reservation.category}</span>
                </span>
              </div>
              <div>
                <span>Ruangan</span>
                <span>
                  {reservation.room?.name} · {reservation.room?.code}
                  <br />
                  <span className="tiny muted">
                    {reservation.room?.building} · Lt. {reservation.room?.floor} · {reservation.room?.capacity} orang
                  </span>
                </span>
              </div>
              <div>
                <span>Jadwal</span>
                <span>
                  {fmtDate(reservation.date, { weekday: true })}
                  <br />
                  {timeLabel(reservation.start)}–{timeLabel(reservation.end)} · {durationLabel(minutes)}
                </span>
              </div>
              <div>
                <span>Jumlah peserta</span>
                <span>{reservation.participants} orang</span>
              </div>
              <div>
                <span>Peminjam</span>
                <span>
                  {reservation.user?.fullName}
                  <br />
                  <span className="tiny muted">
                    {[reservation.user?.identity, reservation.user?.email].filter(Boolean).join(" · ")}
                  </span>
                </span>
              </div>
              {reservation.contact ? (
                <div>
                  <span>Kontak</span>
                  <span className="mono">{reservation.contact}</span>
                </div>
              ) : null}
              {reservation.purpose ? (
                <div>
                  <span>Tujuan</span>
                  <span>{reservation.purpose}</span>
                </div>
              ) : null}
              {reservation.note ? (
                <div>
                  <span>Keterangan</span>
                  <span>{reservation.note}</span>
                </div>
              ) : null}
              {reservation.decidedAt ? (
                <div>
                  <span>Keputusan</span>
                  <span>
                    {fmtDateTime(reservation.decidedAt)}
                    {reservation.decisionNote ? (
                      <>
                        <br />
                        <span className="tiny muted">{reservation.decisionNote}</span>
                      </>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Riwayat</p>
                <h3>Jejak perubahan status</h3>
              </div>
            </div>
            <div className="timeline">
              {(reservation.history ?? []).map((entry, index) => (
                <div
                  className={`timeline-item${index === (reservation.history?.length ?? 0) - 1 ? " is-accent" : ""}`}
                  key={entry.id}
                >
                  <div className="timeline-when">
                    {fmtDateTime(entry.createdAt)} · {entry.actorName ?? "Sistem"}
                  </div>
                  <div className="timeline-what">{entry.action}</div>
                  {entry.note ? <div className="timeline-note">{entry.note}</div> : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <aside style={{ display: "grid", gap: "var(--space-m)" }}>
          <div className="panel">
            <div className="panel-head">
              <div>
                <p className="eyebrow">Dokumen</p>
                <h3>Surat peminjaman</h3>
              </div>
              <Icon name="file" />
            </div>

            {reservation.status === "disetujui" ? (
              letter ? (
                <div style={{ display: "grid", gap: "var(--space-s)" }}>
                  <div>
                    <p className="tiny muted">Nomor surat</p>
                    <p className="mono" style={{ fontSize: 16, fontWeight: 600 }}>
                      {letter.number}
                    </p>
                    <p className="tiny muted">Diterbitkan {fmtDateTime(letter.issuedAt)}</p>
                  </div>
                  <div className="btn-group">
                    <Link className="btn btn-primary btn-sm" href={`/surat/${reservation.id}`}>
                      <Icon name="eye" /> Lihat Surat
                    </Link>
                    <a className="btn btn-ghost btn-sm" href={`/api/surat/${reservation.id}/pdf?download=1`}>
                      <Icon name="download" /> Unduh PDF
                    </a>
                    <Link className="btn btn-quiet btn-sm" href={`/surat/${reservation.id}?print=1`}>
                      Cetak Surat
                    </Link>
                  </div>
                  <p className="tiny muted">
                    Surat diambil langsung dari data peminjaman yang telah disetujui. Pratinjau tersedia sebelum diunduh
                    atau dicetak.
                  </p>
                </div>
              ) : (
                <div className="notice notice-warn">
                  <Icon name="alert" />
                  <div>
                    <strong>Surat belum diterbitkan.</strong>
                    <span>Hubungi admin reservasi untuk menerbitkan surat peminjaman ini.</span>
                  </div>
                </div>
              )
            ) : (
              <div className="notice notice-info">
                <Icon name="info" />
                <div>
                  <strong>Surat belum tersedia.</strong>
                  <span>
                    Surat peminjaman hanya dapat diterbitkan setelah permohonan berstatus <strong>Disetujui</strong>.
                    Status saat ini: {reservation.status === "menunggu" ? "Menunggu Persetujuan" : reservation.status}.
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="panel" style={{ display: "grid", gap: "var(--space-2xs)" }}>
            <p className="eyebrow">Status</p>
            <p style={{ fontSize: 14 }}>
              {reservation.status === "menunggu"
                ? "Permohonan sedang diperiksa admin. Surat belum dapat diterbitkan."
                : reservation.status === "disetujui"
                  ? "Peminjaman disetujui. Surat dapat ditampilkan, diunduh, dan dicetak."
                  : reservation.status === "ditolak"
                    ? "Permohonan ditolak. Surat tidak diterbitkan."
                    : "Peminjaman dibatalkan. Surat tidak berlaku."}
            </p>
            {user.role !== "admin" ? (
              <ReservationCancelButton reservation={reservation} viewer={user} settings={settings} />
            ) : null}
            <Link className="link-arrow" href={backHref}>
              Kembali ke daftar <Icon name="arrowRight" />
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
