"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { useToast } from "@/components/toast";
import { cancelReservationAction } from "@/app/actions/reservations";
import { canCancelReservation } from "@/lib/policy";
import type { Reservation, SessionUser, Settings } from "@/lib/types";

export function ReservationCancelButton({
  reservation,
  viewer,
  settings,
  className = "btn btn-danger btn-sm",
  label = "Batalkan pengajuan",
}: {
  reservation: Reservation;
  viewer: SessionUser;
  settings: Settings;
  className?: string;
  label?: string;
}) {
  const router = useRouter();
  const { push } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const permission = canCancelReservation(reservation, viewer, settings);
  if (!permission.allowed) return <p className="tiny muted">{permission.reason}</p>;

  async function cancel() {
    if (note.trim().length < 3) {
      setError("Tuliskan alasan pembatalan minimal 3 karakter.");
      return;
    }
    setBusy(true);
    setError("");
    const result = await cancelReservationAction(reservation.id, note);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      push(result.message, "error");
      return;
    }
    push("Pengajuan berhasil dibatalkan.", "success");
    setOpen(false);
    setNote("");
    router.refresh();
  }

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <Icon name="x" /> {label}
      </button>

      <Modal
        open={open}
        onClose={() => {
          if (!busy) setOpen(false);
        }}
        title={`Batalkan ${reservation.code}?`}
        footer={
          <>
            <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)} disabled={busy}>
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
          <label htmlFor="detail-cancel-note">
            Alasan pembatalan <span className="req">*</span>
          </label>
          <textarea
            id="detail-cancel-note"
            className="textarea"
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
