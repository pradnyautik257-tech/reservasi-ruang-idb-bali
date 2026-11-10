"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { StatusPill } from "@/components/status-pill";
import { useToast } from "@/components/toast";
import { cancelReservationAction, getReservationDetailAction } from "@/app/actions/reservations";
import { canCancelReservation } from "@/lib/policy";
import { durationLabel, fmtDate, fmtDateTime, timeLabel, toMinutes } from "@/lib/format";
import type { Reservation, SessionUser, Settings } from "@/lib/types";

export function ReservationDetailButton({
  id,
  viewer,
  settings,
  label = "Detail",
  className = "btn btn-ghost btn-sm",
  allowCancel = true,
  children,
  style,
}: {
  id: string;
  viewer: SessionUser;
  settings: Settings;
  label?: string;
  className?: string;
  allowCancel?: boolean;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<Reservation | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  async function openDetail() {
    setOpen(true);
    setError("");
    if (data) return;
    setLoading(true);
    const result = await getReservationDetailAction(id);
    setLoading(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setData(result.data);
  }

  async function cancel() {
    if (note.trim().length < 3) {
      setError("Tuliskan alasan pembatalan minimal 3 karakter.");
      return;
    }
    setBusy(true);
    const result = await cancelReservationAction(id, note);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      push(result.message, "error");
      return;
    }
    push("Pengajuan berhasil dibatalkan.", "success");
    setOpen(false);
    setConfirmOpen(false);
    setData(null);
    setNote("");
    router.refresh();
  }

  const permission = data ? canCancelReservation(data, viewer, settings) : { allowed: false };
  const showCancel = allowCancel && data && permission.allowed;
  const minutes = data ? toMinutes(data.end) - toMinutes(data.start) : 0;

  return (
    <>
      <button type="button" className={className} onClick={openDetail} style={style}>
        {children ?? label}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={data ? data.activity : "Detail pengajuan"}
        subtitle={data?.room ? `${data.room.name} · ${fmtDate(data.date, { short: true })}` : undefined}
        wide
        footer={
          <>
            <Link className="btn btn-quiet" href={`/reservasi/${id}`} onClick={() => setOpen(false)}>
              Halaman detail
            </Link>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
              Tutup
            </button>
            {showCancel ? (
              <button type="button" className="btn btn-danger" onClick={() => setConfirmOpen(true)}>
                Batalkan pengajuan
              </button>
            ) : null}
          </>
        }
      >
        {loading ? <p className="muted">Memuat detail…</p> : null}
        {error && !data ? (
          <div className="notice notice-bad">
            <Icon name="alert" />
            <div>{error}</div>
          </div>
        ) : null}
        {data ? (
          <>
            <div className="detail-code">
              <strong className="mono">{data.code}</strong>
              <StatusPill status={data.status} />
            </div>
            <div className="dl">
              <div>
                <span>Kegiatan</span>
                <span>
                  <strong>{data.activity}</strong>
                  <br />
                  <span className="tiny muted">{data.category}</span>
                </span>
              </div>
              <div>
                <span>Ruang</span>
                <span>
                  {data.room?.name} · {data.room?.code}
                  <br />
                  <span className="tiny muted">
                    {data.room?.building} · Lt. {data.room?.floor} · {data.room?.capacity} orang
                  </span>
                </span>
              </div>
              <div>
                <span>Jadwal</span>
                <span>
                  {fmtDate(data.date, { weekday: true })}
                  <br />
                  {timeLabel(data.start)}–{timeLabel(data.end)} · {durationLabel(minutes)}
                </span>
              </div>
              <div>
                <span>Peserta</span>
                <span>{data.participants} orang</span>
              </div>
              <div>
                <span>Pemohon</span>
                <span>
                  {data.user?.fullName}
                  <br />
                  <span className="tiny muted">{data.user?.email}</span>
                </span>
              </div>
              {data.contact ? (
                <div>
                  <span>Kontak</span>
                  <span className="mono">{data.contact}</span>
                </div>
              ) : null}
              {data.purpose ? (
                <div>
                  <span>Tujuan</span>
                  <span>{data.purpose}</span>
                </div>
              ) : null}
              {data.note ? (
                <div>
                  <span>Catatan</span>
                  <span>{data.note}</span>
                </div>
              ) : null}
              <div>
                <span>Dikirim</span>
                <span>{fmtDateTime(data.createdAt)}</span>
              </div>
              {data.decidedAt ? (
                <div>
                  <span>Keputusan</span>
                  <span>
                    {fmtDateTime(data.decidedAt)}
                    {data.decisionNote ? (
                      <>
                        <br />
                        <span className="tiny muted">{data.decisionNote}</span>
                      </>
                    ) : null}
                  </span>
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: "var(--space-m)" }}>
              <p className="eyebrow is-muted" style={{ marginBottom: "var(--space-xs)" }}>
                Jejak perubahan
              </p>
              <div className="timeline">
                {(data.history ?? []).map((entry, index) => (
                  <div className={`timeline-item${index === (data.history?.length ?? 0) - 1 ? " is-accent" : ""}`} key={entry.id}>
                    <div className="timeline-when">
                      {fmtDateTime(entry.createdAt)} · {entry.actorName ?? "Sistem"}
                    </div>
                    <div className="timeline-what">{entry.action}</div>
                    {entry.note ? <div className="timeline-note">{entry.note}</div> : null}
                  </div>
                ))}
              </div>
            </div>

            {!permission.allowed && allowCancel && permission.reason ? (
              <p className="tiny muted" style={{ marginTop: "var(--space-s)" }}>
                {permission.reason}
              </p>
            ) : null}
          </>
        ) : null}
      </Modal>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Batalkan ${data?.code ?? ""}?`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setConfirmOpen(false)}>
              Pertahankan
            </button>
            <button type="button" className="btn btn-danger" onClick={cancel} disabled={busy}>
              {busy ? "Membatalkan…" : "Ya, batalkan"}
            </button>
          </>
        }
      >
        <p>Status akan berubah menjadi Dibatalkan dan slot ruang dilepas untuk pengguna lain.</p>
        <div className="field" style={{ marginTop: "var(--space-s)" }}>
          <label htmlFor="cancel-note">
            Alasan pembatalan <span className="req">*</span>
          </label>
          <textarea
            className="textarea"
            id="cancel-note"
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            data-autofocus
          />
          <p className="field-hint">Alasan dicatat pada jejak perubahan dan panel admin.</p>
          {error ? <p className="field-error" style={{ display: "block" }}>{error}</p> : null}
        </div>
      </Modal>
    </>
  );
}
