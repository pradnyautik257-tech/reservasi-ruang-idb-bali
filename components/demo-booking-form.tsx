"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { TimeOptions } from "@/components/time-options";
import {
  addDaysISO,
  fmtDate,
  nextBookableDay,
  timeLabel,
  toMinutes,
  todayISO,
} from "@/lib/format";
import { overlaps } from "@/lib/slots";
import { validateReservation } from "@/lib/validation";
import {
  addDemoReservation,
  type DemoMutationResult,
  DEMO_SETTINGS,
} from "@/lib/demo-store";
import type {
  Category,
  Reservation,
  ReservationInput,
  Room,
  SessionUser,
  Settings,
} from "@/lib/types";

const CATEGORIES: Category[] = ["Akademik", "Organisasi", "Seminar", "Lomba", "Lainnya"];

export interface DemoBookingSeed {
  roomId?: string;
  date?: string;
  start?: string;
  end?: string;
  participants?: string;
  nonce: number;
}

export function DemoBookingForm({
  user,
  rooms,
  reservations,
  seed,
  settings = DEMO_SETTINGS,
  onCreated,
  onBack,
}: {
  user: SessionUser;
  rooms: Room[];
  reservations: Reservation[];
  seed: DemoBookingSeed;
  settings?: Settings;
  onCreated: (result: Extract<DemoMutationResult, { ok: true }>) => void;
  onBack: () => void;
}) {
  const today = todayISO();
  const firstAvailable = nextBookableDay(today);
  const rawDate = seed.date || firstAvailable;
  const initialDate = nextBookableDay(rawDate);
  const [form, setForm] = useState<ReservationInput>({
    activity: "",
    category: "Akademik",
    roomId: seed.roomId && rooms.some((room) => room.id === seed.roomId) ? seed.roomId : (rooms[0]?.id ?? ""),
    date: initialDate,
    start: seed.start ?? "",
    end: seed.end ?? "",
    participants: seed.participants ?? "",
    contact: "",
    purpose: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [dateNotice, setDateNotice] = useState(
    initialDate !== rawDate
      ? `Minggu libur. Tanggal dialihkan ke ${fmtDate(initialDate, { weekday: true, short: true })}.`
      : "",
  );
  const [busy, setBusy] = useState(false);

  const room = rooms.find((item) => item.id === form.roomId) ?? null;
  const bookings = useMemo(
    () =>
      reservations
        .filter(
          (item) =>
            item.roomId === form.roomId &&
            item.date === form.date &&
            (item.status === "menunggu" || item.status === "disetujui"),
        )
        .sort((a, b) => a.start.localeCompare(b.start)),
    [reservations, form.roomId, form.date],
  );
  const conflicts = useMemo(
    () => (form.start && form.end ? bookings.filter((booking) => overlaps(form.start, form.end, booking)) : []),
    [bookings, form.start, form.end],
  );
  const minutes = form.start && form.end ? toMinutes(form.end) - toMinutes(form.start) : 0;

  function update<K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setServerError("");
  }

  function changeDate(value: string) {
    const nextDate = nextBookableDay(value);
    update("date", nextDate);
    setDateNotice(
      nextDate !== value
        ? `Minggu libur. Tanggal dialihkan ke ${fmtDate(nextDate, { weekday: true, short: true })}.`
        : "",
    );
  }

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setServerError("");
    const validation = validateReservation(
      form,
      settings,
      room,
      conflicts.map((booking) => ({ code: booking.code, start: booking.start, end: booking.end })),
    );
    setErrors(validation.fieldErrors);
    if (!validation.ok) {
      const first = Object.keys(validation.fieldErrors)[0];
      document.querySelector<HTMLElement>(`[name="${first}"]`)?.focus();
      return;
    }
    setBusy(true);
    const result = addDemoReservation(form, user, reservations);
    setBusy(false);
    if (!result.ok) {
      setServerError(result.message);
      return;
    }
    onCreated(result);
  }

  const summaryStatus =
    !form.start || !form.end
      ? { className: "pill pill-menunggu", text: "Lengkapi waktu" }
      : conflicts.length
        ? { className: "pill pill-ditolak", text: "Jadwal bentrok" }
        : minutes <= 0
          ? { className: "pill pill-menunggu", text: "Waktu belum valid" }
          : { className: "pill pill-disetujui", text: "Ruang tersedia" };

  return (
    <div className="wrap demo-wrap">
      <div className="page-head">
        <div>
          <p className="eyebrow">Pengajuan baru · mode demo</p>
          <h1>Ajukan reservasi ruang</h1>
          <p className="page-subtitle">
            Pengajuan akan berstatus <strong>Menunggu</strong>. Setelah dikirim, masuk sebagai akun admin untuk
            menyetujui atau menolak — datanya tersimpan di browser ini.
          </p>
        </div>
        <div className="page-actions">
          <button type="button" className="btn btn-ghost" onClick={onBack}>
            <Icon name="arrowRight" className="icon-flip" /> Kembali ke ruangan
          </button>
        </div>
      </div>

      {serverError ? (
        <div className="notice notice-bad" role="alert" style={{ marginBottom: "var(--space-m)" }}>
          <Icon name="alert" />
          <div>
            <strong>Pengajuan belum tersimpan.</strong>
            <span>{serverError}</span>
          </div>
        </div>
      ) : null}

      {Object.keys(errors).length > 0 ? (
        <div className="notice notice-bad" role="alert" style={{ marginBottom: "var(--space-m)" }}>
          <Icon name="alert" />
          <div>
            <strong>Ada isian yang perlu diperbaiki.</strong>
            <span>{Object.values(errors).filter(Boolean).slice(0, 2).join(" ")}</span>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} noValidate>
        <div className="split split-form" style={{ alignItems: "start" }}>
          <div className="panel" style={{ display: "grid", gap: "var(--space-m)" }}>
            <div>
              <div className="panel-head">
                <h3>Detail kegiatan</h3>
                <span className="badge">1 dari 2</span>
              </div>
              <div className="form-grid">
                <div className="field" data-invalid={errors.activity ? "true" : undefined}>
                  <label htmlFor="demo-activity">
                    Nama kegiatan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="demo-activity"
                    name="activity"
                    maxLength={90}
                    placeholder="Contoh: Rapat Himpunan Mahasiswa DKV"
                    value={form.activity}
                    onChange={(event) => update("activity", event.target.value)}
                  />
                  <p className="field-hint">Tuliskan nama yang dikenali peserta, 4–90 karakter.</p>
                  <p className="field-error">{errors.activity}</p>
                </div>

                <div className="field" data-invalid={errors.category ? "true" : undefined}>
                  <label htmlFor="demo-category">
                    Jenis kegiatan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <select
                    className="select"
                    id="demo-category"
                    name="category"
                    value={form.category}
                    onChange={(event) => update("category", event.target.value as Category)}
                  >
                    {CATEGORIES.map((category) => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                  <p className="field-error">{errors.category}</p>
                </div>

                <div className="field" data-invalid={errors.participants ? "true" : undefined}>
                  <label htmlFor="demo-participants">
                    Jumlah peserta <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    className="input"
                    id="demo-participants"
                    name="participants"
                    inputMode="numeric"
                    placeholder="Contoh: 30"
                    value={form.participants}
                    onChange={(event) => update("participants", event.target.value.replace(/[^\d]/g, ""))}
                  />
                  <p className="field-error">{errors.participants}</p>
                </div>

                <div className="field" data-invalid={errors.contact ? "true" : undefined}>
                  <label htmlFor="demo-contact">Nomor kontak</label>
                  <input
                    className="input"
                    id="demo-contact"
                    name="contact"
                    placeholder="08xxxxxxxxxx"
                    value={form.contact}
                    onChange={(event) => update("contact", event.target.value)}
                  />
                  <p className="field-hint">Dipakai admin bila perlu konfirmasi.</p>
                  <p className="field-error">{errors.contact}</p>
                </div>

                <div className="field" data-invalid={errors.purpose ? "true" : undefined}>
                  <label htmlFor="demo-purpose">
                    Tujuan peminjaman <span className="req" aria-hidden="true">*</span>
                  </label>
                  <textarea
                    className="textarea"
                    id="demo-purpose"
                    name="purpose"
                    rows={3}
                    maxLength={300}
                    placeholder="Jelaskan singkat tujuan dan kebutuhan kegiatan."
                    value={form.purpose}
                    onChange={(event) => update("purpose", event.target.value)}
                  />
                  <p className="field-hint">Minimal 10 karakter.</p>
                  <p className="field-error">{errors.purpose}</p>
                </div>

                <div className="field">
                  <label htmlFor="demo-note">Catatan tambahan</label>
                  <textarea
                    className="textarea"
                    id="demo-note"
                    name="note"
                    rows={3}
                    maxLength={300}
                    placeholder="Opsional."
                    value={form.note}
                    onChange={(event) => update("note", event.target.value)}
                  />
                  <p className="field-error">{errors.note}</p>
                </div>
              </div>
            </div>

            <div>
              <div className="panel-head">
                <h3>Ruang &amp; waktu</h3>
                <span className="badge">2 dari 2</span>
              </div>
              <div className="form-grid">
                <div className="field" data-invalid={errors.roomId ? "true" : undefined}>
                  <label htmlFor="demo-room">
                    Ruangan <span className="req" aria-hidden="true">*</span>
                  </label>
                  <select
                    className="select"
                    id="demo-room"
                    name="roomId"
                    value={form.roomId}
                    onChange={(event) => update("roomId", event.target.value)}
                  >
                    {rooms.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {item.code} · {item.capacity} orang
                      </option>
                    ))}
                  </select>
                  <p className="field-error">{errors.roomId}</p>
                </div>

                <div className="form-grid cols-3">
                  <div className="field" data-invalid={errors.date ? "true" : undefined}>
                    <label htmlFor="demo-date">
                      Tanggal <span className="req" aria-hidden="true">*</span>
                    </label>
                    <input
                      className="input"
                      id="demo-date"
                      name="date"
                      type="date"
                      value={form.date}
                      min={firstAvailable}
                      max={addDaysISO(today, settings.windowDays)}
                      onChange={(event) => changeDate(event.target.value)}
                    />
                    <p className="field-hint">
                      {dateNotice || "Pemesanan hanya tersedia Senin–Sabtu. Minggu libur."}
                    </p>
                    <p className="field-error">{errors.date}</p>
                  </div>
                  <div className="field" data-invalid={errors.start ? "true" : undefined}>
                    <label htmlFor="demo-start">
                      Waktu mulai <span className="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      className="select"
                      id="demo-start"
                      name="start"
                      value={form.start}
                      onChange={(event) => update("start", event.target.value)}
                    >
                      <option value="">Pilih</option>
                      <TimeOptions settings={settings} />
                    </select>
                    <p className="field-error">{errors.start}</p>
                  </div>
                  <div className="field" data-invalid={errors.end ? "true" : undefined}>
                    <label htmlFor="demo-end">
                      Waktu selesai <span className="req" aria-hidden="true">*</span>
                    </label>
                    <select
                      className="select"
                      id="demo-end"
                      name="end"
                      value={form.end}
                      onChange={(event) => update("end", event.target.value)}
                    >
                      <option value="">Pilih</option>
                      <TimeOptions settings={settings} />
                    </select>
                    <p className="field-error">{errors.end}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="btn-group">
              <button className="btn btn-primary" type="submit" disabled={busy}>
                <Icon name="check" /> {busy ? "Menyimpan…" : "Kirim pengajuan"}
              </button>
              <button className="btn btn-ghost" type="button" onClick={onBack}>
                Batal
              </button>
            </div>
          </div>

          <aside className="summary-card">
            <p className="eyebrow">Ringkasan</p>
            <h3>{room?.name ?? "Pilih ruangan"}</h3>
            <p className="summary-room">{room ? `${room.building} · Lantai ${room.floor}` : "—"}</p>
            <div className="summary-rows">
              <div className="summary-row">
                <span>Tanggal</span>
                <strong>{fmtDate(form.date, { weekday: true, short: true })}</strong>
              </div>
              <div className="summary-row">
                <span>Waktu</span>
                <strong>
                  {form.start && form.end ? `${timeLabel(form.start)}–${timeLabel(form.end)}` : "Belum dipilih"}
                </strong>
              </div>
              <div className="summary-row">
                <span>Peserta</span>
                <strong>{form.participants || "—"} orang</strong>
              </div>
            </div>
            <span className={summaryStatus.className}>{summaryStatus.text}</span>
            <div className="notice notice-info" style={{ marginTop: "var(--space-m)" }}>
              <Icon name="info" />
              <div>
                <strong>Jadwal pada tanggal ini</strong>
                <span>
                  {bookings.length
                    ? bookings
                        .slice(0, 4)
                        .map((booking) => `${timeLabel(booking.start)}–${timeLabel(booking.end)} ${booking.activity}`)
                        .join(" · ")
                    : `Belum ada agenda lain di ${room?.name ?? "ruang ini"}.`}
                </span>
              </div>
            </div>
            {conflicts.length ? (
              <div className="notice notice-bad" style={{ marginTop: 10 }}>
                <Icon name="alert" />
                <div>
                  <strong>Bentrok jadwal</strong>
                  <span>Pilih waktu atau ruang lain sebelum mengirim.</span>
                </div>
              </div>
            ) : null}
          </aside>
        </div>
      </form>
    </div>
  );
}
