"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons";
import { useToast } from "@/components/toast";
import { updateSettingsAction } from "@/app/actions/settings";
import { timeLabel } from "@/lib/format";
import type { Settings } from "@/lib/types";

export function SettingsForm({ settings }: { settings: Settings }) {
  const router = useRouter();
  const { push } = useToast();
  const [form, setForm] = useState({
    openHour: settings.openHour,
    closeHour: settings.closeHour,
    minHours: String(settings.minHours),
    maxHours: String(settings.maxHours),
    windowDays: String(settings.windowDays),
    cancelHours: String(settings.cancelHours),
    autoApprove: settings.autoApprove,
    announcement: settings.announcement,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const result = await updateSettingsAction({
      openHour: form.openHour,
      closeHour: form.closeHour,
      minHours: Number(form.minHours),
      maxHours: Number(form.maxHours),
      windowDays: Number(form.windowDays),
      cancelHours: Number(form.cancelHours),
      autoApprove: form.autoApprove,
      announcement: form.announcement,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      setFieldErrors(result.fieldErrors ?? {});
      return;
    }
    setFieldErrors({});
    push("Pengaturan reservasi disimpan.", "success");
    router.refresh();
  }

  const hourOptions = Array.from({ length: 38 }, (_, index) => {
    const total = 5 * 60 + index * 30;
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
  });

  return (
    <div className="split split-settings" style={{ marginTop: "var(--space-m)" }}>
      <form className="panel" onSubmit={submit} noValidate style={{ display: "grid", gap: "var(--space-m)" }}>
        <div className="panel-head">
          <div>
            <p className="eyebrow">Aturan operasional</p>
            <h3>Pengaturan reservasi</h3>
          </div>
          <span className="badge">Berlaku global</span>
        </div>

        <div className="form-grid cols-2">
          <div className="field" data-invalid={fieldErrors.openHour ? "true" : undefined}>
            <label htmlFor="set-open">Jam buka</label>
            <select
              className="select"
              id="set-open"
              value={form.openHour}
              onChange={(event) => setForm({ ...form, openHour: event.target.value })}
            >
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {timeLabel(hour)}
                </option>
              ))}
            </select>
            <p className="field-error">{fieldErrors.openHour}</p>
          </div>

          <div className="field" data-invalid={fieldErrors.closeHour ? "true" : undefined}>
            <label htmlFor="set-close">Jam tutup</label>
            <select
              className="select"
              id="set-close"
              value={form.closeHour}
              onChange={(event) => setForm({ ...form, closeHour: event.target.value })}
            >
              {hourOptions.map((hour) => (
                <option key={hour} value={hour}>
                  {timeLabel(hour)}
                </option>
              ))}
            </select>
            <p className="field-error">{fieldErrors.closeHour}</p>
          </div>

          <div className="field" data-invalid={fieldErrors.minHours ? "true" : undefined}>
            <label htmlFor="set-min">Durasi minimal (jam)</label>
            <select
              className="select"
              id="set-min"
              value={form.minHours}
              onChange={(event) => setForm({ ...form, minHours: event.target.value })}
            >
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value} jam
                </option>
              ))}
            </select>
            <p className="field-error">{fieldErrors.minHours}</p>
          </div>

          <div className="field" data-invalid={fieldErrors.maxHours ? "true" : undefined}>
            <label htmlFor="set-max">Durasi maksimal (jam)</label>
            <select
              className="select"
              id="set-max"
              value={form.maxHours}
              onChange={(event) => setForm({ ...form, maxHours: event.target.value })}
            >
              {[1, 2, 3, 4, 5, 6, 8].map((value) => (
                <option key={value} value={value}>
                  {value} jam
                </option>
              ))}
            </select>
            <p className="field-error">{fieldErrors.maxHours}</p>
          </div>

          <div className="field" data-invalid={fieldErrors.windowDays ? "true" : undefined}>
            <label htmlFor="set-window">Batas pemesanan ke depan</label>
            <input
              className="input"
              id="set-window"
              inputMode="numeric"
              value={form.windowDays}
              onChange={(event) => setForm({ ...form, windowDays: event.target.value.replace(/[^\d]/g, "") })}
            />
            <p className="field-hint">1–90 hari.</p>
            <p className="field-error">{fieldErrors.windowDays}</p>
          </div>

        </div>

        <label className="check">
          <input
            type="checkbox"
            checked={form.autoApprove}
            onChange={(event) => setForm({ ...form, autoApprove: event.target.checked })}
          />
          <span>
            <strong>Setujui otomatis</strong>
            <br />
            <span className="tiny muted">
              Jika aktif, pengajuan tanpa bentrok langsung berstatus Disetujui. PRD menyarankan keputusan admin, jadi
              gunakan dengan hati-hati.
            </span>
          </span>
        </label>

        <div className="field" data-invalid={fieldErrors.announcement ? "true" : undefined}>
          <label htmlFor="set-announcement">Pengumuman singkat</label>
          <textarea
            className="textarea"
            id="set-announcement"
            rows={2}
            maxLength={160}
            value={form.announcement}
            onChange={(event) => setForm({ ...form, announcement: event.target.value })}
          />
          <p className="field-hint">Tampil pada beranda pengguna.</p>
          <p className="field-error">{fieldErrors.announcement}</p>
        </div>

        {error ? (
          <div className="notice notice-bad">
            <Icon name="alert" />
            <div>{error}</div>
          </div>
        ) : null}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Menyimpan…" : "Simpan pengaturan"}
          </button>
        </div>
      </form>

      <div className="panel" style={{ display: "grid", gap: "var(--space-s)", alignContent: "start" }}>
        <p className="eyebrow">Dampak perubahan</p>
        <div className="dl">
          <div>
            <span>Jam operasional</span>
            <span>
              {timeLabel(settings.openHour)}–{timeLabel(settings.closeHour)}
            </span>
          </div>
          <div>
            <span>Durasi</span>
            <span>
              {settings.minHours}–{settings.maxHours} jam
            </span>
          </div>
          <div>
            <span>Pemesanan</span>
            <span>{settings.windowDays} hari ke depan</span>
          </div>
          <div>
            <span>Pembatalan</span>
            <span>Hanya saat Menunggu</span>
          </div>
          <div>
            <span>Persetujuan</span>
            <span>{settings.autoApprove ? "Otomatis" : "Manual oleh admin"}</span>
          </div>
        </div>
        <div className="notice notice-warn">
          <Icon name="alert" />
          <div>
            <strong>Perubahan tidak mengubah reservasi lama.</strong>
            <span>Validasi baru hanya berlaku untuk pengajuan berikutnya.</span>
          </div>
        </div>
        <div className="dl" style={{ marginTop: "var(--space-2xs)" }}>
          <div>
            <span>Database</span>
            <span>PostgreSQL lokal (PGlite)</span>
          </div>
          <div>
            <span>Sesi</span>
            <span>8 jam, HttpOnly cookie</span>
          </div>
          <div>
            <span>Kata sandi</span>
            <span>scrypt, tidak pernah ke klien</span>
          </div>
        </div>
      </div>
    </div>
  );
}
