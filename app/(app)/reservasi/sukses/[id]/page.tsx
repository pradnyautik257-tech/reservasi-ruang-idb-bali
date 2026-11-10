import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { requireRole } from "@/lib/auth";
import { getReservation } from "@/lib/data";
import { fmtDate, timeLabel } from "@/lib/format";
import { Icon } from "@/components/icons";
import { StatusPill } from "@/components/status-pill";
import { PrintButton } from "@/components/print-button";

export const metadata: Metadata = { title: "Pengajuan tercatat" };

const STEPS: Record<string, [string, string][]> = {
  menunggu: [
    ["Menunggu pemeriksaan", "Admin memeriksa jadwal dan kelengkapan pengajuan."],
    ["Keputusan admin", "Pantau status terbaru beserta catatannya di halaman Reservasi saya."],
    ["Gunakan ruang sesuai jadwal", "Tunjukkan nomor reservasi bila petugas ruang meminta konfirmasi."],
  ],
  disetujui: [
    ["Disetujui admin", "Ruang sudah dipesan untuk jadwal ini. Slot tidak tersedia untuk pengguna lain."],
    ["Gunakan ruang sesuai jadwal", "Datang sesuai waktu dan tunjukkan nomor reservasi bila diminta."],
    ["Jaga kondisi ruang", "Kembalikan tata letak dan laporkan kerusakan kepada petugas."],
  ],
  ditolak: [
    ["Ditolak admin", "Pengajuan ini tidak dapat diterima. Alasan penolakan tercatat pada detail reservasi."],
    ["Lihat catatan admin", "Buka detail untuk membaca alasan, lalu sesuaikan jadwal atau ruang."],
    ["Ajukan jadwal lain", "Anda dapat mengirim pengajuan baru selama slot masih tersedia."],
  ],
  dibatalkan: [
    ["Dibatalkan", "Pengajuan dibatalkan dan slot ruang sudah dilepas untuk pengguna lain."],
    ["Cek riwayat", "Alasan pembatalan tercatat pada detail reservasi."],
    ["Ajukan ulang bila perlu", "Kirim pengajuan baru selama jadwal masih tersedia."],
  ],
};

export default async function SuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(["mahasiswa", "dosen", "admin"]);
  const { id } = await params;
  const reservation = await getReservation(id);

  if (!reservation || (reservation.userId !== user.id && user.role !== "admin")) {
    notFound();
  }

  const steps = STEPS[reservation.status] ?? STEPS.menunggu;
  const intro =
    reservation.status === "menunggu"
      ? "Admin reservasi akan memeriksa kelengkapan dan ketersediaan ruang. Anda tidak perlu mengirim ulang pengajuan."
      : "Pengajuan ini sudah diproses. Status dan catatan terbaru tersimpan pada riwayat reservasi Anda.";

  return (
    <div className="wrap-narrow">
      <div className="success">
        <span className="success-mark">
          <Icon name="check" />
          Pengajuan tercatat
        </span>
        <h1>Terima kasih, pengajuan Anda sudah masuk.</h1>
        <p className="lead">{intro}</p>

        <div className="success-code">
          <span>Nomor reservasi</span>
          <strong>{reservation.code}</strong>
          <span
            style={{
              letterSpacing: 0,
              textTransform: "none",
              fontFamily: "var(--font-text)",
              fontSize: 13,
              color: "var(--ink-2)",
            }}
          >
            {reservation.activity} · {reservation.room?.name}
            <br />
            {fmtDate(reservation.date, { weekday: true })}, {timeLabel(reservation.start)}–{timeLabel(reservation.end)} ·{" "}
            {reservation.participants} peserta
          </span>
        </div>

        <div className={`success-status is-${reservation.status}`}>
          <div className="success-status-head">
            <span className="eyebrow is-muted" style={{ fontSize: 9.5 }}>
              Status saat ini
            </span>
            <StatusPill status={reservation.status} />
          </div>
          <p className="tiny muted">
            {reservation.status === "menunggu"
              ? "Status dapat berubah menjadi Disetujui, Ditolak, atau Dibatalkan — setiap perubahan tercatat pada riwayat pengajuan."
              : "Status terbaru sudah tersimpan pada riwayat pengajuan Anda."}
          </p>
        </div>

        <div className="success-steps">
          {steps.map(([title, description], index) => (
            <div className="success-step" key={title}>
              <b>{String(index + 1).padStart(2, "0")}</b>
              <div>
                <strong>{title}</strong>
                <br />
                <span className="muted">{description}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="btn-group">
          <Link className="btn btn-primary" href="/reservasi">
            Lihat reservasi saya
          </Link>
          <Link className="btn btn-ghost" href="/reservasi/baru">
            Ajukan lagi
          </Link>
          <PrintButton />
        </div>
      </div>
    </div>
  );
}
