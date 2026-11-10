"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { StatusPill } from "@/components/status-pill";
import { useToast } from "@/components/toast";
import { ReservationDetailButton } from "@/components/reservation-detail-button";
import { decideReservationAction, getReservationConflictsAction } from "@/app/actions/reservations";
import { fmtDateShort, fmtDateTime, timeLabel } from "@/lib/format";
import type { Reservation, SessionUser, Settings } from "@/lib/types";

type Decision = "disetujui" | "ditolak";

export function AdminQueue({
  reservations,
  viewer,
  settings,
}: {
  reservations: Reservation[];
  viewer: SessionUser;
  settings: Settings;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [target, setTarget] = useState<{ reservation: Reservation; decision: Decision } | null>(null);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [conflicts, setConflicts] = useState<{
    approved: { code: string; start: string; end: string; activity: string }[];
    pending: { code: string; start: string; end: string; activity: string }[];
  } | null>(null);
  const [checking, setChecking] = useState(false);

  async function open(reservation: Reservation, decision: Decision) {
    setTarget({ reservation, decision });
    setNote("");
    setError("");
    setConflicts(null);
    setChecking(true);
    const result = await getReservationConflictsAction(reservation.id);
    setChecking(false);
    if (result.ok) setConflicts(result.data);
  }

  async function submit() {
    if (!target) return;
    if (target.decision === "ditolak" && note.trim().length < 3) {
      setError("Alasan penolakan wajib diisi minimal 3 karakter.");
      return;
    }
    setBusy(true);
    const result = await decideReservationAction(target.reservation.id, target.decision, note);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      push(result.message, "error");
      return;
    }
    push(
      target.decision === "disetujui"
        ? `Pengajuan ${target.reservation.code} disetujui.`
        : `Pengajuan ${target.reservation.code} ditolak.`,
      "success",
    );
    setTarget(null);
    router.refresh();
  }

  return (
    <>
      <div className="table-wrap table-actions-sticky">
        <table className="table">
          <thead>
            <tr>
              <th>Kode / dikirim</th>
              <th>Kegiatan</th>
              <th>Pemohon</th>
              <th>Ruang</th>
              <th>Jadwal</th>
              <th>Status</th>
              <th className="cell-actions">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((reservation) => {
              const pending = reservation.status === "menunggu";
              return (
                <tr key={reservation.id}>
                  <td>
                    <span className="cell-strong mono">{reservation.code}</span>
                    <span className="cell-sub">{fmtDateTime(reservation.createdAt)}</span>
                  </td>
                  <td>
                    <span className="cell-strong">{reservation.activity}</span>
                    <span className="cell-sub">
                      {reservation.category} · {reservation.participants} peserta
                    </span>
                  </td>
                  <td>
                    <span className="cell-strong">{reservation.user?.fullName}</span>
                    <span className="cell-sub">{reservation.user?.role === "mahasiswa" ? "Mahasiswa" : "Dosen / Staf"}</span>
                  </td>
                  <td>
                    {reservation.room?.name}
                    <span className="cell-sub">{reservation.room?.code}</span>
                  </td>
                  <td className="mono">
                    {fmtDateShort(reservation.date)}
                    <span className="cell-sub">
                      {timeLabel(reservation.start)}–{timeLabel(reservation.end)}
                    </span>
                  </td>
                  <td>
                    <StatusPill status={reservation.status} />
                  </td>
                  <td className="cell-actions">
                    <ReservationDetailButton
                      id={reservation.id}
                      viewer={viewer}
                      settings={settings}
                      allowCancel={false}
                    />
                    {pending ? (
                      <>
                        {" "}
                        <button type="button" className="btn btn-primary btn-sm" onClick={() => open(reservation, "disetujui")}>
                          Setujui
                        </button>{" "}
                        <button type="button" className="btn btn-quiet btn-sm" onClick={() => open(reservation, "ditolak")}>
                          Tolak
                        </button>
                      </>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="record-list">
        {reservations.map((reservation) => {
          const pending = reservation.status === "menunggu";
          return (
            <article className="record" key={reservation.id}>
              <div className="record-top">
                <div>
                  <span className="record-code">{reservation.code}</span>
                  <h3>{reservation.activity}</h3>
                </div>
                <StatusPill status={reservation.status} />
              </div>
              <div className="record-meta">
                <span>{reservation.user?.fullName}</span>
                <span>{reservation.room?.name}</span>
                <span>
                  {fmtDateShort(reservation.date)} · {timeLabel(reservation.start)}–{timeLabel(reservation.end)}
                </span>
              </div>
              <div className="record-actions">
                <ReservationDetailButton
                  id={reservation.id}
                  viewer={viewer}
                  settings={settings}
                  allowCancel={false}
                />
                {pending ? (
                  <>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => open(reservation, "disetujui")}>
                      Setujui
                    </button>
                    <button type="button" className="btn btn-quiet btn-sm" onClick={() => open(reservation, "ditolak")}>
                      Tolak
                    </button>
                  </>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={Boolean(target)}
        onClose={() => setTarget(null)}
        title={target?.decision === "disetujui" ? "Setujui pengajuan" : "Tolak pengajuan"}
        subtitle={target?.reservation.code}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setTarget(null)}>
              Batal
            </button>
            <button
              type="button"
              className={target?.decision === "disetujui" ? "btn btn-primary" : "btn btn-danger"}
              onClick={submit}
              disabled={busy || (target?.decision === "disetujui" && Boolean(conflicts?.approved.length))}
            >
              {busy ? "Menyimpan…" : target?.decision === "disetujui" ? "Setujui pengajuan" : "Tolak pengajuan"}
            </button>
          </>
        }
      >
        {target ? (
          <>
            <p>
              {target.decision === "disetujui" ? "Setujui" : "Tolak"} <strong>{target.reservation.code}</strong> untuk{" "}
              <strong>{target.reservation.activity}</strong>?
            </p>
            <div className="dl" style={{ marginTop: "var(--space-s)" }}>
              <div>
                <span>Ruang</span>
                <span>
                  {target.reservation.room?.name} · {target.reservation.room?.code}
                </span>
              </div>
              <div>
                <span>Jadwal</span>
                <span>
                  {fmtDateShort(target.reservation.date)}, {timeLabel(target.reservation.start)}–
                  {timeLabel(target.reservation.end)}
                </span>
              </div>
              <div>
                <span>Pemohon</span>
                <span>{target.reservation.user?.fullName}</span>
              </div>
            </div>
            <div className="notice notice-info" style={{ marginTop: "var(--space-s)" }} aria-live="polite">
              <Icon name={checking ? "refresh" : conflicts?.approved.length ? "alert" : "check"} />
              <div>
                <strong>
                  {checking
                    ? "Memeriksa bentrok jadwal…"
                    : conflicts?.approved.length
                      ? "Jadwal bertabrakan dengan peminjaman yang sudah disetujui"
                      : "Tidak ada bentrok dengan peminjaman disetujui"}
                </strong>
                {!checking && conflicts ? (
                  <span>
                    {conflicts.approved.length
                      ? conflicts.approved
                          .map((item) => `${item.code} (${timeLabel(item.start)}–${timeLabel(item.end)})`)
                          .join(", ")
                      : conflicts.pending.length
                        ? `Ada ${conflicts.pending.length} pengajuan lain yang masih menunggu pada slot ini. Pengajuan hanya dapat diputuskan satu per satu.`
                        : "Slot ruang tersedia menurut jadwal aktif saat ini."}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="field" style={{ marginTop: "var(--space-s)" }}>
              <label htmlFor="decision-note">
                Catatan {target.decision === "ditolak" ? <span className="req">*</span> : "(opsional)"}
              </label>
              <textarea
                className="textarea"
                id="decision-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                data-autofocus
                placeholder={
                  target.decision === "disetujui"
                    ? "Contoh: Ruang tersedia, harap menjaga kebersihan."
                    : "Jelaskan alasan agar pemohon dapat menyesuaikan jadwal."
                }
              />
              <p className="field-hint">
                {target.decision === "disetujui"
                  ? "Catatan akan terlihat oleh pemohon dan tercatat pada jejak audit."
                  : "Alasan penolakan wajib diisi dan tercatat pada jejak audit."}
              </p>
              {error ? (
                <p className="field-error" style={{ display: "block" }}>
                  {error}
                </p>
              ) : null}
            </div>
          </>
        ) : null}
      </Modal>
    </>
  );
}
